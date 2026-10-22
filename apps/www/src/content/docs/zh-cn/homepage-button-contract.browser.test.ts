// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Browser, Locator, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer, RUNTIMES } from './browser-harness';
import { revealHeaderPreferences } from './site-header-browser';
import { copySourceBindingIssues, type CopySourceBinding } from './copy-command-evidence';

let browser: Browser, baseUrl: string, source: CopySourceBinding;
const directory = join(
  process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR ||
    join(process.env.RUNNER_TEMP || tmpdir(), 'homepage-evidence'),
  'homepage-button-contract'
);
beforeAll(async () => {
  source = {
    exactSHA: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
    expectedSHA: process.env.CANDIDATE_SHA ?? process.env.PROTO_UI_EXPECTED_REVISION ?? null,
    eventSHA: process.env.GITHUB_SHA ?? null,
  };
  expect(copySourceBindingIssues(source, Boolean(process.env.CI))).toEqual([]);
  await mkdir(directory, { recursive: true });
  baseUrl = await startServer('/zh-cn/');
  browser = await launchBrowser();
}, 300_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
});

async function ready(page: Page, runtime: string, family: string) {
  await page.waitForFunction(
    ({ runtime, family }) => {
      const root = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      const showcase = document.querySelector<HTMLElement>('[data-home-showcase]');
      return (
        root?.dataset.runtimeState === 'ready' &&
        root.dataset.runtime === runtime &&
        root.dataset.family === family &&
        showcase?.dataset.runnerState === 'ready' &&
        showcase.dataset.runnerRuntime === runtime
      );
    },
    { runtime, family }
  );
}
async function facts(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element),
      bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      width: bounds.width,
      fontSize: style.fontSize,
      computedFontFamily: style.fontFamily,
      lineHeight: style.lineHeight,
      userSelect: style.userSelect,
      webkitUserSelect: style.getPropertyValue('-webkit-user-select'),
      boxSizing: style.boxSizing,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderTop: style.borderTopWidth,
      borderBottom: style.borderBottomWidth,
      minHeight: style.minHeight,
      whiteSpace: style.whiteSpace,
      inlineHeight: (element as HTMLElement).style.height,
      inlineMinHeight: (element as HTMLElement).style.minHeight,
      tokens: element.getAttribute('data-pui-style'),
      text: element.textContent,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
}
async function textPoint(element: Locator, last = false) {
  return element.evaluate((element, last) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    for (let next = walker.nextNode(); next; next = walker.nextNode())
      if (next.textContent?.trim()) texts.push(next as Text);
    const text = last ? texts.at(-1)! : texts[0]!;
    const range = document.createRange();
    range.setStart(text, last ? Math.max(0, text.length - 1) : 0);
    range.setEnd(text, last ? text.length : 1);
    const rect = range.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, last);
}

