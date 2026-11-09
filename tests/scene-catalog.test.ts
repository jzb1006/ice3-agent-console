import { expect } from '#test-expect';
import { test } from 'node:test';
import { createEquipmentCatalog } from '../src/scene/catalog.js';
import { selectionIdsWithRelated } from '../src/scene/relations.js';

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

test('adds connected equipment to the visual selection without changing the primary ID', () => {
  const records = [
    {
      selectionId: 'equipment/body',
      name: '车身上料工位',
      metadata: {
        equipmentTag: 'BODY-101',
        connections: ['CONV-101'],
      },
      bounds: { min: [0, 0, 0] as const, max: [1, 1, 1] as const },
    },
    {
      selectionId: 'equipment/conveyor',
      name: '主线输送机',
      metadata: { equipmentTag: 'CONV-101', connections: [] },
      bounds: { min: [1, 0, 0] as const, max: [2, 1, 1] as const },
    },
  ];

  expect(selectionIdsWithRelated(['equipment/body'], records)).toEqual([
    'equipment/body',
    'equipment/conveyor',
  ]);
});
