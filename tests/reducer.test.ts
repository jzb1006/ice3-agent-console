import { EventType } from '@ag-ui/core';
import { expect } from '#test-expect';
import { test } from 'node:test';
import { initialState, reduceThread } from '../src/protocol/reducer.js';

test('streams text and executes a complete scene tool call', () => {
  let result = reduceThread(initialState('thread-1'), {
    type: EventType.RUN_STARTED,
    threadId: 'thread-1',
    runId: 'run-1',
  });
  result = reduceThread(result.state, {
    type: EventType.TEXT_MESSAGE_START,
    messageId: 'message-1',
    role: 'assistant',
  });
  result = reduceThread(result.state, {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId: 'message-1',
    delta: '正在定位',
  });
  result = reduceThread(result.state, {
    type: EventType.TOOL_CALL_START,
    toolCallId: 'call-1',
    toolCallName: 'focus_equipment',
  });
  result = reduceThread(result.state, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: 'call-1',
    delta: '{"selectionId":"ROBOT-201"}',
  });
  result = reduceThread(result.state, {
    type: EventType.TOOL_CALL_END,
    toolCallId: 'call-1',
  });

  expect(result.state.status).toBe('running');
  expect(result.state.items[0]).toMatchObject({
    kind: 'text',
    text: '正在定位',
  });
  expect(result.effects).toEqual([{
    type: 'execute-tool',
    toolCallId: 'call-1',
    name: 'focus_equipment',
    args: { selectionId: 'ROBOT-201' },
  }]);
});

test('shows malformed tool arguments without executing them', () => {
  let state = initialState('thread-1');
  state = reduceThread(state, {
    type: EventType.TOOL_CALL_START,
    toolCallId: 'call-1',
    toolCallName: 'focus_equipment',
  }).state;
  state = reduceThread(state, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: 'call-1',
    delta: '{broken',
  }).state;
  const result = reduceThread(state, {
    type: EventType.TOOL_CALL_END,
    toolCallId: 'call-1',
  });
  expect(result.effects).toEqual([]);
  expect(result.state.items[0]).toMatchObject({
    kind: 'tool',
    parseError: expect.stringContaining('JSON'),
  });
});

test('ignores unknown protocol events', () => {
  const state = initialState('thread-1');
  expect(reduceThread(state, { type: 'FUTURE_EVENT' })).toEqual({
    state,
    effects: [],
  });
});
