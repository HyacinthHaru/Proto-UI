// @vitest-environment node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Browser, Locator, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer } from './browser-harness';

const ROUTE = '/zh-cn/start-here/quick-start/';
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  baseUrl = await startServer(ROUTE);
  browser = await launchBrowser();
}, 300_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
});

async function ready(root: Locator, runtime: string, family: string) {
  await root.page().waitForFunction(
    ({ selector, runtime, family }) => {
      const root = document.querySelector<HTMLElement>(selector);
      return (
        root?.dataset.copyView === 'ready' &&
        root.dataset.copyRuntime === runtime &&
        root.dataset.copyFamily === family
      );
    },
    {
      selector: await root.evaluate((el) => {
        el.id ||= `copy-test-${crypto.randomUUID()}`;
        return `#${el.id}`;
      }),
      runtime,
      family,
    }
  );
}
async function paint(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element),
      rect = element.getBoundingClientRect(),
      glyph = element.querySelector('svg')!.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      center: [
        Math.abs(rect.x + rect.width / 2 - glyph.x - glyph.width / 2),
        Math.abs(rect.y + rect.height / 2 - glyph.y - glyph.height / 2),
      ],
      glyph: [glyph.width, glyph.height],
      background: style.backgroundColor,
      shadow: style.boxShadow,
      transform: style.transform,
      tokens: element.getAttribute('data-pui-style'),
      focused: document.activeElement === element,
    };
  });
}
async function evidence(page: Page, root: Locator, name: string, facts: unknown) {
  const directory = join(process.env.RUNNER_TEMP || tmpdir(), 'homepage-evidence', 'copy-commands');
  await mkdir(directory, { recursive: true });
  await root.scrollIntoViewIfNeeded();
  await writeFile(
    join(directory, `${name}.json`),
    JSON.stringify(
      {
        exactSHA: process.env.GITHUB_SHA ?? 'local-unpublished',
        viewport: page.viewportSize(),
        url: page.url(),
        ...(facts as object),
      },
      null,
      2
    )
  );
  const session = await page.context().newCDPSession(page);
  const capture = await session.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(directory, `${name}.png`), Buffer.from(capture.data, 'base64'));
  await session.detach();
}

