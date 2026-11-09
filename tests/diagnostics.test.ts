import { expect } from '#test-expect';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';
import { DiagnosticsPanel } from '../src/view/diagnostics.js';

test('renders engine diagnostics and toggles the panel', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  const panel = new DiagnosticsPanel(host as unknown as HTMLElement);

  panel.render({
    fps: 59.5,
    cpuFrameTimeMs: 4.2,
    backend: 'webgl2',
    drawCalls: 12,
    renderedMeshes: 8,
    renderedBatches: 3,
    gpuBytes: 1024 * 1024,
    selectionCount: 1,
    contextLossCount: 0,
    lastPickTimeMs: 0.8,
  });

  expect(panel.element.hidden).toBe(true);
  expect(panel.element.textContent).toContain('59.5 FPS');
  expect(panel.element.textContent).toContain('1.0 MB');
  const toggle = panel.element.querySelector<HTMLButtonElement>('[data-role="diagnostics-toggle"]')!;
  toggle.click();
  expect(panel.element.hidden).toBe(false);
  panel.dispose();
});
