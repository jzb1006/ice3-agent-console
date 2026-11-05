import { expect } from '#test-expect';
import { test } from 'node:test';
import { toRunAgentInput } from '../src/protocol/run-input.js';

test('maps defaults and omits an empty resume array', () => {
  expect(toRunAgentInput({
    threadId: 'thread-1',
    runId: 'run-1',
    messages: [{ id: 'user-1', role: 'user', content: '你好' }],
    resume: [],
  })).toEqual({
    threadId: 'thread-1',
    runId: 'run-1',
    state: {},
    messages: [{ id: 'user-1', role: 'user', content: '你好' }],
    context: [],
    tools: [],
    forwardedProps: {},
  });
});

test('preserves non-empty resume entries and scene context', () => {
  const result = toRunAgentInput({
    threadId: 'thread-1',
    runId: 'run-2',
    messages: [],
    context: [{ description: 'selected', value: 'ROBOT-201' }],
    resume: [{ interruptId: 'interrupt-1', status: 'resolved' }],
  });
  expect(result.context).toEqual([{ description: 'selected', value: 'ROBOT-201' }]);
  expect(result.resume).toEqual([
    { interruptId: 'interrupt-1', status: 'resolved' },
  ]);
});
