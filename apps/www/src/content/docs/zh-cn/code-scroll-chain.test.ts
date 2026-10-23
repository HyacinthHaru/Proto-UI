// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const css = readFileSync('apps/www/src/styles/code-surfaces.css', 'utf8');
const browser = readFileSync(
  'apps/www/src/content/docs/zh-cn/code-scroll-chain.browser.test.ts',
  'utf8'
);
it('allows vertical document chaining without changing native code overflow or horizontal containment', () => {
  const block = css.match(/\.proto-previewer__code\s*\{([^}]+)\}/)![1];
  for (const token of [
    'overscroll-behavior-x: contain;',
    'overscroll-behavior-y: auto;',
    'overflow: auto;',
    'white-space: pre;',
    'max-height: 4.5rem;',
  ])
    expect(block).toContain(token);
  expect(block).not.toMatch(/overscroll-behavior\s*:/);
});
it('keeps the original reverse input and independently asserts internal, boundary and horizontal native scrolling', () => {
  const tokens = [
    'scrollTo(0, 2860)',
    'elementFromPoint(700, 550)',
    'page.mouse.move(700, 550)',
    'i < 14',
    'page.mouse.wheel(0, -220)',
    'before.scrollY - 500',
    'before.scrollHeight).toBe(before.clientHeight)',
    'before.scrollHeight - before.clientHeight).toBeGreaterThan(160)',
    'inside.scrollY).toBe(before.scrollY)',
    'boundary.scrollHeight - boundary.clientHeight',
    'toBeGreaterThan(boundary.scrollY)',
    'page.mouse.wheel(80, 0)',
    'after.scrollX).toBe(horizontal.scrollX)',
    'entry.failure = String(error)',
    'throw error',
    'await save()',
    'page.screenshot',
  ];
  const check = (s: string) => {
    for (const token of tokens) expect(s).toContain(token);
  };
  check(browser);
  for (const token of tokens) expect(() => check(browser.replaceAll(token, ''))).toThrow();
  const plan = readFileSync('scripts/test/runtime-test-plan.mjs', 'utf8');
  expect(
    plan.match(/'apps\/www\/src\/content\/docs\/zh-cn\/code-scroll-chain.browser.test.ts'/g)
  ).toHaveLength(1);
});

it('keeps exact-head, read-only and bounded independent evidence preparation', () => {
  const workflow = readFileSync('.github/workflows/code-scroll-chain-evidence.yml', 'utf8');
  for (const token of [
    'persist-credentials: false',
    'contents: read',
    'github.event.pull_request.head.sha || github.sha',
    'timeout --signal=TERM --kill-after=10s 560s',
    'if: always()',
    'set -euo pipefail',
    'prepare-homepage-composition-fonts.sh',
  ])
    expect(workflow).toContain(token);
  expect(readFileSync('.github/workflows/toc-motion-evidence.yml', 'utf8')).toContain(
    "'apps/www/src/styles/code-surfaces.css'"
  );
  expect(browser).toContain('trusted: event.isTrusted');
});
