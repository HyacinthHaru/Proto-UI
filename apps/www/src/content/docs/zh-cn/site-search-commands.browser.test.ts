// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Browser, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer } from './browser-harness';

let browser: Browser;
let baseUrl: string;
let source: { sha: string; dirty: boolean };
const searchRoute = (family: 'shadcn' | 'brutalist') =>
  `/zh-cn/ui-libraries/${family}/${family === 'brutalist' ? 'components/' : ''}button/`;
const evidenceDirectory = path.join(
  process.env.RUNNER_TEMP ?? os.tmpdir(),
  'homepage-evidence',
  'search-commands'
);

beforeAll(async () => {
  source = {
    sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
      encoding: 'utf8',
    }).trim(),
  };
  baseUrl = await startServer(searchRoute('shadcn'));
  browser = await launchBrowser();
}, 150_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
}, 60_000);

const diagnosticPages = new Map<
  Page,
  { id: string; stage: string; writes: Promise<void>; errors: string[] }
>();
function stage(page: Page, id: string, step: string) {
  const existing = diagnosticPages.get(page);
  const entry = existing ?? { id, stage: step, writes: Promise.resolve(), errors: [] as string[] };
  if (!existing) {
    page.on('pageerror', (error) => entry.errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') entry.errors.push(`console: ${message.text()}`);
    });
  }
  entry.id = id;
  entry.stage = step;
  const observation = { source, id, stage: step, at: new Date().toISOString(), url: page.url() };
  entry.writes = entry.writes.then(async () => {
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      path.join(evidenceDirectory, `${id}-progress.json`),
      JSON.stringify(observation, null, 2)
    );
  });
  diagnosticPages.set(page, entry);
}
async function captureFailure(page: Page) {
  const entry = diagnosticPages.get(page);
  if (!entry) return;
  await capture(page, entry.id, `failure-${entry.stage}`).catch((error) =>
    console.warn('[Search evidence] failure capture unavailable', error)
  );
}
afterEach(async () => {
  // A case-level timeout can interrupt an await before its catch/finally runs.
  for (const [page, entry] of diagnosticPages) {
    await entry.writes;
    if (!page.isClosed()) {
      await captureFailure(page);
      await page.context().close();
    }
  }
  diagnosticPages.clear();
});

async function capture(page: Page, id: string, state: string) {
  await mkdir(evidenceDirectory, { recursive: true });
  const screenshot = `${id}-${state}.png`;
  await page.screenshot({ path: path.join(evidenceDirectory, screenshot) });
  const observed = await page.locator('site-search').evaluate((search) => ({
    family: document.documentElement.dataset.siteLibraryFamily,
    searchState: { ...(search as HTMLElement).dataset },
    native: {
      dialog: search.querySelector('dialog')?.getBoundingClientRect().toJSON(),
      frame: search.querySelector('.dialog-frame')?.getBoundingClientRect().toJSON(),
      activeElement: document.activeElement?.outerHTML.slice(0, 2000),
    },
    timeline: (window as any).__puiSearchTimeline ?? [],
    theme: document.documentElement.dataset.theme,
    dialogOpen: search.querySelector('dialog')?.open,
    service: search.querySelector('.search-failure') ? 'production-pagefind' : 'dev-warning',
    focused:
      document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.className,
    commands: [
      ...search.querySelectorAll<HTMLElement>(
        '[data-projection-generation-state="active"] [data-search-command]'
      ),
    ].map((button) => ({
      tag: button.localName,
      role: button.getAttribute('role'),
      disabled: button.getAttribute('aria-disabled'),
      connected: button.isConnected,
      tabIndex: button.tabIndex,
      inertAncestor: button.closest('[inert]')?.outerHTML.slice(0, 600),
      viewPending: button.hasAttribute('data-pui-view-pending'),
      tokens: button.getAttribute('data-pui-style'),
      box: button.getBoundingClientRect().toJSON(),
      border: getComputedStyle(button).borderWidth,
      shadow: getComputedStyle(button).boxShadow,
    })),
  }));
  await writeFile(
    path.join(evidenceDirectory, `${id}-${state}.json`),
    JSON.stringify(
      {
        schemaVersion: 1,
        source,
        capturedAt: new Date().toISOString(),
        screenshot,
        url: page.url(),
        viewport: page.viewportSize(),
        observed,
        errors: diagnosticPages.get(page)?.errors ?? [],
        renderer: 'Real Chromium via existing repository browser harness',
        scope:
          'Search trigger/close/retry Buttons only; native dialog and Pagefind visuals remain CSS-owned',
      },
      null,
      2
    )
  );
}

