import { expect } from '#test-expect';
import { test } from 'node:test';
import {
  resolveAutoplay,
  resolveDemoMode,
  resolveSceneMode,
} from '../src/app/mode.js';

test('selects the build default for missing and invalid values', () => {
  expect(resolveDemoMode('', false)).toBe(false);
  expect(resolveDemoMode('?demo=invalid', true)).toBe(true);
  expect(resolveAutoplay('', true)).toBe(true);
  expect(resolveAutoplay('?autoplay=invalid', false)).toBe(false);
});

test('accepts explicit boolean values', () => {
  expect(resolveDemoMode('?demo=1', false)).toBe(true);
  expect(resolveDemoMode('?demo=true', false)).toBe(true);
  expect(resolveDemoMode('?demo=0', true)).toBe(false);
  expect(resolveDemoMode('?demo=false', true)).toBe(false);
  expect(resolveAutoplay('?autoplay=1', false)).toBe(true);
  expect(resolveAutoplay('?autoplay=0', true)).toBe(false);
});

test('selects the requested scene adapter and preserves the procedural default', () => {
  expect(resolveSceneMode('', 'procedural')).toBe('procedural');
  expect(resolveSceneMode('?scene=invalid', 'procedural')).toBe('procedural');
  expect(resolveSceneMode('?scene=tileset', 'procedural')).toBe('tileset');
  expect(resolveSceneMode('?scene=procedural', 'tileset')).toBe('procedural');
});