describe.sequential('Base Button selection and family-owned homepage geometry', () => {
  for (const runtime of RUNTIMES)
    for (const family of ['shadcn', 'brutalist'] as const) {
      it(`${runtime}/${family} preserves local selection policy, public height and editing`, async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const errors: string[] = [],
          record: Record<string, unknown> = {
            ...source,
            runtime,
            family,
            browser: browser.version(),
          };
        page.on('pageerror', (error) => errors.push(error.message));
        const prefix = `${runtime}-${family}`;
        const capture = async (name: string) => {
          await page.screenshot({ path: join(directory, `${prefix}-${name}.png`) });
          await writeFile(join(directory, `${prefix}.json`), JSON.stringify(record, null, 2));
        };
        try {
          await page.addInitScript(
            (runtime) => localStorage.setItem('preferred-prototypes-adapter', runtime),
            runtime
          );
          await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
          await ready(page, runtime, 'shadcn');
          if (family === 'brutalist') {
            await revealHeaderPreferences(page);
            const choice = page.locator(
              '#home-preferences [data-projection-control="family"] [role="combobox"]'
            );
            await choice.click();
            const id = await choice.getAttribute('aria-controls');
            expect(id).toBeTruthy();
            await page
              .locator(`[id=${JSON.stringify(id)}]`)
              .getByRole('option', { name: 'Brutalist', exact: true })
              .click();
            await ready(page, runtime, family);
          }
          const reset = page.locator(
            '[data-home-showcase] [data-projection-generation-state="active"] [data-demo-ref="editor-reset"]'
          );
          await reset.waitFor({ state: 'visible' });
          await reset.scrollIntoViewIfNeeded();
          await page.mouse.move(0, 0);
          const normal = await facts(reset);
          record.normal = normal;
          // Record the actual glyph provider, not just the CSS fallback stack.
          try {
            const fontSession = await context.newCDPSession(page);
            try {
              await fontSession.send('DOM.enable');
              await fontSession.send('CSS.enable');
              const { root } = await fontSession.send('DOM.getDocument');
              const { nodeId } = await fontSession.send('DOM.querySelector', {
                nodeId: root.nodeId,
                selector:
                  '[data-home-showcase] [data-projection-generation-state="active"] [data-demo-ref="editor-reset"]',
              });
              record.platformFonts = await fontSession.send('CSS.getPlatformFontsForNode', {
                nodeId,
              });
            } finally {
              await fontSession.detach();
            }
          } catch (error) {
            record.platformFontObservationError = String(error);
          }
          await capture('normal');
          expect(normal.userSelect).toBe('none');
          expect(normal.inlineHeight).toBe('');
          expect(normal.inlineMinHeight).toBe('');
          expect(normal.minHeight).toBe(family === 'shadcn' ? '36px' : '40px');
          expect(normal.height).toBe(family === 'shadcn' ? 36 : 40);
          expect(normal.whiteSpace).toBe('normal');
          // Actual native drag initiated inside the command label, not a scripted Range.
          await page.evaluate(() => getSelection()?.removeAllRanges());
          const start = await textPoint(reset),
            end = await textPoint(reset, true);
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await page.mouse.move(end.x, end.y, { steps: 12 });
          await page.mouse.up();
          record.commandDrag = await page.evaluate(() => getSelection()?.toString() ?? '');
          await capture('command-drag');
          expect(record.commandDrag).toBe('');
          // Neighboring document text remains selectable. Ctrl+A is recorded separately:
          // range containment is NOT evidence of copy protection or a failed select-none.
          const heading = page.locator('h1').first();
          await heading.scrollIntoViewIfNeeded();
          const headingPoint = await textPoint(heading);
          await page.mouse.click(headingPoint.x, headingPoint.y, { clickCount: 3 });
          const prose = await page.evaluate(() => getSelection()?.toString().trim() ?? '');
          record.proseSelection = prose;
          expect(prose.length).toBeGreaterThan(0);
          await page.keyboard.press('Control+a');
          record.documentSelectAll = await page.evaluate(() => ({
            text: getSelection()?.toString(),
            ranges: getSelection()?.rangeCount,
          }));
          await capture('document-select-all');
          expect((record.documentSelectAll as { ranges: number }).ranges).toBeGreaterThan(0);
          await page.evaluate(() => getSelection()?.removeAllRanges());
          const editor = page.getByRole('textbox', { name: '编辑示例文本', exact: true });
          const sample = '用同一份原型，组合你的界面。';
          expect(await editor.inputValue()).toBe(sample);
          await editor.fill('Selectable editing remains available');
          await editor.press('Control+a');
          expect(
            await editor.evaluate((node) => {
              const input = node as HTMLTextAreaElement;
              return input.value.slice(input.selectionStart, input.selectionEnd);
            })
          ).toBe('Selectable editing remains available');
          const probe = await reset.evaluateHandle((original) => {
            const selector =
              '[data-home-showcase] [data-projection-generation-state="active"] [data-demo-ref="editor-reset"]';
            const identities = new WeakMap<Node, number>();
            let nextId = 0;
            const id = (node: Node | null) => {
              if (!node) return null;
              if (!identities.has(node)) identities.set(node, ++nextId);
              return identities.get(node)!;
            };
            const snapshot = () => {
              const button = document.querySelector(selector);
              const input = document.querySelector(
                '[data-home-showcase] [data-projection-generation-state="active"] [data-demo-ref="editor-text"]'
              );
              return {
                originalButtonId: id(original),
                originalConnected: original.isConnected,
                currentButtonId: id(button),
                editorId: id(input),
                focusedId: id(document.activeElement),
                focusedWithinButton: Boolean(button?.contains(document.activeElement)),
              };
            };
            const events: Array<Record<string, unknown>> = [];
            const observe = (event: Event) => {
              const keyboard = event instanceof KeyboardEvent ? event : null;
              events.push({
                type: event.type,
                key: keyboard?.key ?? null,
                code: keyboard?.code ?? null,
                repeat: keyboard?.repeat ?? null,
                trusted: event.isTrusted,
                targetId: id(event.target instanceof Node ? event.target : null),
                targetWithinButton: Boolean(
                  event.target instanceof Node &&
                  document.querySelector(selector)?.contains(event.target)
                ),
                ...snapshot(),
              });
            };
            for (const type of ['keydown', 'keyup', 'click'])
              document.addEventListener(type, observe, true);
            return {
              snapshot,
              events,
              clear: () => events.splice(0),
              stop: () => {
                for (const type of ['keydown', 'keyup', 'click'])
                  document.removeEventListener(type, observe, true);
              },
            };
          });
          try {
            for (const key of ['Space', 'Enter'] as const) {
              if (key === 'Enter') await editor.fill('Second edit');
              await reset.focus();
              await probe.evaluate((probe) => probe.clear());
              const before = await probe.evaluate((probe) => probe.snapshot());
              const activation: Record<string, unknown> = { key, before, expectedValue: sample };
              record[`keyboard${key}`] = activation;
              try {
                expect(before.focusedWithinButton).toBe(true);
                // One native key sequence only. The void setProps API does not
                // promise that a framework's visible DOM commit is synchronous.
                await page.keyboard.press(key);
                activation.immediateValue = await editor.inputValue();
                activation.immediateIdentity = await probe.evaluate((probe) => probe.snapshot());
                await expect
                  .poll(() => editor.inputValue(), { timeout: 2_000, interval: 20 })
                  .toBe(sample);
                activation.settledValue = await editor.inputValue();
                const events = await probe.evaluate((probe) => probe.events);
                for (const type of ['keydown', 'keyup']) {
                  const matching = events.filter(
                    (event) => event.type === type && event.code === key
                  );
                  expect(matching).toHaveLength(1);
                  expect(matching[0]!.targetWithinButton).toBe(true);
                  expect(matching[0]!.trusted).toBe(true);
                  expect(matching[0]!.repeat).toBe(false);
                }
              } finally {
                activation.finalIdentity = await probe.evaluate((probe) => probe.snapshot());
                activation.finalValue = await editor.inputValue();
                // Native click observations are not equated with semantic callback counts.
                activation.nativeEvents = await probe.evaluate((probe) => probe.events);
                await capture(`keyboard-${key.toLowerCase()}`);
              }
            }
          } finally {
            await probe.evaluate((probe) => probe.stop());
            await probe.dispose();
          }
          // Font enlargement is not browser zoom. Do not rewrite any button dimensions.
          await page.setViewportSize({ width: 390, height: 1000 });
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
          await reset.scrollIntoViewIfNeeded();
          await page.mouse.move(0, 0);
          const enlarged = await facts(reset);
          record.enlarged = { ...enlarged, textScale: 200, browserZoomVerified: false };
          await capture('text200');
          expect(enlarged.height).toBeGreaterThan(normal.height);
          expect(enlarged.height).toBeGreaterThanOrEqual(parseFloat(enlarged.lineHeight));
          expect(enlarged.scrollWidth).toBeLessThanOrEqual(enlarged.clientWidth + 1);
          expect(enlarged.inlineHeight).toBe('');
          expect(enlarged.inlineMinHeight).toBe('');
          // Independent trigger owners are not converted to Base Button. Removing
          // the old page-wide geometry regex must not clip their labels at 200%.
          const triggerFacts = await page
            .locator('[data-home-gallery] [data-projection-prototype]')
            .evaluateAll((nodes) =>
              nodes
                .filter((node) =>
                  /-(?:dialog-trigger|dropdown(?:-menu)?-trigger)$/.test(
                    node.getAttribute('data-projection-prototype') ?? ''
                  )
                )
                .map((node) => {
                  // The unstyled DialogTrigger delegates its painted action to its authored Button.
                  const subject =
                    node.querySelector<HTMLElement>(
                      '[data-projection-prototype="shadcn-button"]'
                    ) ?? node;
                  const style = getComputedStyle(subject),
                    bounds = subject.getBoundingClientRect();
                  const range = document.createRange();
                  range.selectNodeContents(subject);
                  const text = range.getBoundingClientRect();
                  return {
                    prototype: node.getAttribute('data-projection-prototype'),
                    display: style.display,
                    height: bounds.height,
                    width: bounds.width,
                    clientWidth: subject.clientWidth,
                    scrollWidth: subject.scrollWidth,
                    textHeight: text.height,
                    textWidth: text.width,
                    inlineHeight: (node as HTMLElement).style.height,
                    inlineMinHeight: (node as HTMLElement).style.minHeight,
                  };
                })
            );
          record.independentTriggers = triggerFacts;
          expect(triggerFacts.length).toBeGreaterThanOrEqual(2);
          for (const trigger of triggerFacts) {
            expect(trigger.inlineHeight).toBe('');
            expect(trigger.inlineMinHeight).toBe('');
            // display:contents is an ownership wrapper, not a painted hit area.
            if (trigger.display !== 'contents') {
              expect(trigger.height).toBeGreaterThanOrEqual(trigger.textHeight - 1);
              expect(trigger.scrollWidth).toBeLessThanOrEqual(trigger.clientWidth + 1);
            }
          }
          expect(errors).toEqual([]);
        } finally {
          record.errors = errors;
          await capture('final').catch(() => {});
          await context.close();
        }
      }, 120_000);
    }
});
