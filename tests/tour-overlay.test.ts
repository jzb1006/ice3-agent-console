import { expect } from '#test-expect';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';
import { TourOverlay } from '../src/view/tour-overlay.js';

test('renders the active production tour with stage progress', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  const overlay = new TourOverlay(host as unknown as HTMLElement);

  overlay.update({
    title: '整车生产流',
    stageIndex: 3,
    stageCount: 5,
    equipmentName: '车身焊装机器人岛',
    processStage: '车身焊装',
    controls: [
      { label: '移动', value: 'W A S D' },
      { label: '查看', value: '点击节点' },
    ],
    detail: '当前工位正在完成结构连接。',
  });

  expect(overlay.element.hidden).toBe(false);
  expect(overlay.element.dataset.state).toBe('active');
  expect(overlay.element.querySelector('[data-role="tour-title"]')?.textContent)
    .toBe('整车生产流');
  expect(overlay.element.querySelector('[data-role="tour-step"]')?.textContent)
    .toBe('03 / 05');
  expect(overlay.element.querySelector('[data-role="tour-equipment"]')?.textContent)
    .toBe('车身焊装机器人岛');
  expect(overlay.element.querySelectorAll('[data-role="tour-marker"]')).toHaveLength(5);
  expect(overlay.element.querySelectorAll('[data-role="tour-controls"] .tour-hud__control'))
    .toHaveLength(2);
  expect(overlay.element.querySelectorAll('[data-role="tour-marker"][data-state="complete"]'))
    .toHaveLength(2);
  expect(overlay.element.querySelector('[data-role="tour-detail"]')?.textContent)
    .toBe('当前工位正在完成结构连接。');
});

test('shows a preparation and completion state, and can be hidden', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  const overlay = new TourOverlay(host as unknown as HTMLElement);

  overlay.update({
    title: '整车生产流',
    stageIndex: 0,
    stageCount: 5,
    detail: '准备沿生产线播放车辆工艺路径。',
  });
  expect(overlay.element.dataset.state).toBe('preparing');
  expect(overlay.element.querySelector('[data-role="tour-equipment"]')?.textContent)
    .toBe('准备开始');
  expect((overlay.element.querySelector('[data-role="tour-controls"]') as HTMLElement).hidden)
    .toBe(true);

  overlay.update({
    title: '整车生产流',
    stageIndex: 5,
    stageCount: 5,
    completed: true,
    detail: '生产流已完成，车辆进入成品物流月台。',
  });
  expect(overlay.element.dataset.state).toBe('complete');
  expect(overlay.element.querySelector('[data-role="tour-equipment"]')?.textContent)
    .toBe('导览完成');
  expect(overlay.element.querySelectorAll('[data-role="tour-marker"][data-state="complete"]'))
    .toHaveLength(5);

  overlay.hide();
  expect(overlay.element.hidden).toBe(true);
});
