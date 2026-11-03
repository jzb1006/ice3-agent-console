import { demoEquipmentSelectionId } from './demo-asset.js';
import type { SceneToolName } from './contract.js';

export interface FactoryScenarioStep {
  readonly text: string;
  readonly tool: {
    readonly name: SceneToolName;
    readonly args: Readonly<Record<string, unknown>>;
  };
  readonly holdMs?: number;
}

export interface FactoryScenario {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly keywords: readonly string[];
  readonly steps: readonly FactoryScenarioStep[];
}

export interface FactoryQuickAction {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
}

export interface FactoryQuickActionGroup {
  readonly label: string;
  readonly actions: readonly FactoryQuickAction[];
}

const equipment = (tag: string): string => demoEquipmentSelectionId(tag);
const focus = (tag: string): FactoryScenarioStep['tool'] => ({
  name: 'focus_equipment',
  args: { selectionId: equipment(tag) },
});

const tour = (
  entries: readonly { text: string; tag: string }[],
): readonly FactoryScenarioStep[] => [
  ...entries.map((entry) => ({
    text: entry.text,
    tool: focus(entry.tag),
    holdMs: 1_250,
  })),
  {
    text: '本段导览结束，镜头返回整厂总览。',
    tool: { name: 'clear_scene_focus', args: {} },
    holdMs: 500,
  },
];

const FACTORY_SCENARIO_LIST: readonly FactoryScenario[] = Object.freeze([
  {
    id: 'body-shop',
    label: '车身焊装',
    prompt: '带我看车身焊装线',
    keywords: ['车身焊装', '焊装线', '焊装机器人', '点焊机器人', '车身车间'],
    steps: tour([
      { text: '先看车身上料工位，白车身从物流托盘进入主线。', tag: 'BODY-101' },
      { text: '车身沿输送机进入焊装机器人岛，多个工位协同完成结构连接。', tag: 'CONV-101' },
      { text: '点焊机器人按节拍完成关键焊点，位置和节拍由工艺程序控制。', tag: 'ROBOT-201' },
      { text: '焊装完成后，车身进入涂装前的交接区域。', tag: 'WELD-201' },
    ]),
  },
  {
    id: 'paint-shop',
    label: '涂装工艺',
    prompt: '带我看涂装工艺',
    keywords: ['涂装工艺', '喷涂', '喷涂舱', '烘干炉'],
    steps: tour([
      { text: '自动喷涂舱完成底漆、色漆和清漆的均匀喷涂。', tag: 'PAINT-301' },
      { text: '漆面烘干炉稳定控制温度和通过时间，保证涂层固化质量。', tag: 'OVEN-302' },
      { text: '涂装完成的车身离开洁净工艺区，进入总装车间。', tag: 'TRIM-401' },
    ]),
  },
  {
    id: 'final-assembly',
    label: '总装流程',
    prompt: '带我看整车总装流程',
    keywords: ['总装流程', '总装车间', '动力总成', '玻璃安装', '整车装配'],
    steps: tour([
      { text: '内饰装配工位先完成座舱、线束和内饰模块的安装。', tag: 'TRIM-401' },
      { text: '动力总成安装站把发动机、电驱或混动系统与车身合装。', tag: 'POWER-402' },
      { text: '玻璃与车门安装站完成外覆盖件和密封系统装配。', tag: 'GLASS-403' },
      { text: '整车离开总装线后进入质量中心做下线检查。', tag: 'QA-501' },
    ]),
  },
  {
    id: 'quality',
    label: '质量检测',
    prompt: '带我看整车质量检测',
    keywords: ['质量检测', '视觉检测', '终检', '下线测试', '质量中心'],
    steps: tour([
      { text: '视觉质量检测门扫描车身外观、间隙面差和关键装配点。', tag: 'QA-501' },
      { text: '整车下线测试台检查灯光、制动、转向和基础功能状态。', tag: 'EOL-601' },
      { text: '通过终检的车辆进入成品物流月台，等待发运。', tag: 'LOGI-701' },
    ]),
  },
]);

export const FACTORY_SCENARIOS: readonly FactoryScenario[] = FACTORY_SCENARIO_LIST;

export const FACTORY_QUICK_ACTION_GROUPS: readonly FactoryQuickActionGroup[] = Object.freeze([
  Object.freeze({
    label: '生产导览',
    actions: Object.freeze(FACTORY_SCENARIO_LIST.slice(0, 3).map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      prompt: scenario.prompt,
    }))),
  }),
  Object.freeze({
    label: '质量与物流',
    actions: Object.freeze(FACTORY_SCENARIO_LIST.slice(3).map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      prompt: scenario.prompt,
    }))),
  }),
  Object.freeze({
    label: '快速操作',
    actions: Object.freeze([
      { id: 'overview', label: '查看整厂', prompt: '带我看一下整个汽车制造工厂' },
      { id: 'clear', label: '清除聚焦', prompt: '清除当前聚焦并回到整厂总览' },
    ]),
  }),
]);

const normalize = (text: string): string => (
  text.toLocaleLowerCase('zh-CN').replaceAll(/\s+/gu, '')
);

export function matchFactoryScenario(text: string): FactoryScenario | undefined {
  const normalized = normalize(text);
  return FACTORY_SCENARIO_LIST.find((scenario) => (
    normalized.includes(normalize(scenario.prompt))
  )) ?? FACTORY_SCENARIO_LIST.find((scenario) => (
    scenario.keywords.some((keyword) => normalized.includes(normalize(keyword)))
  ));
}
