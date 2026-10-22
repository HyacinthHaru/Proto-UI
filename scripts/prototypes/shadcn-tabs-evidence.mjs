import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { build } from 'esbuild';
import { collectProtoStyleTokensFromFiles } from '../../packages/cli/src/services/prototype-style-tokens.ts';
import { renderProtoStyleTokenCss } from '../../packages/cli/src/services/proto-style-css.ts';
const out = resolve(process.argv[2] ?? '/tmp/pui-shadcn-tabs-evidence');
await mkdir(out, { recursive: true });
const sourceFiles = [
  'root.proto.ts',
  'list.proto.ts',
  'trigger.proto.ts',
  'content.proto.ts',
  'visual.ts',
].map((x) => resolve('packages/prototypes/shadcn/src/tabs', x));
const tokens = await collectProtoStyleTokensFromFiles(sourceFiles);
const css = renderProtoStyleTokenCss(tokens);
assert(!css.includes('Unsupported Proto UI style tokens'));
await writeFile(join(out, 'tokens.css'), css);
await build({
  entryPoints: ['scripts/prototypes/shadcn-tabs-evidence-app.ts'],
  outfile: join(out, 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  tsconfig: 'tsconfig.json',
});
const palette = `:root{--pui-background:#fff;--pui-foreground:#171717;--pui-muted:#f5f5f5;--pui-muted-foreground:#737373;--pui-input:#e5e5e5;--pui-ring:#a3a3a3;--pui-border:#e5e5e5}[data-theme=dark]{--pui-background:#0a0a0a;--pui-foreground:#fafafa;--pui-muted:#262626;--pui-muted-foreground:#a3a3a3;--pui-input:#525252;--pui-ring:#737373;--pui-border:#404040}`;
await writeFile(
  join(out, 'index.html'),
  `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><link rel="stylesheet" href="tokens.css"><title>Source-bound production Tabs</title><style>${palette}body{font:14px system-ui;margin:32px;color:var(--pui-foreground);background:var(--pui-background)}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}section{border:1px solid var(--pui-border);border-radius:12px;padding:20px}h1{font-size:24px}h2{font-size:18px}h3{font-size:12px;text-transform:uppercase;margin-top:32px;color:var(--pui-muted-foreground)}p{color:var(--pui-muted-foreground)}</style></head><body><h1>Production Tabs · shared style scope</h1><p>Text/default only · New York retained · Nova and Rhea · neutral consumer palette</p><main></main><p>Upstream line and SVG/icon surfaces remain unsupported. This is not full Tabs or all-style parity.</p><script type="module" src="app.js"></script></body></html>`
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const receipt = {
  revision:
    process.env.EVIDENCE_HEAD_SHA ??
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceFiles: await Promise.all(
    sourceFiles.map(async (p) => ({
      path: p.slice(process.cwd().length + 1),
      sha256: hash(await readFile(p)),
    }))
  ),
  bundleSha256: hash(await readFile(join(out, 'app.js'))),
  cssSha256: hash(css),
  scope:
    'text/default; Web Components; neutral consumer palette; not full upstream/browser-family parity',
};
if (!process.argv.includes('--build-only'))
  assert.equal(
    receipt.revision,
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    'Evidence revision must equal the checkout'
  );
await writeFile(join(out, 'source.json'), JSON.stringify(receipt, null, 2) + '\n');
if (process.argv.includes('--build-only')) {
  console.log(JSON.stringify(receipt));
  process.exit(0);
}
const { launchBrowser } = await import('../../apps/www/src/content/docs/zh-cn/browser-harness.ts');
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const file = resolve(out, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(out + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.setHeader(
      'content-type',
      { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ??
        'application/octet-stream'
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const observations = [];
try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 820 } });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const theme of ['light', 'dark']) {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
    const matrix = await page.evaluate(() =>
      window.tabsEvidence.records.map((r) => ({
        style: r.style,
        orientation: r.orientation,
        height: r.list.getBoundingClientRect().height,
        radius: getComputedStyle(r.triggers[0]).borderRadius,
        selected: r.triggers[0].getExposes().selected.get(),
        color: getComputedStyle(r.triggers[0]).backgroundColor,
      }))
    );
    for (const row of matrix) {
      assert.equal(row.selected, true);
      assert.equal(row.radius, row.style === 'rhea' ? '16px' : '6px');
      if (row.orientation === 'horizontal')
        assert.equal(row.height, row.style === 'new-york-v4' ? 36 : 32);
    }
    const stable = await page.evaluate(async () => {
      const { records, setElementProps } = window.tabsEvidence;
      const r = records[0],
        a = r.triggers[0],
        text = a.firstChild,
        handle = r.root.getExposes().value,
        selected = a.getExposes().selected;
      a.focus();
      const selection = document.getSelection();
      const range = document.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 4);
      selection.removeAllRanges();
      selection.addRange(range);
      for (const style of ['nova', 'rhea', 'new-york-v4']) {
        setElementProps(r.scope, { styleProfile: style });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (
          document.activeElement !== a ||
          a.firstChild !== text ||
          r.root.getExposes().value !== handle ||
          a.getExposes().selected !== selected ||
          handle.get() !== 'account' ||
          selection.getRangeAt(0).startOffset !== 1 ||
          selection.getRangeAt(0).endOffset !== 4
        )
          return false;
      }
      selection.removeAllRanges();
      a.blur();
      return true;
    });
    assert.equal(stable, true);
    await page.screenshot({ path: join(out, `${theme}-tabs.png`), fullPage: true });
    observations.push({ theme, matrix, noReset: stable });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    join(out, 'browser.json'),
    JSON.stringify({ revision: receipt.revision, observations, pageErrors: errors }, null, 2) + '\n'
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Tabs browser evidence passed: ${out}`);
