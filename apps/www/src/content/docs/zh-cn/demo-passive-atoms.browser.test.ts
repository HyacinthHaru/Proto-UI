// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RUNTIMES, launchBrowser, selectRuntime, startServer, stopServer } from './browser-harness';

const subjects = [
  ...(['base', 'shadcn', 'brutalist'] as const).map((family) => ({ family, atom: 'text' })),
  ...(['base', 'shadcn', 'brutalist', 'bootstrap-2-3-2', 'liquid-glass'] as const).map(
    (family) => ({ family, atom: 'surface' })
  ),
];
const cases = subjects.flatMap(({ family, atom }) =>
  (['en', 'zh-cn'] as const).flatMap((locale) =>
    RUNTIMES.map((runtime) => ({
      family,
      atom,
      locale,
      runtime,
      route: `/${locale}/ui-libraries/${family}/${family === 'brutalist' ? 'components/' : ''}${atom}/`,
    }))
  )
);
let browser: Browser;
let baseUrl = '';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const trackedDiff = execFileSync('git', ['diff', '--binary', 'HEAD'], { encoding: 'utf8' });
const untrackedSource = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(
    (file) =>
      /^(apps\/www\/src|scripts\/test|packages|spec)\//.test(file) &&
      /\.(?:[cm]?[jt]sx?|mdx?|json|ya?ml)$/.test(file)
  );
const sourceDirty = trackedDiff.length > 0 || untrackedSource.length > 0;
const sourceDigest = createHash('sha256').update(sourceSha).update(trackedDiff);
for (const file of untrackedSource.sort()) sourceDigest.update(file).update(readFileSync(file));
const sourceSnapshotSha256 = sourceDigest.digest('hex');
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`;
const evidence = path.join(
  process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR ?? tmpdir(),
  'passive-atom-docs',
  `${sourceSha.slice(0, 12)}-${runId}`
);

beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  baseUrl = await startServer('/en/ui-libraries/base/text/');
  browser = await launchBrowser();
}, 180_000);
afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await stopServer();
  }
}, 60_000);

describe.sequential('Public passive atom documentation previews', () => {
  it.each(cases)(
    '$locale/$family/$atom/$runtime retains public content and passive ownership',
    async ({ family, atom, locale, runtime, route }) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        colorScheme: 'light',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const name = `${locale}-${family}-${atom}-${runtime}`;
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
        const preview = page.locator('[data-previewer-id]').first();
        await selectRuntime(page, preview, runtime, '[data-pui-root]', 4);
        await preview
          .locator('[data-passive-shell-slot]')
          .waitFor({ state: 'attached', timeout: 20_000 });
        expect(await preview.locator('[data-passive-shell-slot]').count()).toBe(1);
        const facts = await preview.evaluate((root) => {
          const host =
            root.querySelector<HTMLElement>('[data-projection-content]') ??
            root.querySelector<HTMLElement>('.host');
          if (!host) throw new Error('Public preview host is missing');
          const boundary = host.querySelector<HTMLElement>(
            '[data-demo-ref="__website_runtime_preview_surface__"]'
          );
          const content =
            host.querySelector<HTMLElement>('[data-passive-shell-slot]') ?? boundary ?? host;
          const nodes = [...content.querySelectorAll<HTMLElement>('[data-pui-root]')];
          return nodes.map((node) => {
            const style = getComputedStyle(node);
            return {
              text: node.textContent?.trim(),
              role: node.getAttribute('role'),
              tabIndex: node.tabIndex,
              width: node.getBoundingClientRect().width,
              height: node.getBoundingClientRect().height,
              size: Number.parseFloat(style.fontSize),
              decoration: style.textDecorationLine,
              background: style.backgroundColor,
              shadow: style.boxShadow,
              transform: style.transform,
            };
          });
        });
        // P-BASE-TEXT-PASSIVE / P-BASE-SURFACE-PASSIVE: a visual sample must not gain input ownership.
        expect(facts).toHaveLength(4);
        for (const fact of facts) {
          expect(fact.text?.length).toBeGreaterThan(0);
          expect(fact.role).toBeNull();
          expect(fact.tabIndex).toBe(-1);
          expect(fact.width).toBeGreaterThan(0);
          expect(fact.height).toBeGreaterThan(0);
        }
        if (atom === 'text') {
          expect(facts[0].text).toBe('A reusable Text atom');
          if (family !== 'base') {
            expect(facts[0].size).toBeGreaterThan(facts[1].size);
            expect(facts[3].decoration).toContain('underline');
          }
        } else {
          expect(facts[0].text).toBe('Outline · rest');
          if (family !== 'base') {
            expect(facts[2].shadow).not.toBe('none');
            expect(facts[3].transform).not.toBe('none');
          }
        }
        expect(errors).toEqual([]);
        await preview.screenshot({ path: path.join(evidence, `${name}.png`) });
        await writeFile(
          path.join(evidence, `${name}.json`),
          JSON.stringify(
            {
              sourceSha,
              sourceDirty,
              sourceSnapshotSha256,
              runId,
              route,
              runtime,
              viewport: { width: 1280, height: 1000 },
              theme: 'light',
              facts,
              errors,
            },
            null,
            2
          )
        );
      } catch (error) {
        await page.screenshot({ path: path.join(evidence, `${name}-failure.png`), fullPage: true });
        throw error;
      } finally {
        await context.close();
      }
    },
    90_000
  );
});
