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
        await page.keyboard.press('Escape');
        expect(await trigger.evaluate((element) => document.activeElement === element)).toBe(true);
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
});
