import { expect } from '#test-expect';
import { test } from 'node:test';
import {
  DEMO_ASSET,
  DEMO_ASSET_ID,
  TILESET_ASSET,
  demoEquipmentSelectionId,
} from '../shared/demo-asset.js';

test('defines the synthetic automotive demo identity once', () => {
  expect(DEMO_ASSET).toEqual({
    id: 'ice3-virtual-auto-plant',
    label: '虚拟汽车制造工厂',
    rootPath: 'assets/automotive-plant',
    manifestPath: 'equipment.json',
    tilesetPath: 'tiled/tileset.json',
  });
  expect(DEMO_ASSET_ID).toBe('ice3-virtual-auto-plant');
  expect(demoEquipmentSelectionId('AE-101'))
    .toBe('ice3-virtual-auto-plant/equipment/AE-101');
});

test('keeps the prepared Tileset asset identity separate from the procedural demo', () => {
  expect(TILESET_ASSET).toEqual({
    id: 'ice3-virtual-wwtp',
    label: '虚拟污水处理厂',
    rootPath: 'assets/wastewater-plant',
    manifestPath: 'equipment.json',
    tilesetPath: 'tiled/tileset.json',
  });
});
