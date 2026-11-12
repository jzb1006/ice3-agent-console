import type { RunAgentInput } from '@ag-ui/core';
import { EventType } from '@ag-ui/core';
import { expect } from '#test-expect';
import { test } from 'node:test';
import { createScriptedAgent } from '../server/agents/scripted.js';

const input = (text: string): RunAgentInput => ({
  threadId: 'thread-1',
  runId: 'run-1',
  state: {},
  messages: [{ id: 'user-1', role: 'user', content: text }],
  context: [],
  tools: [],
  forwardedProps: {},
});

test('returns a deterministic overview tool sequence', async () => {
  const events = [];
  for await (const event of createScriptedAgent({ delayMs: 0 }).run(
    input('带我看一下整个汽车制造工厂'),
  )) {
    events.push(event);
  }
  expect(events[0]?.type).toBe(EventType.RUN_STARTED);
  expect(events.some((event) => (
    event.type === EventType.TOOL_CALL_START
    && event.toolCallName === 'set_camera_view'
  ))).toBe(true);
  expect(events.at(-1)?.type).toBe(EventType.RUN_FINISHED);
});

test('starts the complete production flow from a natural-language request', async () => {
  const events = [];
  for await (const event of createScriptedAgent({ delayMs: 0 }).run(
    input('播放从材料到整车出厂的生产流'),
  )) {
    events.push(event);
  }

  expect(events.some((event) => (
    event.type === EventType.TOOL_CALL_START
    && event.toolCallName === 'play_production'
  ))).toBe(true);
});

test('starts a manual factory visit without auto-advancing nodes', async () => {
  const events = [];
  for await (const event of createScriptedAgent({ delayMs: 0 }).run(
    input('开始厂房参观任务'),
  )) {
    events.push(event);
  }

  expect(events.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT
    && String(event.delta).includes('自由走动'))).toBe(true);
  expect(events.some((event) => event.type === EventType.TOOL_CALL_START)).toBe(false);
});

test('plays a multi-stop guided tour for opening autoplay', async () => {
  const request = input('带我看一下整个汽车制造工厂');
  request.context = [{
    description: 'presentation mode',
    value: 'guided-tour',
  }];
  const toolCalls: { name: string; args: unknown }[] = [];
  let activeName: string | undefined;
  for await (const event of createScriptedAgent({ delayMs: 0 }).run(request)) {
    if (event.type === EventType.TOOL_CALL_START) {
      activeName = String(event.toolCallName);
    } else if (event.type === EventType.TOOL_CALL_ARGS) {
      toolCalls.push({
        name: activeName!,
        args: JSON.parse(String(event.delta)),
      });
    }
  }

  expect(toolCalls).toEqual([
    { name: 'set_camera_view', args: { view: 'overview' } },
    {
      name: 'focus_equipment',
      args: { selectionId: 'ice3-virtual-auto-plant/equipment/BODY-101' },
    },
    {
      name: 'focus_equipment',
      args: { selectionId: 'ice3-virtual-auto-plant/equipment/ROBOT-201' },
    },
    {
      name: 'focus_equipment',
      args: { selectionId: 'ice3-virtual-auto-plant/equipment/PAINT-301' },
    },
    {
      name: 'focus_equipment',
      args: { selectionId: 'ice3-virtual-auto-plant/equipment/TRIM-401' },
    },
    {
      name: 'focus_equipment',
      args: { selectionId: 'ice3-virtual-auto-plant/equipment/QA-501' },
    },
    { name: 'clear_scene_focus', args: {} },
  ]);
});

test('uses current equipment context for a follow-up explanation', async () => {
  const request = input('讲讲这个设备');
  request.context = [{
    description: 'selected equipment',
    value: 'ice3-virtual-auto-plant/equipment/ROBOT-201',
  }];
  const names: string[] = [];
  for await (const event of createScriptedAgent({ delayMs: 0 }).run(request)) {
    if (event.type === EventType.TOOL_CALL_START) {
      names.push(String(event.toolCallName));
    }
  }
  expect(names).toContain('focus_equipment');
  expect(names).toContain('highlight_equipment');
});

test('locates known equipment groups and clears focus', async () => {
  const toolNames = async (text: string): Promise<string[]> => {
    const names: string[] = [];
    for await (const event of createScriptedAgent({ delayMs: 0 }).run(input(text))) {
      if (event.type === EventType.TOOL_CALL_START) {
        names.push(String(event.toolCallName));
      }
    }
    return names;
  };
  expect(await toolNames('焊装机器人在哪里')).toContain('focus_equipment');
  expect(await toolNames('介绍一下涂装工艺')).toContain('focus_equipment');
  expect(await toolNames('回到全厂')).toContain('clear_scene_focus');
});
