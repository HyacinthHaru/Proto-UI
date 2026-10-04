/** Same clean-checkout probe for the reviewed before/candidate. Public website
 * content only. Actual Text/Surface leaves, never wrapper font-size stand-ins. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { Page } from 'playwright-core';
import { launchBrowser, startServer, stopServer } from '../src/content/docs/zh-cn/browser-harness';
import { verifyRevision } from './homepage-evidence-contract';
const { values } = parseArgs({
  options: {
    'revision-kind': { type: 'string' },
    'expected-revision': { type: 'string' },
    out: { type: 'string' },
    'quick-preview': { type: 'boolean', default: false },
  },
});
const kind = values['revision-kind'];
const quickPreview = values['quick-preview'] === true;
assert.ok(kind === 'baseline' || kind === 'candidate');
assert.ok(values.out && values['expected-revision']);
assert.ok(!process.env.PROTO_UI_BROWSER_BASE_URL);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const revision = git('rev-parse', 'HEAD');
verifyRevision(
  revision,
  values['expected-revision'],
  git('status', '--porcelain', '--untracked-files=all')
);
const out = path.resolve(values.out);
await mkdir(out, { recursive: true });
const script = fileURLToPath(import.meta.url);
const report = {
  revisionKind: kind,
  revision,
  scriptSha256: createHash('sha256')
    .update(await readFile(script))
    .digest('hex'),
  capturedAt: new Date().toISOString(),
  limits:
    'Chromium simulated CSS-pixel viewports. Fonts are measured on actual public Text leaves. Screenshots require human visual review; no physical device or complete accessibility claim.',
  cases: [] as Array<Record<string, unknown>>,
  failures: [] as string[],
};
const save = () => writeFile(path.join(out, 'metrics.json'), JSON.stringify(report, null, 2));
const base = await startServer(['/zh-cn/', '/zh-cn/start-here/what-you-saw/']);
const browser = await launchBrowser();
async function homeReady(page: Page, family = 'shadcn') {
  await page.waitForFunction((family) => {
    const r = document.querySelector<HTMLElement>('[data-homepage-runtime]');
    return r?.dataset.runtimeState === 'ready' && r.dataset.family === family;
  }, family);
}
async function switchFamily(page: Page) {
  const trigger = page.locator(
    '#home-preferences [data-projection-control="family"] [role="combobox"]'
  );
  await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  await page
    .locator(`[id=${JSON.stringify(id)}]`)
    .getByRole('option', { name: 'Brutalist', exact: true })
    .click();
  await homeReady(page, 'brutalist');
}
try {
  const configurations = [390, 1440].flatMap((width) =>
    ['zh-cn', 'en'].flatMap((locale) =>
      (['light', 'dark'] as const).map((theme) => ({
        width,
        locale,
        theme,
        family: 'shadcn' as const,
      }))
    )
  );
  const fullVariants = [
    ...configurations,
    ...(['light', 'dark'] as const).map((theme) => ({
      width: 1440,
      locale: 'zh-cn',
      theme,
      family: 'brutalist' as const,
    })),
  ];
  const variants = quickPreview
    ? [{ width: 1440, locale: 'zh-cn', theme: 'dark' as const, family: 'shadcn' as const }]
    : fullVariants;
  for (const v of variants)
    for (const target of quickPreview ? (['docs'] as const) : (['home', 'docs'] as const)) {
      const id = `${v.locale}-${v.width}-${v.theme}-${v.family}-${target}`;
      const context = await browser.newContext({
        viewport: { width: v.width, height: 1000 },
        colorScheme: v.theme,
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const entry: Record<string, unknown> = {
        id,
        ...v,
        target,
        screenshots: [],
        pageErrors: errors,
      };
      report.cases.push(entry);
      const shot = async (name: string, fullPage = false) => {
        const f = `${id}-${name}.png`;
        await page.screenshot({ path: path.join(out, f), fullPage });
        (entry.screenshots as string[]).push(f);
      };
      try {
        if (target === 'home') {
          await page.goto(`${base}/${v.locale}/`, { waitUntil: 'networkidle' });
          await homeReady(page);
          if (v.family === 'brutalist') await switchFamily(page);
          await page.evaluate(() => window.scrollTo(0, 0));
          const facts = await page.evaluate(() => {
            const text = (selector: string) => {
              const e = document.querySelector<HTMLElement>(selector)!;
              assertLeaf(e);
              const c = getComputedStyle(e);
              return {
                prototype: e.dataset.projectionPrototype ?? e.dataset.typographyPrototype,
                tokens: e.getAttribute('data-pui-style'),
                fontSize: parseFloat(c.fontSize),
                fontWeight: c.fontWeight,
                lineHeight: c.lineHeight,
              };
            };
            function assertLeaf(e: HTMLElement | null) {
              if (!e || !e.hasAttribute('data-pui-root'))
                throw new Error('Expected the actual public Text leaf');
            }
            const slogan = text('[data-site-typography="slogan"] [data-typography-prototype]');
            const title = text('.home-gallery__title [data-projection-prototype$="-text-root"]');
            const caption = text(
              '.home-gallery__caption [data-projection-prototype$="-text-root"]'
            );
            const card = document.querySelector<HTMLElement>(
              '[data-gallery-demo] [data-projection-prototype$="-surface-root"]'
            )!;
            const primary = document.querySelector<HTMLElement>(
              '[data-demo-ref="gallery-primary"]'
            )!;
            return {
              slogan,
              title,
              caption,
              cardPadding: getComputedStyle(card).padding,
              gridGap: getComputedStyle(document.querySelector('.home-gallery')!).gap,
              primary: {
                height: primary.getBoundingClientRect().height,
                fontSize: parseFloat(getComputedStyle(primary).fontSize),
              },
              overflow: document.documentElement.scrollWidth - innerWidth,
            };
          });
          entry.home = facts;
          await shot('initial');
          await shot('full', true);
          assert.ok(facts.overflow <= 1);
          assert.equal(facts.primary.fontSize, 14);
          assert.ok(Math.abs(facts.primary.height - (v.family === 'brutalist' ? 40 : 32)) <= 1);
          if (kind === 'candidate') {
            assert.equal(facts.slogan.fontSize, v.width === 390 ? 24 : 36);
            assert.equal(facts.cardPadding, '20px');
            assert.equal(facts.gridGap, v.width === 390 ? '20px' : '24px');
            assert.equal(facts.title.fontSize, 16);
            assert.equal(facts.caption.fontSize, 12);
          }
          if (v.width === 390)
            await page.locator('.site-header-menu [data-demo-ref="home-menu"]').click();
          const selects = await page
            .locator('#home-preferences [role="combobox"]')
            .evaluateAll((nodes) =>
              nodes
                .filter((e) => (e as HTMLElement).checkVisibility())
                .map((e) => ({
                  height: e.getBoundingClientRect().height,
                  overflow: e.scrollWidth - e.clientWidth,
                }))
            );
          entry.headerSelects = selects;
          assert.equal(selects.length, 2);
          for (const select of selects) {
            assert.ok(select.overflow <= 1);
            if (kind === 'candidate')
              assert.ok(Math.abs(select.height - (v.width === 390 ? 44 : 36)) <= 1);
          }
          if (v.width === 390) await page.keyboard.press('Escape');
        } else {
          const route =
            v.family === 'brutalist'
              ? `/${v.locale}/ui-libraries/brutalist/components/button/`
              : `/${v.locale}/start-here/what-you-saw/`;
          await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
          await page.waitForSelector('h1 [data-typography-prototype]');
          if (v.width === 390) {
            await page.waitForSelector('[data-site-contents-button]');
            await page.locator('[data-site-contents-button]').click();
          }
          await page.waitForFunction(() =>
            [
              ...document.querySelectorAll<HTMLElement>(
                '.sidebar-pane a[data-site-link-appearance="sidebar"]'
              ),
            ].some((e) => e.checkVisibility() && e.querySelector('[data-pui-root]'))
          );
          const read = () =>
            page.evaluate(() => {
              const rows = (selector: string) =>
                [...document.querySelectorAll<HTMLAnchorElement>(selector)]
                  .filter((e) => e.checkVisibility())
                  .map((link) => {
                    const surface = link.querySelector<HTMLElement>(
                      '[data-projection-prototype$="-surface-root"],wc-site-shadcn-surface,wc-site-brutalist-surface'
                    )!;
                    const text = link.querySelector<HTMLElement>(
                      'wc-site-shadcn-text,wc-site-brutalist-text,[data-projection-prototype$="-text-root"]'
                    )!;
                    if (!surface || !text)
                      throw new Error('Navigation requires real Surface/Text leaves');
                    const c = getComputedStyle(text),
                      s = getComputedStyle(surface);
                    return {
                      label: link.textContent?.trim(),
                      href: link.getAttribute('href'),
                      current: link.getAttribute('aria-current'),
                      inView: link.hasAttribute('in-view'),
                      surfaceHeight: surface.getBoundingClientRect().height,
                      hitHeight: link.getBoundingClientRect().height,
                      padding: s.padding,
                      fontSize: parseFloat(c.fontSize),
                      fontWeight: c.fontWeight,
                      tokens: surface.getAttribute('data-pui-style'),
                      textTokens: text.getAttribute('data-pui-style'),
                    };
                  });
              return {
                left: rows('.sidebar-pane a[data-site-link-appearance="sidebar"]'),
                right: rows('.right-sidebar a[data-site-link-appearance="toc"]'),
                bodySize: parseFloat(
                  getComputedStyle(
                    document.querySelector('[data-doc-flow] p [data-typography-prototype]')!
                  ).fontSize
                ),
                overflow: document.documentElement.scrollWidth - innerWidth,
              };
            });
          await shot('navigation');
          const facts = await read();
          entry.navigation = facts;
          assert.ok(facts.overflow <= 1);
          assert.ok(facts.left.length > 0);
          if (v.width === 1440) assert.ok(facts.right.length > 0);
          if (kind === 'candidate')
            for (const row of [...facts.left, ...facts.right]) {
              assert.ok(row.surfaceHeight >= (v.width === 390 ? 44 : 32) - 1);
              assert.equal(row.fontSize, 14);
              assert.equal(row.padding, '4px 8px');
              assert.equal(
                row.fontWeight,
                row.current && row.current !== 'false'
                  ? v.family === 'brutalist'
                    ? '600'
                    : '500'
                  : v.family === 'brutalist'
                    ? '500'
                    : '400'
              );
              if (row.inView && !row.current)
                assert.ok(
                  !row.tokens
                    ?.split(/\s+/)
                    .includes(v.family === 'brutalist' ? 'bg-main' : 'bg-accent')
                );
            }
          if (kind === 'candidate') assert.equal(facts.bodySize, 16);
          if (v.width === 1440) {
            const toc = page.locator('.right-sidebar a[data-site-link-appearance="toc"]').nth(1);
            if (await toc.count()) {
              const href = await toc.getAttribute('href');
              await toc.click();
              await page.waitForFunction(
                (href) => location.hash === new URL(href!, location.href).hash,
                href
              );
              await page.waitForFunction(
                (href) =>
                  [...document.querySelectorAll<HTMLAnchorElement>('.right-sidebar a')]
                    .find((a) => a.getAttribute('href') === href)
                    ?.getAttribute('aria-current') === 'true',
                href
              );
              await page.mouse.move(0, 0);
              const moved = await read();
              entry.afterTocNavigation = moved;
              await shot('toc-selected');
              assert.equal(moved.right.filter((x) => x.current && x.current !== 'false').length, 1);
              if (kind === 'candidate')
                assert.equal(
                  moved.right.filter((x) =>
                    x.tokens
                      ?.split(/\s+/)
                      .includes(v.family === 'brutalist' ? 'bg-main' : 'bg-accent')
                  ).length,
                  1
                );
            }
          }
        }
        assert.deepEqual(errors, []);
        entry.outcome = 'passed';
      } catch (e) {
        entry.outcome = 'failed';
        entry.error = e instanceof Error ? e.stack : String(e);
        report.failures.push(`${id}: ${String(e)}`);
        await shot('failure').catch(() => {});
      } finally {
        await save();
        await context.close();
      }
    }
} finally {
  await browser.close();
  await stopServer();
  await save();
}
assert.deepEqual(
  report.failures,
  [],
  'Visual density evidence preserves every failure and requires the candidate invariants'
);
