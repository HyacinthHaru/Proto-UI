// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Locator } from 'playwright-core';
import { afterAll, beforeAll, expect, it } from 'vitest';
import {
  RUNTIMES,
  applyColorScheme,
  chromeExecutable,
  openRoute,
  selectRuntime,
  startServer,
  stopServer,
} from './browser-harness';

const route = '/zh-cn/ui-libraries/shadcn/toggle/';
const upstream = '02cad61166c4c20edbc8a3f71bd720eed4c1f49b';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const patch = execFileSync('git', ['diff', '--binary', 'HEAD']);
const source = {
  sourceSha,
  upstream,
  dirty: patch.length > 0,
  patchSha256: createHash('sha256').update(patch).digest('hex'),
};
const output = process.env.PUI_FINF_FEATURE_EVIDENCE_DIR;
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.CANDIDATE_SHA || !output)
    throw new Error('Native evidence requires the official exact-head GitHub Actions job');
  expect(sourceSha).toBe(process.env.CANDIDATE_SHA);
  expect(source.dirty).toBe(false);
  expect(
    execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim()
  ).toBe('');
  if (process.env.PROTO_UI_BROWSER_BASE_URL)
    throw new Error('Use only this job own loopback test server');
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'shadcn-toggle-source.json'),
    JSON.stringify(
      {
        ...source,
        plannedRuntimeCases: 4,
        themesPerCase: 2,
        status: 'Planned; not acceptance until Vitest completes',
      },
      null,
      2
    )
  );
  baseUrl = await startServer(route);
  browser = await chromium.launch({
    executablePath: await chromeExecutable(),
    headless: true,
    chromiumSandbox: true,
    args: ['--disable-dev-shm-usage'],
  });
  if (output) await mkdir(output, { recursive: true });
}, 150_000);
afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await stopServer();
  }
}, 60_000);

