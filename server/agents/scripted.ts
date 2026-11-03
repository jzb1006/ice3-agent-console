import type { RunAgentInput } from '@ag-ui/core';
import { factoryScriptedPlan } from '../../src/protocol/factory-local-agent.js';
import type { TextStream } from './events.js';
import { emitAgentPlan } from './events.js';
import type { AgentRun } from './types.js';

export function scriptedPlan(input: RunAgentInput): readonly TextStream[] {
  return factoryScriptedPlan(input);
}

export function createScriptedAgent(
  options: { readonly delayMs?: number } = {},
): AgentRun {
  const delayMs = options.delayMs ?? 18;
  return {
    run(input, signal) {
      return emitAgentPlan({
        threadId: input.threadId,
        runId: input.runId,
        plan: scriptedPlan(input),
        delayMs,
        signal,
      });
    },
  };
}
