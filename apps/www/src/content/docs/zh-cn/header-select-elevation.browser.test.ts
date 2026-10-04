// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Browser, Locator, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, RUNTIMES, startServer, stopServer } from './browser-harness';
import { revealHeaderPreferences } from './site-header-browser';
import { measureHeaderPreferenceFocusRing } from './site-header-breakpoint-evidence';

const LABELS = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' } as const;
const appearance = process.env.PROTO_UI_HEADER_SELECT_APPEARANCE ?? 'ghost';
if (appearance !== 'flat' && appearance !== 'ghost')
  throw new Error('Unknown Header appearance expectation');
const output =
  process.env.PROTO_UI_HEADER_SELECT_EVIDENCE_DIR ??
  (process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR
    ? path.join(process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR, 'header-select-elevation')
    : undefined);
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const HISTORICAL_FLAT_SHA = '8856a7112e86aa974f2ba388c3b8b70417268394';
if (appearance === 'flat' && sourceSha !== HISTORICAL_FLAT_SHA)
  throw new Error('Historical flat negative is bound only to its immutable baseline');
const subjectRole = appearance === 'flat' ? 'historical-negative' : 'candidate-acceptance';
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  baseUrl = await startServer('/zh-cn/');
  browser = await launchBrowser();
  if (output) await mkdir(output, { recursive: true });
}, 150_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
}, 60_000);

async function ready(page: Page, runtime: string) {
  await page.waitForFunction(
    (runtime) => {
      const root = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      return root?.dataset.runtimeState === 'ready' && root.dataset.runtime === runtime;
    },
    runtime,
    { timeout: 30_000 }
  );
}
function trigger(page: Page, id: 'runtime' | 'family') {
  return page.locator(
    `[data-homepage-runtime] [data-projection-control="${id}"] [role="combobox"]`
  );
}
async function choose(page: Page, control: 'runtime' | 'family', label: string) {
  await revealHeaderPreferences(page);
  const select = trigger(page, control);
  await select.click();
  const id = await select.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  await page
    .locator(`[id=${JSON.stringify(id)}]`)
    .getByRole('option', { name: label, exact: true })
    .click();
}
async function sample(select: Locator) {
  return select.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      shadow: style.boxShadow,
      radius: style.borderTopLeftRadius,
      border: style.borderTopWidth,
      borderColor: style.borderTopColor,
      background: style.backgroundColor,
      tokens: element.getAttribute('data-pui-style'),
      font: style.fontFamily,
      weight: style.fontWeight,
      hit: !!hit && element.contains(hit),
      owner: element.getAttribute('data-projection-owner'),
      generation: element.getAttribute('data-projection-generation'),
      focused: document.activeElement === element,
      focusVisible: element.matches(':focus-visible'),
    };
  });
}
async function keyboardFocus(page: Page, select: Locator) {
  // Escape already returned to this Trigger. Traverse away and back using
  // genuine keyboard input, without DOM focus or synthetic focus-visible state.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  expect(await select.evaluate((element) => document.activeElement === element)).toBe(true);
}

