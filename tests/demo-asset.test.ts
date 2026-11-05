import { expect } from '#test-expect';
import { test } from 'node:test';
import {
  DEMO_ASSET,
  DEMO_ASSET_ID,
  demoEquipmentSelectionId,
} from '../shared/demo-asset.js';

test('defines the synthetic automotive demo identity once', () => {
  expect(DEMO_ASSET).toEqual({
    id: 'ice3-virtual-auto-plant',
    label: '虚拟汽车制造工厂',
  });
  expect(DEMO_ASSET_ID).toBe('ice3-virtual-auto-plant');
  expect(demoEquipmentSelectionId('ROBOT-201'))
    .toBe('ice3-virtual-auto-plant/equipment/ROBOT-201');
});
