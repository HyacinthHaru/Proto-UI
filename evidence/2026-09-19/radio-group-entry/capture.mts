import { createServer } from 'node:http';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from '../../../apps/workspace/node_modules/vite/dist/node/index.js';
import { launchBrowser } from '../../../apps/www/src/content/docs/zh-cn/browser-harness.ts';
const fixture = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(fixture, '../../..');
const dir = await mkdtemp(path.join(tmpdir(), 'proto-radio-entry-'));
console.log(`Evidence output: ${dir}`);
let vite, server, browser;
try {
  vite = await createViteServer({
    root: fixture,
    cacheDir: dir + '/radio-entry-cache',
    configFile: path.join(repository, 'apps/www/test/fixtures/color-scheme/vite.config.ts'),
    server: { middlewareMode: true, hmr: false, fs: { allow: [repository, dir] } },
  });
  server = createServer(vite.middlewares);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw Error('No address');
  browser = await launchBrowser();
  const results = [];
  for (const controlled of [false, true])
    for (const value of ['a', 'b']) {
      const page = await browser.newPage({ viewport: { width: 600, height: 440 } });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(
          `http://127.0.0.1:${addr.port}/?value=${value}&controlled=${controlled ? 1 : 0}`
        );
        await page.waitForFunction(() => {
          const read = (window as any).readRadio?.();
          return (
            read?.count === 3 &&
            read.items.length === 3 &&
            read.items.filter((i: any) => i.checked === 'true').length === 1
          );
        });
        const frames = await page.evaluate(async () => {
          const rows = [];
          for (let i = 0; i < 12; i++) {
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
            rows.push((window as any).readRadio());
          }
          return rows;
        });
        await page.evaluate(() => {
          document.querySelector('#value')!.textContent =
            'Selected value: ' + (window as any).readRadio().value;
        });
        await page.locator('#start').click();
        await page.keyboard.press('Tab');
        const afterTab = await page.evaluate(() => (window as any).readRadio());
        const name = (controlled ? 'controlled' : 'uncontrolled') + '-' + value;
        await page.locator('main').screenshot({ path: dir + '/base-entry-' + name + '.png' });
        results.push({ controlled, value, frames, afterTab, errors });
      } finally {
        await page.close();
      }
    }
  const result = { browser: browser.version(), results };
  await writeFile(dir + '/radio-base-entry.json', JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        browser: browser.version(),
        cases: results.map((r) => ({
          controlled: r.controlled,
          value: r.value,
          first: r.frames[0],
          last: r.frames.at(-1),
          afterTab: r.afterTab,
          errors: r.errors,
        })),
      },
      null,
      2
    )
  );
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      await vite?.close();
    } finally {
      if (server?.listening) await new Promise<void>((r) => server.close(() => r()));
    }
  }
}
