import { expect } from '#test-expect';
import { test } from 'node:test';
import { ICEBasicMaterial, ICEBoxGeometry, ICEMesh, ICEScene } from 'ice3';
import { FACTORY_EQUIPMENT } from '../shared/factory.ts';
import {
  addBodyLoadingStation,
  addCalibrationStation,
  addChassisStation,
  addDryingOvenStation,
  addEndOfLineTestStation,
  addFinishedVehicleDockStation,
  addFrameAssemblyStation,
  addGlassDoorInstallStation,
  addMainConveyorStation,
  addPaintBoothStation,
  addPowertrainInstallStation,
  addPressStation,
  addPretreatmentStation,
  addQualityInspectionStation,
  addRoadTestStation,
  addSealStation,
  addStandaloneWeldingRobotStation,
  addTrimAssemblyStation,
  addWeldingRobotStation,
  boundsForEquipment,
  createBodyStationMotion,
  createCalibrationStationMotion,
  createChassisStationMotion,
  createConveyorStationMotion,
  createDryingOvenMotion,
  createEndOfLineTestMotion,
  createFinishedVehicleDockMotion,
  createFrameAssemblyMotion,
  createGlassDoorInstallMotion,
  createPaintBoothMotion,
  createPowertrainInstallMotion,
  createPressStationMotion,
  createPretreatmentMotion,
  createQualityInspectionMotion,
  createRoadTestStationMotion,
  createSealStationMotion,
  createStandaloneWeldingRobotMotion,
  createTrimAssemblyMotion,
  createWeldingRobotMotion,
  productionStageRoute,
  updateFactoryAmbientVisual,
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
    min: [-19.8, -1, -12.35],
    max: [-14.2, 1.8, -7.65],
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
  expect(weldingBounds.min[0]).toBeCloseTo(-11.6);
  expect(weldingBounds.min[1]).toBeCloseTo(-0.1);
  expect(weldingBounds.min[2]).toBeCloseTo(-12.9);
  expect(weldingBounds.max[0]).toBeCloseTo(-6.4);
  expect(weldingBounds.max[1]).toBeCloseTo(4.25);
  expect(weldingBounds.max[2]).toBeCloseTo(-7.1);

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
  expect(paintBounds.min[0]).toBeCloseTo(1.3);
  expect(paintBounds.min[1]).toBeCloseTo(0);
  expect(paintBounds.min[2]).toBeCloseTo(-6.2);
  expect(paintBounds.max[0]).toBeCloseTo(6.7);
  expect(paintBounds.max[1]).toBeCloseTo(5.1);
  expect(paintBounds.max[2]).toBeCloseTo(0.2);

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

test('OVEN-302 drying oven preserves selection identity and animates heat flow', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const oven = FACTORY_EQUIPMENT.find((item) => item.tag === 'OVEN-302');
  if (!oven) throw new Error('OVEN-302 fixture is missing');

  const visual = addDryingOvenStation(scene, oven);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === oven.selectionId
  ))).toBe(true);
  const ovenBounds = boundsForEquipment(oven);
  expect(ovenBounds.min[0]).toBeCloseTo(8.1);
  expect(ovenBounds.min[1]).toBeCloseTo(-0.3);
  expect(ovenBounds.min[2]).toBeCloseTo(-6.05);
  expect(ovenBounds.max[0]).toBeCloseTo(13.9);
  expect(ovenBounds.max[1]).toBeCloseTo(6.15);
  expect(ovenBounds.max[2]).toBeCloseTo(0.05);

  const roller = visual.parts.get('roller-0');
  const heatGlow = visual.parts.get('heat-glow-0');
  const fan = visual.parts.get('exhaust-fan-0');
  if (!roller || !heatGlow || !fan) throw new Error('OVEN-302 motion fixtures are missing');

  const motion = createDryingOvenMotion(visual);
  motion.update(0.2);
  expect(roller.toJSON().matrix).toBeDefined();
  expect(fan.toJSON().matrix).toBeDefined();
  expect(heatGlow.visible).toBe(true);
  motion.reset();
  expect(roller.toJSON().matrix).toBeUndefined();
  expect(fan.toJSON().matrix).toBeUndefined();
  expect(heatGlow.visible).toBe(false);
});

