import { expect } from '#test-expect';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';
import { EquipmentBrowser } from '../src/view/equipment-browser.js';
import { createEquipmentCatalog, type EquipmentCatalogEntry } from '../src/scene/catalog.js';

const entries: readonly EquipmentCatalogEntry[] = [
  {
    selectionId: 'equipment/robot',
    name: '点焊机器人',
    tag: 'ROBOT-201',
    stage: '车身焊装',
    area: '车身车间',
    connectionCount: 1,
    searchText: 'robot-201 点焊机器人 车身焊装 车身车间',
  },
  {
    selectionId: 'equipment/paint',
    name: '自动喷涂舱',
    tag: 'PAINT-301',
    stage: '涂装',
    area: '涂装车间',
    connectionCount: 1,
    searchText: 'paint-301 自动喷涂舱 涂装 涂装车间',
  },
];

const catalog = createEquipmentCatalog(entries.map((entry) => ({
  selectionId: entry.selectionId,
  name: entry.name,
  metadata: {
    equipmentTag: entry.tag,
    processStage: entry.stage,
    area: entry.area,
  },
})));

test('filters the equipment directory by text, area, and stage', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  const browser = new EquipmentBrowser(host as unknown as HTMLElement, catalog, {
    onSelect: () => {},
  });
  const results = browser.element.querySelector('[data-role="equipment-results"]')!;
  const query = browser.element.querySelector<HTMLInputElement>(
    '[data-role="equipment-search"]',
  )!;

  expect(results.querySelectorAll('button')).toHaveLength(2);
  query.value = 'ROBOT-201';
  query.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  expect(results.querySelectorAll('button')).toHaveLength(1);
  expect(results.textContent).toContain('点焊机器人');

  query.value = '';
  const area = browser.element.querySelector<HTMLSelectElement>(
    '[data-role="equipment-filter-area"]',
  )!;
  area.value = '涂装车间';
  area.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  expect(results.querySelectorAll('button')).toHaveLength(1);
  expect(results.textContent).toContain('自动喷涂舱');

  area.value = '';
  const stage = browser.element.querySelector<HTMLSelectElement>(
    '[data-role="equipment-filter-stage"]',
  )!;
  stage.value = '车身焊装';
  stage.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  expect(results.querySelectorAll('button')).toHaveLength(1);
  expect(results.textContent).toContain('点焊机器人');
});

test('emits the selected equipment entry from a result row', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  let selected: EquipmentCatalogEntry | undefined;
  const browser = new EquipmentBrowser(host as unknown as HTMLElement, catalog, {
    onSelect: (entry) => {
      selected = entry;
    },
  });
  const result = browser.element.querySelector<HTMLButtonElement>(
    '[data-selection-id="equipment/paint"]',
  )!;

  result.click();

  expect(selected?.selectionId).toBe('equipment/paint');
});

test('reports rejected selection handlers without an unhandled rejection', async () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  let reported: unknown;
  const browser = new EquipmentBrowser(host as unknown as HTMLElement, catalog, {
    onSelect: async () => {
      throw new Error('定位失败');
    },
    onError: (error) => {
      reported = error;
    },
  });
  browser.element.querySelector<HTMLButtonElement>(
    '[data-selection-id="equipment/paint"]',
  )!.click();
  await new Promise((resolve) => setImmediate(resolve));
  expect((reported as Error).message).toBe('定位失败');
});
