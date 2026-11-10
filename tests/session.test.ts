import { EventType } from '@ag-ui/core';
import { expect } from '#test-expect';
import { test } from 'node:test';
import {
  createSession,
  commandForTool,
  type SessionView,
} from '../src/app/session.js';
import type { RunTransport } from '../src/protocol/run-input.js';
import type {
  EquipmentRecord,
  SceneController,
} from '../src/scene/types.js';

class FakeScene implements SceneController {
  readonly commands: unknown[] = [];
  readonly recordsValue: readonly EquipmentRecord[] = [{
    selectionId: 'ice3-virtual-auto-plant/equipment/ROBOT-201',
    name: '一号点焊机器人',
    metadata: { equipmentTag: 'ROBOT-201' },
    bounds: { min: [-7, 0, -7], max: [7, 5, 7] },
  }];

  records(): readonly EquipmentRecord[] {
    return this.recordsValue;
  }

  setSelection(): void {}

  async focus(): Promise<void> {}

  async setView(): Promise<void> {}

  snapshot() {
    return {
      selectedIds: [],
      view: 'overview' as const,
      cameraPosition: [0, 10, 20] as const,
      cameraTarget: [0, 0, 0] as const,
    };
  }

  async execute(command: unknown) {
    this.commands.push(command);
    const type = (command as { readonly type?: string }).type;
    return {
      ok: true,
      selectionIds: type === 'clear'
        ? []
        : ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
      message: type === 'clear' ? '已返回整厂视角' : '已定位一号点焊机器人',
    };
  }

  onSelection(): () => void {
    return () => {};
  }

  onUserCameraIntent(): () => void {
    return () => {};
  }

  async whenReady(): Promise<void> {}

  dispose(): void {}
}

class FakeView implements SessionView {
  readonly messages: string[] = [];
  readonly busyStates: boolean[] = [];
  readonly equipment: Array<unknown> = [];

  appendUserMessage(text: string): void {
    this.messages.push(text);
  }

  render(): void {}

  renderEquipment(equipment: unknown): void {
    this.equipment.push(equipment);
  }

  setBusy(busy: boolean): void {
    this.busyStates.push(busy);
  }

  setError(): void {}
}

function scriptedTransport(
  capture?: (request: Parameters<RunTransport>[0]) => void,
): RunTransport {
  return async (request, handlers) => {
    capture?.(request);
    handlers.onEvent({
      type: EventType.RUN_STARTED,
      threadId: 'thread-1',
      runId: 'run-1',
    });
    handlers.onEvent({
      type: EventType.TOOL_CALL_START,
      toolCallId: 'tool-1',
      toolCallName: 'focus_equipment',
    });
    handlers.onEvent({
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: 'tool-1',
      delta: '{"selectionId":"ice3-virtual-auto-plant/equipment/ROBOT-201"}',
    });
    handlers.onEvent({
      type: EventType.TOOL_CALL_END,
      toolCallId: 'tool-1',
    });
    handlers.onEvent({
      type: EventType.RUN_FINISHED,
      threadId: 'thread-1',
      runId: 'run-1',
    });
    handlers.onDone?.();
  };
}

test('routes a complete scene tool call to the controller', async () => {
  const scene = new FakeScene();
  const session = createSession({
    transport: scriptedTransport(),
    scene,
    view: new FakeView(),
    threadId: 'thread-1',
  });

  await session.send('定位焊装机器人');

  expect(scene.commands).toEqual([{
    type: 'focus',
    selectionIds: ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
  }]);
  expect(session.state.status).toBe('idle');
});

test('preserves the area argument for area camera commands', () => {
  expect(commandForTool('set_camera_view', {
    view: 'area',
    area: '涂装车间',
  })).toEqual({
    type: 'camera',
    view: 'area',
    area: '涂装车间',
  });
});

