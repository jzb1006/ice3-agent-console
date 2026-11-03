import type { RunAgentInput } from '@ag-ui/core';
import { demoEquipmentSelectionId } from '../../shared/demo-asset.js';
import { matchFactoryScenario, type FactoryScenarioStep } from '../../shared/factory-scenarios.js';
import type { TextStream } from '../../server/agents/events.js';
import { emitAgentPlan } from '../../server/agents/events.js';
import type { AgentRun } from '../../server/agents/types.js';

const OPENING_TOUR: readonly TextStream[] = [
  { text: '先从整厂总览建立空间方位：左侧是车身焊装，中段是涂装与总装，右侧是质量检测和成品物流。', tool: { name: 'set_camera_view', args: { view: 'overview' } }, holdMs: 1_300 },
  { text: '车身从上料工位进入主输送线，随后进入焊装机器人岛。', tool: { name: 'focus_equipment', args: { selectionId: demoEquipmentSelectionId('BODY-101') } }, holdMs: 1_300 },
  { text: '点焊机器人按工艺节拍完成白车身结构连接。', tool: { name: 'focus_equipment', args: { selectionId: demoEquipmentSelectionId('ROBOT-201') } }, holdMs: 1_300 },
  { text: '喷涂舱和烘干炉完成车身表面工艺，之后车辆进入总装。', tool: { name: 'focus_equipment', args: { selectionId: demoEquipmentSelectionId('PAINT-301') } }, holdMs: 1_300 },
  { text: '总装线完成内饰、动力总成、玻璃和车门安装。', tool: { name: 'focus_equipment', args: { selectionId: demoEquipmentSelectionId('TRIM-401') } }, holdMs: 1_300 },
  { text: '视觉检测与下线测试确认车辆满足交付要求。', tool: { name: 'focus_equipment', args: { selectionId: demoEquipmentSelectionId('QA-501') } }, holdMs: 1_300 },
  { text: '通过终检的车辆进入成品物流月台，导览结束。', tool: { name: 'clear_scene_focus', args: {} }, holdMs: 600 },
];

function messageText(input: RunAgentInput): string {
  const content = input.messages.at(-1)?.content;
  return typeof content === 'string' ? content : JSON.stringify(content ?? '');
}

function selectedEquipment(input: RunAgentInput): string | undefined {
  const value = input.context?.find((entry) => entry.description === 'selected equipment')?.value;
  return typeof value === 'string' ? value : undefined;
}

function presentationMode(input: RunAgentInput): string | undefined {
  const value = input.context?.find((entry) => entry.description === 'presentation mode')?.value;
  return typeof value === 'string' ? value : undefined;
}

function includesAny(text: string, words: readonly string[]): boolean {
  return words.some((word) => text.includes(word));
}

function toTextStream(steps: readonly FactoryScenarioStep[]): readonly TextStream[] {
  return steps.map((step) => ({ text: step.text, tool: step.tool, holdMs: step.holdMs }));
}

export function factoryScriptedPlan(input: RunAgentInput): readonly TextStream[] {
  const text = messageText(input);
  const selected = selectedEquipment(input);
  if (presentationMode(input) === 'guided-tour' && includesAny(text, ['整个汽车', '汽车制造工厂', '整厂'])) return OPENING_TOUR;
  if (includesAny(text, ['清除', '复位', '回到整厂', '回到全厂', '回到总览'])) return [{ text: '好的，已清除设备聚焦并回到整厂总览。', tool: { name: 'clear_scene_focus', args: {} } }];
  if (includesAny(text, ['这个设备', '这台设备', '当前设备'])) {
    if (!selected) return [{ text: '请先在三维场景中选择一台设备。' }];
    return [
      { text: '正在定位当前设备。', tool: { name: 'focus_equipment', args: { selectionId: selected } } },
      { text: '设备已高亮，右侧信息卡可以查看工艺段和上下游连接。', tool: { name: 'highlight_equipment', args: { selectionIds: [selected] } } },
    ];
  }
  const scenario = matchFactoryScenario(text);
  if (scenario) return toTextStream(scenario.steps);
  if (includesAny(text, ['整厂', '全景', '汽车制造', '总览'])) return [{ text: '正在切换到汽车制造工厂总览。', tool: { name: 'set_camera_view', args: { view: 'overview' } } }];
  return [{ text: '你可以查看车身焊装、涂装、总装或质量检测，也可以先选择一台设备再让我讲解。' }];
}

export function createFactoryScriptedAgent(options: { readonly delayMs?: number } = {}): AgentRun {
  return {
    run(input, signal) {
      return emitAgentPlan({
        threadId: input.threadId,
        runId: input.runId,
        plan: factoryScriptedPlan(input),
        delayMs: options.delayMs ?? 16,
        signal,
      });
    },
  };
}
