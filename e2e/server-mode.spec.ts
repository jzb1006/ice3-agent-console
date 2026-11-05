import { expect, test } from '@playwright/test';

test('starts a moving guided tour when opened without overrides', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8110/?demo=1');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('BODY-101', { timeout: 10_000 });
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('ROBOT-201', { timeout: 10_000 });
});

test('loads the automotive factory and completes a scene command', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8110/?demo=0&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  await page.getByRole('button', { name: '车身焊装', exact: true }).click();
  await expect(page.locator('[data-role="selection-tag"]'))
    .toHaveText('WELD-201', { timeout: 10_000 });
});

test('cancels autoplay when the user interacts with the scene', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8110/?demo=0&autoplay=1');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  await page.mouse.move(520, 420);
  await page.mouse.down();
  await page.mouse.move(550, 440, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(1_000);
  await expect(page.locator('[data-role="message"]')).toHaveCount(0);
});