test('preserves the stage argument for equipment searches', () => {
  expect(commandForTool('find_equipment', {
    query: '机器人',
    stage: '车身焊装',
    area: '车身车间',
  })).toEqual({
    type: 'find',
    query: '机器人',
    stage: '车身焊装',
    area: '车身车间',
  });
});

test('clears the busy state after an asynchronous scene tool completes', async () => {
  let release!: () => void;
  const scene = new FakeScene();
  scene.execute = async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      ok: true,
      selectionIds: [],
      message: '整车生产流已完成',
    };
  };
  const view = new FakeView();
  const session = createSession({
    transport: scriptedTransport(),
    scene,
    view,
    threadId: 'thread-1',
  });

  const pending = session.send('播放整车生产流');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(view.busyStates.at(-1)).toBe(true);
  release();
  await pending;
  expect(view.busyStates.at(-1)).toBe(false);
});

test('marks a cancelled asynchronous scene tool instead of publishing its stale result', async () => {
  let release!: () => void;
  let transportCalls = 0;
  const scene = new FakeScene();
  scene.execute = async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      ok: true,
      selectionIds: ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
      message: '旧动画已完成',
    };
  };
  const transport: RunTransport = async (_request, handlers) => {
    transportCalls += 1;
    if (transportCalls === 1) {
      handlers.onEvent({
        type: EventType.RUN_STARTED,
        threadId: 'thread-1',
        runId: 'run-1',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_START,
        toolCallId: 'tool-1',
        toolCallName: 'play_production',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: 'tool-1',
        delta: '{}',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_END,
        toolCallId: 'tool-1',
      });
      handlers.onDone?.();
    }
  };
  const session = createSession({
    transport,
    scene,
    view: new FakeView(),
    threadId: 'thread-1',
  });

  const first = session.send('播放整车生产流');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = session.send('查看整厂');
  release();
  await Promise.all([first, second]);

  const cancelled = session.state.items.find((item) => item.id === 'tool-1');
  expect(cancelled).toMatchObject({
    kind: 'tool',
    status: 'result',
    cancelled: true,
  });
  expect((cancelled as { readonly result?: { readonly cancelled?: boolean } }).result?.cancelled)
    .toBe(true);
});

test('clears the equipment card after returning to overview', async () => {
  const view = new FakeView();
  const session = createSession({
    transport: async (_request, handlers) => {
      handlers.onEvent({
        type: EventType.RUN_STARTED,
        threadId: 'thread-1',
        runId: 'run-1',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_START,
        toolCallId: 'tool-1',
        toolCallName: 'clear_scene_focus',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: 'tool-1',
        delta: '{}',
      });
      handlers.onEvent({
        type: EventType.TOOL_CALL_END,
        toolCallId: 'tool-1',
      });
      handlers.onEvent({
        type: EventType.RUN_FINISHED,
        threadId: 'thread-1',
        runId: 'run-1',
      });
      handlers.onDone?.();
    },
    scene: new FakeScene(),
    view,
    threadId: 'thread-1',
  });

  await session.send('回到全厂');

  expect(view.equipment.at(-1)).toBeNull();
});

test('manual scene intent cancels pending autoplay', async () => {
  let calls = 0;
  const transport: RunTransport = async (_request, handlers) => {
    calls += 1;
    handlers.onDone?.();
  };
  const session = createSession({
    transport,
    scene: new FakeScene(),
    view: new FakeView(),
    threadId: 'thread-1',
    autoplay: { enabled: true, delayMs: 40 },
  });
  session.start();
  session.notifyUserSceneIntent();
  await new Promise((resolve) => setTimeout(resolve, 70));
  expect(calls).toBe(0);
});

