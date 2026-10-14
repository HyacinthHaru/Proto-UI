// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type CDPSession, type Locator, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isUnpaintedBootstrapBoxShadow as isUnpaintedComposedShadow } from './bootstrap-disabled-paint';
import { observeOwnedMaterialPaint } from './material-paint-observation';
import {
  RUNTIMES,
  choosePreviewRuntime,
  chromeExecutable,
  startServer,
  stopServer,
} from './browser-harness';

// P-BASE-TOGGLE: active/pressed separation, controlled requests, keyboard/focus and disabled.
// P-LIQUID-GLASS-TOGGLE: fixed selection geometry, regular material in both active states,
// shared provider admission, opaque/restrictive-preference fallback and direct Base ownership.
const route = '/en/test/liquid-glass-toggle/';
const evidenceRoot = process.env.PROTO_UI_MATERIAL_EVIDENCE_DIR;
const output = evidenceRoot ? path.join(evidenceRoot, 'toggle') : undefined;
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const source = {
  sourceSha,
  sourceTree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
  patchSha256: createHash('sha256')
    .update(execFileSync('git', ['diff', '--binary', 'HEAD']))
    .digest('hex'),
};
let browser: Browser;
let baseUrl: string;
const results: unknown[] = [];
const safePreferences = {
  'prefers-reduced-motion': 'no-preference',
  'prefers-reduced-transparency': 'no-preference',
  'prefers-contrast': 'no-preference',
  'forced-colors': 'none',
};

beforeAll(async () => {
  if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.CANDIDATE_SHA || !output)
    throw new Error('Toggle native browser evidence requires official exact-head GitHub Actions');
  expect(sourceSha).toBe(process.env.CANDIDATE_SHA);
  expect(execFileSync('git', ['diff', '--binary', 'HEAD']).length).toBe(0);
  expect(
    execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim()
  ).toBe('');
  if (process.env.PROTO_UI_BROWSER_BASE_URL) throw new Error('Use this job own loopback server');
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'source.json'),
    JSON.stringify({ ...source, status: 'Planned; not acceptance until Vitest completes' }, null, 2)
  );
  baseUrl = await startServer([
    route,
    '/en/ui-libraries/liquid-glass/toggle/',
    '/zh-cn/ui-libraries/liquid-glass/toggle/',
  ]);
  browser = await chromium.launch({
    executablePath: await chromeExecutable(),
    headless: true,
    chromiumSandbox: true,
    args: ['--disable-dev-shm-usage'],
  });
}, 150_000);
afterAll(async () => {
  try {
    if (output)
      await writeFile(
        path.join(output, 'results.json'),
        JSON.stringify(
          {
            ...source,
            browser: browser?.version(),
            node: process.version,
            route,
            results,
            scope:
              'Real Web Adapter browser input and shared self-optical provider; not Apple, GPUI, packed or full Compiler parity. Vitest terminal verdict is authoritative.',
          },
          null,
          2
        )
      );
  } finally {
    try {
      await browser?.close();
    } finally {
      await stopServer();
    }
  }
}, 60_000);

