// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Browser, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer } from './browser-harness';

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const baseline = process.env.PROTO_UI_STARTUP_SUBJECT === 'baseline';
const output = process.env.PROTO_UI_STARTUP_EVIDENCE_DIR;
const records: unknown[] = [];
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  if (!process.env.PROTO_UI_BROWSER_BASE_URL)
    throw new Error('Startup evidence requires the dedicated built production-site owner.');
  baseUrl = await startServer('/zh-cn/');
  browser = await launchBrowser();
  if (output) await mkdir(output, { recursive: true });
}, 150_000);
afterAll(async () => {
  if (output)
    await writeFile(
      path.join(output, 'observations.json'),
      JSON.stringify({ revision, baseline, browser: browser?.version(), records }, null, 2)
    );
  await browser?.close();
  await stopServer();
}, 60_000);
async function capture(page: Page, id: string, facts: unknown) {
  let image;
  if (output) {
    const file = `${id}.png`;
    await page.screenshot({ path: path.join(output, file) });
    image = {
      file,
      sha256: createHash('sha256')
        .update(await readFile(path.join(output, file)))
        .digest('hex'),
    };
  }
  records.push({ id, revision, viewport: page.viewportSize(), url: page.url(), facts, image });
}
async function frames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}
async function homeReady(page: Page) {
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('[data-homepage-runtime]')?.dataset.runtimeState ===
      'ready',
    undefined,
    { timeout: 45_000 }
  );
}
const menu = (page: Page) =>
  page.locator(
    '.site-header-menu [data-projection-generation-state="active"] [data-demo-ref="home-menu"]'
  );

