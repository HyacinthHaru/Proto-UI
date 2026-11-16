import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const harness = pathToFileURL(
  join(process.cwd(), 'apps/www/src/content/docs/zh-cn/browser-harness.ts')
);
const { launchBrowser, startServer, stopServer } = await import(harness.href);

const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
assert.equal(source, '1954cd3566b8f93e388352e282701dd086df2cdd');
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
const output = process.argv[2];
const mode = process.argv[3];
assert(output && (mode === 'smoke' || mode === 'all'));
await mkdir(output);
const fixture = await readFile(new URL('./drawer-grid-page.mjs', import.meta.url), 'utf8');
const url = await startServer('/');
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Drawer grid integration</title>
<style>
body { margin: 0; font: 16px system-ui, sans-serif; }
.drawer-test-grid {
  display: grid;
  position: relative;
  grid-template-columns: repeat(2, 160px);
  grid-template-rows: repeat(2, 40px);
  grid-auto-rows: 40px;
  gap: 8px;
  width: max-content;
  margin: 100px 40px;
}
[data-grid-cell] {
  padding: 8px;
  border: 1px solid currentColor;
}
</style></head><body><main id="drawer-grid-host"></main></body></html>`;

async function bounded<T>(stage: string, action: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      action,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(stage + ' did not complete in 20s')), 20_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
try {
  const browser = await launchBrowser();
  const results = [];
  try {
    for (const family of mode === 'smoke' ? ['base'] : ['base', 'shadcn', 'brutalist']) {
      for (const runtime of mode === 'smoke' ? ['wc', 'react'] : ['wc', 'react', 'vue', 'vue2']) {
        const context = await browser.newContext({ viewport: { width: 1000, height: 760 } });
        try {
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.route('**/drawer-grid-probe/', (route) =>
            route.fulfill({ contentType: 'text/html', body: html })
          );
          await page.goto(url + '/drawer-grid-probe/', { waitUntil: 'domcontentloaded' });
          await page.addScriptTag({ type: 'module', content: fixture });
          await page.waitForFunction(() => Boolean((globalThis as any).drawerGrid), undefined, {
            timeout: 20_000,
          });
          const cdp = await context.newCDPSession(page);
          try {
            for (const displayContents of [false, true]) {
              const sampleLabel = { family, runtime, displayContents };
              console.log(JSON.stringify({ ...sampleLabel, stage: 'start' }));
              await bounded(
                'mount',
                page.evaluate((input) => (globalThis as any).drawerGrid.mount(input), sampleLabel)
              );
              const trigger = page.getByRole('button', { name: 'Open Drawer', exact: true });
              const visibleRootNode = page.locator('#actual-grid > [data-demo-ref="root"]');
              await trigger.waitFor({ state: 'visible', timeout: 10_000 });
              assert.equal(await visibleRootNode.count(), 1);
              const layout = await page.evaluate(() => (globalThis as any).drawerGrid.geometry());
              console.log(JSON.stringify({ ...sampleLabel, stage: 'layout', layout }));
              assert(layout.rootIsDirectChild);
              assert.equal(layout.triggerPosition, 'absolute');
              assert.equal(layout.rootBoxCount, displayContents ? 0 : 1);
              assert.equal(layout.rootDisplay, displayContents ? 'contents' : 'block');
              assert.deepEqual(
                layout.templateRows.split(' '),
                displayContents ? ['40px', '40px'] : ['40px', '40px', '40px']
              );
              assert.equal(layout.cells.length, 4);
              assert.deepEqual(
                layout.cells.map((cell: { top: number }) => cell.top),
                displayContents ? [0, 0, 48, 48] : [0, 0, 48, 96]
              );

              const popup = page.getByRole('dialog', { name: 'Drawer settings', exact: true });
              await trigger.press('Enter', { timeout: 10_000 });
              await popup.waitFor({ state: 'visible', timeout: 10_000 });
              assert.equal(await popup.getAttribute('aria-modal'), 'true');
              const relation = await popup.evaluate((element) => ({
                title: element.ownerDocument
                  .getElementById(element.getAttribute('aria-labelledby') ?? '')
                  ?.textContent?.trim(),
                description: element.ownerDocument
                  .getElementById(element.getAttribute('aria-describedby') ?? '')
                  ?.textContent?.trim(),
              }));
              assert.equal(relation.title, 'Drawer settings');
              assert(relation.description?.includes('This panel fits its content.'));
              await page.waitForFunction(
                () => {
                  const element = document.querySelector('[role="dialog"][data-demo-ref="panel"]');
                  return !!element?.contains(document.activeElement);
                },
                undefined,
                { timeout: 10_000 }
              );
              const doc = await cdp.send('DOM.getDocument');
              const { nodeId } = await cdp.send('DOM.querySelector', {
                nodeId: doc.root.nodeId,
                selector: '[role="dialog"][data-demo-ref="panel"]',
              });
              assert(nodeId);
              const ax = await cdp.send('Accessibility.getPartialAXTree', {
                nodeId,
                fetchRelatives: false,
              });
              const axDialog = ax.nodes.find((node) => node.role?.value === 'dialog');
              assert.equal(axDialog?.name?.value, 'Drawer settings');
              await page.keyboard.press('Tab');
              assert(await popup.evaluate((element) => element.contains(document.activeElement)));
              await page.keyboard.press('Escape');
              await popup.waitFor({ state: 'hidden', timeout: 10_000 });
              await page.waitForFunction(
                () => document.activeElement?.getAttribute('data-demo-ref') === 'grid-trigger',
                undefined,
                { timeout: 10_000 }
              );
              assert.equal(
                await page.evaluate(() => (globalThis as any).drawerGrid.rootOpen()),
                false
              );
              assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
              assert.deepEqual(errors, []);
              if (family === 'base' && runtime === 'wc') {
                await page.screenshot({
                  path: join(output, displayContents ? 'grid-contents.png' : 'grid-wrapper.png'),
                });
              }
              results.push({
                ...sampleLabel,
                layout,
                role: axDialog?.role?.value,
                name: axDialog?.name?.value,
                relation,
                tabInside: true,
                returnedFocus: true,
              });
              await writeFile(
                join(output, 'receipt.json'),
                JSON.stringify({ source, tree, chrome: browser.version(), results }, null, 2) + '\n'
              );
              await bounded(
                'destroy',
                page.evaluate(() => (globalThis as any).drawerGrid.destroy())
              );
            }
          } finally {
            await cdp.detach();
          }
        } finally {
          await bounded('context close', context.close());
        }
      }
    }
  } finally {
    await bounded('browser close', browser.close());
  }
} finally {
  await stopServer();
}
