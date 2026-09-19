// Three native custom elements only; this does not import Proto UI product code.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    'happy-dom': { type: 'string' },
    out: { type: 'string' },
  },
});
assert(
  values.out && (values.repo || values['happy-dom']),
  'Usage: tsx probe-element-order.mts --out <json> --happy-dom <installed/lib/index.js> OR --repo <candidate-checkout>'
);

function connectionOrder(environment: any) {
  const { document, customElements, HTMLElement } = environment ?? globalThis;
  const order: string[] = [];
  for (const tag of ['probe-root', 'probe-item', 'probe-indicator']) {
    customElements.define(
      tag,
      class extends HTMLElement {
        connectedCallback() {
          order.push(this.localName);
        }
      }
    );
  }
  const root = document.createElement('probe-root');
  const item = document.createElement('probe-item');
  item.appendChild(document.createElement('probe-indicator'));
  root.appendChild(item);
  document.body.appendChild(root);
  return order;
}

let result: Record<string, unknown>;
if (values['happy-dom']) {
  const entry = resolve(values['happy-dom']);
  const { Window } = await import(pathToFileURL(entry).href);
  const metadata = JSON.parse(await readFile(join(dirname(entry), '../package.json'), 'utf8'));
  const host = new Window();
  try {
    result = { host: 'happy-dom', version: metadata.version, order: connectionOrder(host) };
  } finally {
    host.close();
  }
} else {
  const { launchBrowser } = await import(
    pathToFileURL(join(resolve(values.repo!), 'apps/www/src/content/docs/zh-cn/browser-harness.ts'))
      .href
  );
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    result = {
      browser: browser.version(),
      order: await page.evaluate(connectionOrder, null),
      scope: 'Native custom-element connection order only; no Proto UI implementation injected',
    };
  } finally {
    await browser.close();
  }
}
await writeFile(resolve(values.out), JSON.stringify(result, null, 2) + '\n');