for (const width of [2048, 390, 430, 320]) {
  describe(`${width}px public website`, () => {
    it('keeps language and social surfaces current through open-menu theme cycles', async () => {
      const context = await browser.newContext({
        viewport: { width, height: width === 2048 ? 1237 : 900 },
        colorScheme: 'light',
        hasTouch: width < 500,
      });
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}/zh-cn/`);
        await homeReady(page);
        if (width < 500) await menu(page).tap();
        else await menu(page).click();
        for (const dark of [true, false, true]) {
          const themeButton = page.locator(
            '.site-header-theme [data-projection-generation-state="active"] [data-demo-ref="home-theme"]'
          );
          if (width < 500) await themeButton.tap();
          else await themeButton.click();
          await page.waitForFunction(
            (dark) => (document.documentElement.dataset.theme === 'dark') === dark,
            dark
          );
          await frames(page);
          const facts = await page.evaluate(() => {
            const header = document.querySelector<HTMLElement>('[data-homepage-runtime]')!;
            const canonical = getComputedStyle(header);
            const language = document.querySelector<HTMLElement>(
              '#home-language [data-projection-generation-state="active"] a'
            )!;
            const surfaces = [
              ...document.querySelectorAll<HTMLElement>(
                '#home-language [data-projection-generation-state="active"] [data-projection-scope], #home-social [data-projection-generation-state="active"] [data-projection-scope]'
              ),
            ];
            return {
              open: header.dataset.siteMenuOpen,
              theme: document.documentElement.dataset.theme,
              canonical: {
                background: canonical.getPropertyValue('--pui-background').trim(),
                foreground: canonical.getPropertyValue('--pui-foreground').trim(),
              },
              language: {
                text: language?.textContent,
                width: language?.getBoundingClientRect().width,
                height: language?.getBoundingClientRect().height,
              },
              surfaces: surfaces.map((element) => ({
                background: getComputedStyle(element).getPropertyValue('--pui-background').trim(),
                foreground: getComputedStyle(element).getPropertyValue('--pui-foreground').trim(),
              })),
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          await capture(page, `home-${width}-${dark ? 'dark' : 'light'}-${records.length}`, facts);
          if (!baseline) {
            expect(facts.open).toBe('true');
            expect(facts.language.text).toContain('English');
            expect(facts.language.width).toBeGreaterThan(20);
            expect(facts.surfaces).toHaveLength(2);
            for (const surface of facts.surfaces) expect(surface).toEqual(facts.canonical);
            expect(facts.overflow).toBe(false);
          }
        }
        await page.keyboard.press('Escape');
        await menu(page).click();
        await page.locator('#home-language [data-projection-generation-state="active"] a').focus();
        expect(
          await page
            .locator('#home-language [data-projection-generation-state="active"] a')
            .evaluate((e) => e === document.activeElement)
        ).toBe(true);
        await capture(page, `home-${width}-reopened-keyboard`, {
          input: 'native Escape, click, keyboard focus',
        });
      } finally {
        await context.close();
      }
    }, 90_000);

    it('fits the complete local Runtime label at ordinary widths', async () => {
      const page = await browser.newPage({
        viewport: { width, height: width === 2048 ? 1237 : 900 },
      });
      try {
        await page.goto(`${baseUrl}/zh-cn/ui-libraries/base/button/`);
        const value = page
          .locator('.proto-previewer [data-adapter-select-root] wc-shadcn-select-value')
          .first();
        await value.waitFor();
        await expect.poll(() => value.textContent()).toContain('Web Components');
        const facts = await value.evaluate((e) => ({
          text: e.textContent,
          height: e.getBoundingClientRect().height,
          lineHeight: Number.parseFloat(getComputedStyle(e).lineHeight),
          width: e.getBoundingClientRect().width,
          scrollWidth: e.scrollWidth,
          viewport: innerWidth,
        }));
        await capture(page, `button-${width}-runtime-label`, facts);
        if (!baseline && width !== 320) {
          expect(facts.height).toBeLessThanOrEqual(facts.lineHeight + 1);
          expect(facts.scrollWidth).toBeLessThanOrEqual(facts.width + 1);
        }
      } finally {
        await page.close();
      }
    }, 90_000);
  });
}

for (const route of ['/zh-cn/', '/zh-cn/ui-libraries/brutalist/card/']) {
  it(`${route} has a usable native cold-load disclosure before scripts complete`, async () => {
    const context = await browser.newContext({ viewport: { width: 2048, height: 1237 } });
    const page = await context.newPage();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/*', async (request) => {
      if (request.request().resourceType() === 'script') await gate;
      await request.continue().catch(() => {});
    });
    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit' });
      await page.locator('h1').waitFor();
      await page.waitForFunction(() => document.styleSheets.length > 0);
      const settingsVisible = await page.locator('[data-site-header-settings]').isVisible();
      const fallback = page.locator('[data-site-header-fallback-summary]');
      const isNative = (await fallback.count()) === 1;
      await capture(page, `cold-${route.includes('card') ? 'card' : 'home'}`, {
        scriptsHeld: true,
        settingsVisible,
        isNative,
      });
      let focusedHref: string | null = null;
      if (isNative) {
        await fallback.press('Enter');
        expect(await page.locator('[data-site-header-settings]').isVisible()).toBe(true);
        await capture(page, `cold-native-open-${route.includes('card') ? 'card' : 'home'}`, {
          scriptsHeld: true,
        });
        const link = page.locator('[data-site-header-settings] a[href]').first();
        await link.focus();
        focusedHref = await link.getAttribute('href');
      }
      release();
      await page.waitForSelector('[data-site-menu-ready]', { timeout: 45_000 });
      await capture(page, `loaded-${route.includes('card') ? 'card' : 'home'}`, {
        scriptsReleased: true,
      });
      if (!baseline) {
        expect(isNative).toBe(true);
        expect(settingsVisible).toBe(false);
        expect(await page.locator('[data-site-header]').getAttribute('data-site-menu-open')).toBe(
          'true'
        );
        expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe(
          focusedHref
        );
      }
    } finally {
      release();
      await context.close();
    }
  }, 90_000);
}

for (const width of [2048, 390]) {
  for (const route of ['/zh-cn/', '/en/ui-libraries/shadcn/dialog/']) {
    it(`${route} ${width}px records actual DialogMask paint and preference fallbacks`, async () => {
      const context = await browser.newContext({
        viewport: { width, height: width === 2048 ? 1237 : 900 },
        colorScheme: 'light',
      });
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}${route}`);
        if (route === '/zh-cn/') await homeReady(page);
        const trigger = page
          .locator(
            route === '/zh-cn/'
              ? '[data-home-showcase] [aria-haspopup="dialog"]'
              : '[data-previewer-id] [aria-haspopup="dialog"]'
          )
          .first();
        await trigger.waitFor();
        await trigger.click();
        const mask = page.locator('[data-pui-style~="backdrop-blur-xs"]').last();
        await mask.waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const mask = document.querySelector('[data-pui-style~="backdrop-blur-xs"]');
          return mask?.getAttribute('data-transition-state') === 'entered';
        });
        const read = () =>
          mask.evaluate((element) => ({
            backdropFilter: getComputedStyle(element).backdropFilter,
            background: getComputedStyle(element).backgroundColor,
            opacity: getComputedStyle(element).opacity,
            rect: element.getBoundingClientRect().toJSON(),
            reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches,
            forcedColors: matchMedia('(forced-colors: active)').matches,
          }));
        const normal = await read();
        await capture(
          page,
          `dialog-${route === '/zh-cn/' ? 'home' : 'docs'}-${width}-normal`,
          normal
        );
        if (!baseline) expect(normal.backdropFilter).toBe('blur(4px)');
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
        });
        await frames(page);
        await capture(
          page,
          `dialog-${route === '/zh-cn/' ? 'home' : 'docs'}-${width}-reduced-transparency`,
          { observationOnly: true, ...(await read()) }
        );
        await page.emulateMedia({ forcedColors: 'active' });
        await frames(page);
        await capture(
          page,
          `dialog-${route === '/zh-cn/' ? 'home' : 'docs'}-${width}-forced-colors`,
          { observationOnly: true, ...(await read()) }
        );
        // Preference captures expose actual current behavior. Their visual
        // acceptance stays open; these observations are not a fallback pass.
        await page.keyboard.press('Escape');
      } finally {
        await context.close();
      }
    }, 90_000);
  }
}

for (const route of ['/zh-cn/', '/zh-cn/ui-libraries/brutalist/card/']) {
  it(`${route} keeps native navigation and truthful preview text with JavaScript disabled`, async () => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 900 },
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${route}`);
      const fallback = page.locator('[data-site-header-fallback-summary]');
      const isNative = (await fallback.count()) === 1;
      if (isNative) await fallback.click();
      await capture(page, `noscript-${route.includes('card') ? 'card' : 'home'}-390`, {
        javaScriptEnabled: false,
        nativeDisclosure: isNative,
      });
      if (!baseline) {
        expect(isNative).toBe(true);
        expect(await page.locator('[data-site-header-settings] a[href]').first().isVisible()).toBe(
          true
        );
        if (route.includes('card')) {
          expect(await page.locator('.proto-previewer__skeleton').first().isVisible()).toBe(false);
          expect(await page.locator('.proto-previewer').first().innerText()).toContain(
            'JavaScript'
          );
        }
      }
    } finally {
      await context.close();
    }
  }, 60_000);
}
