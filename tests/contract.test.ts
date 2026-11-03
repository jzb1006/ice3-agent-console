import { expect } from '#test-expect';
import { test } from 'node:test';
import {
  SCENE_TOOLS,
  isSceneToolName,
} from '../shared/contract.js';

test('publishes an immutable scene-tool vocabulary', () => {
  expect(SCENE_TOOLS).toEqual([
    'find_equipment',
    'select_equipment',
    'focus_equipment',
    'highlight_equipment',
    'set_camera_view',
    'clear_scene_focus',
    'play_production',
  ]);
  expect(Object.isFrozen(SCENE_TOOLS)).toBe(true);
  expect(isSceneToolName('focus_equipment')).toBe(true);
  expect(isSceneToolName('unsupported')).toBe(false);
});