async function preferences(cdp: CDPSession, theme: string, extra: Record<string, string> = {}) {
  await cdp.send('Emulation.setEmulatedMedia', {
    features: Object.entries({ ...safePreferences, 'prefers-color-scheme': theme, ...extra }).map(
      ([name, value]) => ({ name, value })
    ),
  });
}
async function newPage(theme = 'light') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // Only the owned local fixture and its assets can be requested; no account or external requests.
  await context.route('**/*', (request) =>
    new URL(request.request().url()).origin === new URL(baseUrl).origin
      ? request.continue()
      : request.abort()
  );
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const cdp = await context.newCDPSession(page);
  await preferences(cdp, theme);
  return { context, page, cdp };
}
async function fixture(page: Page, runtime: string, operation: string, ...args: unknown[]) {
  return page.evaluate(
    ({ runtime, operation, args }) =>
      (window as any).liquidToggleFixture[operation](runtime, ...args),
    { runtime, operation, args }
  );
}
async function state(page: Page, runtime: string, ref: string, key: string) {
  return fixture(page, runtime, 'state', ref, key);
}
async function quality(target: Locator, expected: string) {
  await expect
    .poll(() => target.getAttribute('data-material-quality'), { timeout: 30_000 })
    .toBe(expected);
}
async function observe(target: Locator) {
  return target.evaluate(async (element) => {
    const el = element as HTMLElement;
    const css = getComputedStyle(el),
      rect = el.getBoundingClientRect();
    const ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
    const rgba = (value: string) => {
      if (!CSS.supports('color', value)) throw new Error(`Unresolved observed color ${value}`);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const background = rgba(css.backgroundColor),
      foreground = rgba(css.color);
    const luminance = (rgb: number[]) =>
      rgb
        .slice(0, 3)
        .map((n) => n / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    const lum = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
    const carrierCss = getComputedStyle(el, '::before');
    const carrierMarker = el.getAttribute('data-pui-material-carrier');
    const materialImage =
      carrierMarker === 'contact-v1' ? carrierCss.backgroundImage : css.backgroundImage;
    const uri =
      materialImage.match(/url\(["']?(data:image\/png;base64,[^"')]+)["']?\)/)?.[1] ?? null;
    let pixels: {
      width: number;
      height: number;
      uniqueColors: number;
      min: number;
      max: number;
    } | null = null;
    if (uri) {
      const image = new Image();
      image.src = uri;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height),
        paint = canvas.getContext('2d')!;
      paint.drawImage(image, 0, 0);
      const data = paint.getImageData(0, 0, image.width, image.height).data;
      const colors = new Set<string>();
      let min = 255,
        max = 0;
      for (let i = 0; i < data.length; i += 4) {
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        min = Math.min(min, data[i], data[i + 1], data[i + 2]);
        max = Math.max(max, data[i], data[i + 1], data[i + 2]);
      }
      pixels = { width: image.width, height: image.height, uniqueColors: colors.size, min, max };
    }
    return {
      active: el.getAttribute('aria-pressed'),
      disabled: el.getAttribute('aria-disabled'),
      width: rect.width,
      height: rect.height,
      radius: css.borderTopLeftRadius,
      border: [
        css.borderTopWidth,
        css.borderRightWidth,
        css.borderBottomWidth,
        css.borderLeftWidth,
      ],
      borderColor: rgba(css.borderTopColor),
      ringColor: rgba(css.getPropertyValue('--pui-ring').trim()),
      underline: css.textDecorationLine,
      shadow: css.boxShadow,
      opacity: css.opacity,
      pointerEvents: css.pointerEvents,
      background,
      foreground,
      fallbackContrast: (lum[0] + 0.05) / (lum[1] + 0.05),
      quality: el.dataset.materialQuality,
      reason: el.dataset.materialReason,
      source: el.dataset.materialSource,
      phase: el.dataset.materialPhase,
      motion: el.dataset.materialMotion,
      backdropFilter: css.backdropFilter,
      childCanvases: el.querySelectorAll('canvas').length,
      image: materialImage,
      hostImage: css.backgroundImage,
      carrier: {
        marker: carrierMarker,
        content: carrierCss.content,
        image: carrierCss.backgroundImage,
        pointerEvents: carrierCss.pointerEvents,
        zIndex: carrierCss.zIndex,
        visibility: carrierCss.visibility,
        opacity: carrierCss.opacity,
      },
      uri,
      pixels,
    };
  });
}
function optical(facts: Awaited<ReturnType<typeof observe>>) {
  expect(facts.quality).toBe('self-optical');
  expect(facts.source).toBe('visible-app-canvas');
  expect(facts.backdropFilter).toBe('none');
  expect(facts.childCanvases).toBe(0);
  expect(facts.uri).toBeTruthy();
  expect(facts.carrier).toMatchObject({
    marker: 'contact-v1',
    content: '""',
    pointerEvents: 'none',
    zIndex: '-1',
    visibility: 'visible',
    opacity: '1',
  });
  expect(facts.carrier.image).toBe(facts.image);
  expect(facts.hostImage).toBe('none');
  expect(facts.pixels!.uniqueColors).toBeGreaterThan(20);
  expect(facts.pixels!.max - facts.pixels!.min).toBeGreaterThan(5);
  expect(facts.border).toEqual(['1px', '1px', '1px', '1px']);
}
async function capture(
  name: string,
  subject: Locator,
  entries: unknown[],
  details: Record<string, unknown> = {}
) {
  const facts = await observe(subject);
  const paint = await subject.evaluate(observeOwnedMaterialPaint);
  if (facts.quality === 'self-optical') {
    expect(paint.committed).toBe(true);
    expect(paint.geometryMatches).toBe(true);
  }
  const { uri, image, ...summary } = facts;
  let screenshotSha256: string | undefined;
  let materialSha256: string | undefined;
  if (output) {
    const shot = await subject.screenshot({ path: path.join(output, `${name}.png`) });
    screenshotSha256 = createHash('sha256').update(shot).digest('hex');
    if (uri) {
      const png = Buffer.from(uri.split(',')[1], 'base64');
      materialSha256 = createHash('sha256').update(png).digest('hex');
      await writeFile(path.join(output, `${name}-material.png`), png);
    }
  }
  const { image: committedImage, ...paintObservation } = paint;
  const { image: carrierImage, ...carrierObservation } = summary.carrier;
  const entry = {
    name,
    ...details,
    ...summary,
    carrier: carrierObservation,
    paint: paintObservation,
    screenshotSha256,
    materialSha256,
  };
  entries.push(entry);
  if (output)
    await writeFile(
      path.join(output, `${name}.json`),
      JSON.stringify({ ...source, ...entry }, null, 2)
    );
  return facts;
}

// Both selection directions are measured on the same retained native host.
describe.sequential('Liquid Toggle native input and self-optical material', () => {
  for (const runtime of RUNTIMES)
    for (const theme of ['light', 'dark'] as const)
      it(`${runtime}/${theme}: same-node selection, pointer/keyboard, controlled/disabled and fallback`, async () => {
        const { context, page, cdp } = await newPage(theme);
        const observations: unknown[] = [];
        let failure: string | null = null;
        try {
          await page.goto(`${baseUrl}${route}?theme=${theme}`, { waitUntil: 'networkidle' });
          await page.waitForFunction(
            () => document.documentElement.dataset.liquidToggleReady === 'true',
            undefined,
            { timeout: 60_000 }
          );
          await page.evaluate(() => (window as any).liquidToggleFixture.pause(true));
          const host = page.locator(`[data-toggle-host="${runtime}"]`);
          const subject = (ref: string) => host.locator(`[data-demo-ref="${ref}"]`);
          const target = subject('regular');
          await quality(target, 'self-optical');
          const identity = await target.elementHandle();
          const inactive = await capture(`${runtime}-${theme}-inactive`, target, observations);
          optical(inactive);
          expect(inactive.active).toBe('false');
          expect(inactive.underline).toBe('none');
          await quality(subject('initial-active'), 'self-optical');
          await quality(subject('controlled'), 'self-optical');
          const layout = await host.locator('[data-demo-ref]').evaluateAll((elements) =>
            elements.map((element) => {
              const rect = element.getBoundingClientRect();
              const outset =
                element.getAttribute('data-pui-material-carrier') === 'contact-v1'
                  ? Math.ceil(Math.max(rect.width, rect.height) * 0.08 + 1)
                  : 0;
              return {
                ref: element.getAttribute('data-demo-ref'),
                width: rect.width,
                height: rect.height,
                outset,
                left: rect.left - outset,
                top: rect.top - outset,
                right: rect.right + outset,
                bottom: rect.bottom + outset,
              };
            })
          );
          for (let i = 0; i < layout.length; i++)
            for (let j = i + 1; j < layout.length; j++) {
              const a = layout[i],
                b = layout[j];
              expect(
                a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
              ).toBe(true);
            }
          observations.push({
            layout,
            layoutScope:
              '32px normal composition gap; no overlapping/stacked material support claimed',
          });
          expect(await subject('initial-active').getAttribute('aria-pressed')).toBe('true');
          await quality(subject('opaque'), 'opaque-fallback');
          await quality(subject('disabled'), 'opaque-fallback');
          const bare = page.locator(
            `[data-toggle-no-provider="${runtime}"] [data-demo-ref="bare"]`
          );
          const bareInactive = await capture(
            `${runtime}-${theme}-no-provider-inactive`,
            bare,
            observations
          );
          expect(bareInactive.quality).not.toBe('self-optical');
          expect(['', 'none']).toContain(bareInactive.image);
          expect(bareInactive.background[3]).toBe(255);
          expect(bareInactive.fallbackContrast).toBeGreaterThanOrEqual(4.5);
          await bare.click();
          await expect.poll(() => bare.getAttribute('aria-pressed')).toBe('true');
          const bareActive = await capture(
            `${runtime}-${theme}-no-provider-active`,
            bare,
            observations
          );
          expect(bareActive.quality).not.toBe('self-optical');
          expect(['', 'none']).toContain(bareActive.image);
          expect(bareActive.underline).toContain('underline');
          expect(bareActive.background).toEqual(bareInactive.background);
          expect(await subject('disabled').getAttribute('aria-pressed')).toBe('true');

          await target.hover();
          await page.mouse.down();
          await expect.poll(() => state(page, runtime, 'regular', 'pressed')).toBe(true);
          await expect.poll(() => target.getAttribute('data-material-phase')).toBe('pressed');
          const pressed = await capture(`${runtime}-${theme}-pressed`, target, observations);
          optical(pressed);
          expect(pressed.active).toBe('false');
          expect(pressed.image).not.toBe(inactive.image);
          expect(await fixture(page, runtime, 'requests', 'regular')).toEqual([]);
          await page.mouse.up();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('true');
          await expect.poll(() => state(page, runtime, 'regular', 'pressed')).toBe(false);
          await expect.poll(() => target.getAttribute('data-material-phase')).toBe('rest');
          const active = await capture(`${runtime}-${theme}-active`, target, observations);
          optical(active);
          expect(active.underline).toContain('underline');
          expect(active.borderColor).toEqual(active.ringColor);
          expect(active.background).toEqual(inactive.background);
          expect(active.foreground).toEqual(inactive.foreground);
          expect(active.width).toBe(inactive.width);
          expect(active.height).toBe(inactive.height);
          expect(active.radius).toBe(inactive.radius);
          expect(active.pixels!.width).toBe(inactive.pixels!.width);
          expect(active.pixels!.height).toBe(inactive.pixels!.height);
          expect(await fixture(page, runtime, 'requests', 'regular')).toEqual([
            { ref: 'regular', active: true },
          ]);

          await page.mouse.move(0, 0);
          await page.locator(`[data-focus-start="${runtime}"]`).focus();
          await page.keyboard.press('Tab');
          await expect
            .poll(() => target.evaluate((el) => document.activeElement === el))
            .toBe(true);
          await expect.poll(() => state(page, runtime, 'regular', 'focusVisible')).toBe(true);
          const focus = await capture(`${runtime}-${theme}-keyboard-focus`, target, observations);
          expect(focus.shadow).not.toBe(inactive.shadow);
          const positionY = await page.evaluate(() => scrollY);
          await page.keyboard.press('Space');
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('false');
          expect(await page.evaluate(() => scrollY)).toBe(positionY);
          expect(
            (await fixture(page, runtime, 'requests', 'regular')).map((entry: any) => entry.active)
          ).toEqual([true, false]);
          await page.keyboard.press('Enter');
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('true');
          expect(
            (await fixture(page, runtime, 'requests', 'regular')).map((entry: any) => entry.active)
          ).toEqual([true, false, true]);

          // Disable during a real pointer press: no commit, no stale pressed state or optics.
          await target.hover();
          await page.mouse.down();
          await expect.poll(() => state(page, runtime, 'regular', 'pressed')).toBe(true);
          await fixture(page, runtime, 'setProps', 'regular', { disabled: true });
          await expect.poll(() => target.getAttribute('aria-disabled')).toBe('true');
          await expect.poll(() => state(page, runtime, 'regular', 'pressed')).toBe(false);
          await expect.poll(() => state(page, runtime, 'regular', 'hovered')).toBe(false);
          await page.mouse.up();
          await page.keyboard.press('Space');
          await page.keyboard.press('Enter');
          await quality(target, 'opaque-fallback');
          const disabled = await capture(`${runtime}-${theme}-disabled`, target, observations);
          expect(disabled.active).toBe('true');
          expect(disabled.underline).toContain('underline');
          expect(disabled.opacity).toBe('0.5');
          expect(disabled.pointerEvents).toBe('none');
          expect(disabled.image).toBe('none');
          expect(isUnpaintedComposedShadow(disabled.shadow)).toBe(true);
          expect(await state(page, runtime, 'regular', 'focusVisible')).toBe(false);
          expect(disabled.carrier.marker).toBe(null);
          expect((await fixture(page, runtime, 'requests', 'regular')).length).toBe(3);
          await page.mouse.move(0, 0);
          await fixture(page, runtime, 'setProps', 'regular', { disabled: false });
          await quality(target, 'self-optical');
          await target.click();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('false');
          await capture(`${runtime}-${theme}-restored-inactive`, target, observations);

          const controlled = subject('controlled');
          await controlled.click();
          await controlled.focus();
          await page.keyboard.press('Enter');
          await expect
            .poll(async () => (await fixture(page, runtime, 'requests', 'controlled')).length)
            .toBe(2);
          expect(await controlled.getAttribute('aria-pressed')).toBe('false');
          expect(
            (await fixture(page, runtime, 'requests', 'controlled')).map(
              (entry: any) => entry.active
            )
          ).toEqual([true, true]);
          await capture(`${runtime}-${theme}-controlled-rejected`, controlled, observations);
          await fixture(page, runtime, 'setProps', 'controlled', { active: true });
          await expect.poll(() => controlled.getAttribute('aria-pressed')).toBe('true');
          await quality(controlled, 'self-optical');
          await capture(`${runtime}-${theme}-controlled-late-active`, controlled, observations);
          await controlled.click();
          await expect
            .poll(async () => (await fixture(page, runtime, 'requests', 'controlled')).length)
            .toBe(3);
          expect(await controlled.getAttribute('aria-pressed')).toBe('true');
          expect(
            (await fixture(page, runtime, 'requests', 'controlled')).map(
              (entry: any) => entry.active
            )
          ).toEqual([true, true, false]);
          await fixture(page, runtime, 'setProps', 'controlled', { active: false });
          await expect.poll(() => controlled.getAttribute('aria-pressed')).toBe('false');

          // Revoke the admitted source itself, not a component-owned material switch.
          await target.click();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('true');
          await page.mouse.move(0, 0);
          await fixture(page, runtime, 'source', false);
          await quality(target, 'opaque-fallback');
          const lost = await capture(`${runtime}-${theme}-source-lost`, target, observations);
          expect(lost.image).toBe('none');
          expect(lost.active).toBe('true');
          expect(lost.underline).toContain('underline');
          expect(lost.fallbackContrast).toBeGreaterThanOrEqual(4.5);
          await fixture(page, runtime, 'source', true);
          await quality(target, 'self-optical');
          await fixture(page, runtime, 'setProps', 'regular', { material: 'opaque' });
          await quality(target, 'opaque-fallback');
          await fixture(page, runtime, 'setProps', 'regular', { material: 'auto' });
          await quality(target, 'self-optical');

          await preferences(cdp, theme, { 'prefers-reduced-motion': 'reduce' });
          await quality(target, 'self-optical');
          await expect.poll(() => target.getAttribute('data-material-motion')).toBe('static');
          await capture(`${runtime}-${theme}-reduced-motion`, target, observations);
          for (const [feature, value] of [
            ['prefers-reduced-transparency', 'reduce'],
            ['prefers-contrast', 'more'],
            ['forced-colors', 'active'],
          ]) {
            await preferences(cdp, theme, { [feature]: value });
            await quality(target, 'opaque-fallback');
            const fallback = await capture(`${runtime}-${theme}-${feature}`, target, observations);
            expect(fallback.image).toBe('none');
            expect(fallback.active).toBe('true');
            expect(fallback.underline).toContain('underline');
            if (feature !== 'forced-colors')
              expect(fallback.fallbackContrast).toBeGreaterThanOrEqual(4.5);
            await preferences(cdp, theme);
            await quality(target, 'self-optical');
          }
          expect(await target.evaluate((el, first) => el === first, identity)).toBe(true);
          observations.push({
            sameNativeNode: true,
            requests: await fixture(page, runtime, 'requests', 'regular'),
            controlledRequests: await fixture(page, runtime, 'requests', 'controlled'),
            provider: await page.evaluate(() => (window as any).liquidToggleFixture.metrics()),
          });
          if (output)
            await host.screenshot({
              path: path.join(output, `${runtime}-${theme}-recovered-scene.png`),
            });
          await page.evaluate(() => (window as any).liquidToggleFixture.dispose());
          expect(await page.locator('[data-material-backdrop]').count()).toBe(0);
          const disposed = await page.evaluate(() => (window as any).liquidToggleFixture.metrics());
          expect(disposed).toMatchObject({ contexts: 0, pendingImages: 0, decodedImages: 0 });
          observations.push({ disposed });
        } catch (error) {
          failure = String(error);
          if (output)
            await page
              .screenshot({
                path: path.join(output, `${runtime}-${theme}-failure.png`),
                fullPage: true,
              })
              .catch(() => {});
          throw error;
        } finally {
          results.push({ runtime, theme, failure, observations });
          await context.close();
        }
      }, 120_000);

  it('unknown preferences retain fallback on all four real runtime hosts', async () => {
    const { context, page } = await newPage();
    try {
      await page.goto(`${baseUrl}${route}?unknown=1`, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        () => document.documentElement.dataset.liquidToggleReady === 'true',
        undefined,
        { timeout: 60_000 }
      );
      for (const runtime of RUNTIMES) {
        const target = page.locator(
          `[data-toggle-host="${runtime}"] [data-demo-ref="initial-active"]`
        );
        await quality(target, 'opaque-fallback');
        const facts = await capture(`${runtime}-unknown-preferences`, target, results, { runtime });
        expect(facts.active).toBe('true');
        expect(facts.image).toBe('none');
        expect(facts.underline).toContain('underline');
        expect(facts.fallbackContrast).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      await context.close();
    }
  }, 90_000);

  for (const locale of ['en', 'zh-cn'])
    it(`${locale}: actual public Toggle page uses the shared optical path across all four runtimes`, async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(`${baseUrl}/${locale}/ui-libraries/liquid-glass/toggle/`, {
          waitUntil: 'networkidle',
        });
        const selector = page.locator('.site-header-runtime').first();
        for (const runtime of RUNTIMES) {
          await choosePreviewRuntime(page, selector, runtime);
          const panel = page.locator(`[data-adapter-panel="${runtime}"]`);
          await panel.waitFor({ state: 'visible' });
          const target = panel.getByRole('button', { name: 'Bold', exact: true });
          await quality(target, 'self-optical');
          const identity = await target.elementHandle();
          const inactive = await capture(`public-${locale}-${runtime}-inactive`, target, results, {
            locale,
            runtime,
            publicRoute: page.url(),
          });
          optical(inactive);
          await target.click();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('true');
          await quality(target, 'self-optical');
          const active = await capture(`public-${locale}-${runtime}-active`, target, results, {
            locale,
            runtime,
          });
          optical(active);
          expect(active.underline).toContain('underline');
          expect(active.width).toBe(inactive.width);
          expect(active.height).toBe(inactive.height);
          expect(await target.evaluate((el, first) => el === first, identity)).toBe(true);
          await expect
            .poll(() => panel.getByRole('status').textContent())
            .toContain('1 activeChange requests');
          if (output)
            await panel.screenshot({
              path: path.join(output, `public-${locale}-${runtime}-scene.png`),
            });
        }
      } finally {
        await context.close();
      }
    }, 150_000);
});
