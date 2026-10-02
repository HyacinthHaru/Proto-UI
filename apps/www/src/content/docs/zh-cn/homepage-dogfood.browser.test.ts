// @vitest-environment node
import type { Browser, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, RUNTIMES, startServer, stopServer } from './browser-harness';
const LABELS = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' } as const;
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  baseUrl = await startServer('/zh-cn/');
  browser = await launchBrowser();
}, 150_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
}, 60_000);
async function ready(page: Page, runtime: string) {
  await page.waitForFunction(
    (target) => {
      const page = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      const demo = document.querySelector<HTMLElement>('[data-home-demo-options]');
      return (
        page?.dataset.runtimeState === 'ready' &&
        page.dataset.runtime === target &&
        demo?.dataset.runnerState === 'ready' &&
        demo.dataset.runnerRuntime === target
      );
    },
    runtime,
    { timeout: 30_000 }
  );
}
async function switchRuntime(page: Page, runtime: keyof typeof LABELS) {
  const trigger = page.locator(
    '[data-homepage-runtime] [data-projection-control="runtime"] [role="combobox"]'
  );
  await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  await page
    .locator(`[id=${JSON.stringify(id)}]`)
    .getByRole('option', { name: LABELS[runtime], exact: true })
    .click();
  await ready(page, runtime);
}