test('marks an autoplay request as a guided tour', async () => {
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let captured: Parameters<RunTransport>[0] | undefined;
  const transport: RunTransport = async (request, handlers) => {
    captured = request;
    handlers.onEvent({
      type: EventType.RUN_STARTED,
      threadId: 'thread-1',
      runId: 'run-1',
    });
    handlers.onEvent({
      type: EventType.RUN_FINISHED,
      threadId: 'thread-1',
      runId: 'run-1',
    });
    handlers.onDone?.();
    started();
  };
  const session = createSession({
    transport,
    scene: new FakeScene(),
    view: new FakeView(),
    threadId: 'thread-1',
    autoplay: { enabled: true, delayMs: 0 },
  });

  session.start();
  await requestStarted;

  expect(captured?.context).toContainEqual({
    description: 'presentation mode',
    value: 'guided-tour',
  });
});

test('manual scene intent cancels an active autoplay run', async () => {
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let signal: AbortSignal | undefined;
  const transport: RunTransport = async (_request, handlers, nextSignal) => {
    signal = nextSignal;
    handlers.onEvent({
      type: EventType.RUN_STARTED,
      threadId: 'thread-1',
      runId: 'run-1',
    });
    handlers.onEvent({
      type: EventType.TEXT_MESSAGE_START,
      messageId: 'assistant-1',
      role: 'assistant',
    });
    handlers.onEvent({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: 'assistant-1',
      delta: '正在切换视角。',
    });
    started();
    await new Promise<void>((resolve) => {
      nextSignal?.addEventListener('abort', () => resolve(), { once: true });
    });
  };
  const session = createSession({
    transport,
    scene: new FakeScene(),
    view: new FakeView(),
    threadId: 'thread-1',
    autoplay: { enabled: true, delayMs: 0 },
  });

  session.start();
  await requestStarted;
  expect(session.state.items.length).toBeGreaterThan(0);

  session.notifyUserSceneIntent();

  expect(signal?.aborted).toBe(true);
  expect(session.state.items).toEqual([]);
  expect(session.state.status).toBe('idle');
  expect(session.state.runId).toBeNull();
});

test('a replacement run keeps ownership of the busy state', async () => {
  let autoplayStarted!: () => void;
  const autoplayRequestStarted = new Promise<void>((resolve) => {
    autoplayStarted = resolve;
  });
  let manualStarted!: () => void;
  const manualRequestStarted = new Promise<void>((resolve) => {
    manualStarted = resolve;
  });
  let finishManual!: () => void;
  const view = new FakeView();
  const transport: RunTransport = async (request, handlers, signal) => {
    const isAutoplay = request.messages.some(
      (message) => message.content === '带我看一下整个汽车制造工厂',
    );
    if (isAutoplay) {
      handlers.onEvent({
        type: EventType.RUN_STARTED,
        threadId: 'thread-1',
        runId: 'autoplay-run',
      });
      autoplayStarted();
      await new Promise<void>((resolve) => {
        signal?.addEventListener('abort', () => resolve(), { once: true });
      });
      return;
    }
    manualStarted();
    await new Promise<void>((resolve) => {
      finishManual = resolve;
    });
  };
  const session = createSession({
    transport,
    scene: new FakeScene(),
    view,
    threadId: 'thread-1',
    autoplay: { enabled: true, delayMs: 0 },
  });

  session.start();
  await autoplayRequestStarted;
  const replacement = session.send('定位焊装机器人');
  await manualRequestStarted;
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(view.busyStates.at(-1)).toBe(true);

  finishManual();
  await replacement;
  expect(view.busyStates.at(-1)).toBe(false);
});

test('sends the complete equipment catalog to the Agent', async () => {
  let captured: Parameters<RunTransport>[0] | undefined;
  const session = createSession({
    transport: scriptedTransport((request) => {
      captured = request;
    }),
    scene: new FakeScene(),
    view: new FakeView(),
    threadId: 'thread-1',
  });
  await session.send('找一台焊装机器人');
  const catalog = captured?.context?.find(
    (entry) => entry.description === 'equipment catalog',
  );
  expect(catalog).toBeDefined();
  expect(catalog?.value).toContain('ROBOT-201');
  expect(catalog?.value).toContain('一号点焊机器人');
});
