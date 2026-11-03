import { expect } from '#test-expect';
import { test } from 'node:test';
import { ICEScene } from 'ice3';
import { FACTORY_EQUIPMENT } from '../shared/factory.ts';
import { addBodyLoadingStation } from '../src/scene/factory-browser.ts';

test('BODY-101 visual parts preserve the equipment selection identity', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const body = FACTORY_EQUIPMENT.find((item) => item.tag === 'BODY-101');
  if (!body) throw new Error('BODY-101 fixture is missing');

  addBodyLoadingStation(scene, body);

  expect(scene.children.length).toBeGreaterThan(1);
  expect(scene.children.every((child) => (
    child.selectionId === body.selectionId
  ))).toBe(true);
});
