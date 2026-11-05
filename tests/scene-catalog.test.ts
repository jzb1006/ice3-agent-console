import { expect } from '#test-expect';
import { test } from 'node:test';
import { createEquipmentCatalog } from '../src/scene/catalog.js';

const catalog = createEquipmentCatalog([
  {
    selectionId: 'ice3-virtual-auto-plant/equipment/ROBOT-201',
    name: '点焊机器人',
    metadata: {
      equipmentTag: 'ROBOT-201',
      processStage: 'body-shop',
      area: 'BodyShop',
    },
  },
  {
    selectionId: 'ice3-virtual-auto-plant/equipment/PAINT-301',
    name: '自动喷涂舱',
    metadata: {
      equipmentTag: 'PAINT-301',
      processStage: 'paint-shop',
      area: 'PaintShop',
    },
  },
]);

test('finds equipment by tag, Chinese name, stage, and area', () => {
  expect(catalog.find({ query: 'ROBOT-201' })[0]?.name).toBe('点焊机器人');
  expect(catalog.find({ query: '喷涂舱' })[0]?.selectionId)
    .toContain('PAINT-301');
  expect(catalog.find({ stage: 'body-shop' })[0]?.tag).toBe('ROBOT-201');
  expect(catalog.find({ area: 'PaintShop' })[0]?.tag)
    .toBe('PAINT-301');
});

test('ranks exact tags ahead of partial text matches', () => {
  expect(catalog.find({ query: 'ROBOT-201' })[0]?.tag).toBe('ROBOT-201');
  expect(catalog.find({ query: '不存在' })).toEqual([]);
});
