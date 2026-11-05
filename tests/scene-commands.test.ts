import { expect } from '#test-expect';
import { test } from 'node:test';
import { SceneCommandExecutor } from '../src/scene/controller.js';
import type {
  CameraView,
  EquipmentRecord,
  SceneSnapshot,
} from '../src/scene/types.js';

class FakeScene {
  readonly items: readonly EquipmentRecord[] = [{
    selectionId: 'ice3-virtual-auto-plant/equipment/ROBOT-201',
    name: '点焊机器人',
    metadata: {
      equipmentTag: 'ROBOT-201',
      processStage: 'body-shop',
      area: 'BodyShop',
    },
    bounds: { min: [-7, 0, -7], max: [7, 5, 7] },
  }];
  selection: readonly string[] = [];
  cameraMoves = 0;
  productionRuns = 0;
  view: CameraView = 'overview';

  records(): readonly EquipmentRecord[] {
    return this.items;
  }

  setSelection(ids: readonly string[]): void {
    this.selection = ids;
  }

  async focus(): Promise<void> {
    this.cameraMoves += 1;
    this.view = 'equipment';
  }

  async setView(view: CameraView): Promise<void> {
    this.cameraMoves += 1;
    this.view = view;
  }

  async playProduction(): Promise<void> {
    this.productionRuns += 1;
  }

  snapshot(): SceneSnapshot {
    return {
      selectedIds: this.selection,
      view: this.view,
      cameraPosition: [0, 10, 20],
      cameraTarget: [0, 0, 0],
    };
  }
}

test('does not mutate the scene for an unknown equipment ID', async () => {
  const scene = new FakeScene();
  const executor = new SceneCommandExecutor(scene);
  const result = await executor.execute({
    type: 'focus',
    selectionIds: ['missing'],
  });
  expect(result.ok).toBe(false);
  expect(scene.selection).toEqual([]);
  expect(scene.cameraMoves).toBe(0);
});

test('focuses and clears a known device', async () => {
  const scene = new FakeScene();
  const executor = new SceneCommandExecutor(scene);
  const focused = await executor.execute({
    type: 'focus',
    selectionIds: ['ice3-virtual-auto-plant/equipment/ROBOT-201'],
  });
  expect(focused.ok).toBe(true);
  expect(scene.selection).toEqual(['ice3-virtual-auto-plant/equipment/ROBOT-201']);
  expect(scene.cameraMoves).toBe(1);
  const cleared = await executor.execute({ type: 'clear' });
  expect(cleared.ok).toBe(true);
  expect(scene.selection).toEqual([]);
  expect(scene.view).toBe('overview');
});

test('plays the production flow through the scene port', async () => {
  const scene = new FakeScene();
  const executor = new SceneCommandExecutor(scene);
  const result = await executor.execute({ type: 'production' });

  expect(result.ok).toBe(true);
  expect(scene.productionRuns).toBe(1);
});
