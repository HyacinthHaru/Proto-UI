import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const [sourceArg, baseArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !baseArg || !outputArg || process.argv.length !== 5) {
  console.error('Usage: node probe-built-preview.mjs SOURCE_ROOT BASE_URL OUTPUT_DIR');
  process.exit(2);
}

const sourceRoot = path.resolve(sourceArg);
const outputDir = path.resolve(outputArg);
const route = '/en/ui-libraries/base/dialog/';
const url = new URL(route, baseArg).href;
const previewSelector = '[data-previewer-id][data-demo-id="demo-base-dialog"]';
const contentSelector = '.base-dialog-demo-content';
const maskSelector = '.base-dialog-demo-mask';
const timeout = 8_000;
const viewport = { width: 1440, height: 1000 };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = {
  startedAt: new Date().toISOString(),
  url,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    os: os.release(),
    viewport,
  },
  scope: {
    primary: 'Initial Web Component Base Dialog on the ordinary built docs route',
    supplementary:
      'Native View code Button; native runtime Select; React and Vue Dialog if the public control reaches them',
    excluded:
      'Vue 2, other browsers, complete accessibility/focus/keyboard matrix, dev-server optimization and historical ddac15da reproduction',
    input:
      'Playwright native pointer clicks; passive input observer records isTrusted. No synthetic dispatch, DOM/CSS state injection, exposed-method invocation or private Core flags.',
    waiting:
      'Navigation load, visible controls, and observed transition/detach/overflow conditions; no sleep or forced animation completion.',
  },
  checks: [],
  actions: [],
  samples: [],
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  httpErrors: [],
  nativeInputs: [],
  fatalErrors: [],
  artifacts: [],
};
await mkdir(outputDir, { recursive: true });

function check(runtime, name, passed, observed) {
  report.checks.push({ runtime, name, passed: Boolean(passed), observed });
}

async function attempt(runtime, name, action) {
  const entry = { runtime, name, startedAt: new Date().toISOString() };
  report.actions.push(entry);
  try {
    await action();
    entry.passed = true;
    return true;
  } catch (error) {
    entry.passed = false;
    entry.error = String(error?.stack ?? error);
    return false;
  } finally {
    entry.finishedAt = new Date().toISOString();
  }
}

// Candidate locations match the repository's browser-harness.ts, including Windows per-user Chrome.
async function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* Try the next installed location. */
    }
  }
  throw new Error('Chrome/Chromium is required; set CHROME_PATH to its executable.');
}

async function snapshot(page, runtime, stage) {
  const facts = await page.evaluate(
    ({ previewSelector, contentSelector, maskSelector }) => {
      const preview = document.querySelector(previewSelector);
      const host = preview?.querySelector('.host');
      const content = document.querySelector(contentSelector);
      const mask = document.querySelector(maskSelector);
      const element = (node) => {
        if (!(node instanceof HTMLElement)) return null;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const detached = Boolean(node.closest('[data-pui-view-detached]'));
        return {
          tag: node.tagName,
          text: node.textContent?.trim().slice(0, 400),
          attributes: Object.fromEntries(
            [...node.attributes].map(({ name, value }) => [name, value])
          ),
          connected: node.isConnected,
          detached,
          visible:
            !detached &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          computed: Object.fromEntries(
            [
              'display',
              'visibility',
              'opacity',
              'pointerEvents',
              'position',
              'zIndex',
              'overflow',
              'scale',
            ].map((key) => [key, style[key]])
          ),
        };
      };
      const trigger =
        host &&
        [...host.querySelectorAll('wc-base-dialog-trigger, [data-pui-root][role="button"]')].find(
          (node) => node.textContent?.trim() === 'Open Dialog'
        );
      return {
        readyState: document.readyState,
        preview: preview
          ? {
              demoId: preview.dataset.demoId,
              initialRuntime: preview.dataset.initialRuntime,
              availableRuntimes: preview.dataset.runtimes,
              projectionMode: preview.dataset.projectionMode,
              hostText: host?.textContent?.trim(),
              hostRootTag: host?.querySelector('[data-pui-root]')?.tagName,
            }
          : null,
        selectedRuntime: preview
          ?.querySelector('[data-adapter-select-root]')
          ?.getAttribute('data-value'),
        body: {
          overflow: document.body.style.getPropertyValue('overflow'),
          overflowPriority: document.body.style.getPropertyPriority('overflow'),
          computedOverflow: getComputedStyle(document.body).overflow,
          paddingRight: document.body.style.getPropertyValue('padding-right'),
          paddingRightPriority: document.body.style.getPropertyPriority('padding-right'),
        },
        trigger: element(trigger),
        content: element(content),
        mask: element(mask),
        focus: element(document.activeElement),
        focusInsideContent: Boolean(content?.contains(document.activeElement)),
        resources: performance
          .getEntriesByType('resource')
          .filter((entry) => entry.initiatorType === 'script')
          .map((entry) => entry.name),
      };
    },
    { previewSelector, contentSelector, maskSelector }
  );
  const sample = { runtime, stage, observedAt: new Date().toISOString(), ...facts };
  report.samples.push(sample);
  return sample;
}

