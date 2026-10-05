// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { launchBrowser } from '../../../../apps/www/src/content/docs/zh-cn/browser-harness';
import type * as Fixture from './fixtures/focus-intent-native';

declare global {
  interface Window {
    focusIntentNative: typeof Fixture;
  }
}
let browser: Awaited<ReturnType<typeof launchBrowser>>;
let bundle: string;
beforeAll(async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./fixtures/focus-intent-native.ts', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    globalName: 'focusIntentNative',
    target: 'es2022',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  bundle = result.outputFiles[0].text;
  browser = await launchBrowser();
}, 60_000);
afterAll(async () => browser?.close());

// HC-FOCUS-TARGET-0001-C; C-AS-FOCUSABLE-0001-G. Native proof uses real
// CSS focus rejection, frame delivery, and trusted events on isolated own UI.
for (const runtime of ['react', 'vue', 'vue2', 'wc'] as const) {
  it.each(['programmatic', 'native', 'entry'] as const)(
    `${runtime} native %s requests renew exhausted budgets only on explicit new intent`,
    async (kind) => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.setContent('<!doctype html><body></body>');
        await page.addScriptTag({ content: bundle });
        const result = await page.evaluate(
          ({ runtime, kind }) => window.focusIntentNative.observeIntentBudget(runtime, kind),
          { runtime, kind }
        );
        console.info('[native-intent-budget]', JSON.stringify({ runtime, kind, ...result }));
        expect(result).toEqual({
          cycles: ['omitted', 'reused'].map((options) => ({
            options,
            rejected: true,
            exhaustedAfterReveal: true,
            newRejected: true,
            recovered: true,
          })),
          trustedFocusEvents: 2,
        });
      } finally {
        await context.close();
      }
    }
  );
  it(`${runtime} native descendant rejection stays bounded while its independent root remains focused`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent('<!doctype html><body></body>');
      await page.addScriptTag({ content: bundle });
      const result = await page.evaluate(
        (runtime) => window.focusIntentNative.observeFocusedRootBudget(runtime),
        runtime
      );
      console.info('[native-focused-root-budget]', JSON.stringify({ runtime, ...result }));
      expect(result).toEqual({
        initialRootActive: true,
        afterBudget: {
          rootActive: true,
          rootFocused: true,
          descendantActive: false,
          trustedDescendantFocusEvents: 0,
        },
        explicitRecovery: true,
        trustedDescendantFocusEvents: 1,
      });
    } finally {
      await context.close();
    }
  });
}
