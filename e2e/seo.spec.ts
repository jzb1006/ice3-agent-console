import { expect, test } from '@playwright/test';

test('serves production TDK and keeps GA disabled on localhost', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (/googletagmanager\.com|google-analytics\.com/.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });

  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0');
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });

  await expect(page).toHaveTitle(/汽车制造工厂.*3D.*ICE3/);
  await expect(page.locator('meta[name="description"]'))
    .toHaveAttribute('content', /Agent/);
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute('href', 'https://ice-3d.github.io/ice3-agent-console/');
  await expect(page.locator('meta[property="og:url"]'))
    .toHaveAttribute('content', 'https://ice-3d.github.io/ice3-agent-console/');
  expect(await page.content()).toContain('G-5M03M076TL');

  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const graph = (JSON.parse(raw ?? '{}') as {
    '@graph'?: Array<{ '@type'?: string }>;
  })['@graph'];
  expect(graph?.map((item) => item['@type']))
    .toEqual(expect.arrayContaining(['WebSite', 'SoftwareApplication']));

  const summary = page.locator('#site-summary');
  await expect(summary).toHaveCount(1);
  const box = await summary.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(2);
  expect(box?.height).toBeLessThanOrEqual(2);

  await page.waitForTimeout(1_000);
  expect(analyticsRequests).toEqual([]);
  expect(await page.evaluate(() => (
    window as Window & { gtag?: unknown }
  ).gtag)).toBeUndefined();
});

test('shows inline loading until the interactive console is ready', async ({
  page,
}) => {
  let releaseBoot!: () => void;
  const bootGate = new Promise<void>((resolve) => {
    releaseBoot = resolve;
  });
  await page.route('**/boot.*.js', async (route) => {
    await bootGate;
    await route.continue();
  });

  await page.goto('http://127.0.0.1:8111/?demo=1&autoplay=0', {
    waitUntil: 'commit',
  });
  const loading = page.locator('#boot-loading');
  await expect(loading).toBeVisible();
  await expect(loading).toContainText('正在加载工业 3D 场景');
  await expect(page.locator('#site-summary')).toHaveCSS('position', 'absolute');

  releaseBoot();
  await expect(page.locator('[data-role="scene-status"]'))
    .toHaveText('场景已就绪', { timeout: 60_000 });
  await expect(loading).toHaveCount(0);
});
