// @vitest-environment node
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Browser, Page, Locator } from 'playwright-core';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer } from './browser-harness';

const quick = '/zh-cn/start-here/quick-start/';
const long = '/zh-cn/ui-libraries/base/transition/';
const out = process.env.PROTO_UI_CODE_SCROLL_EVIDENCE_DIR ?? '/tmp/pui-code-scroll-chain';
let browser: Browser;
let baseUrl: string;
const receipt: any = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  expectedRevision: process.env.EVIDENCE_HEAD_SHA ?? null,
  sources: [
    'apps/www/src/styles/code-surfaces.css',
    'apps/www/src/content/docs/zh-cn/code-scroll-chain.browser.test.ts',
  ].map((path) => ({
    path,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  })),
  cases: [],
};
beforeAll(async () => {
  if (receipt.expectedRevision) expect(receipt.revision).toBe(receipt.expectedRevision);
  baseUrl = await startServer(quick);
  browser = await launchBrowser();
}, 300_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
});
async function save() {
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'observations.json'), JSON.stringify(receipt, null, 2));
}
async function facts(page: Page, pre: Locator) {
  return pre.evaluate((e) => {
    const p = e as HTMLElement,
      s = getComputedStyle(p),
      r = p.getBoundingClientRect();
    return {
      scrollY,
      scrollX,
      scrollTop: p.scrollTop,
      scrollLeft: p.scrollLeft,
      clientHeight: p.clientHeight,
      scrollHeight: p.scrollHeight,
      clientWidth: p.clientWidth,
      scrollWidth: p.scrollWidth,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      overscrollX: s.overscrollBehaviorX,
      overscrollY: s.overscrollBehaviorY,
      overflowX: s.overflowX,
      overflowY: s.overflowY,
    };
  });
}
async function ready(page: Page): Promise<void> {
  await page.waitForSelector('[data-code-panel-init="1"]:visible');
  await page.waitForFunction(() => customElements.get('wc-shadcn-button'));
  // CodePanel initializes before the async Previewer mount replaces its SSR pre.
  // Wait for that replacement before Playwright can retain an element to measure.
  await page.waitForFunction(() => {
    const shell = [...document.querySelectorAll<HTMLElement>('[data-code-shell]')].find((element) =>
      element.checkVisibility()
    );
    if (!shell) return false;
    const previewer = shell.closest('[data-previewer-id]') as
      | (HTMLElement & { __previewer__?: { getCurrentRuntime(): string | null } })
      | null;
    // CodeExample owns a CodePanel without an async Previewer runtime.
    const sources = document.querySelectorAll<HTMLElement>('[data-site-code-surface="frame"]');
    const visibleReady = [...sources]
      .filter((root) => root.checkVisibility())
      .every((root) => root.dataset.codeSurfaceView === 'ready');
    return visibleReady && (!previewer || Boolean(previewer.__previewer__?.getCurrentRuntime()));
  });
}

