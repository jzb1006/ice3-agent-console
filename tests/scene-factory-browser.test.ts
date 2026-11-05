import { expect } from '#test-expect';
import { test } from 'node:test';
import { ICEScene } from 'ice3';
import { FACTORY_EQUIPMENT } from '../shared/factory.ts';
import {
  addBodyLoadingStation,
  addMainConveyorStation,
  addPaintBoothStation,
  addWeldingRobotStation,
  boundsForEquipment,
  createBodyStationMotion,
  createConveyorStationMotion,
  createPaintBoothMotion,
  createWeldingRobotMotion,
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

test('WELD-201 robot island preserves selection identity and animated pose', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const welding = FACTORY_EQUIPMENT.find((item) => item.tag === 'WELD-201');
  if (!welding) throw new Error('WELD-201 fixture is missing');

  const visual = addWeldingRobotStation(scene, welding);
  expect(scene.children.length).toBeGreaterThan(10);
  expect(scene.children.every((child) => (
    child.selectionId === welding.selectionId
  ))).toBe(true);
  const weldingBounds = boundsForEquipment(welding);
  expect(weldingBounds.min[0]).toBeCloseTo(-10.6);
  expect(weldingBounds.min[1]).toBeCloseTo(-0.1);
  expect(weldingBounds.min[2]).toBeCloseTo(-2.9);
  expect(weldingBounds.max[0]).toBeCloseTo(-5.4);
  expect(weldingBounds.max[1]).toBeCloseTo(4.25);
  expect(weldingBounds.max[2]).toBeCloseTo(2.9);

  const arm = visual.parts.get('robot-arm-upper');
  const spark = visual.parts.get('weld-spark-0');
  if (!arm || !spark) throw new Error('WELD-201 motion fixtures are missing');

  const motion = createWeldingRobotMotion(visual);
  motion.update(0.2);
  expect(arm.toJSON().matrix).toBeDefined();
  expect(spark.visible).toBe(true);
  motion.reset();
  expect(arm.toJSON().matrix).toBeUndefined();
  expect(spark.visible).toBe(false);
});

test('PAINT-301 booth preserves selection identity and animates the spray gantry', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const paint = FACTORY_EQUIPMENT.find((item) => item.tag === 'PAINT-301');
  if (!paint) throw new Error('PAINT-301 fixture is missing');

  const visual = addPaintBoothStation(scene, paint);
  expect(scene.children.length).toBeGreaterThan(10);
  expect(scene.children.every((child) => (
    child.selectionId === paint.selectionId
  ))).toBe(true);
  const paintBounds = boundsForEquipment(paint);
  expect(paintBounds.min[0]).toBeCloseTo(-2.7);
  expect(paintBounds.min[1]).toBeCloseTo(0);
  expect(paintBounds.min[2]).toBeCloseTo(-3.2);
  expect(paintBounds.max[0]).toBeCloseTo(2.7);
  expect(paintBounds.max[1]).toBeCloseTo(5.1);
  expect(paintBounds.max[2]).toBeCloseTo(3.2);

  const gantry = visual.parts.get('gantry-rail');
  const mist = visual.parts.get('paint-mist-0');
  if (!gantry || !mist) throw new Error('PAINT-301 motion fixtures are missing');

  const motion = createPaintBoothMotion(visual);
  motion.update(0.2);
  expect(gantry.toJSON().matrix).toBeDefined();
  expect(mist.visible).toBe(true);
  motion.reset();
  expect(gantry.toJSON().matrix).toBeUndefined();
  expect(mist.visible).toBe(false);
});
