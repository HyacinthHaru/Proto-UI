import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const { values, positionals } = parseArgs({
  options: { chrome: { type: 'string' } },
  allowPositionals: true,
});
const [sourcePath, label, scenario = 'crossing'] = positionals;
const executablePath = values.chrome ?? process.env.CHROME_PATH;
if (!sourcePath || !label || !executablePath) {
  throw new Error(
    'Usage: run.mjs SOURCE_ROOT LABEL [crossing|coalescing] --chrome CHROME_PATH (or set CHROME_PATH)'
  );
}
const sourceRoot = path.resolve(sourcePath);
const require = createRequire(path.join(sourceRoot, 'apps/www/package.json'));
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const serving = path.join(here, label);
const server = http.createServer((request, response) => {
  const file = path.join(serving, request.url === '/' ? 'index.html' : request.url.split('?')[0]);
  if (!fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader(
    'Content-Type',
    file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.html')
        ? 'text/html'
        : 'application/json'
  );
  response.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (event) => {
  if (event.type() === 'error') errors.push(event.text());
});
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => Boolean(window.evidence));
  await page.screenshot({
    path: path.join(here, `${label}-${scenario}-initial.png`),
    fullPage: true,
  });
  const result = await page.evaluate((scenario) => window.evidence[scenario](), scenario);
  await page.screenshot({
    path: path.join(here, `${label}-${scenario}-result.png`),
    fullPage: true,
  });
  const evidence = {
    date: new Date().toISOString(),
    browser: browser.version(),
    node: process.version,
    scenario,
    result,
    errors,
  };
  fs.writeFileSync(path.join(here, `${label}-${scenario}.json`), JSON.stringify(evidence, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(result.result.phase, 'mounted');
  assert.equal(result.result.state, 2);
  assert.equal(result.result.calls.setup, 1);
  assert.equal(result.result.calls.created, 1);
  assert.equal(result.result.calls.disposed, 0);
  if (scenario === 'crossing') {
    assert.equal(result.sameState, true);
    assert.equal(result.result.epoch, 2);
    assert.equal(result.result.calls.mounted, 2);
    assert.equal(result.result.calls.unmounted, 1);
    assert.equal(result.result.renderedText, label === 'baseline' ? 'Count 1' : 'Count 2');
    assert.equal(result.result.calls.render, label === 'baseline' ? 3 : 4);
    assert.equal(result.result.calls.updated, label === 'baseline' ? 0 : 1);
    assert.equal(
      result.trace.some((event) => event.type === 'update.commit.done' && event.epoch === 1),
      false
    );
  } else {
    assert.equal(result.result.renderedText, 'Count 2');
    assert.equal(result.result.epoch, 1);
    assert.equal(result.result.calls.render, 3);
    assert.equal(result.result.calls.updated, 2);
  }
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
  server.close();
}