test('TRIM-401 assembly station preserves selection identity and animates installation', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const trim = FACTORY_EQUIPMENT.find((item) => item.tag === 'TRIM-401');
  if (!trim) throw new Error('TRIM-401 fixture is missing');

  const visual = addTrimAssemblyStation(scene, trim);
  expect(scene.children.length).toBeGreaterThan(25);
  expect(scene.children.every((child) => (
    child.selectionId === trim.selectionId
  ))).toBe(true);
  const trimBounds = boundsForEquipment(trim);
  expect(trimBounds.min[0]).toBeCloseTo(20.95);
  expect(trimBounds.min[1]).toBeCloseTo(-0.65);
  expect(trimBounds.min[2]).toBeCloseTo(-7.9);
  expect(trimBounds.max[0]).toBeCloseTo(27.05);
  expect(trimBounds.max[1]).toBeCloseTo(5.05);
  expect(trimBounds.max[2]).toBeCloseTo(0.5);

  const lift = visual.parts.get('lift-frame');
  const arm = visual.parts.get('robot-arm-left-lower');
  const spark = visual.parts.get('assembly-spark-0');
  if (!lift || !arm || !spark) throw new Error('TRIM-401 motion fixtures are missing');

  const motion = createTrimAssemblyMotion(visual);
  motion.update(0.2);
  expect(lift.toJSON().matrix).toBeDefined();
  expect(arm.toJSON().matrix).toBeDefined();
  expect(spark.visible).toBe(true);
  motion.reset();
  expect(lift.toJSON().matrix).toBeUndefined();
  expect(arm.toJSON().matrix).toBeUndefined();
  expect(spark.visible).toBe(false);
});

test('QA-501 inspection gate preserves selection identity and animates scanning', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const quality = FACTORY_EQUIPMENT.find((item) => item.tag === 'QA-501');
  if (!quality) throw new Error('QA-501 fixture is missing');

  const visual = addQualityInspectionStation(scene, quality);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === quality.selectionId
  ))).toBe(true);
  const qualityBounds = boundsForEquipment(quality);
  expect(qualityBounds.min[0]).toBeCloseTo(0);
  expect(qualityBounds.min[1]).toBeCloseTo(-0.2);
  expect(qualityBounds.min[2]).toBeCloseTo(5.6);
  expect(qualityBounds.max[0]).toBeCloseTo(4);
  expect(qualityBounds.max[1]).toBeCloseTo(4.3);
  expect(qualityBounds.max[2]).toBeCloseTo(12.4);

  const light = visual.parts.get('scan-light-0');
  const camera = visual.parts.get('vision-camera-near');
  const beam = visual.parts.get('scan-beam-0');
  if (!light || !camera || !beam) throw new Error('QA-501 motion fixtures are missing');

  const motion = createQualityInspectionMotion(visual);
  motion.update(0.2);
  expect(light.toJSON().matrix).toBeDefined();
  expect(camera.toJSON().matrix).toBeDefined();
  expect(light.visible).toBe(true);
  expect(beam.visible).toBe(true);
  motion.reset();
  expect(light.toJSON().matrix).toBeUndefined();
  expect(camera.toJSON().matrix).toBeUndefined();
  expect(light.visible).toBe(false);
  expect(beam.visible).toBe(false);
});

