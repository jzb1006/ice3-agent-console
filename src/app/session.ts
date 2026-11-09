import type { CameraView, EquipmentSummary, SceneCommand } from '../../shared/scene.js';
import type { Effect, ThreadState } from '../protocol/reducer.js';
import { initialState, reduceThread } from '../protocol/reducer.js';
import type {
  RunMessage,
  RunRequest,
  RunTransport,
} from '../protocol/run-input.js';
import type { SceneController } from '../scene/types.js';

export interface SessionView {
  appendUserMessage(text: string, id?: string): void;
  render(state: ThreadState): void;
  renderEquipment(equipment: EquipmentSummary | null): void;
  setBusy(busy: boolean): void;
  setError(message: string | null): void;
}

export interface AgentConsoleSession {
  readonly state: ThreadState;
  start(): void;
  send(text: string): Promise<void>;
  notifyUserSceneIntent(): void;
  setSelectedEquipment(id: string | null): void;
  dispose(): void;
}

interface SessionOptions {
  readonly transport: RunTransport;
  readonly scene: SceneController;
  readonly view: SessionView;
  readonly threadId: string;
  readonly autoplay?: {
    readonly enabled: boolean;
    readonly delayMs: number;
  };
}

function objectArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
}

function selectionIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function commandForTool(
  name: string,
  value: unknown,
): SceneCommand | undefined {
  const args = objectArgs(value);
  switch (name) {
    case 'find_equipment':
      return {
        type: 'find',
        ...(typeof args.query === 'string' ? { query: args.query } : {}),
        ...(typeof args.area === 'string' ? { area: args.area } : {}),
      };
    case 'select_equipment':
      return { type: 'select', selectionIds: selectionIds(args.selectionIds) };
    case 'focus_equipment':
      return {
        type: 'focus',
        selectionIds: typeof args.selectionId === 'string'
          ? [args.selectionId]
          : selectionIds(args.selectionIds),
      };
    case 'highlight_equipment':
      return {
        type: 'highlight',
        selectionIds: selectionIds(args.selectionIds),
        ...(typeof args.durationMs === 'number'
          ? { durationMs: args.durationMs }
          : {}),
      };
    case 'set_camera_view': {
      const view = args.view;
      if (view !== 'overview' && view !== 'area' && view !== 'equipment' && view !== 'top') {
        return undefined;
      }
      return {
        type: 'camera',
        view: view as CameraView,
        ...(typeof args.area === 'string' ? { area: args.area } : {}),
      };
    }
    case 'clear_scene_focus':
      return { type: 'clear' };
    case 'play_production':
      return { type: 'production' };
    default:
      return undefined;
  }
}