async function installOpenCounter(page: Page) {
  await page.addInitScript(() => {
    const timeline: unknown[] = [];
    (window as any).__puiSearchTimeline = timeline;
    const describe = (node: EventTarget | null) =>
      node instanceof Element
        ? {
            tag: node.localName,
            id: node.id,
            command: (node as HTMLElement).dataset.searchCommand,
            role: node.getAttribute('role'),
            disabled: node.getAttribute('aria-disabled'),
            generation: (node as HTMLElement).dataset.projectionGeneration,
            connected: node.isConnected,
          }
        : null;
    const record = (type: string, target: EventTarget | null, extra: unknown = null) => {
      timeline.push({
        at: performance.now(),
        type,
        target: describe(target),
        active: describe(document.activeElement),
        open: document.querySelector('site-search dialog')?.hasAttribute('open'),
        extra,
      });
      if (timeline.length > 160) timeline.shift();
    };
    for (const type of [
      'pointerdown',
      'pointerup',
      'click',
      'keydown',
      'keyup',
      'focusin',
      'focusout',
      'cancel',
      'close',
    ]) {
      for (const capture of [true, false])
        window.addEventListener(
          type,
          (event) => {
            if (
              document.querySelector('site-search dialog[open]') ||
              (event.target instanceof Element && event.target.closest('site-search'))
            ) {
              record(`${type}:${capture ? 'capture' : 'bubble'}`, event.target, {
                key: (event as KeyboardEvent).key,
                x: (event as MouseEvent).clientX,
                y: (event as MouseEvent).clientY,
                trusted: event.isTrusted,
                kind: event.constructor.name,
              });
            }
          },
          capture
        );
    }
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...args) {
      const tracked = this.hasAttribute('data-search-command');
      if (tracked) record('native-focus:before', this);
      const result = originalFocus.apply(this, args);
      if (tracked) record('native-focus:after', this);
      return result;
    };
    const originalClose = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.close = function (...args) {
      record('dialog-close:before', this);
      const result = originalClose.apply(this, args);
      record('dialog-close:after', this);
      return result;
    };
    const original = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function () {
      this.dataset.testOpenCount = String(Number(this.dataset.testOpenCount ?? 0) + 1);
      return original.call(this);
    };
  });
}

