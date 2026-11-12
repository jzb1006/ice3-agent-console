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

export interface FactoryVisitStop {
  readonly tag: string;
  readonly guide: string;
}

export const FACTORY_VISIT_STOPS: readonly FactoryVisitStop[] = Object.freeze([
  { tag: 'PRESS-101', guide: '观察冲压机的上模与送料区，了解板材如何被成形为车身结构件。' },
  { tag: 'BODY-101', guide: '从这里开始参观白车身上料，托盘将冲压件交给主线。' },
  { tag: 'CONV-101', guide: '沿着输送方向观察车身如何在不同工位之间流转。' },
  { tag: 'WELD-201', guide: '焊装机器人岛负责多点协同，把车身骨架连接成稳定结构。' },
  { tag: 'ROBOT-201', guide: '这个独立点焊机器人展示单工位的焊接节拍和安全工作范围。' },
  { tag: 'FRAME-202', guide: '在骨架合装站观察车身定位、夹紧和结构合装过程。' },
  { tag: 'PREP-301', guide: '前处理槽先清洁并活化车身表面，为后续涂层附着做准备。' },
  { tag: 'PAINT-301', guide: '喷涂舱通过多道喷涂工艺形成均匀的车身表面颜色和保护层。' },
  { tag: 'SEAL-304', guide: '密封胶站处理焊缝和接缝，提升防水、隔音与耐久性。' },
  { tag: 'OVEN-302', guide: '烘干炉通过温度和通过时间控制涂层固化质量。' },
  { tag: 'TRIM-401', guide: '总装从座舱、线束和内饰模块开始，把车身变成可使用的整车。' },
  { tag: 'CHASSIS-404', guide: '底盘与车轮装配站完成悬架、制动和车轮安装。' },
  { tag: 'POWER-402', guide: '动力总成安装站把发动机、电驱或混动系统与车身合装。' },
  { tag: 'GLASS-403', guide: '玻璃与车门安装站完成外覆盖件、玻璃和密封系统装配。' },
  { tag: 'QA-501', guide: '视觉质量检测门扫描外观、间隙面差和关键装配点。' },
  { tag: 'CAL-502', guide: '整车标定站校准摄像头、雷达、底盘和控制器参数。' },
  { tag: 'EOL-601', guide: '下线测试台检查灯光、制动、转向和基础功能状态。' },
  { tag: 'ROAD-602', guide: '动态路试道验证车辆行驶、制动和转向表现。' },
  { tag: 'LOGI-701', guide: '成品物流月台是参观终点，合格车辆将在这里等待发运。' },
]);

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
      { text: '车身冲压机先完成板材成形，冲压件进入上料工位。', tag: 'PRESS-101' },
      { text: '先看车身上料工位，白车身从物流托盘进入主线。', tag: 'BODY-101' },
      { text: '车身沿输送机进入焊装机器人岛，多个工位协同完成结构连接。', tag: 'CONV-101' },
      { text: '点焊机器人按节拍完成关键焊点，位置和节拍由工艺程序控制。', tag: 'ROBOT-201' },
      { text: '骨架合装站完成车身结构合装，焊装完成后进入涂装前交接。', tag: 'FRAME-202' },
    ]),
  },
  {
    id: 'paint-shop',
    label: '涂装工艺',
    prompt: '带我看涂装工艺',
    keywords: ['涂装工艺', '喷涂', '喷涂舱', '烘干炉'],
    steps: tour([
      { text: '涂装前处理槽清洁并活化车身表面，为涂层附着做准备。', tag: 'PREP-301' },
      { text: '自动喷涂舱完成底漆、色漆和清漆的均匀喷涂。', tag: 'PAINT-301' },
      { text: '车身密封胶站处理焊缝和接缝，提升防水和隔音性能。', tag: 'SEAL-304' },
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
      { text: '底盘与车轮装配站完成悬架、制动和车轮安装。', tag: 'CHASSIS-404' },
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
      { text: '整车标定站写入控制器参数，并校准摄像头、雷达和底盘系统。', tag: 'CAL-502' },
      { text: '整车下线测试台检查灯光、制动、转向和基础功能状态。', tag: 'EOL-601' },
      { text: '动态路试道验证车辆行驶、制动和转向表现，合格后进入发运。', tag: 'ROAD-602' },
      { text: '通过终检的车辆进入成品物流月台，等待发运。', tag: 'LOGI-701' },
    ]),
  },
]);

export const FACTORY_SCENARIOS: readonly FactoryScenario[] = FACTORY_SCENARIO_LIST;

export const FACTORY_QUICK_ACTION_GROUPS: readonly FactoryQuickActionGroup[] = Object.freeze([
  Object.freeze({
    label: '任务参观',
    actions: Object.freeze([
      { id: 'factory-visit', label: '厂房参观', prompt: '开始厂房参观任务' },
      { id: 'exit-factory-visit', label: '退出参观', prompt: '退出厂房参观任务' },
    ]),
  }),
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
      { id: 'production-run', label: '整车生产流', prompt: '播放从材料到整车出厂的生产流' },
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
