import { expect, test } from '@playwright/test';

async function yellowPixelCount(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2');
    const panel = document.querySelector('.conversation-panel');
    if (!canvas || !gl || !panel) {
      throw new Error('scene canvas or conversation panel is missing');
    }
    const width = canvas.width;
    const height = canvas.height;
    const visibleWidth = Math.max(
      0,
      Math.min(width, Math.round(panel.getBoundingClientRect().left)),
    );
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(
      0,
      0,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < visibleWidth; x += 1) {
        const offset = (y * width + x) * 4;
        const red = pixels[offset]!;
        const green = pixels[offset + 1]!;
        const blue = pixels[offset + 2]!;
        if (
          red > 180
          && green > 120
          && green < 245
          && blue < 90
          && red > green + 15
          && green > blue + 50
        ) {
          count += 1;
        }
      }
    }
    return count;
  });
}

test('runs the static demo without an Agent server', async ({ page }) => {
  const backendRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(':8099')) {
      backendRequests.push(request.url());
    }
  });
  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="agent-mode"]'))
    .toHaveText('剧本模式');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  await page.getByRole('button', { name: '车身焊装', exact: true }).click();
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('WELD-201', { timeout: 10_000 });
  expect(backendRequests).toEqual([]);
});

test('runs a production scenario in the static build', async ({ page }) => {
  const backendRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(':8099')) {
      backendRequests.push(request.url());
    }
  });
  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });

  await page.getByRole('button', { name: '涂装工艺', exact: true }).click();
  const tour = page.locator('[data-role="tour-hud"]');
  await expect(tour).toBeVisible({ timeout: 10_000 });
  await expect(tour.locator('[data-role="tour-title"]'))
    .toHaveText('涂装工艺');
  await expect(tour.locator('[data-role="tour-step"]'))
    .toHaveText(/^\d{2} \/ 05$/);
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('PAINT-301', { timeout: 10_000 });
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('TRIM-401', { timeout: 10_000 });
  expect(backendRequests).toEqual([]);
});

test('shows the production tour HUD while the vehicle moves through the line', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });

  await page.getByRole('button', { name: '整车生产流', exact: true }).click();
  const tour = page.locator('[data-role="tour-hud"]');
  await expect(tour).toBeVisible({ timeout: 10_000 });
  await expect(tour.locator('[data-role="tour-title"]'))
    .toHaveText('整车生产流');
  await expect(tour.locator('[data-role="tour-step"]'))
    .toHaveText(/^\d{2} \/ 19$/);
  await expect(tour.locator('[data-role="tour-markers"] [data-role="tour-marker"]'))
    .toHaveCount(19);
});

test('keeps the selected equipment highlighted during scenario playback', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });

  await page.getByRole('button', { name: '总装流程', exact: true }).click();
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('QA-501', { timeout: 20_000 });
  await expect.poll(
    () => yellowPixelCount(page),
    { timeout: 1_200, intervals: [100] },
  ).toBeGreaterThan(500);
});

test('returns to overview and hides the focus card after a complete scenario', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  const initial = await page.evaluate(() => (
    window.__ICE3_AGENT_CONSOLE__.snapshot()
  ));

  await page.getByRole('button', { name: '质量检测', exact: true }).click();
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('EOL-601', { timeout: 20_000 });
  await page.waitForTimeout(600);
  const focusedCanvas = await page.locator(
    'canvas[data-layer="scene"]',
  ).screenshot();
  await expect.poll(
    () => page.evaluate(() => {
      const snapshot = window.__ICE3_AGENT_CONSOLE__.snapshot();
      return snapshot.view === 'overview'
        && snapshot.selectedIds.length === 0;
    }),
    { timeout: 20_000 },
  ).toBe(true);
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => (
    window.__ICE3_AGENT_CONSOLE__.selectedIds()
  ))).toEqual([]);
  expect(await page.evaluate(() => (
    window.__ICE3_AGENT_CONSOLE__.snapshot()
  ))).toEqual(initial);
  const returnedCanvas = await page.locator(
    'canvas[data-layer="scene"]',
  ).screenshot();
  expect(returnedCanvas.equals(focusedCanvas)).toBe(false);
  await expect(page.locator('[data-role="equipment-card"]')).toBeHidden();
});