// The standard harness serves Astro dev. That path intentionally renders the
// development warning instead of Pagefind. These cases prove actual command
// projection, responsive layout, modal activation and focus restoration; they
// do not claim a live production index or retry has been exercised.
describe.sequential('Search family Button commands', () => {
  for (const family of ['shadcn', 'brutalist'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const width of [390, 1440]) {
        it(`${family} ${theme} ${width}px preserves activation, dismissal and focus`, async () => {
          const context = await browser.newContext({
            viewport: { width, height: 960 },
            colorScheme: theme,
          });
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.addInitScript(
            (theme) => localStorage.setItem('starlight-theme', theme),
            theme
          );
          await installOpenCounter(page);
          const id = `${family}-${theme}-${width}`;
          stage(page, id, 'navigate');
          try {
            const response = await page.goto(`${baseUrl}${searchRoute(family)}`, {
              waitUntil: 'networkidle',
            });
            expect(response?.ok(), `Expected existing ${family} documentation route`).toBe(true);
            const trigger = page.locator(
              'site-search [data-projection-generation-state="active"] [data-open-modal]'
            );
            const dialog = page.locator('site-search dialog');
            const close = page.locator(
              'site-search [data-projection-generation-state="active"] [data-close-modal]'
            );
            stage(page, id, 'initial-ready');
            await expect.poll(() => trigger.getAttribute('aria-disabled')).toBe('false');
            expect(await trigger.evaluate((button) => button.localName)).toBe(
              `wc-${family}-button`
            );
            expect(await trigger.getAttribute('role')).toBe('button');
            await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe(theme);
            // P-SHADCN-BUTTON-COLOR-SCHEME-STYLES: dark outline has its
            // own input tint; Brutalist surface retains its paired tokens.
            expect(await trigger.getAttribute('data-pui-style')).toContain(
              family === 'brutalist'
                ? 'bg-secondary-background'
                : theme === 'dark'
                  ? 'bg-input/30'
                  : 'bg-background'
            );
            const box = await trigger.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(43);
            if (width < 1100) expect(box!.width).toBeCloseTo(44, 0);
            else expect(box!.width).toBeGreaterThan(150);
            await capture(page, id, 'trigger');
            await trigger.locator('svg').click();
            await expect
              .poll(() => dialog.evaluate((element) => (element as HTMLDialogElement).open))
              .toBe(true);
            expect(await dialog.getAttribute('data-test-open-count')).toBe('1');
            expect(await close.evaluate((button) => button.localName)).toBe(`wc-${family}-button`);
            expect(await close.getAttribute('data-pui-style')).toContain(
              family === 'brutalist' ? 'bg-secondary-background' : 'bg-transparent'
            );
            await capture(page, id, 'open');
            await close.locator('svg').click();
            await expect
              .poll(() => trigger.evaluate((element) => element === document.activeElement))
              .toBe(true);
            await trigger.press('Enter');
            await expect.poll(() => dialog.getAttribute('data-test-open-count')).toBe('2');
            await page.keyboard.press('Escape');
            await expect
              .poll(() => trigger.evaluate((element) => element === document.activeElement))
              .toBe(true);
            await trigger.press('Space');
            await expect.poll(() => dialog.getAttribute('data-test-open-count')).toBe('3');
            stage(page, id, 'backdrop');
            await page.mouse.click(2, 2);
            await expect
              .poll(() => dialog.evaluate((element) => (element as HTMLDialogElement).open))
              .toBe(false);
            await expect
              .poll(() => trigger.evaluate((element) => element === document.activeElement))
              .toBe(true);
            for (const key of ['Control+k', 'Meta+k']) {
              await page.keyboard.press(key);
              await expect
                .poll(() => dialog.evaluate((element) => (element as HTMLDialogElement).open))
                .toBe(true);
              await page.keyboard.press(key);
              await expect
                .poll(() => dialog.evaluate((element) => (element as HTMLDialogElement).open))
                .toBe(false);
              await expect
                .poll(() => trigger.evaluate((element) => element === document.activeElement))
                .toBe(true);
            }
            expect(errors).toEqual([]);
          } catch (error) {
            await captureFailure(page);
            throw error;
          } finally {
            await context.close();
          }
        }, 60_000);
      }
    }
  }
});

const runtimeLabels = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' };
async function choosePageControl(page: Page, control: 'family' | 'runtime', label: string) {
  const trigger = page.locator(
    `[data-homepage-runtime] [data-projection-generation-state="active"] [data-projection-control="${control}"] [role="combobox"]`
  );
  await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  await page
    .locator(`[id=${JSON.stringify(id)}]`)
    .getByRole('option', { name: label, exact: true })
    .click();
}
async function homeReady(page: Page, family: string, runtime: string) {
  await page.waitForFunction(
    ({ family, runtime }) => {
      const home = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      const search = home?.querySelector<HTMLElement>('site-search');
      return (
        home?.dataset.runtimeState === 'ready' &&
        home.dataset.family === family &&
        home.dataset.runtime === runtime &&
        search?.dataset.searchRuntime === runtime &&
        search.dataset.searchFamily === family &&
        search.dataset.searchGeneration === home.dataset.runtimeGeneration
      );
    },
    { family, runtime }
  );
}

