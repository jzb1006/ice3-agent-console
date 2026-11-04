import { expect } from '#test-expect';
import { test } from 'node:test';
import { ICEScene } from 'ice3';
import { FACTORY_EQUIPMENT } from '../shared/factory.ts';
import {
  addBodyLoadingStation,
  addMainConveyorStation,
  boundsForEquipment,
  createBodyStationMotion,
  createConveyorStationMotion,
} from '../src/scene/factory-browser.ts';

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

test('BODY-101 loading motion lifts the gantry and restores its static pose', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const body = FACTORY_EQUIPMENT.find((item) => item.tag === 'BODY-101');
  if (!body) throw new Error('BODY-101 fixture is missing');

  const visual = addBodyLoadingStation(scene, body);
  const gantry = visual.parts.get('gantry-beam');
  if (!gantry) throw new Error('BODY-101 gantry fixture is missing');

  const motion = createBodyStationMotion(visual);
  motion.update(0.25);
  expect(gantry.toJSON().matrix).toBeDefined();
  motion.reset();
  expect(gantry.toJSON().matrix).toBeUndefined();
});

test('CONV-101 visual parts preserve the equipment selection identity', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const conveyor = FACTORY_EQUIPMENT.find((item) => item.tag === 'CONV-101');
  if (!conveyor) throw new Error('CONV-101 fixture is missing');

  addMainConveyorStation(scene, conveyor);

  expect(scene.children.length).toBeGreaterThan(10);
  expect(scene.children.every((child) => (
    child.selectionId === conveyor.selectionId
  ))).toBe(true);
  expect(boundsForEquipment(conveyor)).toEqual({
    min: [-16.8, -1, -2.35],
    max: [-11.2, 1.8, 2.35],
  });
});

test('CONV-101 conveyor motion rotates rollers and restores their static pose', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const conveyor = FACTORY_EQUIPMENT.find((item) => item.tag === 'CONV-101');
  if (!conveyor) throw new Error('CONV-101 fixture is missing');

  const visual = addMainConveyorStation(scene, conveyor);
  const roller = visual.parts.get('roller-0');
  if (!roller) throw new Error('CONV-101 roller fixture is missing');

  const motion = createConveyorStationMotion(visual);
  motion.update(0.125);
  expect(roller.toJSON().matrix).toBeDefined();
  motion.reset();
  expect(roller.toJSON().matrix).toBeUndefined();
});
