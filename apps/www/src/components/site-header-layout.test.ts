import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

const markdown = readFileSync('apps/www/src/components/override/MarkdownContent.astro', 'utf8');
const frame = readFileSync('apps/www/src/components/override/PageFrame.astro', 'utf8');
const browser = readFileSync(
  'apps/www/src/content/docs/zh-cn/site-search-commands.browser.test.ts',
  'utf8'
);

function actualMarkdownFixture() {
  // Materialize the checked-in wrapper itself. Never invent a legacy class to
  // make a Website selector pass when the real MarkdownContent does not have it.
  const body = markdown
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace('<SiteCopyBootstrap />', '')
    .replace('<slot />', '<h2 id="actual-doc-heading">Installation</h2>');
  document.body.innerHTML = `<div class="site-page-frame"><header data-docs-site-header></header><main>${body}</main></div>`;
  const heading = document.querySelector<HTMLHeadingElement>('#actual-doc-heading')!;
  expect(heading.closest('[data-doc-flow]')).not.toBeNull();
  expect(document.querySelector('.sl-markdown-content')).toBeNull();
  return heading;
}
afterEach(() => document.body.replaceChildren());

describe('Docs header offset targets the actual MarkdownContent wrapper', () => {
  it('matches the real heading with the owned scroll-margin selector', () => {
    const heading = actualMarkdownFixture();
    const match = frame.match(/:global\(([^{}]*?)\)\s*\{\s*scroll-margin-top:\s*([^;]+);/);
    expect(match).not.toBeNull();
    const selector = match![1]!.replace(/\s+/g, ' ').trim();
    expect([...document.querySelectorAll(selector)]).toContain(heading);
    expect(match![2]).toBe('calc(var(--header-height) + 1rem)');
  });

  it('uses a browser heading locator that exists in the real wrapper', () => {
    const heading = actualMarkdownFixture();
    const selector = browser.match(/const heading = page\.locator\('([^']+)'\)\.first\(\)/)?.[1];
    expect(selector).toBeTruthy();
    expect(document.querySelector(selector!)).toBe(heading);
  });
});