for (const width of [1280, 1440, 2048]) {
  for (const family of ['shadcn', 'brutalist'] as const) {
    it(`homepage ${family} ${width}px aligns actual Search and both selectors in every runtime`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await installOpenCounter(page);
      try {
        expect((await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' }))?.ok()).toBe(
          true
        );
        await homeReady(page, 'shadcn', 'wc');
        if (family === 'brutalist') await choosePageControl(page, 'family', 'Brutalist');
        for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
          if (runtime !== 'wc') await choosePageControl(page, 'runtime', runtimeLabels[runtime]);
          await homeReady(page, family, runtime);
          const geometry = await page.locator('[data-homepage-runtime]').evaluate((home) => {
            const select = (name: string) =>
              home.querySelector<HTMLElement>(
                `[data-projection-generation-state="active"] [data-projection-control="${name}"] [role="combobox"]`
              )!;
            const search = home.querySelector<HTMLElement>(
              'site-search [data-projection-generation-state="active"] [data-open-modal]'
            )!;
            const rect = (node: HTMLElement) => {
              const box = node.getBoundingClientRect();
              return {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                bottom: box.bottom,
                center: box.y + box.height / 2,
                scrollWidth: node.scrollWidth,
                clientWidth: node.clientWidth,
              };
            };
            const selectors = ['family', 'runtime'].map((name) => {
              const trigger = select(name);
              const label = trigger
                .closest('[data-projection-control]')!
                .querySelector<HTMLElement>('.pui-projection-control-label')!;
              const value = trigger.querySelector<HTMLElement>(
                '[data-projection-prototype$="select-value"]'
              );
              return {
                name,
                trigger: rect(trigger),
                label: rect(label),
                value: value ? rect(value) : null,
                text: trigger.textContent,
              };
            });
            const searchRoot = home.querySelector<HTMLElement>('site-search')!;
            return {
              search: rect(search),
              selectors,
              overflow: document.documentElement.scrollWidth - innerWidth,
              pageGeneration: (home as HTMLElement).dataset.runtimeGeneration,
              searchGeneration: searchRoot.dataset.searchGeneration,
              commands: [
                ...searchRoot.querySelectorAll<HTMLElement>(
                  '[data-projection-generation-state="active"] [data-search-command]'
                ),
              ].map((node) => ({
                command: node.dataset.searchCommand,
                prototype: node.dataset.projectionPrototype,
                generation: node.dataset.projectionGeneration,
                runtime: node.dataset.projectionRuntime,
                family: node.dataset.projectionFamily,
              })),
            };
          });
          const id = `home-${family}-${runtime}-${width}`;
          await capture(page, id, 'geometry');
          await writeFile(
            path.join(evidenceDirectory, `${id}-rects.json`),
            JSON.stringify({ source, width, family, runtime, geometry }, null, 2)
          );
          expect(geometry.overflow).toBeLessThanOrEqual(1);
          expect(geometry.commands).toHaveLength(3);
          expect(Math.abs(geometry.search.height - 44)).toBeLessThanOrEqual(1);
          for (const selector of geometry.selectors) {
            expect(Math.abs(selector.trigger.height - 44)).toBeLessThanOrEqual(1);
            expect(Math.abs(selector.trigger.bottom - geometry.search.bottom)).toBeLessThanOrEqual(
              1
            );
            expect(Math.abs(selector.trigger.center - geometry.search.center)).toBeLessThanOrEqual(
              1
            );
            expect(selector.label.bottom).toBeLessThanOrEqual(selector.trigger.y + 1);
            expect(selector.trigger.scrollWidth - selector.trigger.clientWidth).toBeLessThanOrEqual(
              1
            );
            expect(selector.value, 'actual Select value projection').not.toBeNull();
            if (selector.value)
              expect(selector.value.scrollWidth - selector.value.clientWidth).toBeLessThanOrEqual(
                1
              );
          }
          for (const command of geometry.commands) {
            expect(command.prototype).toBe(`${family}-button`);
            expect(command.generation).toBe(geometry.pageGeneration);
            expect(command.runtime).toBe(runtime);
            expect(command.family).toBe(family);
          }
          const trigger = page.locator(
            'site-search [data-projection-generation-state="active"] [data-open-modal]'
          );
          await trigger.locator('svg').click();
          expect(
            await page
              .locator('site-search dialog')
              .evaluate((dialog) => (dialog as HTMLDialogElement).open)
          ).toBe(true);
          await page.keyboard.press('Escape');
          await expect
            .poll(() => trigger.evaluate((node) => node === document.activeElement))
            .toBe(true);
        }
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }, 180_000);
  }
}