test('EOL-601 end-of-line test station preserves selection identity and animates checks', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const eol = FACTORY_EQUIPMENT.find((item) => item.tag === 'EOL-601');
  if (!eol) throw new Error('EOL-601 fixture is missing');

  const visual = addEndOfLineTestStation(scene, eol);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === eol.selectionId
  ))).toBe(true);
  const eolBounds = boundsForEquipment(eol);
  expect(eolBounds.min[0]).toBeCloseTo(-16.6);
  expect(eolBounds.min[1]).toBeCloseTo(-0.55);
  expect(eolBounds.min[2]).toBeCloseTo(6.1);
  expect(eolBounds.max[0]).toBeCloseTo(-11.4);
  expect(eolBounds.max[1]).toBeCloseTo(4.15);
  expect(eolBounds.max[2]).toBeCloseTo(11.9);

  const roller = visual.parts.get('roller-0');
  const arm = visual.parts.get('test-arm-left');
  const flash = visual.parts.get('test-flash-0');
  if (!roller || !arm || !flash) throw new Error('EOL-601 motion fixtures are missing');

  const motion = createEndOfLineTestMotion(visual);
  motion.update(0.2);
  expect(roller.toJSON().matrix).toBeDefined();
  expect(arm.toJSON().matrix).toBeDefined();
  expect(flash.visible).toBe(true);
  motion.reset();
  expect(roller.toJSON().matrix).toBeUndefined();
  expect(arm.toJSON().matrix).toBeUndefined();
  expect(flash.visible).toBe(false);
});

test('LOGI-701 finished vehicle dock preserves selection identity and animates dispatch', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const logistics = FACTORY_EQUIPMENT.find((item) => item.tag === 'LOGI-701');
  if (!logistics) throw new Error('LOGI-701 fixture is missing');

  const visual = addFinishedVehicleDockStation(scene, logistics);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === logistics.selectionId
  ))).toBe(true);
  const logisticsBounds = boundsForEquipment(logistics);
  expect(logisticsBounds.min[0]).toBeCloseTo(-33.4);
  expect(logisticsBounds.min[1]).toBeCloseTo(-0.45);
  expect(logisticsBounds.min[2]).toBeCloseTo(5.8);
  expect(logisticsBounds.max[0]).toBeCloseTo(-26.3);
  expect(logisticsBounds.max[1]).toBeCloseTo(4.7);
  expect(logisticsBounds.max[2]).toBeCloseTo(12.2);

  const roller = visual.parts.get('roller-0');
  const barrier = visual.parts.get('dock-barrier');
  const flash = visual.parts.get('dispatch-flash-0');
  if (!roller || !barrier || !flash) throw new Error('LOGI-701 motion fixtures are missing');

  const motion = createFinishedVehicleDockMotion(visual);
  motion.update(0.2);
  expect(roller.toJSON().matrix).toBeDefined();
  expect(barrier.toJSON().matrix).toBeDefined();
  expect(flash.visible).toBe(true);
  motion.reset();
  expect(roller.toJSON().matrix).toBeUndefined();
  expect(barrier.toJSON().matrix).toBeUndefined();
  expect(flash.visible).toBe(false);
});

test('POWER-402 powertrain station preserves selection identity and animates installation', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const powertrain = FACTORY_EQUIPMENT.find((item) => item.tag === 'POWER-402');
  if (!powertrain) throw new Error('POWER-402 fixture is missing');

  const visual = addPowertrainInstallStation(scene, powertrain);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === powertrain.selectionId
  ))).toBe(true);
  const powertrainBounds = boundsForEquipment(powertrain);
  expect(powertrainBounds.min[0]).toBeCloseTo(16.2);
  expect(powertrainBounds.min[1]).toBeCloseTo(-0.45);
  expect(powertrainBounds.min[2]).toBeCloseTo(6.2);
  expect(powertrainBounds.max[0]).toBeCloseTo(20.8);
  expect(powertrainBounds.max[1]).toBeCloseTo(4.75);
  expect(powertrainBounds.max[2]).toBeCloseTo(11.1);

  const lift = visual.parts.get('lift-beam');
  const roller = visual.parts.get('roller-0');
  const flash = visual.parts.get('torque-flash-0');
  if (!lift || !roller || !flash) throw new Error('POWER-402 motion fixtures are missing');

  const motion = createPowertrainInstallMotion(visual);
  motion.update(0.2);
  expect(lift.toJSON().matrix).toBeDefined();
  expect(roller.toJSON().matrix).toBeDefined();
  expect(flash.visible).toBe(true);
  motion.reset();
  expect(lift.toJSON().matrix).toBeUndefined();
  expect(roller.toJSON().matrix).toBeUndefined();
  expect(flash.visible).toBe(false);
});

