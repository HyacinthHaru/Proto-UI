// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromeExecutable, startServer, stopServer } from './browser-harness';
import { revealHeaderPreferences } from './site-header-browser';
const FAMILIES = ['shadcn', 'brutalist'] as const;
const CONTROLS = ['header', 'sidebar'] as const;
const OUTPUT = process.env.PROTO_UI_LANGUAGE_EVIDENCE_DIR ?? '/tmp/language-navigation';
let browser: Browser;
let base: URL;
let revision: string;
beforeAll(async () => {
  let stage = 'configuration';
  await mkdir(OUTPUT, { recursive: true });
  try {
    const required = process.env.PROTO_UI_BROWSER_BASE_URL;
    if (!required) throw new Error('Built production PROTO_UI_BROWSER_BASE_URL is required');
    base = new URL(required);
    if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:')
      throw new Error('Loopback production origin required');
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (process.env.PROTO_UI_EXPECTED_HEAD !== revision)
      throw new Error('Exact source revision mismatch');
    await mkdir(OUTPUT, { recursive: true });
    const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    await writeFile(
      path.join(OUTPUT, 'source.json'),
      JSON.stringify({ revision, base: base.href, dirty })
    );
    if (dirty) throw new Error('Dirty source tree is not exact-head evidence');
    stage = 'production-server-readiness';
    await startServer('/en/ui-libraries/shadcn/button/');
    stage = 'sandboxed-browser-launch';
    browser = await chromium.launch({
      executablePath: await chromeExecutable(),
      headless: true,
      chromiumSandbox: true,
      args: [
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--no-first-run',
      ],
    });
  } catch (error) {
    try {
      await writeFile(
        path.join(OUTPUT, 'startup-failure.json'),
        JSON.stringify({ revision, stage, failure: String(error), acceptance: false })
      );
    } catch (evidenceError) {
      console.error('Startup evidence failure', evidenceError);
    }
    throw error;
  }
}, 150_000);
afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await stopServer();
  }
}, 30_000);