describe.sequential('Copy commands: real consumer recipes across public runtimes', () => {
  it('writes the real browser clipboard from trusted activation', async () => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'domcontentloaded' });
      const root = page.locator('.expressive-code [data-site-copy]').first();
      await ready(root, 'wc', 'shadcn');
      const expected = await root.getAttribute('data-site-copy-text');
      await root.locator('[data-demo-ref="copy-button"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLElement>('.expressive-code [data-demo-ref="copy-button"]')
            ?.dataset.copyState === 'success'
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    } finally {
      await context.close();
    }
  }, 60_000);
  it('leaves exact selectable source available without JavaScript', async () => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 1000 },
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'domcontentloaded' });
      const source = page.locator('.expressive-code pre').first();
      expect((await source.textContent())?.trim()).toBeTruthy();
      const facts = await source.evaluate((element) => ({
        selectable: getComputedStyle(element).userSelect !== 'none',
        overflow: getComputedStyle(element).overflowX,
      }));
      expect(facts.selectable).toBe(true);
      expect(['auto', 'scroll']).toContain(facts.overflow);
      expect(await page.locator('[data-site-copy] [role="button"]').count()).toBe(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      ).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
    }
  });
  for (const runtime of ['wc', 'react', 'vue', 'vue2']) {
    it(`${runtime}: InstallCommand keeps source-host identity separate from its Copy runtime`, async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 1000 } });
      await context.addInitScript((runtime) => {
        localStorage.setItem('preferred-prototypes-adapter', runtime);
        Object.assign(window, { __installCopyWrites: [] });
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText(text: string) {
              (window as any).__installCopyWrites.push(text);
              return Promise.resolve();
            },
          },
        });
      }, runtime);
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}/zh-cn/ui-libraries/shadcn/button/`, {
          waitUntil: 'domcontentloaded',
        });
        // This older documentation has no Vue2 installation snippet. Expose its
        // real WC source card as a labelled fixture; do not invent a Vue2 command.
        if (runtime === 'vue2')
          await page
            .locator('[data-install-command-card]')
            .first()
            .evaluate((card) => {
              const panel = card.closest<HTMLElement>('[data-adapter-panel]')!;
              panel.style.display = '';
              panel.dataset.copyFixture = 'wc-source-vue2-renderer';
            });
        const card = page.locator('[data-install-command-card]:visible').first();
        await card.waitFor();
        const root = card.locator('[data-site-copy]');
        const expected = await card
          .locator('[data-command-panel]:not([hidden]) [data-command]')
          .textContent();
        for (const family of ['shadcn', 'brutalist']) {
          await page.evaluate((family) => {
            document.documentElement.dataset.siteLibraryFamily = family;
            document
              .querySelectorAll<HTMLElement>('[data-site-family-scope]')
              .forEach((scope) => (scope.dataset.siteLibraryFamily = family));
          }, family);
          await ready(root, runtime, family);
          const button = root.locator('[data-demo-ref="copy-button"]');
          const count = await page.evaluate(() => (window as any).__installCopyWrites.length);
          await button.click();
          await page.waitForFunction(
            (count) => (window as any).__installCopyWrites.length === count + 1,
            count
          );
          expect(await page.evaluate(() => (window as any).__installCopyWrites.at(-1))).toBe(
            expected
          );
          const facts = await paint(button);
          expect(facts.glyph).toEqual([18, 18]);
          expect(Math.max(...facts.center)).toBeLessThanOrEqual(1);
          await evidence(page, root, `${runtime}-${family}-install`, {
            runtime,
            family,
            sourceHostFixture: runtime === 'vue2' ? 'existing wc snippet' : false,
            familyInput: 'explicit docs consumer fixture',
            facts,
          });
        }
      } finally {
        await context.close();
      }
    }, 90_000);
  }
  for (const runtime of ['wc', 'react', 'vue', 'vue2'])
    for (const family of ['shadcn', 'brutalist']) {
      it(`${runtime}/${family}: exact EC and CodePanel payload, paint, keyboard, failure and repeat`, async () => {
        const context = await browser.newContext({
          viewport: { width: runtime === 'wc' ? 1440 : 390, height: 1000 },
        });
        await context.addInitScript((runtime) => {
          localStorage.setItem('preferred-prototypes-adapter', runtime);
          const state = { writes: [] as string[], fail: false };
          Object.assign(window, { __copyFixture: state });
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText(text: string) {
                state.writes.push(text);
                return state.fail ? Promise.reject(new Error('fixture denial')) : Promise.resolve();
              },
            },
          });
          // Deliberate negative control: no successful fallback may mask a rejection.
          Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: () => false,
          });
        }, runtime);
        const page = await context.newPage();
        try {
          await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('[data-code-panel-init="1"]:visible');
          // Docs has no family picker. This explicit consumer-input fixture uses
          // the same family markers as applySiteLibraryFamily; screenshots label it.
          await page.evaluate((family) => {
            document.documentElement.dataset.siteLibraryFamily = family;
            document
              .querySelectorAll<HTMLElement>('[data-site-family-scope]')
              .forEach((scope) => (scope.dataset.siteLibraryFamily = family));
          }, family);
          const panel = page.locator('[data-code-shell]:visible').first();
          await panel.waitFor();
          const toggle = panel.locator('[data-code-toggle]');
          if (await toggle.isVisible()) await toggle.click();
          const roots = [
            page.locator('.expressive-code [data-site-copy]').first(),
            panel.locator('[data-site-copy]'),
          ];
          for (const [index, root] of roots.entries()) {
            await ready(root, runtime, family);
            const button = root.locator('[data-demo-ref="copy-button"]');
            const expected = await root.evaluate((root) =>
              root.hasAttribute('data-site-copy-text')
                ? root.getAttribute('data-site-copy-text')
                : root.closest('[data-code-shell]')!.querySelector<HTMLElement>('code')!.dataset
                    .rawCode
            );
            const name = await button.textContent();
            expect(name?.trim()).toBeTruthy();
            for (const theme of ['light', 'dark']) {
              await page.evaluate(
                (theme) => (document.documentElement.dataset.theme = theme),
                theme
              );
              await page.mouse.move(0, 0);
              await button.evaluate((element: HTMLElement) => element.blur());
              const baseline = await paint(button);
              expect([baseline.width, baseline.height]).toEqual(
                family === 'shadcn' ? [32, 32] : [40, 40]
              );
              expect(baseline.glyph).toEqual([18, 18]);
              expect(Math.max(...baseline.center)).toBeLessThanOrEqual(1);
              await button.hover();
              await page.waitForFunction(
                ({ selector, color }) =>
                  getComputedStyle(document.querySelector(selector)!).backgroundColor !== color,
                {
                  selector: `#${await root.getAttribute('id')} [data-demo-ref="copy-button"]`,
                  color: baseline.background,
                }
              );
              const hovered = await paint(button);
              expect(hovered.background).not.toBe(baseline.background);
              await page.mouse.move(0, 0);
              await page.keyboard.press('Tab');
              await button.focus();
              const ring = family === 'shadcn' ? 'ring-3' : 'ring-offset-2';
              await page.waitForFunction(
                ({ selector, ring }) =>
                  document
                    .querySelector(selector)
                    ?.getAttribute('data-pui-style')
                    ?.split(' ')
                    .includes(ring),
                {
                  selector: `#${await root.getAttribute('id')} [data-demo-ref="copy-button"]`,
                  ring,
                }
              );
              const focused = await paint(button);
              expect(focused.focused).toBe(true);
              expect(focused.shadow).not.toBe(baseline.shadow);
              await evidence(page, root, `${runtime}-${family}-${index}-${theme}-focus`, {
                runtime,
                family,
                theme,
                familyInput: 'explicit docs consumer fixture',
                baseline,
                hovered,
                focused,
              });
            }
            for (const key of ['Enter', 'Space']) {
              const count = await page.evaluate(
                () => ((window as any).__copyFixture.writes as string[]).length
              );
              await button.focus();
              expect(await button.evaluate((element) => document.activeElement === element)).toBe(
                true
              );
              const beforeScroll = await page.evaluate(() => scrollY);
              await page.keyboard.press(key);
              await page.waitForFunction(
                (count) => ((window as any).__copyFixture.writes as string[]).length === count + 1,
                count
              );
              await page.waitForFunction(
                ({ selector }) =>
                  document.querySelector<HTMLElement>(selector)?.dataset.copyState === 'success',
                { selector: `#${await root.getAttribute('id')} [data-demo-ref="copy-button"]` }
              );
              const writes = await page.evaluate(
                () => (window as any).__copyFixture.writes as string[]
              );
              expect(writes.length).toBe(count + 1);
              expect(writes.at(-1)).toBe(expected);
              expect(await button.textContent()).toBe(name);
              expect(await root.locator('[role="status"]').textContent()).toContain('已复制');
              // Copy remains focusable while pending; the effect owner handles
              // overlap. Settlement must not steal focus or allow Space scrolling.
              expect(await button.evaluate((element) => document.activeElement === element)).toBe(
                true
              );
              expect(await page.evaluate(() => scrollY)).toBe(beforeScroll);
            }
            await page.evaluate(() => {
              (window as any).__copyFixture.fail = true;
            });
            await button.click();
            await page.waitForFunction(
              ({ selector }) =>
                document.querySelector<HTMLElement>(selector)?.dataset.copyState === 'error',
              { selector: `#${await root.getAttribute('id')} [data-demo-ref="copy-button"]` }
            );
            expect(await root.locator('[role="status"]').textContent()).toContain('复制失败');
            await page.evaluate(() => {
              (window as any).__copyFixture.fail = false;
            });
            await button.click();
            await page.waitForFunction(
              ({ selector }) =>
                document.querySelector<HTMLElement>(selector)?.dataset.copyState === 'success',
              { selector: `#${await root.getAttribute('id')} [data-demo-ref="copy-button"]` }
            );
            expect(await button.textContent()).toBe(name);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          ).toBeLessThanOrEqual(1);
          expect(await page.locator('.expressive-code .copy button').count()).toBe(0);
        } finally {
          await context.close();
        }
      }, 90_000);
    }
});
