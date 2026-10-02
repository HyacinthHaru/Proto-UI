/**
 * Actual-browser evidence, not a screenshot mockup. Run this candidate-owned
 * script with cwd set to either clean checkout so both revisions use one probe.
 * Browser input is Playwright's real keyboard/pointer input. DOM evaluation is
 * read-only, except scrollTo(0, 0) to normalize capture framing.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { Browser, Page } from 'playwright-core';
import { launchBrowser, startServer, stopServer } from '../src/content/docs/zh-cn/browser-harness';
import {
  DOCUMENTATION_VARIANTS,
  HOMEPAGE_ROUTES,
  HOMEPAGE_VIEWPORTS,
  layoutFailures,
  verifyRevision,
} from './homepage-evidence-contract';
import { captureDocumentationEvidence } from './capture-documentation-evidence';

const { values } = parseArgs({
  options: {
    'revision-kind': { type: 'string' },
    'expected-revision': { type: 'string' },
    out: { type: 'string' },
  },
});
const revisionKind = values['revision-kind'];
assert.ok(
  revisionKind === 'baseline' || revisionKind === 'candidate',
  '--revision-kind must be baseline or candidate'
);
assert.ok(values.out && values['expected-revision'], '--out and --expected-revision are required');
assert.ok(
  !process.env.PROTO_UI_BROWSER_BASE_URL,
  'External servers cannot prove checkout provenance; unset PROTO_UI_BROWSER_BASE_URL'
);
const out = path.resolve(values.out);
await mkdir(out, { recursive: true });
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const revision = git('rev-parse', 'HEAD');
const status = git('status', '--porcelain', '--untracked-files=all');
verifyRevision(revision, values['expected-revision'], status);
const scriptPath = fileURLToPath(import.meta.url);
const scriptRevision = execFileSync('git', ['-C', path.dirname(scriptPath), 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const scriptSha256 = createHash('sha256')
  .update(await readFile(scriptPath))
  .digest('hex');
const report: Record<string, unknown> & {
  cases: Array<Record<string, unknown>>;
  failures: string[];
} = {
  schemaVersion: 1,
  revisionKind,
  revision,
  scriptRevision,
  scriptSha256,
  startedAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  browserContext: { deviceScaleFactor: 1, reducedMotion: 'reduce', freshStoragePerCase: true },
  github: {
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    repository: process.env.GITHUB_REPOSITORY,
  },
  procedure:
    'Real Chromium, clean checkout, shared docs dev-server harness, real pointer/keyboard selection; no visual-state injection',
  scope:
    'Two localized homepages and Base Toggle / Shadcn Radio Group / Brutalist Tooltip docs, desktop/mobile, light/dark; actual controls, ownership, computed/platform fonts and overflow',
  limitations: [
    'Chromium only; screenshots require visual review',
    'No claim of complete assistive-technology or browser-engine parity',
    'Failure, stale-candidate and disposal behavior are outside this capture probe; consult separate runtime regression results',
  ],
  cases: [],
  failures: [],
};
const saveReport = () =>
  writeFile(path.join(out, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
await saveReport();

const HOME = '[data-home-demo-options]';
const RUNTIME_LABELS = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' } as const;
type Runtime = keyof typeof RUNTIME_LABELS;
const fontSelectors = [
  { name: 'html', selector: 'html' },
  { name: 'body', selector: 'body' },
  { name: 'heading', selector: 'h1' },
  { name: 'tagline', selector: '.homepage-hero__tagline, h1[data-page-title] + div' },
  {
    name: 'hero-action',
    selector: '.homepage-hero [data-homepage-mount] a[href], section:has(h1) a[data-slot="button"]',
  },
  {
    name: 'navigation',
    selector: '[data-homepage-runtime] [data-projection-content] a[href], header a[href]',
  },
  {
    name: 'runtime-control',
    selector:
      '[data-homepage-runtime] [data-projection-control="runtime"] [role="combobox"], [data-home-demo-options] [data-projection-control="runtime"] [role="combobox"]',
  },
  {
    name: 'component-control',
    selector: '[data-home-demo-options] [data-projection-control="component"] [role="combobox"]',
  },
  { name: 'toolbar-label', selector: '.pui-projection-control-label' },
  { name: 'preview-intro-title', selector: '.home-demo-previewer__intro-title' },
  { name: 'preview-status', selector: '.home-demo-previewer__status' },
  { name: 'research-lead', selector: '.home-demo-previewer__research-lead' },
  { name: 'demo', selector: '[data-home-demo-host] [data-projection-content] [data-pui-root]' },
];

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
}

async function waitForRuntime(page: Page, runtime: Runtime): Promise<void> {
  await page.waitForFunction(
    ({ runtime, requireHeader }) => {
      const home = document.querySelector<HTMLElement>('[data-home-demo-options]');
      const host = home?.querySelector<HTMLElement>('[data-home-demo-host]');
      const scope = host?.querySelector<HTMLElement>('[data-projection-scope]');
      const header = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      return (
        home?.dataset.runnerState === 'ready' &&
        home.dataset.runnerRuntime === runtime &&
        host?.getAttribute('aria-busy') === 'false' &&
        scope?.dataset.projectionRuntime === runtime &&
        scope.dataset.projectionState === 'ready' &&
        !!scope.querySelector('[data-projection-content] [data-pui-root]') &&
        (!requireHeader ||
          (header?.dataset.runtimeState === 'ready' && header.dataset.runtime === runtime))
      );
    },
    { runtime, requireHeader: revisionKind === 'candidate' },
    { timeout: 30_000 }
  );
  assert.ok(
    !(await page.locator(`${HOME} [data-home-demo-host]`).innerText()).includes('[Home Demo Error]')
  );
  await settle(page);
}

function runtimeTrigger(page: Page) {
  const owner = revisionKind === 'candidate' ? '[data-homepage-runtime]' : HOME;
  return page.locator(`${owner} [data-projection-control="runtime"] [role="combobox"]`).first();
}

async function chooseRuntime(page: Page, runtime: Runtime, keyboard: boolean): Promise<void> {
  const trigger = runtimeTrigger(page);
  if (keyboard) {
    await trigger.focus();
    await page.keyboard.press('Enter');
  } else await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  assert.ok(id, 'Runtime selector must control an identifiable option portal');
  const portal = page.locator(`[id=${JSON.stringify(id)}]`);
  await portal.waitFor({ state: 'visible' });
  if (keyboard) {
    await page.waitForFunction(
      (id) => document.getElementById(id)?.contains(document.activeElement),
      id
    );
    await page.keyboard.press('Home');
    await page.waitForFunction(
      ([id, label]) =>
        document.getElementById(id)?.querySelector('[role="option"]:focus')?.textContent?.trim() ===
        label,
      [id, RUNTIME_LABELS.wc]
    );
    for (let index = 0; index < Object.keys(RUNTIME_LABELS).indexOf(runtime); index++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(
        ([id, label]) =>
          document
            .getElementById(id)
            ?.querySelector('[role="option"]:focus')
            ?.textContent?.trim() === label,
        [id, Object.values(RUNTIME_LABELS)[index + 1]!]
      );
    }
    await page.keyboard.press('Enter');
  } else {
    await portal.getByRole('option', { name: RUNTIME_LABELS[runtime], exact: true }).click();
  }
  await waitForRuntime(page, runtime);
}

async function ownership(page: Page, runtime: Runtime) {
  const result = await page.evaluate(() => {
    const groups = [...document.querySelectorAll<HTMLElement>('[data-homepage-actions]')];
    const hosts = [
      ...groups.map((group) => ({
        name: group.id || 'homepage-actions',
        host: group.querySelector<HTMLElement>('[data-homepage-mount]'),
      })),
      { name: 'demo', host: document.querySelector<HTMLElement>('[data-home-demo-host]') },
    ];
    return hosts.map(({ name, host }) => ({
      name,
      pageGeneration:
        document.querySelector<HTMLElement>('[data-homepage-runtime]')?.dataset.runtimeGeneration,
      scopes: [...(host?.querySelectorAll<HTMLElement>('[data-projection-scope]') ?? [])].map(
        (scope) => ({
          runtime: scope.dataset.projectionRuntime,
          generation: scope.dataset.projectionGeneration,
          state: scope.dataset.projectionState,
          hidden: scope.hidden,
          inert: scope.inert,
          generationState: scope.closest<HTMLElement>('[data-projection-generation-host]')?.dataset
            .projectionGenerationState,
          generationInert: scope.closest<HTMLElement>('[data-projection-generation-host]')?.inert,
          nativeAnchors: scope.querySelectorAll('[data-projection-content] a[href]').length,
          scopeOwner: {
            vue3: !!scope.closest('[data-v-app]'),
            vue2: !!(scope as HTMLElement & { __vue__?: unknown }).__vue__,
            react: Object.keys(scope).some((key) => key.startsWith('__reactFiber$')),
          },
          roots: [
            ...scope.querySelectorAll<HTMLElement>('[data-projection-content] [data-pui-root]'),
          ].map((root) => ({
            tag: root.tagName,
            prototype: root.getAttribute('data-prototype'),
            vue3: !!root.closest('[data-v-app]'),
            vue2: !!(root as HTMLElement & { __vue__?: unknown }).__vue__,
            react: Object.keys(root).some((key) => key.startsWith('__reactFiber$')),
          })),
        })
      ),
    }));
  });
  if (revisionKind === 'candidate')
    assert.ok(result.length >= 3, 'Candidate must mount header, hero actions and demo');
  for (const host of result) {
    assert.equal(host.scopes.length, 1, `${host.name}: stale or missing projection scope`);
    const scope = host.scopes[0]!;
    assert.equal(scope.runtime, runtime, `${host.name}: runtime`);
    assert.equal(scope.state, 'ready', `${host.name}: state`);
    assert.equal(scope.hidden, false, `${host.name}: hidden`);
    assert.equal(scope.inert, false, `${host.name}: inert`);
    assert.equal(scope.generationState, 'active', `${host.name}: active generation`);
    assert.equal(scope.generationInert, false, `${host.name}: active generation is interactive`);
    if (revisionKind === 'candidate') {
      assert.ok(Number(host.pageGeneration) > 0, 'Header must expose a committed generation');
      assert.equal(scope.generation, host.pageGeneration, `${host.name}: same page generation`);
    }
    assert.ok(
      scope.roots.length > 0 || (host.name !== 'demo' && scope.nativeAnchors > 0),
      `${host.name}: actual prototype or native-anchor content required`
    );
    if (runtime !== 'wc')
      assert.ok(
        scope.scopeOwner[runtime === 'vue' ? 'vue3' : runtime],
        `${host.name}: actual ${runtime} scope ownership`
      );
    for (const root of scope.roots) {
      if (runtime === 'wc')
        assert.ok(root.tag.startsWith('WC-'), `${host.name}: WC custom element`);
      else if (runtime === 'react') assert.ok(root.react, `${host.name}: React-owned root`);
      else if (runtime === 'vue') assert.ok(root.vue3, `${host.name}: Vue-owned root`);
      else assert.ok(root.vue2, `${host.name}: Vue 2-owned root`);
    }
  }
  return result;
}

async function measure(page: Page, samples = fontSelectors) {
  const metrics = await page.evaluate(
    (samples) => ({
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      theme: document.documentElement.dataset.theme,
      heading: document.querySelector('h1')?.textContent?.trim(),
      fontVariables: {
        fontSans: getComputedStyle(document.documentElement).getPropertyValue('--font-sans'),
        colorFontGeistSans: getComputedStyle(document.documentElement).getPropertyValue(
          '--color-font-geist-sans'
        ),
      },
      fontFaces: [...document.fonts].map((face) => ({
        family: face.family,
        status: face.status,
        weight: face.weight,
        style: face.style,
      })),
      surfaceGeometry: [
        'header',
        '.homepage-hero',
        'section:has(h1)',
        'h1',
        '[data-home-demo-options]',
        '.home-demo-previewer__intro-title',
        '.home-demo-previewer__status',
        '.home-demo-previewer__research-lead',
      ].flatMap((selector) =>
        [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            selector,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            margin: style.margin,
            padding: style.padding,
            gap: style.gap,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            whiteSpace: style.whiteSpace,
          };
        })
      ),
      fonts: samples.flatMap(({ name, selector }) => {
        const matches = [...document.querySelectorAll<HTMLElement>(selector)];
        const matchIndex = matches.findIndex(
          (element) =>
            element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
        );
        if (matchIndex < 0) return [];
        const element = matches[matchIndex]!;
        const style = getComputedStyle(element);
        return [
          {
            name,
            selector,
            matchIndex,
            text: element.textContent?.trim().slice(0, 100),
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            fontWeight: style.fontWeight,
          },
        ];
      }),
      overflowingElements: [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            getComputedStyle(element).visibility !== 'hidden' &&
            (rect.left < -1 || rect.right > innerWidth + 1)
          );
        })
        .slice(0, 30)
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
        })),
    }),
    samples
  );
  const session = await page.context().newCDPSession(page);
  const platformFonts: Array<Record<string, unknown>> = [];
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    for (const sample of metrics.fonts) {
      const { nodeIds } = await session.send('DOM.querySelectorAll', {
        nodeId: root.nodeId,
        selector: sample.selector,
      });
      const nodeId = nodeIds[sample.matchIndex];
      assert.ok(nodeId, `${sample.name}: measured font node is still present`);
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      platformFonts.push({ name: sample.name, fonts });
    }
  } finally {
    await session.detach();
  }
  return { ...metrics, platformFonts };
}

async function nativeLinks(page: Page) {
  return page.locator('[data-homepage-actions]').evaluateAll((groups) =>
    groups.map((group) => {
      const helpers = {
        links(selector: string) {
          return [...group.querySelectorAll<HTMLAnchorElement>(selector)].map((link) => ({
            text: link.textContent?.trim(),
            href: link.getAttribute('href'),
            target: link.getAttribute('target'),
            rel: link.getAttribute('rel'),
          }));
        },
      };
      return {
        group: group.id,
        fallback: helpers.links('[data-homepage-fallback] a[href]'),
        live: helpers.links('[data-homepage-mount] [data-projection-content] a[href]'),
      };
    })
  );
}

let browser: Browser | undefined;
try {
  const baseUrl = await startServer([
    ...HOMEPAGE_ROUTES,
    ...DOCUMENTATION_VARIANTS.map((variant) => variant.route),
  ]);
  browser = await launchBrowser();
  report.browserVersion = browser.version();
  for (const route of HOMEPAGE_ROUTES)
    for (const viewport of HOMEPAGE_VIEWPORTS)
      for (const colorScheme of ['light', 'dark'] as const) {
        const id = `${route.split('/')[1]}-${viewport.name}-${colorScheme}`;
        const evidence: Record<string, unknown> = {
          id,
          route,
          viewport,
          colorScheme,
          screenshots: [],
          transitions: [],
        };
        report.cases.push(evidence);
        const screenshots = evidence.screenshots as string[];
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme,
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        const pageErrors: string[] = [];
        const externalModules = new Map<string, number>();
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('response', (response) => {
          if (new URL(response.url()).hostname === 'esm.sh') {
            externalModules.set(response.url(), response.status());
          }
        });
        evidence.pageErrors = pageErrors;
        const screenshot = async (name: string, fullPage = false) => {
          const filename = `${id}-${name}.png`;
          await page.screenshot({ path: path.join(out, filename), fullPage });
          screenshots.push(filename);
        };
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
          await waitForRuntime(page, 'wc');
          await page.waitForFunction(
            (theme) => document.documentElement.dataset.theme === theme,
            colorScheme
          );
          await page.evaluate(() => scrollTo(0, 0));
          evidence.initial = await measure(page);
          await screenshot('initial-viewport');
          await screenshot('initial-full', true);
          if (revisionKind === 'candidate') {
            assert.equal(
              (evidence.initial as Awaited<ReturnType<typeof measure>>).fonts.length,
              fontSelectors.length,
              'Every candidate font sample must resolve to visible content'
            );
            const failures = layoutFailures(
              evidence.initial as Awaited<ReturnType<typeof measure>>
            );
            evidence.layoutFailures = failures;
            report.failures.push(...failures.map((failure) => `${id}: ${failure}`));
          }
          evidence.initialOwnership = await ownership(page, 'wc');
          for (const [index, runtime] of (
            ['react', 'vue', 'vue2', 'wc', 'react', 'wc'] as const
          ).entries()) {
            await chooseRuntime(page, runtime, index === 1);
            const owners = await ownership(page, runtime);
            const focused = await runtimeTrigger(page).evaluate(
              (element) => document.activeElement === element
            );
            assert.ok(focused, `${runtime}: runtime selector focus must be restored`);
            const links = await nativeLinks(page);
            for (const group of links)
              assert.deepEqual(group.live, group.fallback, `${group.group}: preserve native links`);
            const button = page
              .locator(`${HOME} [data-projection-content] [data-pui-root]`)
              .first();
            await button.scrollIntoViewIfNeeded();
            const box = await button.boundingBox();
            assert.ok(box, 'Demo button is rendered');
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.waitForFunction(
              () =>
                !!document.querySelector(
                  '[data-home-demo-host] [data-projection-content] [data-pui-root][data-pressed]'
                )
            );
            const pressed = await button.getAttribute('data-pressed');
            if (index < 3) {
              const filename = `${id}-${runtime}-demo-pressed.png`;
              await page.locator(HOME).screenshot({ path: path.join(out, filename) });
              screenshots.push(filename);
            }
            await page.mouse.up();
            await page.waitForFunction(
              () =>
                !document.querySelector(
                  '[data-home-demo-host] [data-projection-content] [data-pui-root][data-pressed]'
                )
            );
            (evidence.transitions as unknown[]).push({
              runtime,
              input:
                index === 1 ? 'focused control + keyboard Enter/Home/ArrowDown/Enter' : 'pointer',
              owners,
              focusRestored: focused,
              nativeLinks: links,
              demoPress: { down: pressed, released: true },
            });
            if (index < 3) {
              await page.evaluate(() => scrollTo(0, 0));
              await screenshot(`${runtime}-viewport`);
              const metrics = await measure(page);
              (evidence.transitions as Array<Record<string, unknown>>).at(-1)!.layout = metrics;
              if (revisionKind === 'candidate') {
                report.failures.push(
                  ...layoutFailures(metrics).map((failure) => `${id} ${runtime}: ${failure}`)
                );
              }
            }
          }
          if (revisionKind === 'candidate') {
            const themeButton = page.locator(
              '[data-homepage-runtime] [data-demo-ref="home-theme"]'
            );
            const opposite = colorScheme === 'light' ? 'dark' : 'light';
            await themeButton.click();
            await page.waitForFunction(
              (theme) => document.documentElement.dataset.theme === theme,
              opposite
            );
            await themeButton.click();
            await page.waitForFunction(
              (theme) => document.documentElement.dataset.theme === theme,
              colorScheme
            );
            evidence.themeRoundTrip = [colorScheme, opposite, colorScheme];
          }
          assert.deepEqual(pageErrors, [], 'No uncaught page errors');
          evidence.outcome = report.failures.some(
            (failure) => failure.startsWith(`${id}:`) || failure.startsWith(`${id} `)
          )
            ? 'failed'
            : 'passed';
        } catch (error) {
          evidence.outcome = 'failed';
          evidence.error = error instanceof Error ? error.stack : String(error);
          report.failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
          await screenshot('failure-viewport').catch(() => {});
        } finally {
          evidence.externalModules = [...externalModules].map(([url, status]) => ({ url, status }));
          await context.close();
          await saveReport();
        }
      }
  await captureDocumentationEvidence({
    browser,
    baseUrl,
    revisionKind,
    out,
    report,
    saveReport,
    measure,
  });
} catch (error) {
  report.failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
} finally {
  await browser?.close();
  await stopServer();
  report.finishedAt = new Date().toISOString();
  report.outcome = report.failures.length ? 'failed' : 'passed';
  // Generated CSS can change during the supported dev startup; retain that
  // fact, rather than presenting startup-generated files as committed source.
  report.postServerWorktreeStatus = git('status', '--porcelain', '--untracked-files=all');
  await saveReport();
  const escape = (value: unknown) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
    );
  await writeFile(
    path.join(out, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Website ${revisionKind} evidence</title><style>body{font:16px system-ui;margin:2rem;max-width:100rem}img{max-width:100%;height:auto;border:1px solid #bbb}figure{margin:2rem 0}code{overflow-wrap:anywhere}</style><h1>Actual website pages: ${revisionKind}</h1><p>Revision <code>${revision}</code>. Browser ${escape(report.browserVersion)}. <a href="metrics.json">Measured results and exact procedure</a>.</p>${report.cases.map((item) => `<section><h2>${escape(item.id)}: ${escape(item.outcome)}</h2>${(item.screenshots as string[]).map((file) => `<figure><figcaption>${escape(file)}</figcaption><a href="${escape(file)}"><img loading="lazy" src="${escape(file)}" alt="Actual rendered page ${escape(file)}"></a></figure>`).join('')}</section>`).join('')}</html>`
  );
}
console.log(
  JSON.stringify(
    {
      revisionKind,
      revision,
      outcome: report.outcome,
      cases: report.cases.length,
      failures: report.failures,
    },
    null,
    2
  )
);
if (report.failures.length) process.exitCode = 1;
