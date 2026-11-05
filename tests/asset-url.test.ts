import { expect } from '#test-expect';
import { test } from 'node:test';
import { resolveDemoAssetUrl } from '../src/scene/asset-url.js';

test('resolves demo Tileset and manifest relative to the deployed page', () => {
  expect(resolveDemoAssetUrl(
    'https://example.com/apps/agent-console/',
    'tiled/tileset.json',
  )).toBe(
    'https://example.com/apps/agent-console/assets/automotive-plant/tiled/tileset.json',
  );
  expect(resolveDemoAssetUrl(
    'https://example.com/apps/agent-console/',
    'equipment.json',
  )).toBe(
    'https://example.com/apps/agent-console/assets/automotive-plant/equipment.json',
  );
});

test('preserves a query-free path from a nested page URL', () => {
  expect(resolveDemoAssetUrl(
    'https://example.com/apps/agent-console/index.html?demo=1',
    'tiled/tileset.json',
  )).toBe(
    'https://example.com/apps/agent-console/assets/automotive-plant/tiled/tileset.json',
  );
});

test('resolves an alternate prepared asset root without changing the demo default', () => {
  expect(resolveDemoAssetUrl(
    'https://example.com/apps/agent-console/',
    'tiled/tileset.json',
    'assets/wastewater-plant',
  )).toBe(
    'https://example.com/apps/agent-console/assets/wastewater-plant/tiled/tileset.json',
  );
});