async function observe(target: Locator) {
  return target.evaluate((element) => {
    const css = getComputedStyle(element),
      rect = element.getBoundingClientRect();
    // Color conversion only; never inserts an oracle element or component CSS.
    const ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
    const rgba = (color: string) => {
      if (!CSS.supports('color', color)) throw new Error('Unresolved observed color');
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    return {
      height: rect.height,
      minWidth: parseFloat(css.minWidth),
      padding: parseFloat(css.paddingLeft),
      gap: parseFloat(css.columnGap),
      radius: parseFloat(css.borderTopLeftRadius),
      border: parseFloat(css.borderTopWidth),
      shadow: css.boxShadow,
      borderColor: rgba(css.borderTopColor),
      inputColor: rgba(css.getPropertyValue('--pui-input').trim()),
      radiusBase: css.getPropertyValue('--pui-radius').trim(),
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      background: rgba(css.backgroundColor),
      foreground: rgba(css.color),
      accent: rgba(css.getPropertyValue('--pui-accent').trim()),
      accentForeground: rgba(css.getPropertyValue('--pui-accent-foreground').trim()),
      muted: rgba(css.getPropertyValue('--pui-muted').trim()),
      mutedForeground: rgba(css.getPropertyValue('--pui-muted-foreground').trim()),
      active: element.getAttribute('aria-pressed'),
      disabled: element.getAttribute('aria-disabled'),
      opacity: parseFloat(css.opacity),
      pointerEvents: css.pointerEvents,
    };
  });
}

for (const runtime of RUNTIMES) {
  it(`New York Toggle ${runtime} real dimensions and paint in light/dark`, async () => {
    const { context, page, previewer } = await openRoute(browser, baseUrl, route, {
      width: 1100,
      height: 900,
    });
    page.setDefaultTimeout(10_000);
    const watchdog = setTimeout(() => {
      void context.close().catch(() => {});
    }, 85_000);
    let failure: string | null = null;
    const subject = (ref: string) => previewer.locator(`.host [data-demo-ref="${ref}"]`);
    const receipt: unknown[] = [];
    const capture = async (scheme: string, state: string) => {
      if (!output) return;
      const name = `shadcn-toggle-${runtime}-${scheme}-${state}`;
      await previewer.screenshot({ path: path.join(output, `${name}.png`) });
      await writeFile(
        path.join(output, `${name}.json`),
        JSON.stringify(
          {
            ...source,
            runtime,
            scheme,
            state,
            scope: 'Real public demo; not packed/GPUI or complete Toggle parity',
            observations: receipt,
          },
          null,
          2
        )
      );
    };
    try {
      await selectRuntime(page, previewer, runtime, '[aria-pressed]', 6);
      for (const scheme of ['light', 'dark'] as const) {
        await applyColorScheme(page, scheme);
        await page.mouse.move(0, 0);
        for (const [ref, scale, padding] of [
          ['default', 2.25, 0.5],
          ['small', 2, 0.375],
          ['large', 2.5, 0.625],
        ] as const) {
          const facts = await observe(subject(ref));
          expect(Math.abs(facts.height - facts.rem * scale)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(facts.minWidth - facts.rem * scale)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(facts.padding - facts.rem * padding)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(facts.gap - facts.rem * 0.5)).toBeLessThanOrEqual(0.5);
          expect(facts.border).toBe(0);
          const radiusBase =
            parseFloat(facts.radiusBase) * (facts.radiusBase.endsWith('rem') ? facts.rem : 1);
          expect(Math.abs(facts.radius - Math.max(radiusBase - 2, 0))).toBeLessThanOrEqual(0.5);
          receipt.push({ scheme, ref, facts });
        }
        const outline = await observe(subject('outline'));
        expect(outline.border).toBe(1);
        expect(outline.borderColor).toEqual(outline.inputColor);
        // A transparent ring layer alone is not the pinned shadow-xs paint.
        expect(outline.shadow).toMatch(/rgba\(0, 0, 0, 0\.05\) 0px 1px 2px 0px/);
        await expect
          .poll(async () => {
            const facts = await observe(subject('active-outline'));
            return (
              JSON.stringify(facts.background) === JSON.stringify(facts.accent) &&
              JSON.stringify(facts.foreground) === JSON.stringify(facts.accentForeground)
            );
          })
          .toBe(true);
        const active = await observe(subject('active-outline'));
        expect(active.active).toBe('true');
        expect(active.background).toEqual(active.accent);
        expect(active.foreground).toEqual(active.accentForeground);
        const disabled = await observe(subject('disabled-active'));
        expect(disabled.disabled).toBe('true');
        expect(disabled.active).toBe('true');
        expect(disabled.opacity).toBe(0.5);
        expect(disabled.pointerEvents).toBe('none');
        receipt.push({ scheme, outline, active, disabled });
        await capture(scheme, 'rest');
        for (const ref of ['default', 'outline'] as const) {
          const target = subject(ref);
          await target.hover();
          await expect
            .poll(async () => {
              const facts = await observe(target);
              return (
                JSON.stringify(facts.background) ===
                  JSON.stringify(ref === 'outline' ? facts.accent : facts.muted) &&
                JSON.stringify(facts.foreground) ===
                  JSON.stringify(ref === 'outline' ? facts.accentForeground : facts.mutedForeground)
              );
            })
            .toBe(true);
          receipt.push({ scheme, ref, state: 'hover', facts: await observe(target) });
          await capture(scheme, `${ref}-hover`);
          await target.click();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('true');
          await expect
            .poll(async () => {
              const facts = await observe(target);
              return (
                JSON.stringify(facts.background) === JSON.stringify(facts.accent) &&
                JSON.stringify(facts.foreground) === JSON.stringify(facts.accentForeground)
              );
            })
            .toBe(true);
          receipt.push({ scheme, ref, state: 'active', facts: await observe(target) });
          await capture(scheme, `${ref}-active`);
          await target.click();
          await expect.poll(() => target.getAttribute('aria-pressed')).toBe('false');
        }
      }
    } catch (error) {
      failure = String(error);
      throw error;
    } finally {
      clearTimeout(watchdog);
      try {
        await context.close();
      } finally {
        if (output)
          await writeFile(
            path.join(output, `shadcn-toggle-${runtime}-result.json`),
            JSON.stringify(
              {
                ...source,
                runtime,
                failure,
                observations: receipt,
                scope: 'Callback result only; Vitest terminal verdict remains authoritative',
              },
              null,
              2
            )
          );
      }
    }
  }, 90_000);
}