async function observe(entry: any, label: string, page: Page, pre: Locator) {
  entry.wheels = await page.evaluate(() => (window as any).__codeScrollWheels ?? []);
  const value = await facts(page, pre);
  entry.observations.push({ label, ...value });
  await save();
  return value;
}
async function run(name: string, width: number, body: (page: Page, entry: any) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    (window as any).__codeScrollWheels = [];
    addEventListener(
      'wheel',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const pre = target?.closest('pre');
        (window as any).__codeScrollWheels.push({
          trusted: event.isTrusted,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          target: target?.tagName,
          className: target?.getAttribute('class'),
          scrollY,
          preScrollTop: pre?.scrollTop,
          preScrollLeft: pre?.scrollLeft,
          defaultPreventedAtWindow: event.defaultPrevented,
        });
      },
      { passive: true }
    );
  });

  const entry: any = { name, width, observations: [], errors: [], blocked: [] };
  receipt.cases.push(entry);
  page.on('pageerror', (error) => entry.errors.push(String(error)));
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.origin === new URL(baseUrl).origin || ['data:', 'blob:'].includes(u.protocol))
      return route.continue();
    entry.blocked.push(u.href);
    return route.abort();
  });
  try {
    await body(page, entry);
    expect(entry.errors).toEqual([]);
    expect(entry.blocked).toEqual([]);
    entry.passed = true;
  } catch (error) {
    entry.failure = String(error);
    throw error;
  } finally {
    await save();
    try {
      await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
    } finally {
      await context.close();
    }
  }
}
it('replays the original short-code reverse wheel position without trapping the document', async () => {
  await run('original-short-code-reverse', 1440, async (page, entry) => {
    await page.goto(baseUrl + quick, { waitUntil: 'networkidle' });
    await ready(page);
    await page.evaluate(() => scrollTo(0, 2860));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(2860);
    const hit = await page.evaluate(() => {
      const e = document.elementFromPoint(700, 550);
      return { tag: e?.tagName, className: e?.getAttribute('class') };
    });
    entry.hitBefore = hit;
    await save();
    expect(hit.tag).toBe('PRE');
    expect(hit.className).toContain('proto-previewer__code');
    const index = await page.evaluate(() =>
      [...document.querySelectorAll('pre.proto-previewer__code')].indexOf(
        document.elementFromPoint(700, 550)!
      )
    );
    const target = page.locator('pre.proto-previewer__code').nth(index);
    const before = await observe(entry, 'before-original-wheel', page, target);
    expect(before.scrollHeight).toBe(before.clientHeight);
    expect(before.overscrollX).toBe('contain');
    expect(before.overscrollY).toBe('auto');
    await page.mouse.move(700, 550);
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, -220);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await observe(entry, `wheel-${i}`, page, target);
    }
    await expect
      .poll(() => page.evaluate(() => scrollY), { timeout: 2000 })
      .toBeLessThan(before.scrollY - 500);
    await observe(entry, 'after-original-wheel', page, target);
  });
}, 45_000);
for (const width of [1440, 320])
  it(`preserves long-code internal scrolling then document chaining at ${width}px`, async () => {
    await run(`long-code-${width}`, width, async (page, entry) => {
      await page.goto(baseUrl + long, { waitUntil: 'networkidle' });
      await ready(page);
      const panel = page.locator('[data-code-shell]:visible').first();
      await panel.locator('[data-code-toggle]').click();
      await expect.poll(() => panel.getAttribute('data-code-expanded')).toBe('true');
      const pre = panel.locator('pre.proto-previewer__code');
      await pre.evaluate((e) => {
        e.scrollIntoView({ block: 'center' });
        e.scrollTop = 0;
        e.scrollLeft = 0;
      });
      const before = await observe(entry, 'long-before-wheel', page, pre);
      expect(before.scrollHeight - before.clientHeight).toBeGreaterThan(160);
      expect(before.overscrollX).toBe('contain');
      expect(before.overscrollY).toBe('auto');
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
      await page.mouse.wheel(0, 80);
      await expect
        .poll(() => pre.evaluate((e) => e.scrollTop), { timeout: 2000 })
        .toBeGreaterThan(0);
      const inside = await observe(entry, 'long-internal-wheel', page, pre);
      expect(inside.scrollY).toBe(before.scrollY);
      await pre.evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      const boundary = await observe(entry, 'long-at-bottom', page, pre);
      expect(boundary.scrollTop).toBe(boundary.scrollHeight - boundary.clientHeight);
      await page.mouse.wheel(0, 220);
      await expect
        .poll(() => page.evaluate(() => scrollY), { timeout: 2000 })
        .toBeGreaterThan(boundary.scrollY);
      await observe(entry, 'long-document-chain', page, pre);
      await pre.evaluate((e) => {
        e.scrollIntoView({ block: 'center' });
        e.scrollLeft = 0;
      });
      const horizontal = await observe(entry, 'horizontal-before', page, pre);
      expect(horizontal.scrollWidth).toBeGreaterThan(horizontal.clientWidth);
      await page.mouse.move(
        horizontal.x + horizontal.width / 2,
        horizontal.y + horizontal.height / 2
      );
      await page.mouse.wheel(80, 0);
      await expect
        .poll(() => pre.evaluate((e) => e.scrollLeft), { timeout: 2000 })
        .toBeGreaterThan(0);
      const after = await observe(entry, 'horizontal-after', page, pre);
      expect(after.scrollX).toBe(horizontal.scrollX);
      expect(after.scrollY).toBe(horizontal.scrollY);
    });
  }, 45_000);