test('GLASS-403 glass and door station preserves selection identity and animates installation', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const glass = FACTORY_EQUIPMENT.find((item) => item.tag === 'GLASS-403');
  if (!glass) throw new Error('GLASS-403 fixture is missing');

  const visual = addGlassDoorInstallStation(scene, glass);
  expect(scene.children.length).toBeGreaterThan(20);
  expect(scene.children.every((child) => (
    child.selectionId === glass.selectionId
  ))).toBe(true);
  const glassBounds = boundsForEquipment(glass);
  expect(glassBounds.min[0]).toBeCloseTo(8.1);
  expect(glassBounds.min[1]).toBeCloseTo(-0.4);
  expect(glassBounds.min[2]).toBeCloseTo(6.2);
  expect(glassBounds.max[0]).toBeCloseTo(13);
  expect(glassBounds.max[1]).toBeCloseTo(4.65);
  expect(glassBounds.max[2]).toBeCloseTo(11.8);

  const arm = visual.parts.get('suction-arm-near');
  const cup = visual.parts.get('suction-cup-near');
  const flash = visual.parts.get('install-flash-near');
  if (!arm || !cup || !flash) throw new Error('GLASS-403 motion fixtures are missing');

  const motion = createGlassDoorInstallMotion(visual);
  motion.update(0.2);
  expect(arm.toJSON().matrix).toBeDefined();
  expect(cup.toJSON().matrix).toBeDefined();
  expect(flash.visible).toBe(true);
  motion.reset();
  expect(arm.toJSON().matrix).toBeUndefined();
  expect(cup.toJSON().matrix).toBeUndefined();
  expect(flash.visible).toBe(false);
});

test('ROBOT-201 standalone welding robot preserves selection identity and animates welding', () => {
  const scene = new ICEScene({ id: 'test-scene' });
  const robot = FACTORY_EQUIPMENT.find((item) => item.tag === 'ROBOT-201');
  if (!robot) throw new Error('ROBOT-201 fixture is missing');

  const visual = addStandaloneWeldingRobotStation(scene, robot);
  expect(scene.children.length).toBeGreaterThan(10);
  expect(scene.children.every((child) => (
    child.selectionId === robot.selectionId
  ))).toBe(true);
  const robotBounds = boundsForEquipment(robot);
  expect(robotBounds.min[0]).toBeCloseTo(-10.25);
  expect(robotBounds.min[1]).toBeCloseTo(1.8);
  expect(robotBounds.min[2]).toBeCloseTo(-7.75);
  expect(robotBounds.max[0]).toBeCloseTo(-7.45);
  expect(robotBounds.max[1]).toBeCloseTo(6.1);
  expect(robotBounds.max[2]).toBeCloseTo(-5.25);

  const arm = visual.parts.get('robot-arm-lower');
  const torch = visual.parts.get('weld-torch');
  const spark = visual.parts.get('weld-spark-0');
  if (!arm || !torch || !spark) throw new Error('ROBOT-201 motion fixtures are missing');

  const motion = createStandaloneWeldingRobotMotion(visual);
  motion.update(0.2);
  expect(arm.toJSON().matrix).toBeDefined();
  expect(torch.toJSON().matrix).toBeDefined();
  expect(spark.visible).toBe(true);
  motion.reset();
  expect(arm.toJSON().matrix).toBeUndefined();
  expect(torch.toJSON().matrix).toBeUndefined();
  expect(spark.visible).toBe(false);
});

