import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import path from 'node:path';
import { startStrictPreview } from '<SOURCE_ROOT>/apps/www/scripts/search-production-preview.mjs';
import { buildBoundary } from '<SOURCE_ROOT>/scripts/test/search-intent-ab.mjs';
import { launchBrowser } from '<SOURCE_ROOT>/apps/www/src/content/docs/zh-cn/browser-harness.ts';
import {
  installSearchStartupTrace,
  readSearchReadyWithinBudget,
  searchReadinessWasOnTime,
} from '<SOURCE_ROOT>/apps/www/src/content/docs/zh-cn/site-search-evidence.ts';
const root = '<SOURCE_ROOT>';
const output = '<EVIDENCE_ROOT>/production-native-control';
const source = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirty: true,
  searchSHA256: createHash('sha256')
    .update(await readFile(path.join(root, 'apps/www/src/components/override/Search.astro')))
    .digest('hex'),
  diffSHA256: createHash('sha256')
    .update(execFileSync('git', ['diff', '--binary', '--full-index', 'HEAD'], { cwd: root }))
    .digest('hex'),
};
await mkdir(output, { recursive: true });
const built = await buildBoundary(root);
await writeFile(path.join(output, 'build-boundary.json'), JSON.stringify(built, null, 2));
const uiPath = built.uiAssets[0].path;
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer();
  s.on('error', reject);
  s.listen(0, '127.0.0.1', () => {
    const a = s.address();
    if (!a || typeof a === 'string') return reject(Error('port unavailable'));
    s.close((e) => (e ? reject(e) : resolve(a.port)));
  });
});
const preview = await startStrictPreview({ root: path.join(root, 'apps/www'), port });
const browser = await launchBrowser();
const samples: any[] = [];
const startedAt = new Date().toISOString();
try {
  for (const family of ['shadcn', 'brutalist']) {
    const route = `/zh-cn/ui-libraries/${family}/${family === 'brutalist' ? 'components/' : ''}button/`;
    const modes =
      family === 'shadcn'
        ? [
            'cold-1',
            'cold-2',
            'cold-3',
            'cold-4',
            'cold-5',
            'runtime-held',
            'close-held',
            'head503-retry',
            'intent',
          ]
        : ['cold-1', 'runtime-held', 'close-held', 'head503-retry', 'intent'];
    for (const mode of modes) {
      const sample: any = {
        family,
        mode,
        source,
        viewport: { width: 1440, height: 960 },
        theme: 'light',
        startedAt: new Date().toISOString(),
        requests: [],
        responses: [],
        errors: [],
        status: 'running',
      };
      const context = await browser.newContext({ viewport: sample.viewport, colorScheme: 'light' });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      let release = () => {};
      const gate = new Promise<void>((r) => (release = r));
      let failHead = mode === 'head503-retry';
      let runtimeRequested = false;
      let uiRequested = false;
      let runtimeResponded = false;
      page.on('pageerror', (e) => sample.errors.push(e.message));
      page.on('request', (r) => {
        const p = new URL(r.url()).pathname;
        if (p.startsWith('/pagefind/') || p === uiPath) {
          sample.requests.push({ path: p, method: r.method(), at: Date.now() });
          if (p === uiPath) uiRequested = true;
          if (p === '/pagefind/pagefind.js' && r.method() === 'GET') runtimeRequested = true;
        }
      });
      page.on('response', (r) => {
        const p = new URL(r.url()).pathname;
        if (p.startsWith('/pagefind/') || p === uiPath) {
          sample.responses.push({
            path: p,
            method: r.request().method(),
            status: r.status(),
            at: Date.now(),
          });
          if (p === '/pagefind/pagefind.js' && r.request().method() === 'GET')
            runtimeResponded = true;
        }
      });
      await page.route('**/pagefind/pagefind.js', async (r) => {
        if (r.request().method() === 'HEAD' && failHead) {
          await r.fulfill({ status: 503, body: '' });
          return;
        }
        if (r.request().method() === 'GET' && ['runtime-held', 'close-held'].includes(mode))
          await gate;
        await r.continue();
      });
      await page.addInitScript(() => {
        localStorage.setItem('starlight-theme', 'light');
        const timeline: any[] = [];
        (window as any).__native848 = timeline;
        for (const t of ['keydown', 'click', 'focusin'])
          window.addEventListener(
            t,
            (e) =>
              timeline.push({
                type: e.type,
                trusted: e.isTrusted,
                key: (e as KeyboardEvent).key,
                at: performance.now(),
              }),
            true
          );
        new MutationObserver(() => {
          const input = document.querySelector('.pagefind-ui__search-input');
          const dialog = document.querySelector('site-search dialog') as HTMLDialogElement | null;
          timeline.push({
            type: 'dom',
            at: performance.now(),
            dialogOpen: dialog?.open,
            input: !!input,
            focused: input === document.activeElement,
          });
        }).observe(document, { subtree: true, childList: true, attributes: true });
      });
      await page.addInitScript(installSearchStartupTrace);
      const uiReply = page.waitForResponse(
        (r) => new URL(r.url()).pathname === uiPath && r.status() === 200,
        { timeout: 10000 }
      );
      uiReply.catch(() => {});
      const runtimeReply = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/pagefind/pagefind.js' && r.request().method() === 'GET',
        { timeout: 10000 }
      );
      runtimeReply.catch(() => {});
      const save = async () => {
        sample.timeline = await page.evaluate(() => (window as any).__native848);
        await writeFile(
          path.join(output, `${family}-${mode}.json`),
          JSON.stringify(sample, null, 2)
        );
      };
      const capture = async (name: string) => {
        sample.capture = name;
        await page.screenshot({ path: path.join(output, name) });
      };
      try {
        assert.equal(
          (
            await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' })
          )?.status(),
          200
        );
        sample.readiness = await page.evaluate(readSearchReadyWithinBudget, {
          startedAt: Date.now(),
        });
        assert.equal(searchReadinessWasOnTime(sample.readiness), true);
        const trigger = page.locator(
          'site-search [data-projection-generation-state="active"] [data-open-modal]'
        );
        const dialog = page.locator('site-search dialog');
        const input = page.locator('site-search .pagefind-ui__search-input');
        assert.equal(runtimeRequested, false, 'No runtime GET before actual open/intent');
        assert.equal(uiRequested, false, 'No default UI GET before actual open/intent');
        assert.equal(await input.count(), 0);
        if (mode === 'intent') {
          await trigger.hover();
          await uiReply;
          assert.equal(await dialog.evaluate((e: any) => e.open), false);
          assert.equal(await input.count(), 0);
          sample.preparedWithoutUI = true;
        }
        sample.openSentAt = Date.now();
        await page.keyboard.press('Control+k');
        if (['runtime-held', 'close-held'].includes(mode)) {
          await Promise.race([
            uiReply,
            new Promise((_, reject) =>
              setTimeout(() => reject(Error('UI not requested while runtime held')), 2000)
            ),
          ]);
          assert.equal(runtimeRequested, true);
          assert.equal(runtimeResponded, false);
          assert.equal(uiRequested, true);
          assert.equal(await input.count(), 0);
          sample.parallelUIWhileRuntimeHeld = true;
          if (mode === 'runtime-held' && family === 'shadcn')
            await capture('shadcn-runtime-held-loading.png');
          if (mode === 'close-held') {
            await page.keyboard.press('Escape');
            assert.equal(await dialog.evaluate((e: any) => e.open), false);
            release();
            await runtimeReply;
            await page.evaluate(
              () =>
                new Promise<void>((r) =>
                  requestAnimationFrame(() => requestAnimationFrame(() => r()))
                )
            );
            assert.equal(await input.count(), 0);
            sample.closedWithoutLateUI = true;
            await page.keyboard.press('Control+k');
          } else release();
        }
        if (mode === 'head503-retry') {
          const retry = page.locator(
            'site-search [data-projection-generation-state="active"] .search-failure__retry'
          );
          await retry.waitFor({ state: 'visible' });
          assert.equal(await retry.evaluate((e) => e === document.activeElement), true);
          failHead = false;
          await retry.click();
          sample.retryFromHEAD503 = true;
        }
        await input.waitFor({ state: 'visible' });
        await page.waitForFunction(
          () => document.querySelector('.pagefind-ui__search-input') === document.activeElement
        );
        sample.inputObservedAt = Date.now();
        sample.descriptiveOpenToInputMs = sample.inputObservedAt - sample.openSentAt;
        assert.equal(await input.count(), 1);
        await input.fill('Button');
        const link = page
          .locator('site-search .pagefind-ui__result-link')
          .filter({ hasText: /button/i })
          .first();
        await link.waitFor({ state: 'visible' });
        sample.result = { href: await link.getAttribute('href'), text: await link.textContent() };
        const href = new URL(sample.result.href, `http://127.0.0.1:${port}`);
        assert.equal(href.origin, `http://127.0.0.1:${port}`);
        assert.equal((await context.request.get(href.href)).status(), 200);
        if (mode === 'cold-1') await capture(`${family}-cold-query.png`);
        assert.equal(sample.errors.length, 0);
        sample.status = 'pass';
        sample.endedAt = new Date().toISOString();
        await save();
        samples.push(sample);
        console.log(family, mode, 'PASS', sample.descriptiveOpenToInputMs);
      } catch (e) {
        sample.status = 'fail';
        sample.failure = String(e);
        await capture(`${family}-${mode}-failure.png`).catch(() => {});
        await save();
        samples.push(sample);
        throw e;
      } finally {
        release();
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await preview.stop();
  await writeFile(
    path.join(output, 'result.json'),
    JSON.stringify(
      {
        source,
        startedAt,
        endedAt: new Date().toISOString(),
        platform: process.platform,
        node: process.version,
        browser: browser.version(),
        scope:
          'Separate local macOS production-preview diagnostic; not the Linux-only managed runner or canonical CI; HEAD503 and two held runtime GETs are injected, UI/DOM/native keyboard/query real',
        samples,
        cleanup: 'browser close and owned preview stop awaited',
      },
      null,
      2
    )
  );
}
