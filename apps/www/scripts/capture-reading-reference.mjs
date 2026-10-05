import { createHash } from 'node:crypto';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { collectReadingReference } from './reading-reference-collector.mjs';
import {
  allowOwnRequest,
  hashReadingObservation,
  observationFailures,
  pngDimensions,
  readSourceBinding,
  routeOwnResponse,
  READING_CASES,
  READING_ROUTES,
  READING_VIEWPORT,
} from './reading-reference-contract.mjs';
import {
  launchBrowser,
  startServer,
  stopServer,
} from '../src/content/docs/zh-cn/browser-harness.ts';

// This independent runner does not enter or alter the existing browser matrix.
// Run from the repository root using node --import tsx and a clean candidate.
const out = path.resolve(
  process.env.PROTO_UI_READING_EVIDENCE_DIR ?? path.join(os.tmpdir(), 'proto-ui-reading-reference')
);
const report = {
  schemaVersion: 1,
  purpose:
    'Matched candidate reading-reference observation; not design acceptance, production attribution or clicked hit-testing.',
  startedAtUTC: new Date().toISOString(),
  externalProductionReference: {
    kind: 'externally-observed-reference',
    sourceSha: null,
    sourceBinding: 'unknown; collect separately, do not attribute it to the candidate',
  },
  requested: {
    viewport: READING_VIEWPORT,
    deviceScaleFactor: 1,
    browserZoom:
      '100% fresh non-persistent browser context; verify actual DPR, visual viewport scale and CSS zoom',
    siteThemes: ['light', 'dark'],
    browserColorSchemePreference: 'light',
    reducedMotion: 'no-preference',
    routeCount: 2,
  },
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    eventSha: process.env.GITHUB_SHA ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  },
  cases: [],
  failures: [],
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = () =>
  writeFile(path.join(out, 'reading-reference.json'), `${JSON.stringify(report, null, 2)}\n`);
