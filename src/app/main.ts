import type { EquipmentSummary } from '../../shared/scene.js';
import { DEMO_ASSET } from '../../shared/demo-asset.js';
import {
  FACTORY_VISIT_STOPS,
  matchFactoryScenario,
  type FactoryScenario,
} from '../../shared/factory-scenarios.js';
import { ChatPanel } from '../view/chat-panel.js';
import { EquipmentCard } from '../view/equipment-card.js';
import { createQuickActions } from '../view/quick-actions.js';
import { StageView } from '../view/stage.js';
import { ConsoleStatus } from '../view/status.js';
import { DiagnosticsPanel } from '../view/diagnostics.js';
import { runAgentServer } from '../protocol/client.js';
import { runAgentLocally } from '../protocol/local-agent.js';
import type { ThreadState } from '../protocol/reducer.js';
import { createFactorySceneController } from '../scene/factory-browser.js';
import { createEquipmentCatalog } from '../scene/catalog.js';
import { resolveVisibleViewport } from '../scene/focus-framing.js';
import type { SceneStatusUpdate } from '../scene/types.js';
import {
  resolveAutoplay,
  resolveDemoMode,
} from './mode.js';
import {
  createSession,
  type AgentConsoleSession,
  type SessionView,
} from './session.js';
import { EquipmentBrowser } from '../view/equipment-browser.js';

const FACTORY_VISIT_CONTROLS = Object.freeze([
  { label: '移动', value: 'W A S D / 方向键' },
  { label: '观察', value: '拖动鼠标' },
  { label: '镜头', value: '滚轮远近' },
  { label: '查看', value: '点击节点' },
  { label: '退出', value: '快捷操作' },
] as const);

class ConsoleView implements SessionView {
  constructor(
    readonly chat: ChatPanel,
    readonly equipment: EquipmentCard,
    readonly status: ConsoleStatus,
    private readonly onEquipment?: (equipment: EquipmentSummary | null) => void,
  ) {}

  appendUserMessage(text: string, id?: string): void {
    this.chat.appendUserMessage(text, id);
  }

  render(state: ThreadState): void {
    this.chat.render(state);
  }

  renderEquipment(equipment: EquipmentSummary | null): void {
    this.equipment.show(equipment);
    this.onEquipment?.(equipment);
  }

  setBusy(busy: boolean): void {
    this.chat.setBusy(busy);
  }

  setError(message: string | null): void {
    this.chat.setError(message);
    if (message) this.status.set(message, 'error');
  }
}