export function createSession(options: SessionOptions): AgentConsoleSession {
  const {
    transport,
    scene,
    view,
    threadId,
    autoplay,
  } = options;
  let state = initialState(threadId);
  let runId: string | null = null;
  let abort: AbortController | null = null;
  let autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  let autoplayBaseState: ThreadState | null = null;
  let activeAutoplayRun: string | null = null;
  let selectedEquipment: string | null = null;
  let disposed = false;
  let sequence = 0;

  const publish = (next: ThreadState): void => {
    state = next;
    view.render(state);
    view.setError(state.error);
  };
  const local = (action: { type: string } & Record<string, unknown>): void => {
    publish(reduceThread(state, action).state);
  };
  const stopAutoplay = (): void => {
    if (autoplayTimer !== null) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  };
  const equipmentSummary = (id: string | null): EquipmentSummary | null => {
    if (!id) return null;
    const record = scene.records().find((item) => item.selectionId === id);
    if (!record) return null;
    const metadata = record.metadata ?? {};
    return {
      selectionId: record.selectionId,
      name: record.name,
      tag: typeof metadata.equipmentTag === 'string'
        ? metadata.equipmentTag
        : undefined,
      stage: typeof metadata.processStage === 'string'
        ? metadata.processStage
        : undefined,
      area: typeof metadata.area === 'string' ? metadata.area : undefined,
      connectionCount: Array.isArray(metadata.connections)
        ? metadata.connections.length
        : 0,
    };
  };
  const setSelectedEquipment = (id: string | null): void => {
    selectedEquipment = id;
    view.renderEquipment(equipmentSummary(id));
  };

  async function processEffect(
    effect: Effect,
    currentRun: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (effect.type !== 'execute-tool') return;
    const command = commandForTool(effect.name, effect.args);
    if (!command) {
      local({
        type: '@local/tool-result',
        toolCallId: effect.toolCallId,
        error: `不支持的场景参数：${effect.name}`,
        result: { ok: false },
      });
      return;
    }
    const publishCancelled = (): void => {
      if (disposed) return;
      local({
        type: '@local/tool-result',
        toolCallId: effect.toolCallId,
        cancelled: true,
        result: { ok: false, cancelled: true },
      });
    };
    if (signal.aborted) {
      publishCancelled();
      return;
    }
    const result = await scene.execute(command, signal);
    if (signal.aborted) {
      publishCancelled();
      return;
    }
    if (disposed || runId !== currentRun) return;
    local({
      type: '@local/tool-result',
      toolCallId: effect.toolCallId,
      result,
      ...(result.ok ? {} : { error: result.message }),
    });
    if (command.type === 'clear') {
      setSelectedEquipment(null);
    } else if (result.selectionIds[0]) {
      setSelectedEquipment(result.selectionIds[0]);
    }
  }

  const run = async (
    text: string,
    options: { readonly autoplay: boolean },
  ): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || disposed) return;
    abort?.abort();
    const runAbort = new AbortController();
    abort = runAbort;
    const currentRun = `run-${++sequence}`;
    runId = currentRun;
    const userId = `user-${currentRun}`;
    if (options.autoplay) activeAutoplayRun = currentRun;
    if (!options.autoplay) view.appendUserMessage(trimmed, userId);
    local({ type: '@local/user-message', id: userId, text: trimmed });
    view.setBusy(true);
    const snapshot = scene.snapshot();
    const messages: RunMessage[] = state.items.flatMap((item) => (
      item.kind === 'text'
        ? [{ id: item.id, role: item.role, content: item.text }]
        : []
    ));
    const selected = selectedEquipment ?? snapshot.selectedIds[0];
    const catalog = scene.records().map((record) => ({
      selectionId: record.selectionId,
      name: record.name,
      tag: record.metadata?.equipmentTag,
      stage: record.metadata?.processStage,
      area: record.metadata?.area,
    }));
    const request: RunRequest = {
      threadId,
      runId: currentRun,
      messages,
      context: [
        ...(options.autoplay
          ? [{ description: 'presentation mode', value: 'guided-tour' }]
          : []),
        ...(selected
          ? [{ description: 'selected equipment', value: selected }]
          : []),
        {
          description: 'camera state',
          value: JSON.stringify(snapshot),
        },
        {
          description: 'equipment catalog',
          value: JSON.stringify(catalog),
        },
      ],
      state: { scene: snapshot },
    };
    const pending: Promise<void>[] = [];
    try {
      await transport(request, {
        onEvent: (event) => {
          if (disposed || runId !== currentRun) return;
          const reduction = reduceThread(
            state,
            event as { type: string } & Record<string, any>,
          );
          publish(reduction.state);
          for (const effect of reduction.effects) {
            pending.push(processEffect(effect, currentRun, runAbort.signal));
          }
        },
        onError: (error) => {
          if (runId !== currentRun) return;
          local({ type: '@local/error', message: error.message });
        },
        onDone: () => {
          if (runId !== currentRun) return;
        },
      }, runAbort.signal);
      await Promise.all(pending);
    } catch (error) {
      if (!runAbort.signal.aborted && runId === currentRun) {
        local({
          type: '@local/error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (runId === currentRun) {
        runId = null;
        view.setBusy(false);
      }
      if (activeAutoplayRun === currentRun) activeAutoplayRun = null;
    }
  };

  const cancelAutoplayConversation = (): void => {
    stopAutoplay();
    if (!autoplayBaseState) return;
    const base = autoplayBaseState;
    autoplayBaseState = null;
    if (activeAutoplayRun && activeAutoplayRun === runId) {
      runId = null;
      activeAutoplayRun = null;
      abort?.abort();
      view.setBusy(false);
    }
    publish(base);
  };

  const send = async (text: string): Promise<void> => {
    cancelAutoplayConversation();
    await run(text, { autoplay: false });
  };

  return {
    get state() {
      return state;
    },
    start() {
      if (!autoplay?.enabled) return;
      autoplayBaseState = state;
      autoplayTimer = setTimeout(() => {
        autoplayTimer = null;
        void run('带我看一下整个汽车制造工厂', { autoplay: true });
      }, autoplay.delayMs);
    },
    send,
    notifyUserSceneIntent() {
      cancelAutoplayConversation();
    },
    setSelectedEquipment,
    dispose() {
      disposed = true;
      stopAutoplay();
      activeAutoplayRun = null;
      abort?.abort();
    },
  };
}
