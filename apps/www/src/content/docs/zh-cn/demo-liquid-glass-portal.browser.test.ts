// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Browser, BrowserContext, CDPSession, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  launchBrowser,
  startServer,
  stopServer,
  RUNTIMES,
  choosePreviewRuntime,
} from './browser-harness';
const ROUTE = '/en/test/liquid-glass-portal/';
const evidence = process.env.PROTO_UI_MATERIAL_EVIDENCE_DIR;
const observations: unknown[] = [];
let browser: Browser;
let baseUrl = '';
const safe = {
  'prefers-reduced-motion': 'reduce',
  'prefers-reduced-transparency': 'no-preference',
  'prefers-contrast': 'no-preference',
  'forced-colors': 'none',
};
async function preferences(
  cdp: CDPSession,
  theme = 'light',
  overrides: Record<string, string> = {}
) {
  await cdp.send('Emulation.setEmulatedMedia', {
    features: Object.entries({ ...safe, 'prefers-color-scheme': theme, ...overrides }).map(
      ([name, value]) => ({ name, value })
    ),
  });
}
async function fixture(runtime: string, theme = 'light', font = 'regular', dpr = 1) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: dpr,
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(baseUrl).origin
      ? route.continue()
      : route.abort()
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await preferences(cdp, theme);
  await page.goto(`${baseUrl}${ROUTE}?runtime=${runtime}&theme=${theme}&font=${font}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => document.documentElement.dataset.portalReady, undefined, {
    timeout: 60000,
  });
  return { context, page, cdp };
}
const geometry = (page: Page) =>
  page.evaluate(() => (window as any).liquidPortalFixture.geometry());
async function open(page: Page) {
  const trigger = page.getByRole('button', { name: 'Open account menu', exact: true });
  await page.evaluate(() => (window as any).liquidPortalFixture.beginFocusObservation());
  await trigger.click();
  await page.getByRole('menu').waitFor({ state: 'visible' });
  return trigger;
}
async function optical(page: Page) {
  await expect
    .poll(async () => (await geometry(page)).quality, { timeout: 20000 })
    .toBe('self-optical');
  await expect
    .poll(() => page.evaluate(() => (window as any).liquidPortalFixture.activity().firstFocus))
    .toMatchObject({
      contentConnected: true,
      scopeContains: true,
      destinationOwns: true,
      physicalDestinationIsOverlay: true,
    });
  const firstFocus = await page.evaluate(
    () => (window as any).liquidPortalFixture.activity().firstFocus
  );
  const result = await geometry(page);
  expect(result.scopeContains).toBe(true);
  expect(result.destinationOwns).toBe(true);
  expect(result.contentCount).toBe(1);
  expect(result.admission.valid).toBe(true);
  expect(result.sourceKind).toBe('visible-app-canvas');
  expect(result.backdropFilter).toBe('none');
  expect(result.image).toContain('data:image/png');
  expect(result.content.left - result.paintOutset).toBeGreaterThanOrEqual(result.canvas.left);
  expect(result.content.top - result.paintOutset).toBeGreaterThanOrEqual(result.canvas.top);
  expect(result.content.right + result.paintOutset).toBeLessThanOrEqual(result.canvas.right);
  expect(result.content.bottom + result.paintOutset).toBeLessThanOrEqual(result.canvas.bottom);
  expect(result.source.width).toBe(Math.ceil(result.canvas.width * result.dpr));
  expect(result.source.height).toBe(Math.ceil(result.canvas.height * result.dpr));
  expect(result.source.width).toBeLessThanOrEqual(2048);
  expect(result.source.height).toBeLessThanOrEqual(2048);
  expect(result.source.width * result.source.height).toBeLessThanOrEqual(1048576);
  // Decode the real sink output rather than treating a status attribute as
  // sufficient paint evidence. No mocked canvas or supplied output image.
  const pixels = await page.evaluate(async () => {
    const host = document.querySelector<HTMLElement>('[data-demo-ref="content"]')!;
    const image = new Image();
    image.src = host.style.backgroundImage.slice(5, -2);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    let painted = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] > 0) {
        painted++;
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
    return { width: canvas.width, height: canvas.height, painted, colors: colors.size };
  });
  expect(pixels.painted).toBeGreaterThan(1000);
  expect(pixels.colors).toBeGreaterThan(20);
  return { ...result, image: undefined, outputPixels: pixels, firstFocus };
}
async function capture(page: Page, name: string) {
  if (!evidence) return undefined;
  const dir = path.join(evidence, 'portal');
  await mkdir(dir, { recursive: true });
  const buffer = await page
    .locator('[data-portal-fixture-host]')
    .screenshot({ path: path.join(dir, `${name}.png`) });
  return { file: `portal/${name}.png`, sha256: createHash('sha256').update(buffer).digest('hex') };
}
beforeAll(async () => {
  baseUrl = await startServer(ROUTE);
  browser = await launchBrowser();
}, 150000);
afterAll(async () => {
  if (evidence) {
    await mkdir(path.join(evidence, 'portal'), { recursive: true });
    await writeFile(
      path.join(evidence, 'portal', 'metadata.json'),
      JSON.stringify(
        {
          sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
          sourceTree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
            encoding: 'utf8',
          }).trim(),
          trackedDiff: execFileSync('git', ['diff', '--name-only', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
          route: ROUTE,
          node: process.version,
          browser: browser?.version(),
          scope:
            'Official Dropdown Content and shared scene. Actual same-origin canvas only; no arbitrary DOM, native or Apple equivalence.',
          observations,
        },
        null,
        2
      )
    );
  }
  await browser?.close();
  await stopServer();
}, 60000);
describe.sequential('real Liquid Dropdown Content in a bounded scene portal', () => {
  for (const runtime of RUNTIMES)
    for (const theme of ['light', 'dark'])
      for (const font of ['regular', 'large'])
        for (const dpr of [1, 2])
          it(`${runtime} ${theme} ${font} DPR${dpr}: actual Content optics and complete source bounds`, async () => {
            const { context, page } = await fixture(runtime, theme, font, dpr);
            try {
              const trigger = await open(page);
              const result = await optical(page);
              const screenshot = await capture(page, `${runtime}-${theme}-${font}-dpr${dpr}`);
              await page.keyboard.press('ArrowDown');
              expect(
                await page
                  .getByRole('menuitem')
                  .evaluateAll((items) => items.some((item) => item === document.activeElement))
              ).toBe(true);
              await page.keyboard.press('Escape');
              await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
              await expect
                .poll(() => trigger.evaluate((el) => el === document.activeElement))
                .toBe(true);
              await open(page);
              await optical(page);
              await page.locator('#outside').click();
              await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
              observations.push({
                runtime,
                theme,
                font,
                dpr,
                ...result,
                screenshot,
                reopen: true,
                escapeFocus: true,
                outsideDismissal: true,
              });
            } finally {
              await context.close();
            }
          }, 90000);
  for (const runtime of RUNTIMES)
    it(`${runtime}: one-pixel source loss, intervening paint, withdrawal, registration revocation/restoration and preferences`, async () => {
      const { context, page, cdp } = await fixture(runtime);
      try {
        const trigger = await open(page);
        await optical(page);
        await page.evaluate(() => (window as any).liquidPortalFixture.undersize(true));
        await expect
          .poll(async () => (await geometry(page)).reason)
          .toBe('source-bounds-unavailable');
        expect((await geometry(page)).image).toBe('none');
        await capture(page, `${runtime}-one-pixel-too-short`);
        await page.evaluate(() => (window as any).liquidPortalFixture.undersize(false));
        await optical(page);
        await page.evaluate(() => (window as any).liquidPortalFixture.overlap(true));
        await expect
          .poll(async () => (await geometry(page)).reason)
          .toBe('source-overlapping-content');
        await page.evaluate(() => (window as any).liquidPortalFixture.overlap(false));
        await optical(page);
        await page.evaluate(() => (window as any).liquidPortalFixture.source(false));
        await expect.poll(async () => (await geometry(page)).quality).toBe('opaque-fallback');
        expect((await geometry(page)).image).toBe('none');
        await page.evaluate(() => (window as any).liquidPortalFixture.source(true));
        await optical(page);
        await page.locator('[data-demo-ref="content"]').evaluate((el) => {
          (el as HTMLElement).style.color = '#ff0000';
        });
        await expect
          .poll(async () => (await geometry(page)).reason)
          .toBe('external-foreground-mismatch');
        expect((await geometry(page)).image).not.toContain('data:image');
        await page.locator('[data-demo-ref="content"]').evaluate((el) => {
          (el as HTMLElement).style.removeProperty('color');
        });
        await optical(page);
        await expect
          .poll(() =>
            page
              .getByRole('menuitem')
              .evaluateAll((items) => items.some((item) => item === document.activeElement))
          )
          .toBe(true);
        const beforeRevocation = await page.evaluate(() =>
          (window as any).liquidPortalFixture.activity()
        );
        expect(beforeRevocation.openChangeCount).toBeGreaterThan(0);
        await page.evaluate(() => {
          const content = document.querySelector('[data-demo-ref="content"]')!;
          (window as any).portalBeforeRevocation = {
            content,
            parent: content.parentElement,
            focus: document.activeElement,
          };
        });
        await page.evaluate(() => (window as any).liquidPortalFixture.destination(false));
        await expect.poll(async () => (await geometry(page)).image).not.toContain('data:image');
        expect((await geometry(page)).quality).not.toBe('self-optical');
        expect((await geometry(page)).fallbackFill).toBe('rgb(255, 255, 255)');
        expect((await geometry(page)).foreground).toBe('rgb(29, 29, 31)');
        expect((await geometry(page)).destinationOwns).toBe(true);
        expect(await trigger.getAttribute('aria-expanded')).toBe('true');
        expect(
          await page.evaluate(() => {
            const old = (window as any).portalBeforeRevocation;
            const content = document.querySelector('[data-demo-ref="content"]');
            return (
              content === old.content &&
              content?.parentElement === old.parent &&
              document.activeElement === old.focus
            );
          })
        ).toBe(true);
        // Observe after the next committed layout/paint boundary as well as
        // the synchronous registration signal; no synthetic focus is sent.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
        );
        const afterRevocation = await page.evaluate(() =>
          (window as any).liquidPortalFixture.activity()
        );
        expect(afterRevocation.blurCount - beforeRevocation.blurCount).toBe(0);
        expect(afterRevocation.closeCount - beforeRevocation.closeCount).toBe(0);
        expect(afterRevocation.openChangeCount - beforeRevocation.openChangeCount).toBe(0);
        for (const key of ['scrollX', 'scrollY', 'contentScrollTop', 'contentScrollLeft'])
          expect(afterRevocation[key]).toBe(beforeRevocation[key]);
        await capture(page, `${runtime}-registration-pending-opaque`);
        // Only the next attached view resolves the revoked registration. No
        // opened host is moved to body merely to make this test pass.
        await page.keyboard.press('Escape');
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
        await expect.poll(() => trigger.evaluate((el) => el === document.activeElement)).toBe(true);
        await open(page);
        await expect
          .poll(() =>
            page.locator('[data-demo-ref="content"]').evaluate((el, runtime) => {
              const parent = el.parentElement!;
              if (runtime !== 'react') return parent === document.body;
              return (
                parent.matches('[data-pui-portal-mount]') && parent.parentElement === document.body
              );
            }, runtime)
          )
          .toBe(true);
        if (runtime === 'react') {
          const carrier = page.locator('[data-pui-portal-mount]');
          expect(await carrier.count()).toBe(1);
          expect(
            await carrier.evaluate((el) => ({
              display: getComputedStyle(el).display,
              role: el.getAttribute('role'),
              tabIndex: el.getAttribute('tabindex'),
              background: getComputedStyle(el).backgroundImage,
            }))
          ).toEqual({ display: 'contents', role: null, tabIndex: null, background: 'none' });
        }
        expect(await trigger.getAttribute('aria-expanded')).toBe('true');
        expect((await geometry(page)).image).not.toContain('data:image');
        expect((await geometry(page)).admission.reason).toBe('source-scope-unavailable');
        await page.keyboard.press('Escape');
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
        await page.evaluate(() => (window as any).liquidPortalFixture.destination(true));
        await open(page);
        await optical(page);
        expect(await trigger.getAttribute('aria-expanded')).toBe('true');
        for (const override of [
          { 'prefers-reduced-transparency': 'reduce' },
          { 'forced-colors': 'active' },
        ] as Record<string, string>[]) {
          await preferences(cdp, 'light', override);
          try {
            await expect
              .poll(async () => (await geometry(page)).quality, {
                message: `${runtime} preference ${JSON.stringify(override)}`,
              })
              .toBe('opaque-fallback');
            expect((await geometry(page)).image).toBe('none');
            expect((await geometry(page)).reason).toBe('transparency-or-contrast-override');
          } finally {
            // Retain the failing iteration too: the old all-or-nothing journey
            // record could not distinguish reduced transparency from UA colors.
            const snapshot = await geometry(page);
            const forcedColorAdjust = await page
              .locator('[data-demo-ref="content"]')
              .evaluate((el) => getComputedStyle(el).forcedColorAdjust);
            observations.push({
              runtime,
              checkpoint: 'preference-fallback',
              override,
              forcedColorAdjust,
              snapshot,
            });
            await capture(page, `${runtime}-preference-${Object.keys(override)[0]}`);
          }
          await preferences(cdp);
          await optical(page);
        }
        await page.evaluate(() => (window as any).liquidPortalFixture.dispose());
        expect(await page.locator('[data-demo-ref="content"]').count()).toBe(0);
        expect(await page.locator('[data-material-scene]').count()).toBe(0);
        observations.push({
          runtime,
          onePixelRejected: true,
          overlapRejected: true,
          foregroundMismatchRejected: true,
          sourceRecovered: true,
          destinationRegistrationDeferredUntilReopen: true,
          pendingPreservedContentParentFocusAndOpen: true,
          beforeRevocation,
          afterRevocation,
          preferencesFallback: true,
          disposed: true,
        });
      } finally {
        await context.close();
      }
    }, 90000);
  it('DPR4 enlarged-font source stays opaque when the genuine scene exceeds pixel budget', async () => {
    const { context, page } = await fixture('wc', 'light', 'large', 4);
    try {
      await open(page);
      await expect.poll(async () => (await geometry(page)).quality).toBe('opaque-fallback');
      const result = await geometry(page);
      expect(
        Math.ceil(result.canvas.width * result.dpr) * Math.ceil(result.canvas.height * result.dpr)
      ).toBeGreaterThan(1048576);
      expect(result.source).toBeNull();
      expect(result.image).toBe('none');
      observations.push({ ...result, image: undefined, overBudgetFallback: true });
    } finally {
      await context.close();
    }
  }, 90000);
  // The public demo is an acceptance target too. A small owned fixture cannot
  // substitute for the originally reported documentation route.
  for (const runtime of RUNTIMES)
    for (const locale of ['en', 'zh-cn'])
      for (const theme of ['light', 'dark'])
        it(`${runtime} ${locale} ${theme}: public Dropdown preview has optical portal Content`, async () => {
          const context: BrowserContext = await browser.newContext({
            viewport: { width: 1440, height: 1100 },
          });
          await context.route('**/*', (route) =>
            new URL(route.request().url()).origin === new URL(baseUrl).origin
              ? route.continue()
              : route.abort()
          );
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await preferences(cdp, theme);
          try {
            await page.goto(`${baseUrl}/${locale}/ui-libraries/liquid-glass/dropdown-menu/`, {
              waitUntil: 'networkidle',
            });
            const preview = page.locator('[data-previewer-id]').first();
            await choosePreviewRuntime(page, page.locator('.site-header-runtime').first(), runtime);
            const panel = page.locator(`[data-adapter-panel="${runtime}"]`);
            await panel.waitFor({ state: 'visible' });
            const trigger = panel.getByRole('button', { name: 'Open menu', exact: true });
            await page.evaluate(() => {
              (window as any).publicPortalFirstFocus = null;
              document.addEventListener(
                'focusin',
                (event) => {
                  if ((window as any).publicPortalFirstFocus || !(event.target instanceof Element))
                    return;
                  const menu = event.target.closest('[role="menu"]');
                  if (!menu) return;
                  const parent = menu.parentElement;
                  const destination = parent?.matches('[data-pui-portal-mount]')
                    ? parent.parentElement
                    : parent;
                  (window as any).publicPortalFirstFocus = {
                    scopeContains: !!menu.closest('[data-material-scene]'),
                    destinationOwns: !!menu.closest('[data-material-overlay-mount]'),
                    physicalDestinationIsOverlay: !!destination?.matches(
                      '[data-material-overlay-mount]'
                    ),
                    contentConnected: menu.isConnected,
                  };
                },
                true
              );
            });
            await trigger.click();
            const content = page.getByRole('menu');
            await content.waitFor({ state: 'visible' });
            await expect
              .poll(() => content.getAttribute('data-material-quality'), { timeout: 20000 })
              .toBe('self-optical');
            expect(
              await content.evaluate((el) => el.closest('[data-material-scene]') !== null)
            ).toBe(true);
            expect(
              await content.evaluate((el) => (el as HTMLElement).style.backgroundImage)
            ).toContain('data:image/png');
            await expect
              .poll(() => page.evaluate(() => (window as any).publicPortalFirstFocus))
              .toEqual({
                scopeContains: true,
                destinationOwns: true,
                physicalDestinationIsOverlay: true,
                contentConnected: true,
              });
            const firstFocus = await page.evaluate(() => (window as any).publicPortalFirstFocus);
            if (evidence) {
              await mkdir(path.join(evidence, 'portal'), { recursive: true });
              await preview.screenshot({
                path: path.join(
                  evidence,
                  'portal',
                  `${runtime}-${locale}-${theme}-public-dropdown.png`
                ),
              });
            }
            await page.keyboard.press('ArrowDown');
            expect(
              await content
                .getByRole('menuitem')
                .evaluateAll((items) => items.some((item) => item === document.activeElement))
            ).toBe(true);
            await page.keyboard.press('Escape');
            await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
            await expect
              .poll(() => trigger.evaluate((el) => el === document.activeElement))
              .toBe(true);
            await trigger.click();
            await expect
              .poll(() => content.getAttribute('data-material-quality'))
              .toBe('self-optical');
            await page.locator('h1').first().click();
            await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
            observations.push({
              runtime,
              route: `/${locale}/ui-libraries/liquid-glass/dropdown-menu/`,
              theme,
              publicContentOptical: true,
              firstFocus,
              escapeFocus: true,
              reopenedOptical: true,
              outsideDismissal: true,
            });
          } finally {
            await context.close();
          }
        }, 90000);
});
