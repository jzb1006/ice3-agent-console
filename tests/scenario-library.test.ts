import { expect } from '#test-expect';
import { test } from 'node:test';
import { SCENE_TOOLS } from '../shared/contract.js';
import { DEMO_ASSET_ID } from '../shared/demo-asset.js';
import { FACTORY_EQUIPMENT } from '../shared/factory.js';
import {
  FACTORY_QUICK_ACTION_GROUPS,
  FACTORY_SCENARIOS,
  matchFactoryScenario,
} from '../shared/factory-scenarios.js';

test('publishes the confirmed quick-action groups and script order', () => {
  expect(FACTORY_QUICK_ACTION_GROUPS.map((group) => group.label)).toEqual([
    '生产导览',
    '质量与物流',
    '快速操作',
  ]);
  expect(FACTORY_QUICK_ACTION_GROUPS.flatMap((group) => (
    group.actions.map((action) => action.label)
  ))).toEqual([
    '车身焊装',
    '涂装工艺',
    '总装流程',
    '质量检测',
    '查看整厂',
    '清除聚焦',
  ]);
});

test('every static scenario uses approved tools and focuses equipment', () => {
  expect(FACTORY_SCENARIOS).toHaveLength(4);
  for (const scenario of FACTORY_SCENARIOS) {
    expect(scenario.steps.length).toBeGreaterThan(0);
    expect(scenario.steps.some((step) => (
      step.tool.name === 'focus_equipment'
    ))).toBe(true);
    for (const step of scenario.steps) {
      expect(SCENE_TOOLS).toContain(step.tool.name);
      expect(step.text.length).toBeGreaterThan(0);
    }
  }
});

test('every static scenario ends by clearing focus and returning to overview', () => {
  for (const scenario of FACTORY_SCENARIOS) {
    expect(scenario.steps.at(-1)?.tool).toEqual({
      name: 'clear_scene_focus',
      args: {},
    });
    expect(scenario.steps.at(-1)?.text).toContain('整厂');
  }
});

test('every built-in scene action targets equipment in the automotive factory', () => {
  const knownIds = new Set(FACTORY_EQUIPMENT.map((item) => item.selectionId));
  const prefix = `${DEMO_ASSET_ID}/equipment/`;
  const focusTargets = FACTORY_SCENARIOS.flatMap((scenario) => (
    scenario.steps
      .filter((step) => step.tool.name === 'focus_equipment')
      .map((step) => String(step.tool.args.selectionId))
  ));

  expect(focusTargets.length).toBeGreaterThan(0);
  for (const selectionId of focusTargets) {
    expect(selectionId.startsWith(prefix)).toBe(true);
    expect(knownIds.has(selectionId)).toBe(true);
  }
});

test('matches the intended scenario without crossing topics', () => {
  expect(matchFactoryScenario('带我看看焊装机器人')?.id).toBe('body-shop');
  expect(matchFactoryScenario('查看涂装工艺')?.id).toBe('paint-shop');
  expect(matchFactoryScenario('分析总装流程')?.id).toBe('final-assembly');
  expect(matchFactoryScenario('说明质量检测')?.id).toBe('quality');
  expect(matchFactoryScenario('这个设备怎么运行')).toBeUndefined();
});