async function installWriteProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    const key = '__localeNativeWrites';
    const original = Storage.prototype.setItem;
    const record = (kind: string, value: string) => {
      const entries = JSON.parse(sessionStorage.getItem(key) ?? '[]');
      entries.push({ kind, value, pathname: location.pathname });
      original.call(sessionStorage, key, JSON.stringify(entries));
    };
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === 'preferred-locale') record('storage', String(value));
      return original.call(this, name, value);
    };
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (!descriptor?.get || !descriptor.set) throw new Error('Native cookie descriptor missing');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => descriptor.get!.call(document),
      set: (value: string) => {
        if (value.startsWith('preferred-locale=')) record('cookie', value);
        descriptor.set!.call(document, value);
      },
    });
  });
}
async function readWrites(
  page: Page
): Promise<Array<{ kind: string; value: string; pathname: string }>> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__localeNativeWrites') ?? '[]'));
}
async function repeatPageLoad(page: Page) {
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('astro:page-load'));
  });
}
async function inspect(page: Page) {
  return page.evaluate(() => ({
    url: location.href,
    scrollY,
    width: innerWidth,
    locale: document.documentElement.lang,
    storage: localStorage.getItem('preferred-locale'),
    cookie: document.cookie,
    roots: [...document.querySelectorAll<HTMLElement>('[data-language-select-root]')].map(
      (root) => ({
        tag: root.localName,
        initialized: root.dataset.languageSelectInitialized,
        locale: root.dataset.currentLocale,
        paths: root.dataset.localePaths,
        visible: !!root.getClientRects().length,
        rect: root.getBoundingClientRect().toJSON(),
        owner: root.closest('header')
          ? 'header'
          : root.closest('.sidebar-pane')
            ? 'sidebar'
            : 'unknown',
        expanded: root.querySelector('[role=combobox]')?.getAttribute('aria-expanded'),
        controls: root.querySelector('[role=combobox]')?.getAttribute('aria-controls'),
      })
    ),
  }));
}
async function chooseLocale(
  page: Page,
  control: (typeof CONTROLS)[number],
  locale: string,
  input: 'pointer' | 'keyboard',
  expectedPath: string
) {
  if (control === 'header') await revealHeaderPreferences(page);
  else {
    const pane = page.locator('#starlight__sidebar');
    if (!(await pane.isVisible())) {
      const toggle = page.locator('[aria-controls="starlight__sidebar"]:visible');
      await expect.poll(() => toggle.count()).toBe(1);
      await toggle.click();
    }
  }
  const root = page.locator(
    `${control === 'header' ? 'header' : '.sidebar-pane'} [data-language-select-root]`
  );
  await expect.poll(() => root.count()).toBe(1);
  await expect.poll(() => root.getAttribute('data-language-select-initialized')).toBe('true');
  const paths = JSON.parse((await root.getAttribute('data-locale-paths'))!);
  expect(paths[locale]).toBe(expectedPath);
  const trigger = root.locator('[role="combobox"]');
  await trigger.waitFor({ state: 'visible' });
  if (input === 'pointer') await trigger.click();
  else {
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
  }
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true');
  const id = await trigger.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const popup = page.locator(`[id=${JSON.stringify(id)}]`);
  await expect.poll(() => popup.count()).toBe(1);
  await popup.waitFor({ state: 'visible' });
  const option = popup.locator(`[role="option"][data-value="${locale}"]`);
  await expect.poll(() => option.count()).toBe(1);
  if (input === 'pointer') await option.click();
  else {
    const options = popup.getByRole('option');
    const values = await options.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-value'))
    );
    const index = values.indexOf(locale);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }
  await page.waitForURL((url) => url.origin === base.origin && url.pathname === expectedPath);
  return expectedPath;
}
async function saveEvidence(page: Page, report: Record<string, unknown>, name: string) {
  await writeFile(path.join(OUTPUT, `${name}.json`), JSON.stringify(report, null, 2));
  await writeFile(path.join(OUTPUT, `${name}.html`), await page.content());
  const png = await page.screenshot({ fullPage: true });
  await writeFile(path.join(OUTPUT, `${name}.png`), png);
  report.pngSha256 = createHash('sha256').update(png).digest('hex');
  await writeFile(path.join(OUTPUT, `${name}.json`), JSON.stringify(report, null, 2));
}
describe.sequential('Production language selector navigation', () => {
  for (const family of FAMILIES)
    for (const control of CONTROLS) {
      it(`${family} ${control}: real locale round trip with one binding`, async () => {
        const context = await browser.newContext({
          viewport: { width: control === 'header' ? 1440 : 390, height: 1000 },
          serviceWorkers: 'block',
        });
        const blocked: string[] = [];
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          if (url.origin === base.origin) return route.continue();
          blocked.push(url.origin);
          return route.abort('blockedbyclient');
        });
        await installWriteProbe(context);
        const page = await context.newPage();
        const navigations: string[] = [];
        page.on('request', (request) => {
          if (request.isNavigationRequest() && request.frame() === page.mainFrame())
            navigations.push(request.url());
        });
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const report: Record<string, unknown> = {
          revision,
          family,
          control,
          samples: [],
          navigations,
          blocked,
          errors,
          passed: false,
        };
        let primaryFailure: unknown;
        const evidenceErrors: string[] = [];
        try {
          const suffix = family === 'shadcn' ? 'shadcn/button/' : 'brutalist/components/button/';
          await page.goto(`${base.origin}/en/ui-libraries/${suffix}`, { waitUntil: 'networkidle' });
          await expect.poll(() => page.locator('[data-language-select-root]').count()).toBe(2);
          for (const [locale, input] of [
            ['zh-cn', 'pointer'],
            ['en', 'keyboard'],
          ] as const) {
            await repeatPageLoad(page);
            const before = await readWrites(page);
            const navigationCount = navigations.length;
            (report.samples as unknown[]).push({
              stage: 'before',
              state: await inspect(page),
              writes: before,
            });
            const expectedPath = `/${locale}/ui-libraries/${suffix}`;
            await chooseLocale(page, control, locale, input, expectedPath);
            await expect
              .poll(() =>
                page
                  .locator('[data-language-select-root][data-language-select-initialized="true"]')
                  .count()
              )
              .toBe(2);
            const writes = (await readWrites(page)).slice(before.length);
            expect(navigations.slice(navigationCount)).toEqual([`${base.origin}${expectedPath}`]);
            expect(writes.filter((row) => row.kind === 'storage').map((row) => row.value)).toEqual([
              locale,
            ]);
            expect(writes.filter((row) => row.kind === 'cookie')).toHaveLength(1);
            expect(writes.find((row) => row.kind === 'cookie')!.value).toContain('SameSite=Lax');
            expect(new URL(page.url()).pathname).toBe(expectedPath);
            expect(await page.evaluate(() => localStorage.getItem('preferred-locale'))).toBe(
              locale
            );
            const cookie = (await context.cookies()).filter(
              (item) => item.name === 'preferred-locale'
            );
            expect(cookie).toHaveLength(1);
            expect(cookie[0].value).toBe(locale);
            expect(cookie[0].path).toBe('/');
            expect(cookie[0].sameSite).toBe('Lax');
            expect(
              await page
                .locator('[data-language-select-root]')
                .evaluateAll((nodes) =>
                  nodes.map((node) => node.getAttribute('data-current-locale'))
                )
            ).toEqual([locale, locale]);
            await expect
              .poll(() =>
                page
                  .locator('[data-language-select-root]')
                  .evaluateAll((nodes) =>
                    nodes.map((node) =>
                      (
                        node as HTMLElement & {
                          getExposes?: () => { value?: { get?: () => string } };
                        }
                      )
                        .getExposes?.()
                        .value?.get?.()
                    )
                  )
              )
              .toEqual([locale, locale]);
            (report.samples as unknown[]).push({
              stage: 'after',
              state: await inspect(page),
              writes,
            });
          }
          expect(errors).toEqual([]);
          report.passed = true;
        } catch (error) {
          primaryFailure = error;
          report.failure = String(error);
        } finally {
          try {
            report.final = await inspect(page);
          } catch (error) {
            evidenceErrors.push(String(error));
          }
          try {
            await saveEvidence(page, report, `${family}-${control}`);
          } catch (error) {
            evidenceErrors.push(String(error));
          }
          try {
            await context.close();
          } catch (error) {
            evidenceErrors.push(String(error));
          }
          report.evidenceErrors = evidenceErrors;
          report.evidenceComplete = evidenceErrors.length === 0;
          report.acceptance = report.passed === true && evidenceErrors.length === 0;
          try {
            await writeFile(
              path.join(OUTPUT, `${family}-${control}.json`),
              JSON.stringify(report, null, 2)
            );
          } catch (error) {
            evidenceErrors.push(String(error));
          }
        }
        if (primaryFailure) throw primaryFailure;
        if (evidenceErrors.length) throw new Error(evidenceErrors.join('\n'));
      }, 90_000);
    }
});
