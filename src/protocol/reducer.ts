import { EventType } from '@ag-ui/core';
import { isSceneToolName, type SceneToolName } from '../../shared/contract.js';

export interface TextItem {
  readonly kind: 'text';
  readonly id: string;
  readonly role: string;
  text: string;
  done: boolean;
}

export interface ToolItem {
  readonly kind: 'tool';
  readonly id: string;
  readonly name: string;
  argsRaw: string;
  args?: unknown;
  status: 'streaming' | 'args-done' | 'result';
  parseError?: string;
  cancelled?: boolean;
  result?: unknown;
}

export type ThreadItem = TextItem | ToolItem;

export interface ThreadState {
  readonly threadId: string;
  readonly runId: string | null;
  readonly status: 'idle' | 'running' | 'error';
  readonly items: readonly ThreadItem[];
  readonly error: string | null;
  readonly eventCount: number;
}

export interface ExecuteToolEffect {
  readonly type: 'execute-tool';
  readonly toolCallId: string;
  readonly name: SceneToolName;
  readonly args: unknown;
}

export interface CustomEffect {
  readonly type: 'custom';
  readonly name: string;
  readonly value: unknown;
}

export type Effect = ExecuteToolEffect | CustomEffect;

export interface Reduction {
  readonly state: ThreadState;
  readonly effects: readonly Effect[];
}

export type Action = {
  readonly type: string;
} & Record<string, any>;

export function initialState(threadId: string): ThreadState {
  return {
    threadId,
    runId: null,
    status: 'idle',
    items: [],
    error: null,
    eventCount: 0,
  };
}

function replaceItem(
  items: readonly ThreadItem[],
  id: string,
  update: (item: ThreadItem) => ThreadItem,
): readonly ThreadItem[] {
  return items.map((item) => (item.id === id ? update(item) : item));
}

function unknownEvent(state: ThreadState): Reduction {
  return { state, effects: [] };
}

export function reduceThread(state: ThreadState, action: Action): Reduction {
  const effects: Effect[] = [];
  const base = { ...state, eventCount: state.eventCount + 1 };

  switch (action.type) {
    case EventType.RUN_STARTED:
      return {
        state: {
          ...base,
          runId: String(action.runId),
          status: 'running',
          error: null,
        },
        effects,
      };
    case EventType.TEXT_MESSAGE_START:
      return {
        state: {
          ...base,
          items: [
            ...state.items,
            {
              kind: 'text',
              id: String(action.messageId),
              role: String(action.role ?? 'assistant'),
              text: '',
              done: false,
            },
          ],
        },
        effects,
      };
    case EventType.TEXT_MESSAGE_CONTENT:
      return {
        state: {
          ...base,
          items: replaceItem(state.items, String(action.messageId), (item) => (
            item.kind === 'text'
              ? { ...item, text: item.text + String(action.delta ?? '') }
              : item
          )),
        },
        effects,
      };
    case EventType.TEXT_MESSAGE_END:
      return {
        state: {
          ...base,
          items: replaceItem(state.items, String(action.messageId), (item) => (
            item.kind === 'text' ? { ...item, done: true } : item
          )),
        },
        effects,
      };
    case EventType.TOOL_CALL_START:
      return {
        state: {
          ...base,
          items: [
            ...state.items,
            {
              kind: 'tool',
              id: String(action.toolCallId),
              name: String(action.toolCallName),
              argsRaw: '',
              status: 'streaming',
            },
          ],
        },
        effects,
      };
    case EventType.TOOL_CALL_ARGS:
      return {
        state: {
          ...base,
          items: replaceItem(state.items, String(action.toolCallId), (item) => (
            item.kind === 'tool'
              ? { ...item, argsRaw: item.argsRaw + String(action.delta ?? '') }
              : item
          )),
        },
        effects,
      };
    case EventType.TOOL_CALL_END: {
      const toolCallId = String(action.toolCallId);
      let parsed: unknown;
      let parseError: string | undefined;
      const current = state.items.find((item) => (
        item.kind === 'tool' && item.id === toolCallId
      )) as ToolItem | undefined;
      if (!current) return unknownEvent(state);
      try {
        parsed = current.argsRaw ? JSON.parse(current.argsRaw) : {};
      } catch (error) {
        parseError = (error as Error).message;
      }
      const toolItem: ToolItem = {
        ...current,
        args: parsed,
        parseError,
        status: 'args-done',
      };
      if (
        !parseError
        && isSceneToolName(current.name)
      ) {
        effects.push({
          type: 'execute-tool',
          toolCallId,
          name: current.name,
          args: parsed,
        });
      }
      return {
        state: {
          ...base,
          items: replaceItem(state.items, toolCallId, () => toolItem),
        },
        effects,
      };
    }
    case EventType.TOOL_CALL_RESULT:
      return {
        state: {
          ...base,
          items: replaceItem(state.items, String(action.toolCallId), (item) => (
            item.kind === 'tool'
              ? { ...item, status: 'result', result: action.content }
              : item
          )),
        },
        effects,
      };
    case EventType.CUSTOM:
      effects.push({
        type: 'custom',
        name: String(action.name),
        value: action.value,
      });
      return { state: base, effects };
    case EventType.RUN_FINISHED:
      return {
        state: { ...base, status: 'idle' },
        effects,
      };
    case EventType.RUN_ERROR:
      return {
        state: {
          ...base,
          status: 'error',
          error: String(action.message ?? 'Agent 执行失败'),
        },
        effects,
      };
    case '@local/user-message':
      return {
        state: {
          ...base,
          items: [
            ...state.items,
            {
              kind: 'text',
              id: String(action.id),
              role: 'user',
              text: String(action.text),
              done: true,
            },
          ],
        },
        effects,
      };
    case '@local/tool-result':
      return {
        state: {
          ...base,
          items: replaceItem(state.items, String(action.toolCallId), (item) => (
            item.kind === 'tool'
              ? {
                  ...item,
                  status: 'result',
                  result: action.result,
                  ...(action.cancelled
                    ? { cancelled: true, parseError: undefined }
                    : action.error
                      ? { parseError: String(action.error) }
                      : {}),
                }
              : item
          )),
        },
        effects,
      };
    case '@local/error':
      return {
        state: {
          ...base,
          status: 'error',
          error: String(action.message ?? 'Agent 执行失败'),
        },
        effects,
      };
    default:
      return unknownEvent(state);
  }
}