describe.sequential('Homepage end-to-end dogfood boundary', () => {
  it('switches every registered homepage group through real adapters, preserving native anchors and theme', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
      await ready(page, 'wc');
      const fallbackLinks = await page.locator('[data-homepage-fallback] a').evaluateAll((links) =>
        links.map((link) => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim(),
          target: link.getAttribute('target'),
        }))
      );
      expect(fallbackLinks.length).toBeGreaterThan(5);
      expect(
        await page.locator('[data-home-demo-options] [data-projection-control="runtime"]').count()
      ).toBe(0);
      for (const runtime of [...RUNTIMES, 'react', 'wc'] as const) {
        await switchRuntime(page, runtime);
        const groups = await page.locator('[data-homepage-actions]').evaluateAll((roots) =>
          roots.map((root) => {
            const active = root.querySelectorAll<HTMLElement>(
              '[data-projection-generation-state="active"]'
            );
            const surfaces = [
              ...(active[0]?.querySelectorAll<HTMLElement>('[data-projection-prototype]') ?? []),
            ];
            return {
              activeCount: active.length,
              runtime:
                active[0]?.querySelector<HTMLElement>('[data-projection-scope]')?.dataset
                  .projectionRuntime,
              surfaces: surfaces.length,
              fallbackHidden: root.querySelector<HTMLElement>('[data-homepage-fallback]')?.hidden,
            };
          })
        );
        expect(groups.length).toBeGreaterThanOrEqual(3);
        for (const group of groups) {
          expect(group.activeCount).toBe(1);
          expect(group.runtime).toBe(runtime);

          expect(group.fallbackHidden).toBe(true);
        }
        const anchors = await page
          .locator('[data-homepage-mount] [data-projection-generation-state="active"] a')
          .evaluateAll((links) =>
            links.map((link) => ({
              href: link.getAttribute('href'),
              text: link.textContent?.trim(),
              target: link.getAttribute('target'),
            }))
          );
        expect(anchors).toEqual(fallbackLinks);
        expect(
          await page
            .locator(
              '[data-homepage-runtime] [data-projection-control="runtime"] [role="combobox"]'
            )
            .evaluate((element) => document.activeElement === element)
        ).toBe(true);
        const accessibleTheme = page
          .locator('[data-homepage-runtime]')
          .getByRole('button', { name: '切换主题', exact: true });
        expect(await accessibleTheme.count()).toBe(1);
        expect(await accessibleTheme.getAttribute('title')).toBe('切换主题');
        await accessibleTheme.hover();
        expect(await accessibleTheme.count(), 'name survives hover feedback').toBe(1);
        const themeBefore = await page.locator('html').getAttribute('data-theme');
        await page
          .locator(
            '[data-homepage-runtime] [data-projection-generation-state="active"] [data-demo-ref="home-theme"]'
          )
          .click();
        await expect
          .poll(() => page.locator('html').getAttribute('data-theme'))
          .toBe(themeBefore === 'dark' ? 'light' : 'dark');
        expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe(
          themeBefore === 'dark' ? 'light' : 'dark'
        );
        const trigger = page.locator(
          '[data-homepage-runtime] [data-projection-control="runtime"] [role="combobox"]'
        );
        await trigger.focus();
        await page.keyboard.press('Enter');
        const keyboardPortalId = await trigger.getAttribute('aria-controls');
        const keyboardPortal = page.locator(`[id=${JSON.stringify(keyboardPortalId)}]`);
        await keyboardPortal.waitFor({ state: 'visible' });
        // Select enters the selected item after its deferred overlay-ready step.
        // Escape must test an entered popup, not race that entry callback.
        await expect
          .poll(
            () =>
              keyboardPortal
                .getByRole('option')
                .evaluateAll((items) => items.some((item) => item === document.activeElement)),
            { timeout: 10_000 }
          )
          .toBe(true);
        await page.keyboard.press('Escape');
        await keyboardPortal.waitFor({ state: 'hidden' });
        await expect
          .poll(() => trigger.evaluate((element) => document.activeElement === element), {
            timeout: 10_000,
          })
          .toBe(true);
      }
      const chooseDemo = async (control: 'family' | 'component', label: string) => {
        const trigger = page.locator(
          `[data-home-demo-options] [data-projection-control="${control}"] [role="combobox"]`
        );
        await trigger.click();
        const id = await trigger.getAttribute('aria-controls');
        await page
          .locator(`[id=${JSON.stringify(id)}]`)
          .getByRole('option', { name: label, exact: true })
          .click();
      };
      await chooseDemo('component', 'Tabs');
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLElement>('[data-home-demo-options]')?.dataset
            .projectionComponent === 'tabs'
      );
      for (const family of ['brutalist', 'shadcn'] as const) {
        await chooseDemo('family', family === 'brutalist' ? 'Brutalist' : 'Shadcn');
        await page.waitForFunction(
          (target) =>
            document.querySelector<HTMLElement>('[data-homepage-runtime]')?.dataset.family ===
            target,
          family
        );
        for (const runtime of RUNTIMES) {
          await switchRuntime(page, runtime);
          const coordinates = await page.evaluate(() => {
            const root = document.querySelector<HTMLElement>('[data-homepage-runtime]')!;
            const demo = document.querySelector<HTMLElement>('[data-home-demo-options]')!;
            const scopes = [
              ...document.querySelectorAll<HTMLElement>(
                '[data-homepage-mount] [data-projection-generation-state="active"] [data-projection-scope], [data-home-demo-host] [data-projection-generation-state="active"] [data-projection-scope]'
              ),
            ];
            return {
              family: root.dataset.family,
              component: demo.dataset.projectionComponent,
              pageGeneration: root.dataset.runtimeGeneration,
              demoGeneration: demo.dataset.projectionGeneration,
              source: demo.querySelector('a[data-home-demo-source]')?.getAttribute('href'),
              scopes: scopes.map((scope) => ({
                runtime: scope.dataset.projectionRuntime,
                family: scope.dataset.projectionFamily,
                generation: scope.dataset.projectionGeneration,
              })),
            };
          });
          const accessibleTheme = page
            .locator('[data-homepage-runtime]')
            .getByRole('button', { name: '切换主题', exact: true });
          expect(await accessibleTheme.count(), `${family}/${runtime} icon accessible name`).toBe(
            1
          );
          expect(await accessibleTheme.getAttribute('title')).toBe('切换主题');
          expect(coordinates.family).toBe(family);
          expect(coordinates.component).toBe('tabs');
          expect(coordinates.demoGeneration).toBe(coordinates.pageGeneration);
          expect(coordinates.source).toContain(`demo-${family}-tabs.demo.ts`);
          for (const scope of coordinates.scopes) {
            expect(scope.runtime).toBe(runtime);
            expect(scope.family).toBe(family);
            expect(scope.generation).toBe(coordinates.pageGeneration);
          }
        }
      }
      expect(errors).toEqual([]);
      const link = page
        .locator('[data-homepage-runtime] [data-projection-generation-state="active"] a')
        .filter({ hasText: '文档' });
      const destination = await link.getAttribute('href');
      const opened = context.waitForEvent('page');
      await link.click({ modifiers: ['Control'] });
      const newPage = await opened;
      await newPage.waitForURL(`**${destination}`);
      await newPage.close();
      expect(new URL(page.url()).pathname).toBe('/zh-cn/');
    } finally {
      await context.close();
    }
  }, 240_000);

  it('keeps native navigation available without JavaScript and does not overflow mobile', async () => {
    const noJs = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    try {
      const page = await noJs.newPage();
      await page.goto(`${baseUrl}/zh-cn/`);
      const links = page.locator('[data-homepage-fallback] a');
      expect(await links.count()).toBeGreaterThan(5);
      expect(await links.first().isVisible()).toBe(true);
      await links.filter({ hasText: '文档' }).first().click();
      await page.waitForURL('**/zh-cn/start-here/what-you-saw/');
    } finally {
      await noJs.close();
    }
    const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/zh-cn/`);
      await ready(page, 'wc');
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        const geometry = await page.evaluate(() => {
          const header = document
            .querySelector<HTMLElement>('[data-homepage-runtime]')!
            .getBoundingClientRect();
          const nav = document
            .querySelector<HTMLElement>('#home-navigation')!
            .getBoundingClientRect();
          const status = document
            .querySelector<HTMLElement>('[data-homepage-runtime-status]')!
            .getBoundingClientRect();
          const brand = document.querySelector<HTMLElement>(
            '[data-homepage-mount] [data-home-brand]'
          )!;
          return {
            width: header.width,
            navWidth: nav.width,
            height: header.height,
            statusArea: status.width * status.height,
            brandSize: getComputedStyle(brand).fontSize,
          };
        });
        expect(geometry.navWidth, `${width}px full-width navigation`).toBeGreaterThanOrEqual(
          geometry.width * 0.95
        );
        expect(geometry.height, `${width}px compact header`).toBeLessThan(
          width === 390 ? 150 : 190
        );
        expect(geometry.statusArea).toBeLessThanOrEqual(1);
        expect(geometry.brandSize).toBe('16px');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await switchRuntime(page, 'vue2');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
    } finally {
      await context.close();
    }
  }, 90_000);
  it('retains saved React across cold library routes and exercises actual family chrome', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
      await ready(page, 'wc');
      await switchRuntime(page, 'react');
      expect(await page.evaluate(() => localStorage.getItem('preferred-prototypes-adapter'))).toBe(
        'react'
      );
      for (const route of [
        {
          path: '/zh-cn/ui-libraries/brutalist/components/tooltip/',
          family: 'brutalist',
          component: 'tooltip',
        },
        {
          path: '/zh-cn/ui-libraries/shadcn/radio-group/',
          family: 'shadcn',
          component: 'radio-group',
        },
      ]) {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
        const preview = page
          .locator('[data-previewer-id][data-projection-mode="fixed-family"]')
          .first();
        await preview.scrollIntoViewIfNeeded();
        const scope = preview.locator(
          '[data-projection-generation-state="active"] [data-projection-scope]'
        );
        await expect.poll(() => scope.getAttribute('data-projection-runtime')).toBe('react');
        expect(await page.locator('html').getAttribute('data-site-library-family')).toBe(
          route.family
        );
        expect(await preview.getAttribute('data-projection-family')).toBe(route.family);
        expect(await preview.getAttribute('data-projection-component')).toBe(route.component);
        const adapter = page.locator('header [data-adapter-select-root]').first();
        const language = page.locator('header [data-language-select-root]').first();
        const theme = page.locator('header [data-theme-toggle]').first();
        for (const control of [adapter, language]) {
          expect(await control.evaluate((element) => element.localName)).toBe(
            `wc-${route.family}-select-root`
          );
          expect(await control.getAttribute('data-pui-root')).not.toBeNull();
        }
        expect(await theme.evaluate((element) => element.localName)).toBe(
          `wc-${route.family}-button`
        );
        const chooseAdapter = async (value: 'vue' | 'react') => {
          const trigger = adapter.locator('[role="combobox"]');
          await trigger.click();
          const id = await trigger.getAttribute('aria-controls');
          expect(id).toBeTruthy();
          const portal = page.locator(`[id=${JSON.stringify(id)}]`);
          await portal.waitFor({ state: 'visible' });
          expect(await portal.getAttribute('data-site-control-family')).toBe(route.family);
          expect(await portal.getAttribute('data-pui-root')).not.toBeNull();
          await portal
            .getByRole('option', { name: value === 'vue' ? 'Vue' : 'React', exact: true })
            .click();
          await expect.poll(() => scope.getAttribute('data-projection-runtime')).toBe(value);
        };
        await chooseAdapter('vue');
        await chooseAdapter('react');
        const languageTrigger = language.locator('[role="combobox"]');
        await languageTrigger.click();
        const languagePortalId = await languageTrigger.getAttribute('aria-controls');
        const languagePortal = page.locator(`[id=${JSON.stringify(languagePortalId)}]`);
        await languagePortal.waitFor({ state: 'visible' });
        expect(await languagePortal.getAttribute('data-site-control-family')).toBe(route.family);
        expect(await languagePortal.getByRole('option').count()).toBeGreaterThan(1);
        await page.keyboard.press('Escape');
        await languagePortal.waitFor({ state: 'hidden' });
        const beforeTheme = await page.locator('html').getAttribute('data-theme');
        await page.evaluate(() => {
          const state = window as typeof window & { __siteThemeChanges?: number };
          state.__siteThemeChanges = 0;
          document.addEventListener('starlight-theme:change', () => {
            state.__siteThemeChanges = (state.__siteThemeChanges ?? 0) + 1;
          });
        });
        await theme.click();
        await expect
          .poll(() => page.locator('html').getAttribute('data-theme'))
          .toBe(beforeTheme === 'dark' ? 'light' : 'dark');
        expect(
          await page.evaluate(
            () => (window as typeof window & { __siteThemeChanges?: number }).__siteThemeChanges
          )
        ).toBe(1);
        expect(
          await page.evaluate(() => localStorage.getItem('preferred-prototypes-adapter'))
        ).toBe('react');
        expect(await preview.getAttribute('data-projection-family')).toBe(route.family);
        expect(await preview.getAttribute('data-projection-component')).toBe(route.component);
      }
    } finally {
      await context.close();
    }
  }, 180_000);
});
