import type { EquipmentSummary } from '../../shared/scene.js';
import { DEMO_ASSET } from '../../shared/demo-asset.js';
import { matchFactoryScenario, type FactoryScenario } from '../../shared/factory-scenarios.js';
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
    prepareTour(prompt);
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
        activeScenario = null;
        stage.tour.hide();
        session?.notifyUserSceneIntent();
      },
    };
    const scene = await createFactorySceneController({
      ...sceneOptions,
      onProductionStage: ({ selectionId, stageIndex, stageCount, completed }) => {
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
      activeScenario = null;
      stage.tour.hide();
      session?.setSelectedEquipment(ids[0] ?? null);
      session?.notifyUserSceneIntent();
    });
    const equipmentCatalog = createEquipmentCatalog(scene.records());
    new EquipmentBrowser(chat.browserArea, equipmentCatalog, {
      onSelect: async (entry) => {
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
