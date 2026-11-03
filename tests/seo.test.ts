import { expect } from '#test-expect';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const html = read('public/index.html');
const robots = read('public/robots.txt');
const sitemap = read('public/sitemap.xml');
const canonical = 'https://jzb1006.github.io/ice3-agent-console/';

function meta(kind: string, key: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]*${kind}=["']${key}["'][^>]*content=["']([^"']+)["']`,
    'i',
  );
  return pattern.exec(html)?.[1];
}

function property(key: string): string | undefined {
  return meta('property', key);
}

test('publishes search and social metadata for the 3D automotive console', () => {
  const title = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? '';
  const description = meta('name', 'description') ?? '';
  const keywords = (meta('name', 'keywords') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  expect(title).toContain('汽车制造工厂');
  expect(title).toContain('3D');
  expect(title).toContain('ICE3');
  expect(description).toContain('3D');
  expect(description).toContain('Agent');
  expect(keywords.length).toBeGreaterThanOrEqual(10);
  expect(keywords.some((keyword) => keyword.includes('数字孪生'))).toBe(true);
  expect(new Set(keywords).size).toBe(keywords.length);
  expect(meta('name', 'robots')).toContain('index');
  expect(meta('name', 'robots')).not.toContain('noindex');
});

test('keeps canonical, Open Graph and Twitter links on the Pages URL', () => {
  expect(html).toContain(`<link rel="canonical" href="${canonical}"`);
  expect(property('og:url')).toBe(canonical);
  expect(property('og:title')).toContain('汽车制造工厂');
  expect(property('og:description')).toContain('Agent');
  expect(property('og:image')).toBe(`${canonical}og-cover.jpg`);
  expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  expect(meta('name', 'twitter:image')).toBe(property('og:image'));
  expect(existsSync(join(root, 'public/og-cover.jpg'))).toBe(true);
});

test('declares a WebSite and SoftwareApplication JSON-LD graph', () => {
  const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    .exec(html)?.[1] ?? '';
  expect(raw.length).toBeGreaterThan(100);
  const graph = raw
    ? (JSON.parse(raw) as { '@graph'?: Array<Record<string, unknown>> })['@graph']
    : [];
  expect(graph?.map((item) => item['@type']))
    .toEqual(expect.arrayContaining(['WebSite', 'SoftwareApplication']));
  const app = graph?.find((item) => item['@type'] === 'SoftwareApplication');
  expect(app?.url).toBe(canonical);
  expect(app?.screenshot).toBe(`${canonical}og-cover.jpg`);
  expect(app?.browserRequirements).toContain('WebGL2');
});

test('publishes crawl entry points and a meaningful canvas text alternative', () => {
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain('Allow: /');
  expect(robots).toContain(`Sitemap: ${canonical}sitemap.xml`);
  expect(sitemap).toContain(`<loc>${canonical}</loc>`);
  expect(sitemap).toContain(`${canonical}og-cover.jpg`);

  const summary = /<section[^>]*id="site-summary"[\s\S]*?<\/section>/i
    .exec(html)?.[0] ?? '';
  const text = summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  expect(summary).toContain('class="sr-only"');
  expect(text.length).toBeGreaterThan(600);
  for (const term of [
    '汽车制造工厂',
    '3D',
    '设备',
    'Agent',
    '数字孪生',
    '场景',
  ]) {
    expect(text).toContain(term);
  }
  expect(summary).toContain('https://github.com/ice-3d/ice3-agent-console');
});

test('loads GA4 only outside local and file URLs', () => {
  expect(html).toContain("'G-5M03M076TL'");
  expect(html).not.toContain('G-HW6H6EP0ES');
  expect(html).toContain("host === 'localhost'");
  expect(html).toContain("host === '127.0.0.1'");
  expect(html).toContain("host === '::1'");
  expect(html).toContain("location.protocol === 'file:'");
  expect(html).not.toContain(
    '<script async src="https://www.googletagmanager.com/gtag/js',
  );
});

test('paints an accessible inline loading state before runtime CSS and JS', () => {
  const criticalStyle = /<style[^>]*data-role="boot-critical"[^>]*>([\s\S]*?)<\/style>/i
    .exec(html)?.[1] ?? '';
  expect(criticalStyle).toContain('.sr-only');
  expect(criticalStyle).toContain('#boot-loading');
  expect(html).toContain('id="boot-loading"');
  expect(html).toContain('正在加载工业 3D 场景');
  expect(html).toContain('正在准备模型、材质和 Agent 演示');
});
