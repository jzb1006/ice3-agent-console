import type { EquipmentSummary } from '../../shared/scene.js';
import { DEMO_ASSET } from '../../shared/demo-asset.js';
import { ChatPanel } from '../view/chat-panel.js';
import { EquipmentCard } from '../view/equipment-card.js';
import { createQuickActions } from '../view/quick-actions.js';
import { StageView } from '../view/stage.js';
import { ConsoleStatus } from '../view/status.js';
import { runAgentServer } from '../protocol/client.js';
import { runAgentLocally } from '../protocol/local-agent.js';
import type { ThreadState } from '../protocol/reducer.js';
import { createFactorySceneController } from '../scene/factory-browser.js';
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

class ConsoleView implements SessionView {
  constructor(
    readonly chat: ChatPanel,
    readonly equipment: EquipmentCard,
    readonly status: ConsoleStatus,
  ) {}

  appendUserMessage(text: string, id?: string): void {
    this.chat.appendUserMessage(text, id);
  }

  render(state: ThreadState): void {
    this.chat.render(state);
  }

  renderEquipment(equipment: EquipmentSummary | null): void {
    this.equipment.show(equipment);
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
  const view = new ConsoleView(chat, equipment, status);
  const demo = resolveDemoMode(window.location.search, true);
  const autoplay = resolveAutoplay(window.location.search, true);
  chat.setMode('scripted', demo ? 'local' : 'server');

  try {
    let session: AgentConsoleSession | null = null;
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
      onUserCameraIntent: () => session?.notifyUserSceneIntent(),
    };
    const scene = await createFactorySceneController({
      ...sceneOptions,
      onProductionStage: (selectionId) => {
        session?.setSelectedEquipment(selectionId);
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
      session?.setSelectedEquipment(ids[0] ?? null);
      session?.notifyUserSceneIntent();
    });
    createQuickActions(chat.composerArea, (prompt) => {
      void session?.send(prompt);
    });
    view.render(session.state);
    window.__ICE3_AGENT_CONSOLE__ = {
      send: (text) => session.send(text),
      selectedIds: () => scene.snapshot().selectedIds,
      snapshot: () => scene.snapshot(),
      assistantMode: () => 'scripted',
      transportMode: () => demo ? 'local' : 'server',
      state: () => session.state,
    };
    await scene.whenReady();
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
  }
}