async function capture(page, runtime, stage) {
  const filename = `${runtime}-${stage}.png`;
  await attempt(runtime, `capture ${stage}`, async () => {
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
    report.artifacts.push(filename);
  });
}

async function waitForOpen(page) {
  await page.waitForFunction(
    ({ contentSelector, maskSelector }) => {
      const present = (selector) => {
        const node = document.querySelector(selector);
        return (
          node &&
          !node.closest('[data-pui-view-detached]') &&
          node.getAttribute('data-transition-state') === 'entered'
        );
      };
      return (
        present(contentSelector) &&
        present(maskSelector) &&
        document.body.style.overflow === 'hidden'
      );
    },
    { contentSelector, maskSelector },
    { timeout }
  );
}

async function runRuntime(browser, runtime, builtHtmlHash) {
  const context = await browser.newContext({ viewport, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(30_000);
  let phase = 'navigation';
  page.on('pageerror', (error) =>
    report.pageErrors.push({ runtime, phase, message: error.message, stack: error.stack })
  );
  page.on('console', (message) => {
    if (message.type() === 'error')
      report.consoleErrors.push({
        runtime,
        phase,
        text: message.text(),
        location: message.location(),
      });
  });
  page.on('requestfailed', (request) =>
    report.failedRequests.push({ runtime, phase, url: request.url(), failure: request.failure() })
  );
  page.on('response', (response) => {
    if (response.status() >= 400)
      report.httpErrors.push({ runtime, phase, url: response.url(), status: response.status() });
  });
  // These listeners only observe real input; they do not prevent, stop or change an event.
  await page.exposeBinding('__recordBuiltPreviewInput', (_source, input) => {
    report.nativeInputs.push({ runtime, phase, ...input });
  });
  await page.addInitScript(() => {
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) {
      document.addEventListener(
        type,
        (event) => {
          const node = event.composedPath().find((entry) => entry instanceof Element);
          void window.__recordBuiltPreviewInput({
            type,
            isTrusted: event.isTrusted,
            tag: node?.tagName,
            text: node?.textContent?.trim().slice(0, 100),
            pointerType: event.pointerType,
            button: event.button,
            clientX: event.clientX,
            clientY: event.clientY,
            key: event.key,
          });
        },
        { capture: true, passive: true }
      );
    }
  });

  try {
    const navigated = await attempt(runtime, 'load built route', async () => {
      const response = await page.goto(url, { waitUntil: 'load' });
      check(runtime, 'HTTP 200', response?.status() === 200, response?.status());
      const servedHtmlHash = sha256(await response.body());
      check(
        runtime,
        'served HTML equals local production artifact',
        servedHtmlHash === builtHtmlHash,
        { builtHtmlHash, servedHtmlHash }
      );
    });
    if (!navigated) return;
    const preview = page.locator(previewSelector);
    const mounted = await attempt(runtime, 'initial WC trigger is visible', async () => {
      await preview.locator('.host wc-base-dialog-trigger').waitFor({ state: 'visible' });
      await preview.locator('.host').scrollIntoViewIfNeeded();
    });
    if (!mounted) {
      await snapshot(page, runtime, 'initial-unavailable');
      await capture(page, runtime, 'initial-unavailable');
      return;
    }

    if (runtime === 'react') {
      phase = 'site-button';
      const expanded = await attempt(runtime, 'native View code Button expands code', async () => {
        await preview.locator('[data-code-toggle]').click();
        await page.waitForFunction(
          (selector) =>
            document
              .querySelector(`${selector} [data-code-shell]`)
              ?.getAttribute('data-code-expanded') === 'true',
          previewSelector,
          { timeout }
        );
      });
      check(
        runtime,
        'representative Shadcn Button works',
        expanded,
        'View code click and data-code-expanded'
      );
      await snapshot(page, runtime, 'site-button');
      await capture(page, runtime, 'site-button');
    }

    if (runtime !== 'wc') {
      phase = 'runtime-selection';
      const switched = await attempt(
        runtime,
        'native Select reaches requested runtime',
        async () => {
          const trigger = preview.locator('[data-adapter-select-root] wc-shadcn-select-trigger');
          await trigger.click();
          const controlledId = await trigger.getAttribute('aria-controls');
          const options = controlledId
            ? page.locator(`[id=${JSON.stringify(controlledId)}]`)
            : page.locator('body');
          await options
            .getByRole('option', { name: runtime === 'react' ? 'React' : 'Vue', exact: true })
            .last()
            .click();
          await page.waitForFunction(
            ({ previewSelector, runtime }) => {
              const preview = document.querySelector(previewSelector);
              const host = preview?.querySelector('.host');
              const root = host?.querySelector('[data-pui-root]');
              if (
                preview?.querySelector('[data-adapter-select-root]')?.getAttribute('data-value') !==
                  runtime ||
                !root ||
                root.tagName.startsWith('WC-')
              )
                return false;
              const vue = host.hasAttribute('data-v-app') || Boolean(root.closest('[data-v-app]'));
              return runtime === 'vue' ? vue : !vue;
            },
            { previewSelector, runtime },
            { timeout }
          );
        }
      );
      check(
        runtime,
        'requested runtime was actually mounted',
        switched,
        'Native runtime control selection and host identity'
      );
      if (!switched) {
        await snapshot(page, runtime, 'runtime-unavailable');
        await capture(page, runtime, 'runtime-unavailable');
        return;
      }
    }

    phase = 'initial';
    await preview.locator('.host').scrollIntoViewIfNeeded();
    const initial = await snapshot(page, runtime, 'initial');
    await capture(page, runtime, 'initial');
    check(runtime, 'initial content is closed', !initial.content?.visible, initial.content);
    check(runtime, 'initial mask is closed', !initial.mask?.visible, initial.mask);
    if (runtime === 'wc')
      check(
        runtime,
        'initial path is WC',
        initial.preview?.hostRootTag === 'WC-BASE-DIALOG-ROOT',
        initial.preview?.hostRootTag
      );

    phase = 'open';
    const trigger =
      runtime === 'wc'
        ? preview.locator('.host wc-base-dialog-trigger')
        : preview.locator('.host').getByRole('button', { name: 'Open Dialog', exact: true });
    const clickedOpen = await attempt(runtime, 'native Open Dialog click', () => trigger.click());
    await snapshot(page, runtime, 'after-open-input');
    if (clickedOpen)
      await attempt(runtime, 'wait for entered Content and Mask with modal lock', () =>
        waitForOpen(page)
      );
    const opened = await snapshot(page, runtime, 'open');
    await capture(page, runtime, 'open');
    check(runtime, 'native open action completed', clickedOpen, clickedOpen);
    check(
      runtime,
      'trusted native opening pointer observed',
      report.nativeInputs.some(
        (input) =>
          input.runtime === runtime &&
          input.phase === 'open' &&
          input.type === 'pointerdown' &&
          input.isTrusted
      ),
      'Passive document capture'
    );
    check(
      runtime,
      'Content visible and entered',
      opened.content?.visible && opened.content.attributes['data-transition-state'] === 'entered',
      opened.content
    );
    check(
      runtime,
      'Content role is dialog',
      opened.content?.attributes.role === 'dialog',
      opened.content?.attributes.role
    );
    check(
      runtime,
      'Content aria-modal is true',
      opened.content?.attributes['aria-modal'] === 'true',
      opened.content?.attributes['aria-modal']
    );
    check(
      runtime,
      'Mask visible and entered',
      opened.mask?.visible && opened.mask.attributes['data-transition-state'] === 'entered',
      opened.mask
    );
    check(
      runtime,
      'Mask presence holds body scroll lock',
      opened.body.overflow === 'hidden' && opened.body.computedOverflow === 'hidden',
      opened.body
    );

    phase = 'close';
    const content = page.locator(contentSelector);
    const close =
      runtime === 'wc'
        ? content.locator('wc-base-dialog-close').filter({ hasText: /^Cancel$/ })
        : content.getByRole('button', { name: 'Cancel', exact: true });
    const clickedClose = await attempt(runtime, 'native Cancel click', () => close.click());
    await snapshot(page, runtime, 'after-close-input');
    if (clickedClose)
      await attempt(runtime, 'wait for leave/detach and overflow restoration', async () => {
        await page.waitForFunction(
          ({ contentSelector, maskSelector, overflow, priority }) => {
            const closed = (selector) => {
              const node = document.querySelector(selector);
              return (
                !node ||
                node.closest('[data-pui-view-detached]') ||
                node.getAttribute('data-transition-state') === 'closed'
              );
            };
            return (
              closed(contentSelector) &&
              closed(maskSelector) &&
              document.body.style.getPropertyValue('overflow') === overflow &&
              document.body.style.getPropertyPriority('overflow') === priority
            );
          },
          {
            contentSelector,
            maskSelector,
            overflow: initial.body.overflow,
            priority: initial.body.overflowPriority,
          },
          { timeout }
        );
      });
    const closed = await snapshot(page, runtime, 'closed');
    await capture(page, runtime, 'closed');
    check(runtime, 'native close action completed', clickedClose, clickedClose);
    check(
      runtime,
      'trusted native closing pointer observed',
      report.nativeInputs.some(
        (input) =>
          input.runtime === runtime &&
          input.phase === 'close' &&
          input.type === 'pointerdown' &&
          input.isTrusted
      ),
      'Passive document capture'
    );
    check(runtime, 'Content is no longer visible', !closed.content?.visible, closed.content);
    check(runtime, 'Mask is no longer visible', !closed.mask?.visible, closed.mask);
    check(
      runtime,
      'original body overflow value and priority restored',
      closed.body.overflow === initial.body.overflow &&
        closed.body.overflowPriority === initial.body.overflowPriority,
      { initial: initial.body, closed: closed.body }
    );
  } finally {
    await context.close();
    check(
      runtime,
      'no page errors',
      report.pageErrors.filter((entry) => entry.runtime === runtime).length === 0,
      report.pageErrors.filter((entry) => entry.runtime === runtime)
    );
    check(
      runtime,
      'no console errors',
      report.consoleErrors.filter((entry) => entry.runtime === runtime).length === 0,
      report.consoleErrors.filter((entry) => entry.runtime === runtime)
    );
  }
}

let browser;
try {
  const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, encoding: 'utf8' }).trim();
  report.source = {
    head: git('rev-parse', 'HEAD'),
    workingTree: git('status', '--short'),
    hashes: {},
  };
  for (const filename of [
    'apps/www/astro.config.mjs',
    'pnpm-lock.yaml',
    'apps/www/src/content/docs/zh-cn/demo-base-dialog.demo.ts',
    'apps/www/src/content/docs/en/ui-libraries/base/dialog.mdx',
  ]) {
    report.source.hashes[filename] = sha256(await readFile(path.join(sourceRoot, filename)));
  }
  report.runnerSha256 = sha256(await readFile(fileURLToPath(import.meta.url)));
  const builtHtml = await readFile(
    path.join(sourceRoot, 'apps/www/dist/en/ui-libraries/base/dialog/index.html')
  );
  report.builtHtmlSha256 = sha256(builtHtml);
  const siteRequire = createRequire(path.join(sourceRoot, 'apps/www/package.json'));
  const { chromium } = siteRequire('playwright-core');
  report.environment.playwright = siteRequire('playwright-core/package.json').version;
  const executablePath = await chromeExecutable();
  report.environment.chromeExecutable = path.basename(executablePath);
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  report.environment.browser = browser.version();
  for (const runtime of ['wc', 'react', 'vue']) {
    await attempt(runtime, 'complete route probe', () =>
      runRuntime(browser, runtime, report.builtHtmlSha256)
    );
    await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
} catch (error) {
  report.fatalErrors.push(String(error?.stack ?? error));
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  report.passed =
    report.fatalErrors.length === 0 &&
    report.checks.length > 0 &&
    report.checks.every((entry) => entry.passed) &&
    report.actions.every((entry) => entry.passed);
  report.summary = {
    checks: report.checks.length,
    failedChecks: report.checks
      .filter((entry) => !entry.passed)
      .map(({ runtime, name }) => `${runtime}: ${name}`),
    failedActions: report.actions
      .filter((entry) => !entry.passed)
      .map(({ runtime, name }) => `${runtime}: ${name}`),
    pageErrors: report.pageErrors.length,
    consoleErrors: report.consoleErrors.length,
    observedDialogRuntimes: report.samples
      .filter((entry) => entry.stage === 'open')
      .map((entry) => entry.runtime),
  };
  for (const [filename, value] of [
    ['report.json', report],
    ['page-errors.json', report.pageErrors],
    ['console-errors.json', report.consoleErrors],
    ['native-inputs.json', report.nativeInputs],
  ]) {
    await writeFile(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
  }
  console.log(
    JSON.stringify(
      { passed: report.passed, ...report.summary, fatalErrors: report.fatalErrors, outputDir },
      null,
      2
    )
  );
  process.exitCode = report.passed ? 0 : 1;
}