describe.sequential('Header public ghost presentation and labelled compact fields', () => {
  for (const family of appearance === 'flat' ? ['brutalist'] : ['shadcn', 'brutalist'])
    for (const runtime of RUNTIMES)
      for (const theme of ['light', 'dark'] as const) {
        it(`${family}/${runtime}/${theme}: ${subjectRole}; source-bound rest, hover, native focus, popup and compact reparenting`, async () => {
          const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
            colorScheme: theme,
          });
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const measurements: unknown[] = [];
          let disposition = 'not-completed';
          const capture = async (state: string) => {
            if (output)
              await page.screenshot({
                path: path.join(output, `${family}-${runtime}-${theme}-${appearance}-${state}.png`),
              });
          };
          try {
            await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
            await ready(page, 'wc');
            if (family === 'brutalist') await choose(page, 'family', 'Brutalist');
            await ready(page, 'wc');
            await page.waitForFunction(
              (family) =>
                document
                  .querySelector('[data-homepage-runtime]')
                  ?.getAttribute('data-site-library-family') === family ||
                document.documentElement.dataset.siteLibraryFamily === family,
              family
            );
            if (runtime !== 'wc') {
              await choose(page, 'runtime', LABELS[runtime]);
              await ready(page, runtime);
            }
            for (const width of [1440, 390]) {
              await page.setViewportSize({ width, height: 1000 });
              await revealHeaderPreferences(page);
              await page.mouse.move(0, 900);
              // Clear selection-return focus through native Tab before resting capture.
              await page
                .locator('[data-homepage-runtime] [data-projection-control-label="runtime"]')
                .click();
              for (const control of ['runtime', 'family'] as const) {
                const select = trigger(page, control);
                const rest = await sample(select);
                expect(rest.hit).toBe(true);
                expect(rest.height).toBeCloseTo(
                  appearance === 'flat' || width === 390 ? 44 : 36,
                  0
                );
                expect(rest.border).toBe(family === 'brutalist' ? '2px' : '1px');
                if (family === 'brutalist') {
                  expect(rest.radius).toBe('5px');
                  expect(rest.weight).toBe('500');
                  expect(rest.font).toContain('DM Sans');
                }
                if (appearance === 'ghost') {
                  expect(rest.tokens?.split(/\s+/).includes('border-transparent')).toBe(
                    width === 1440
                  );
                  if (width === 1440) expect(rest.borderColor).toBe('rgba(0, 0, 0, 0)');
                }
                expect(rest.shadow.includes('4px 4px 0px 0px')).toBe(false);
                await capture(`${width}-${control}-rest`);
                await select.hover();
                const hovered = await sample(select);
                expect(hovered.x - rest.x).toBeCloseTo(0, 1);
                expect(hovered.y - rest.y).toBeCloseTo(0, 1);
                expect(hovered.shadow.includes('4px 4px 0px 0px')).toBe(false);
                expect(hovered.hit).toBe(true);
                await capture(`${width}-${control}-hover`);
                await page.mouse.down();
                const pressed = await sample(select);
                expect(pressed.x).toBeCloseTo(hovered.x, 1);
                expect(pressed.y).toBeCloseTo(
                  hovered.y +
                    (appearance === 'ghost' && family === 'shadcn' && width === 390 ? 1 : 0),
                  1
                );
                await page.mouse.up();
                const id = await select.getAttribute('aria-controls');
                const popup = page.locator(`[id=${JSON.stringify(id)}]`);
                await popup.waitFor({ state: 'visible' });
                // Content retains its own family presentation; ghost affects Trigger only.
                const popupShadow = await popup.evaluate(
                  (element) => getComputedStyle(element).boxShadow
                );
                if (family === 'brutalist') expect(popupShadow).toBe('none');
                else {
                  expect(await popup.getAttribute('data-pui-style')).toContain('shadow-md');
                  expect(popupShadow).not.toBe('none');
                }
                await capture(`${width}-${control}-popup`);
                await page.keyboard.press('Escape');
                await page.waitForFunction(
                  (id) => document.activeElement?.getAttribute('aria-controls') === id,
                  id
                );
                await page.mouse.move(0, 900);
                await keyboardFocus(page, select);
                const focused = await sample(select);
                expect(focused.focused).toBe(true);
                expect(focused.focusVisible).toBe(true);
                expect(focused.shadow).not.toBe(rest.shadow);
                const ring = await select.evaluate(measureHeaderPreferenceFocusRing);
                expect(ring.ringWidth).toBe(family === 'shadcn' ? 3 : 2);
                expect(ring.ringOffset).toBe(family === 'shadcn' ? 0 : 2);
                expect(ring.inViewport).toBe(true);
                if (
                  appearance === 'flat' &&
                  sourceSha === HISTORICAL_FLAT_SHA &&
                  width === 390 &&
                  control === 'runtime'
                ) {
                  // The immutable before revision predates the ring gutter fix.
                  // Reproduce this exact old defect, never call it a healthy
                  // baseline or silently ignore other historical failures.
                  measurements.push({
                    stage: 'historical-negative',
                    width,
                    control,
                    ring,
                    classification: '8856a711-compact-runtime-focus-ring-clipped',
                  });
                  expect(ring.unclipped, 'the exact old clipping must be reproduced').toBe(false);
                  expect(errors).toEqual([]);
                  await capture('390-runtime-historical-clipped-focus-ring');
                  disposition = 'historical-negative-reproduced';
                  return;
                }
                expect(ring.unclipped).toBe(true);
                await capture(`${width}-${control}-focus`);
                const lease = await select.elementHandle();
                await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 1000 });
                await revealHeaderPreferences(page);
                expect(
                  await select.evaluate((current, original) => current === original, lease)
                ).toBe(true);
                const moved = await sample(select);
                expect(moved.owner).toBe(rest.owner);
                expect(moved.generation).toBe(rest.generation);
                expect(moved.focused).toBe(true);
                await page.setViewportSize({ width, height: 1000 });
                await revealHeaderPreferences(page);
                await page
                  .locator('[data-homepage-runtime] [data-projection-control-label="runtime"]')
                  .click();
                measurements.push({ control, width, rest, hovered, pressed, focused, ring, moved });
              }
            }
            // Hold the real pointer at the original edge; center-only paint
            // checks cannot detect feedback that moves its own hit owner away.
            const edgeTargets = [
              { id: 'runtime', locator: trigger(page, 'runtime') },
              ...(appearance === 'ghost'
                ? [
                    {
                      id: 'theme-button',
                      locator: page.locator(
                        '[data-homepage-runtime] .site-header-theme [data-projection-generation-state="active"] [data-demo-ref="home-theme"]'
                      ),
                    },
                  ]
                : []),
            ];
            for (const target of edgeTargets) {
              const edgeSelect = target.locator;
              const physicalOwner = await edgeSelect.elementHandle();
              for (const edge of ['left', 'top'] as const) {
                await page.mouse.move(0, 900);
                await expect
                  .poll(async () => (await edgeSelect.getAttribute('data-hovered')) === null)
                  .toBe(true);
                const before = await sample(edgeSelect);
                const point =
                  edge === 'left'
                    ? { x: before.x + 1, y: before.y + before.height / 2 }
                    : { x: before.x + before.width / 2, y: before.y + 1 };
                await page.mouse.move(point.x, point.y);
                const frames = await edgeSelect.evaluate(async (element, point) => {
                  const result = [];
                  for (let index = 0; index < 120; index++) {
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                    const rect = element.getBoundingClientRect();
                    const hit = document.elementFromPoint(point.x, point.y);
                    result.push({
                      x: rect.x,
                      y: rect.y,
                      hovered: element.hasAttribute('data-hovered'),
                      hit: !!hit && element.contains(hit),
                    });
                  }
                  return result;
                }, point);
                measurements.push({
                  stage: 'original-edge-stability',
                  control: target.id,
                  edge,
                  point,
                  before,
                  frames,
                });
                await capture(`390-${target.id}-${edge}-edge`);
                if (appearance === 'ghost') {
                  expect(
                    frames.every(
                      (frame) =>
                        Math.abs(frame.x - before.x) <= 0.5 && Math.abs(frame.y - before.y) <= 0.5
                    )
                  ).toBe(true);
                }
                expect(
                  new Set(
                    frames
                      .slice(-60)
                      .map((frame) => JSON.stringify([frame.x, frame.y, frame.hovered]))
                  ).size,
                  `${edge} original edge must not oscillate between hover and rest`
                ).toBe(1);
                expect(
                  frames.slice(-60).every((frame) => frame.hit),
                  `${edge} original body edge retains its actual interactive owner`
                ).toBe(true);
                if (target.id === 'runtime') {
                  await page.mouse.down();
                  await expect.poll(() => edgeSelect.getAttribute('data-pressed')).not.toBeNull();
                  await page.mouse.up();
                  const popupId = await edgeSelect.getAttribute('aria-controls');
                  await page
                    .locator(`[id=${JSON.stringify(popupId)}]`)
                    .waitFor({ state: 'visible' });
                  await page.keyboard.press('Escape');
                  expect(
                    await edgeSelect.evaluate((element, owner) => element === owner, physicalOwner)
                  ).toBe(true);
                  expect(
                    await edgeSelect.evaluate((element) => document.activeElement === element)
                  ).toBe(true);
                }
              }
            }
            expect(errors).toEqual([]);
            disposition = 'candidate-accepted';
          } catch (error) {
            disposition = 'unexpected-failure';
            try {
              await capture('failure');
            } catch (captureError) {
              console.error('Header failure capture unavailable', captureError);
            }
            throw error;
          } finally {
            if (output)
              await writeFile(
                path.join(output, `${family}-${runtime}-${theme}-${appearance}.json`),
                JSON.stringify(
                  {
                    sourceSha,
                    eventSha: process.env.GITHUB_SHA ?? null,
                    expectedSha:
                      process.env.PROTO_UI_HEADER_SELECT_SUBJECT_SHA ??
                      process.env.PROTO_UI_EXPECTED_REVISION ??
                      null,
                    probeSha: process.env.CANDIDATE_SHA ?? sourceSha,
                    appearance,
                    family,
                    subjectRole,
                    disposition,
                    route: '/zh-cn/',
                    runtime,
                    theme,
                    measurements,
                    errors,
                  },
                  null,
                  2
                )
              );
            await context.close();
          }
        }, 90_000);
      }
});
