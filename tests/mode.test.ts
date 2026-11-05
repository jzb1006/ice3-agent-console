import { expect } from '#test-expect';
import { test } from 'node:test';
import { resolveAutoplay, resolveDemoMode } from '../src/app/mode.js';

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