let browser;
await mkdir(out, { recursive: true });
try {
  // Never use the harness's externally supplied URL escape hatch in this task.
  if (process.env.PROTO_UI_BROWSER_BASE_URL)
    throw new Error(
      'This runner only starts its own local docs server; PROTO_UI_BROWSER_BASE_URL is not allowed.'
    );
  report.source = readSourceBinding(process.env.PROTO_UI_EXPECTED_HEAD);
  report.collector = {
    path: 'apps/www/scripts/reading-reference-collector.mjs',
    sha256: sha256(await readFile(new URL('./reading-reference-collector.mjs', import.meta.url))),
  };
  await save();
  const baseUrl = await startServer(
    READING_ROUTES.map(({ route }) => route),
    { rejectRedirects: true }
  );
  if (new URL(baseUrl).hostname !== '127.0.0.1')
    throw new Error('Expected the harness-owned loopback server.');
  report.sourceAfterServerStart = readSourceBinding(process.env.PROTO_UI_EXPECTED_HEAD);
  browser = await launchBrowser();
  report.environment.browserVersion = browser.version();
  for (const target of READING_CASES) {
    const entry = {
      ...target,
      originalURL: `${baseUrl}${target.route}`,
      startedAtUTC: new Date().toISOString(),
      outcome: 'collecting',
      pageErrors: [],
      failedRequests: [],
      blockedExternalRequests: [],
      networkBoundaryFailures: [],
      screenshots: [],
    };
    report.cases.push(entry);
    const context = await browser.newContext({
      viewport: READING_VIEWPORT,
      screen: READING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      locale: 'zh-CN',
      serviceWorkers: 'block',
    });
    await context.route('**/*', (route) =>
      routeOwnResponse(route, baseUrl, (failure) => {
        entry.networkBoundaryFailures.push(failure);
        if (failure.kind === 'external-request') entry.blockedExternalRequests.push(failure.url);
      })
    );
    await context.routeWebSocket('**/*', (socket) => {
      if (allowOwnRequest(socket.url(), baseUrl)) socket.connectToServer();
      else {
        entry.blockedExternalRequests.push(socket.url());
        socket.close();
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.on('pageerror', (error) => entry.pageErrors.push(error.message));
    page.on('requestfailed', (request) =>
      entry.failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null })
    );
    const screenshot = async (kind, fullPage) => {
      const filename = `${target.id}-${kind}.png`;
      const filenamePath = path.join(out, filename);
      const bytes = await page.screenshot({
        path: filenamePath,
        type: 'png',
        fullPage,
        scale: 'css',
        timeout: 30_000,
      });
      const dimensions = pngDimensions(bytes);
      entry.screenshots.push({
        path: filename,
        kind,
        fullPage,
        format: 'png',
        dimensions,
        sha256: sha256(bytes),
        byteLength: bytes.length,
        mtimeUTC: (await stat(filenamePath)).mtime.toISOString(),
        capturedAtUTC: new Date().toISOString(),
      });
      if (
        !fullPage &&
        (dimensions.width !== READING_VIEWPORT.width ||
          dimensions.height !== READING_VIEWPORT.height)
      )
        throw new Error(
          `Raw viewport PNG dimensions are ${dimensions.width}x${dimensions.height}, not 1180x757.`
        );
    };
    try {
      const response = await page.goto(entry.originalURL, {
        waitUntil: 'networkidle',
        timeout: 60_000,
      });
      entry.httpStatus = response?.status() ?? null;
      entry.finalURL = page.url();
      if (entry.httpStatus !== 200) throw new Error(`Document HTTP status ${entry.httpStatus}`);
      await page.locator('main[data-pagefind-body]').waitFor({ state: 'visible' });
      // The external reference uses a light OS preference and the site's real
      // theme button for dark mode. Do not silently substitute dark media.
      await page.waitForFunction(
        () =>
          document
            .querySelector('header [data-theme-toggle]')
            ?.getAttribute('data-site-shadcn-initialized') === '1'
      );
      const readThemeState = () =>
        page.evaluate(() => {
          const button = document.querySelector('header [data-theme-toggle]');
          const bounds = button?.getBoundingClientRect();
          return {
            theme: document.documentElement.dataset.theme,
            rootInlineColorScheme: document.documentElement.style.colorScheme,
            rootComputedColorScheme: getComputedStyle(document.documentElement).colorScheme,
            button: button
              ? {
                  selector: 'header [data-theme-toggle]',
                  tag: button.localName,
                  id: button.id || null,
                  ariaLabel: button.getAttribute('aria-label'),
                  ariaPressed: button.getAttribute('aria-pressed'),
                  state: button.getAttribute('data-state'),
                  prototype: button.getAttribute('data-projection-prototype'),
                  targetBox: bounds
                    ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
                    : null,
                }
              : null,
          };
        });
      const beforeTheme = await readThemeState();
      if (beforeTheme.theme !== target.colorScheme) {
        await page.locator('header [data-theme-toggle]').click();
        await page.waitForFunction(
          (theme) => document.documentElement.dataset.theme === theme,
          target.colorScheme
        );
        entry.themeAction = {
          method: 'native pointer click on the Header Theme button',
          before: beforeTheme,
          after: await readThemeState(),
        };
      } else
        entry.themeAction = {
          method: 'initial site theme already matches',
          before: beforeTheme,
          after: beforeTheme,
        };

      await page.waitForFunction(
        (theme) =>
          document.documentElement.dataset.theme === theme &&
          Boolean(document.querySelector('main[data-pagefind-body] [data-typography-runtime]')) &&
          [...document.querySelectorAll('[data-projection-scope]')].every(
            (root) => root.getAttribute('data-projection-state') === 'ready'
          ),
        target.colorScheme
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      entry.observation = hashReadingObservation(await page.evaluate(collectReadingReference));
      entry.observationFailures = observationFailures(entry.observation, target);
      await screenshot('viewport', false);
      await screenshot('full', true);
      entry.observationFailures.push(
        ...entry.pageErrors.map((error) => `Page error: ${error}`),
        ...entry.networkBoundaryFailures.map(
          (failure) => `Network boundary: ${JSON.stringify(failure)}`
        ),
        ...entry.failedRequests.map(({ url, error }) => `Request failed: ${url}: ${error}`),
        ...entry.blockedExternalRequests.map((url) => `External request blocked: ${url}`)
      );
      if (entry.observationFailures.length) throw new Error(entry.observationFailures.join('\n'));
      entry.outcome = 'observed';
    } catch (error) {
      entry.outcome = 'failed';
      entry.error = error instanceof Error ? error.stack : String(error);
      entry.finalURL = page.url();
      report.failures.push(`${target.id}: ${String(error)}`);
      if (!entry.observation)
        entry.observation = await page
          .evaluate(collectReadingReference)
          .then(hashReadingObservation)
          .catch((failure) => ({ collectionError: String(failure) }));
      await screenshot('failure-viewport', false).catch((failure) => {
        entry.screenshotFailure = String(failure);
      });
    } finally {
      entry.finishedAtUTC = new Date().toISOString();
      await context.close();
      await save();
    }
  }
  report.sourceAfterCapture = readSourceBinding(process.env.PROTO_UI_EXPECTED_HEAD);
} catch (error) {
  report.failures.push(error instanceof Error ? error.stack : String(error));
} finally {
  await browser
    ?.close()
    .catch((error) => report.failures.push(`Browser cleanup: ${String(error)}`));
  await stopServer().catch((error) => report.failures.push(`Server cleanup: ${String(error)}`));
  report.finishedAtUTC = new Date().toISOString();
  report.outcome = report.failures.length ? 'failed' : 'observed';
  await save();
}
if (report.failures.length) {
  console.error(report.failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Observed ${report.cases.length} source-bound reading cases. Report: ${path.join(out, 'reading-reference.json')}. Visual review remains separate.`
  );