export async function startConsole(host: HTMLElement): Promise<void> {
  host.replaceChildren();
  const stage = new StageView(
    host,
    DEMO_ASSET.label,
  );
  const chat = new ChatPanel(host);
  const equipment = new EquipmentCard(host);
  const status = new ConsoleStatus(host);
  const diagnostics = new DiagnosticsPanel(host);
  const demo = resolveDemoMode(window.location.search, true);
  const autoplay = resolveAutoplay(window.location.search, true);
  chat.setMode('scripted', demo ? 'local' : 'server');
  let session: AgentConsoleSession | null = null;
  let activeScenario: FactoryScenario | null = null;
  let factoryVisitActive = false;
  let enterFactoryVisit: (() => Promise<void>) | null = null;
  let exitFactoryVisit: (() => Promise<void>) | null = null;
  let handleVisitNode: ((selectionId: string) => void) | null = null;
  const scenarioFocusSteps = (): readonly FactoryScenario['steps'][number][] => (
    activeScenario?.steps.filter((step) => step.tool.name === 'focus_equipment') ?? []
  );
  const updateScenarioTour = (selected: EquipmentSummary | null): void => {
    if (!activeScenario) return;
    const steps = scenarioFocusSteps();
    if (!selected) {
      stage.tour.update({
        title: activeScenario.label,
        stageIndex: steps.length,
        stageCount: steps.length,
        completed: true,
        detail: '本段导览结束，镜头返回整厂总览。',
      });
      return;
    }
    const index = steps.findIndex((step) => (
      step.tool.args.selectionId === selected.selectionId
    ));
    if (index < 0) return;
    const step = steps[index]!;
    stage.tour.update({
      title: activeScenario.label,
      stageIndex: index + 1,
      stageCount: steps.length,
      equipmentName: selected.name,
      processStage: selected.stage,
      detail: step.text,
    });
  };
  const view = new ConsoleView(chat, equipment, status, updateScenarioTour);
  const prepareTour = (prompt: string): void => {
    stage.tour.hide();
    activeScenario = matchFactoryScenario(prompt) ?? null;
    if (!activeScenario) return;
    const steps = scenarioFocusSteps();
    stage.tour.update({
      title: activeScenario.label,
      stageIndex: 0,
      stageCount: steps.length,
      detail: `准备开始${activeScenario.label}导览。`,
    });
  };
  const sendPrompt = (prompt: string): Promise<void> | undefined => {
    const startsFactoryVisit = /厂房参观|参观厂房|第一人称|自由走动/u.test(prompt);
    const exitsFactoryVisit = /(?:退出|结束)(?:厂房)?参观/u.test(prompt);
    if (exitsFactoryVisit) {
      void exitFactoryVisit?.();
    } else if (startsFactoryVisit) {
      void enterFactoryVisit?.();
    } else if (factoryVisitActive) {
      void exitFactoryVisit?.();
    }
    if (!startsFactoryVisit && !exitsFactoryVisit) prepareTour(prompt);
    return session?.send(prompt);
  };

  try {
    const visibleSceneViewport = () => {
      const stageBounds = stage.element.getBoundingClientRect();
      const panelBounds = chat.element.getBoundingClientRect();
      return resolveVisibleViewport(
        {
          x: 0,
          y: 0,
          width: stageBounds.width,
          height: stageBounds.height,
        },
        {
          x: panelBounds.left - stageBounds.left,
          y: panelBounds.top - stageBounds.top,
          width: panelBounds.width,
          height: panelBounds.height,
        },
      );
    };
    const sceneOptions = {
      stage: stage.element,
      visibleViewport: visibleSceneViewport,
      onStatus: ({ text, kind }: SceneStatusUpdate) => status.set(text, kind),
      onUserCameraIntent: () => {
        if (!factoryVisitActive) {
          activeScenario = null;
          stage.tour.hide();
        }
        session?.notifyUserSceneIntent();
      },
      onVisitNode: (selectionId: string) => handleVisitNode?.(selectionId),
    };
    const scene = await createFactorySceneController({
      ...sceneOptions,
      onProductionStage: ({ selectionId, stageIndex, stageCount, completed }) => {
        factoryVisitActive = false;
        activeScenario = null;
        if (selectionId) {
          const record = scene.records().find((item) => item.selectionId === selectionId);
          const metadata = record?.metadata ?? {};
          session?.setSelectedEquipment(selectionId);
          stage.tour.update({
            title: '整车生产流',
            stageIndex,
            stageCount,
            equipmentName: record?.name ?? '当前工位',
            processStage: typeof metadata.processStage === 'string'
              ? metadata.processStage
              : undefined,
            detail: `车辆正在经过${record?.name ?? '当前工位'}，请留意该阶段的工艺变化。`,
          });
          status.set(
            `生产流 ${stageIndex}/${stageCount}：${record?.name ?? '当前工位'}`,
            'loading',
          );
        } else if (completed) {
          stage.tour.update({
            title: '整车生产流',
            stageIndex,
            stageCount,
            completed: true,
            detail: '生产流已完成，车辆进入成品物流月台。',
          });
          status.set('生产流已完成：车辆进入成品物流月台');
        } else {
          stage.tour.update({
            title: '整车生产流',
            stageIndex,
            stageCount,
            detail: '准备沿生产线播放车辆工艺路径。',
          });
          status.set(`生产流准备中：共 ${stageCount} 个工艺阶段`, 'loading');
        }
      },
    });
    const updateFactoryVisitGuide = (selectionId: string | null): void => {
      if (!factoryVisitActive) return;
      const fallback = FACTORY_VISIT_STOPS[0]!;
      const record = selectionId
        ? scene.records().find((item) => item.selectionId === selectionId)
        : undefined;
      const tag = typeof record?.metadata?.equipmentTag === 'string'
        ? record.metadata.equipmentTag
        : undefined;
      const index = tag
        ? FACTORY_VISIT_STOPS.findIndex((stop) => stop.tag === tag)
        : -1;
      const stop = index >= 0 ? FACTORY_VISIT_STOPS[index]! : fallback;
      const target = record ?? scene.records().find((item) => item.metadata?.equipmentTag === fallback.tag);
      stage.tour.update({
        eyebrow: '厂房参观',
        title: '厂房参观任务',
        stageIndex: index >= 0 ? index + 1 : 0,
        stageCount: FACTORY_VISIT_STOPS.length,
        equipmentName: target
          ? index >= 0 ? target.name : `建议前往：${target.name}`
          : '建议前往下一个节点',
        processStage: target?.metadata?.processStage as string | undefined ?? '自由行走',
        controls: FACTORY_VISIT_CONTROLS,
        detail: index >= 0
          ? `${stop.guide} 参观者可自行继续移动，不会自动跳转。`
          : `自由行走：使用 W/A/S/D 或方向键移动，拖动鼠标转向，滚轮调整镜头远近；${stop.guide}`,
      });
    };
    handleVisitNode = (selectionId): void => {
      if (!factoryVisitActive) return;
      scene.setSelection([selectionId]);
      session?.setSelectedEquipment(selectionId);
      updateFactoryVisitGuide(selectionId);
      const record = scene.records().find((item) => item.selectionId === selectionId);
      status.set(`已到达参观节点：${record?.name ?? '当前工位'}`);
    };
    enterFactoryVisit = async (): Promise<void> => {
      factoryVisitActive = true;
      activeScenario = null;
      stage.tour.update({
        eyebrow: '厂房参观',
        title: '厂房参观任务',
        stageIndex: 0,
        stageCount: FACTORY_VISIT_STOPS.length,
        equipmentName: '准备进入厂房',
        processStage: '自由行走',
        controls: FACTORY_VISIT_CONTROLS,
        detail: '使用 W/A/S/D 或方向键控制人物移动，拖动鼠标观察四周，滚轮调整镜头远近；靠近节点会停下并展示设备说明。',
      });
      await scene.enterFactoryVisit?.();
      updateFactoryVisitGuide(null);
    };
    exitFactoryVisit = async (): Promise<void> => {
      factoryVisitActive = false;
      stage.tour.hide();
      scene.setSelection([]);
      session?.setSelectedEquipment(null);
      await scene.exitFactoryVisit?.();
    };
    session = createSession({
      transport: demo ? runAgentLocally : runAgentServer,
      scene,
      view,
      threadId: `ice3-agent-${Date.now()}`,
      autoplay: {
        enabled: autoplay,
        delayMs: 1_200,
      },
    });
    scene.onSelection((ids) => {
      if (factoryVisitActive) {
        session?.setSelectedEquipment(ids[0] ?? null);
        updateFactoryVisitGuide(ids[0] ?? null);
        session?.notifyUserSceneIntent();
        return;
      }
      activeScenario = null;
      stage.tour.hide();
      session?.setSelectedEquipment(ids[0] ?? null);
      session?.notifyUserSceneIntent();
    });
    const equipmentCatalog = createEquipmentCatalog(scene.records());
    new EquipmentBrowser(chat.browserArea, equipmentCatalog, {
      onSelect: async (entry) => {
        if (factoryVisitActive) {
          try {
            scene.setSelection([entry.selectionId]);
            session?.setSelectedEquipment(entry.selectionId);
            updateFactoryVisitGuide(entry.selectionId);
          } catch (error) {
            const message = `设备选择失败：${error instanceof Error ? error.message : String(error)}`;
            status.set(message, 'error');
          }
          return;
        }
        activeScenario = null;
        stage.tour.hide();
        session?.notifyUserSceneIntent();
        try {
          const result = await scene.execute({
            type: 'focus',
            selectionIds: [entry.selectionId],
          });
          if (result.ok) session?.setSelectedEquipment(entry.selectionId);
          status.set(result.message, result.ok ? 'ready' : 'error');
        } catch (error) {
          const message = `设备定位失败：${
            error instanceof Error ? error.message : String(error)
          }`;
          status.set(message, 'error');
          view.setError(message);
        }
      },
      onError: (error) => {
        const message = `设备定位失败：${
          error instanceof Error ? error.message : String(error)
        }`;
        status.set(message, 'error');
        view.setError(message);
      },
    });
    chat.onSubmit((prompt) => {
      void sendPrompt(prompt);
    });
    createQuickActions(chat.composerArea, (prompt) => {
      void sendPrompt(prompt);
    });
    view.render(session.state);
    window.__ICE3_AGENT_CONSOLE__ = {
      send: (text) => sendPrompt(text) ?? Promise.resolve(),
      selectedIds: () => scene.snapshot().selectedIds,
      snapshot: () => scene.snapshot(),
      assistantMode: () => 'scripted',
      transportMode: () => demo ? 'local' : 'server',
      state: () => session!.state,
    };
    await scene.whenReady();
    diagnostics.connect(
      () => scene.diagnostics?.(),
      async () => scene.capture?.(),
    );
    stage.setReady();
    status.set('场景已就绪');
    session.start();
  } catch (error) {
    const message = `场景加载失败：${
      error instanceof Error ? error.message : String(error)
    }`;
    status.set(message, 'error');
    view.setError(message);
    stage.element.setAttribute('aria-busy', 'false');
    diagnostics.dispose();
  }
}