test('new production stations render structured animated parts', () => {
  const fixtures = [
    ['PRESS-101', addPressStation, createPressStationMotion, 'press-die'],
    ['FRAME-202', addFrameAssemblyStation, createFrameAssemblyMotion, 'frame-arm-left'],
    ['PREP-301', addPretreatmentStation, createPretreatmentMotion, 'prep-roller-0'],
    ['SEAL-304', addSealStation, createSealStationMotion, 'seal-nozzle'],
    ['CHASSIS-404', addChassisStation, createChassisStationMotion, 'chassis-lift'],
    ['CAL-502', addCalibrationStation, createCalibrationStationMotion, 'cal-beam'],
    ['ROAD-602', addRoadTestStation, createRoadTestStationMotion, 'road-roller-0'],
  ] as const;
  for (const [tag, addStation, createMotion, movingPart] of fixtures) {
    const scene = new ICEScene({ id: `test-scene-${tag}` });
    const item = FACTORY_EQUIPMENT.find((equipment) => equipment.tag === tag);
    if (!item) throw new Error(`${tag} fixture is missing`);
    const visual = addStation(scene, item);
    expect(scene.children.length).toBeGreaterThan(8);
    expect(scene.children.every((child) => child.selectionId === item.selectionId)).toBe(true);
    const part = visual.parts.get(movingPart);
    if (!part) throw new Error(`${tag} motion fixture is missing`);
    const motion = createMotion(visual);
    motion.update(0.2);
    expect(part.toJSON().matrix).toBeDefined();
    motion.reset();
    expect(part.toJSON().matrix).toBeUndefined();
  }
});

test('production flow routes the vehicle through the spatial station layout', () => {
  const route = productionStageRoute();
  const frame = route.find((stage) => stage.tag === 'FRAME-202');
  const prep = route.find((stage) => stage.tag === 'PREP-301');
  const chassis = route.find((stage) => stage.tag === 'CHASSIS-404');
  if (!frame || !prep || !chassis) throw new Error('production route fixtures are missing');

  const expectPosition = (
    actual: readonly [number, number, number],
    expected: readonly [number, number, number],
  ): void => {
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 8));
  };
  expectPosition(frame.startPosition, [-9, 0, -10]);
  expectPosition(frame.endPosition, [-3, 0, -10]);
  expectPosition(prep.startPosition, [-3, 0, -10]);
  expectPosition(prep.endPosition, [-3, 0, -3]);
  expectPosition(chassis.startPosition, [24, 0, -3]);
  expectPosition(chassis.endPosition, [24, 0, 5]);
});

test('canonical factory positions form separated process zones around the courtyard', () => {
  const positions = new Map(FACTORY_EQUIPMENT.map((item) => [item.tag, item.position]));
  const zLevels = new Set(FACTORY_EQUIPMENT.map((item) => item.position[2]));

  expect(zLevels.size).toBeGreaterThanOrEqual(5);
  expect(positions.get('WELD-201')).toEqual([-9, 1.45, -10]);
  expect(positions.get('PAINT-301')).toEqual([4, 1.8, -3]);
  expect(positions.get('QA-501')).toEqual([2, 1.9, 9]);
  for (const [, position] of positions) {
    expect(position[0]).toBeGreaterThanOrEqual(-30);
    expect(position[0]).toBeLessThanOrEqual(24);
    expect(position[2]).toBeGreaterThanOrEqual(-10);
    expect(position[2]).toBeLessThanOrEqual(9);
  }
});

test('factory ambient motion animates signals, cranes, utility caps, and inspection scan', () => {
  const createFixture = (id: string): ICEMesh => new ICEMesh({
    id,
    position: [0, 1, 0],
    geometry: new ICEBoxGeometry({ width: 1, height: 1, depth: 1 }),
    material: new ICEBasicMaterial({ color: '#ffffff' }),
  });
  const signal = createFixture('ambient-signal');
  const trolley = createFixture('ambient-trolley');
  const cap = createFixture('ambient-cap');
  const scan = createFixture('ambient-scan');

  updateFactoryAmbientVisual({
    signalLights: [signal],
    craneTrolleys: [trolley],
    utilityCaps: [cap],
    inspectionScan: scan,
  }, 0.7);

  expect(signal.visible).toBe(true);
  expect(trolley.toJSON().matrix).toBeDefined();
  expect(cap.toJSON().matrix).toBeDefined();
  expect(scan.toJSON().matrix).toBeDefined();
});
