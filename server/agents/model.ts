import type { RunAgentInput } from '@ag-ui/core';
import { EventType } from '@ag-ui/core';
import { isSceneToolName } from '../../shared/contract.js';
import type { AgentEvent } from './events.js';
import type { ModelClient, ModelMessage } from './model-client.js';
import type { AgentRun } from './types.js';

const SYSTEM_PROMPT = [
  '你是工业三维现场的讲解助手。',
  '需要操作场景时必须调用已提供的场景工具。',
  '只讨论当前汽车制造工厂及其设备、产线、工艺连接和视图。',
  '不要编造设备位号；不确定时先调用 find_equipment。',
].join('\n');

function contextText(input: RunAgentInput): string {
  if (!input.context?.length) return '';
  return input.context
    .map((entry) => `${entry.description}: ${entry.value}`)
    .join('\n');
}

function buildMessages(input: RunAgentInput): readonly ModelMessage[] {
  const context = contextText(input);
  return [
    {
      role: 'system',
      content: context ? `${SYSTEM_PROMPT}\n\n当前场景：\n${context}` : SYSTEM_PROMPT,
    },
    ...input.messages.flatMap((message): ModelMessage[] => {
      if (message.role !== 'user' && message.role !== 'assistant') return [];
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
      return [{ role: message.role, content }];
    }),
  ];
}

export function createModelAgent(
  client: Pick<ModelClient, 'complete'>,
): AgentRun {
  return {
    async *run(input, signal): AsyncIterable<AgentEvent> {
      let ordinal = 0;
      const id = (prefix: string): string => (
        `${prefix}_${input.runId}_${(ordinal++).toString(36)}`
      );
      yield {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      let response;
      try {
        response = await client.complete(buildMessages(input), signal);
      } catch (error) {
        if (!signal?.aborted) {
          yield {
            type: EventType.RUN_ERROR,
            message: (error as Error).message || '模型执行失败',
          };
        }
        return;
      }

      if (response.text) {
        const messageId = id('message');
        yield {
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: 'assistant',
        };
        for (const delta of response.text.match(/.{1,12}/gu) ?? []) {
          yield {
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta,
          };
        }
        yield { type: EventType.TEXT_MESSAGE_END, messageId };
      }

      for (const call of response.toolCalls ?? []) {
        if (!isSceneToolName(call.name)) {
          yield {
            type: EventType.RUN_ERROR,
            message: `不支持的场景工具：${call.name}`,
          };
          return;
        }
        try {
          const parsed = JSON.parse(call.arguments);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('工具参数必须是对象');
          }
        } catch (error) {
          yield {
            type: EventType.RUN_ERROR,
            message: `无效的场景工具参数：${(error as Error).message}`,
          };
          return;
        }
        const toolCallId = id('tool');
        yield {
          type: EventType.TOOL_CALL_START,
          toolCallId,
          toolCallName: call.name,
        };
        yield {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId,
          delta: call.arguments,
        };
        yield { type: EventType.TOOL_CALL_END, toolCallId };
      }

      yield {
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
      };
    },
  };
}
