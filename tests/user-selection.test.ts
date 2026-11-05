import { expect } from '#test-expect';
import { test } from 'node:test';
import { applyUserSelection } from '../src/scene/user-selection.js';

const selectable = new Set([
  'ice3-virtual-auto-plant/equipment/ROBOT-201',
  'ice3-virtual-auto-plant/equipment/PAINT-301',
]);

test('applies a known equipment selection once without scheduling a blink', () => {
  const writes: (readonly string[])[] = [];

  const selected = applyUserSelection(
    ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
    selectable,
    (ids) => writes.push(ids),
  );

  expect(selected).toEqual(['ice3-virtual-auto-plant/equipment/ROBOT-201']);
  expect(writes).toEqual([
    ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
  ]);
});

test('rejects a plant-wide untagged node from the user selection', () => {
  const writes: (readonly string[])[] = [];

  const selected = applyUserSelection(
    ['node-000095'],
    selectable,
    (ids) => writes.push(ids),
  );

  expect(selected).toEqual([]);
  expect(writes).toEqual([[]]);
});