it('homepage keeps one native dialog through open-runtime transitions and repeat initialization', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await installOpenCounter(page);
  stage(page, 'home-open-runtime', 'navigate');
  try {
    expect((await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' }))?.ok()).toBe(true);
    await homeReady(page, 'shadcn', 'wc');
    await page
      .locator('site-search [data-projection-generation-state="active"] [data-open-modal]')
      .click();
    await page.evaluate(() => {
      const search = document.querySelector('site-search') as HTMLElement & {
        connectedCallback(): void;
      };
      Object.assign(window, { __originalSearchDialog: search.querySelector('dialog') });
      search.connectedCallback();
      search.connectedCallback();
    });
    for (const runtime of ['react', 'vue', 'vue2', 'wc']) {
      // Existing page preference ingress, including updates while native modal
      // inertness prevents interacting with the Header's Select itself.
      await page.evaluate(
        (runtime) =>
          document.dispatchEvent(
            new CustomEvent('proto-adapter:change', { detail: { adapter: runtime } })
          ),
        runtime
      );
      await homeReady(page, 'shadcn', runtime);
      expect(
        await page.evaluate(
          () =>
            document.querySelector('site-search dialog') === (window as any).__originalSearchDialog
        )
      ).toBe(true);
      expect(
        await page
          .locator('site-search dialog')
          .evaluate((dialog) => (dialog as HTMLDialogElement).open)
      ).toBe(true);
      const close = page.locator(
        'site-search [data-projection-generation-state="active"] [data-close-modal]'
      );
      stage(page, 'home-open-runtime', `${runtime}-close-focus`);
      await close.click();
      const trigger = page.locator(
        'site-search [data-projection-generation-state="active"] [data-open-modal]'
      );
      await expect
        .poll(() => trigger.evaluate((node) => node === document.activeElement))
        .toBe(true);
      await trigger.press('Space');
    }
    await capture(page, 'home-open-runtime', 'final');
  } catch (error) {
    await captureFailure(page);
    throw error;
  } finally {
    await context.close();
  }
}, 120_000);

it('keeps a documentation link available without JavaScript', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  stage(page, 'no-js', 'navigate-source');
  try {
    expect((await page.goto(`${baseUrl}${searchRoute('shadcn')}`))?.ok()).toBe(true);
    stage(page, 'no-js', 'find-link');
    const link = page.locator('site-search noscript a');
    expect(await link.isVisible()).toBe(true);
    stage(page, 'no-js', 'click-link');
    await link.click();
    stage(page, 'no-js', 'destination-url');
    await page.waitForURL('**/zh-cn/ui-libraries/');
  } finally {
    await context.close();
  }
});
