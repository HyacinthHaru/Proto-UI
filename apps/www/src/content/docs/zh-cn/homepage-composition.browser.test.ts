// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Browser, BrowserContext, Locator, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, startServer, stopServer, RUNTIMES } from './browser-harness';
import { revealHeaderPreferences } from './site-header-browser';
import { copySourceBindingIssues, type CopySourceBinding } from './copy-command-evidence';

// Eight fresh, credential-free contexts; five layout samples reuse each page.
// 150s startup + 8 x 45s cases + 30s no-JS + 20s teardown < the 600s lane cap.
// Only real input changes application state. The sole style mutation is the
// explicitly reported text-resize simulation, never a component geometry fix.
const directory = join(
  process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR ||
    join(process.env.RUNNER_TEMP || tmpdir(), 'homepage-evidence'),
  'homepage-composition'
);
const HOME = '[data-home-showcase="website-component-gallery"]';
const ACTIVE = `${HOME} [data-projection-generation-state="active"]`;
const RUNTIME_LABELS = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' };
const LAYOUTS = [
  { name: '1400', width: 1400, textScale: 100 },
  { name: '1180', width: 1180, textScale: 100 },
  { name: '2048', width: 2048, textScale: 100 },
  { name: '320', width: 320, textScale: 100 },
  { name: '320-text200', width: 320, textScale: 200 },
] as const;
let browser: Browser, baseUrl: string, source: CopySourceBinding, testSha256: string;

type CaptureSelection = Array<{
  hostGeneration: string | null;
  scopes: Array<{
    generation: string | null;
    runtime: string | null;
    family: string | null;
    state: string | null;
    scenes: Array<{ name: string | null; generation: string | null }>;
  }>;
}>;
/** Pure evidence observer, not application behavior; independently negative-tested below. */
export function captureSelectionIssues(
  selection: CaptureSelection,
  runtime: string,
  family: string
): string[] {
  if (selection.length !== 1) return ['expected exactly one active generation'];
  const host = selection[0]!;
  if (!host.hostGeneration || host.scopes.length !== 1) return ['expected one identified scope'];
  const scope = host.scopes[0]!;
  const issues: string[] = [];
  if (scope.generation !== host.hostGeneration) issues.push('stale scope generation');
  if (scope.runtime !== runtime || scope.family !== family || scope.state !== 'ready')
    issues.push('wrong committed scope');
  const names = scope.scenes.map((scene) => scene.name).sort();
  if (
    JSON.stringify(names) !==
    JSON.stringify(['workspace-command', 'workspace-help', 'workspace-progress'])
  )
    issues.push('missing or duplicate scene');
  if (scope.scenes.some((scene) => scene.generation !== host.hostGeneration))
    issues.push('stale scene generation');
  return issues;
}
it('capture selection rejects missing, duplicate and stale generations without mutating the page', () => {
  const good: CaptureSelection = [
    {
      hostGeneration: '3',
      scopes: [
        {
          generation: '3',
          runtime: 'wc',
          family: 'shadcn',
          state: 'ready',
          scenes: ['workspace-command', 'workspace-help', 'workspace-progress'].map((name) => ({
            name,
            generation: '3',
          })),
        },
      ],
    },
  ];
  expect(captureSelectionIssues(good, 'wc', 'shadcn')).toEqual([]);
  expect(captureSelectionIssues([], 'wc', 'shadcn')).toEqual([
    'expected exactly one active generation',
  ]);
  expect(captureSelectionIssues([...good, good[0]!], 'wc', 'shadcn')).toEqual([
    'expected exactly one active generation',
  ]);
  const stale = structuredClone(good);
  stale[0]!.scopes[0]!.generation = '2';
  expect(captureSelectionIssues(stale, 'wc', 'shadcn')).toContain('stale scope generation');
  const missingScene = structuredClone(good);
  missingScene[0]!.scopes[0]!.scenes.pop();
  expect(captureSelectionIssues(missingScene, 'wc', 'shadcn')).toContain(
    'missing or duplicate scene'
  );
  const duplicateScene = structuredClone(good);
  duplicateScene[0]!.scopes[0]!.scenes[2] = duplicateScene[0]!.scopes[0]!.scenes[0]!;
  expect(captureSelectionIssues(duplicateScene, 'wc', 'shadcn')).toContain(
    'missing or duplicate scene'
  );
}, 1_000);

beforeAll(async () => {
  await mkdir(directory, { recursive: true });
  source = {
    exactSHA: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
    expectedSHA: process.env.CANDIDATE_SHA ?? process.env.PROTO_UI_EXPECTED_REVISION ?? null,
    eventSHA: process.env.GITHUB_SHA ?? null,
  };
  testSha256 = createHash('sha256')
    .update(await readFile(new URL('./homepage-composition.browser.test.ts', import.meta.url)))
    .digest('hex');
  await writeFile(
    join(directory, 'source.json'),
    JSON.stringify({ ...source, testSha256 }, null, 2)
  );
  expect(copySourceBindingIssues(source, Boolean(process.env.CI))).toEqual([]);
  if (process.env.CI) expect(source.expectedSHA).toMatch(/^[a-f\d]{40}$/);
  // A remote server could render a different revision than the checkout.
  expect(process.env.PROTO_UI_BROWSER_BASE_URL).toBeUndefined();
  try {
    baseUrl = await startServer('/en/');
    expect(new URL(baseUrl).hostname).toBe('127.0.0.1');
    browser = await launchBrowser();
  } catch (error) {
    await writeFile(
      join(directory, 'startup-failure.json'),
      JSON.stringify({ ...source, error: String(error) }, null, 2)
    );
    throw error;
  }
}, 150_000);
afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await stopServer();
  }
}, 20_000);

async function restrictNetwork(context: BrowserContext, blockedRequests: string[]) {
  const origin = new URL(baseUrl).origin;
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) await route.continue();
    else {
      blockedRequests.push(`${url.protocol}//${url.host}${url.pathname}`);
      await route.abort('blockedbyclient');
    }
  });
  await context.routeWebSocket('**/*', async (socket) => {
    const url = new URL(socket.url());
    if (url.protocol === 'ws:' && url.host === new URL(baseUrl).host) socket.connectToServer();
    else {
      blockedRequests.push(`websocket ${url.protocol}//${url.host}${url.pathname}`);
      await socket.close();
    }
  });
}

async function resizeText200(page: Page) {
  // Snapshot every baseline BEFORE applying any override: inherited text must
  // not be multiplied once per ancestor. px text is enlarged as well as rem text.
  const probe = await page.evaluateHandle(() => {
    const parents = new Set<HTMLElement>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent?.trim() && node.parentElement) parents.add(node.parentElement);
    }
    for (const input of document.querySelectorAll<HTMLElement>('input,textarea'))
      parents.add(input);
    const samples = [...parents]
      .filter((node) => {
        if (
          !node.getClientRects().length ||
          node.closest(
            'script,style,noscript,[hidden],[aria-hidden="true"],[data-pui-view-detached]'
          )
        )
          return false;
        for (let parent: HTMLElement | null = node; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
      })
      .map((node) => ({ node, before: parseFloat(getComputedStyle(node).fontSize) }));
    for (const sample of samples) sample.node.style.fontSize = `${sample.before * 2}px`;
    return samples;
  });
  try {
    await settled(page);
    const read = () =>
      probe.evaluate((samples) =>
        samples.map(({ node, before }) => ({
          tag: node.tagName,
          text: node.textContent?.trim().slice(0, 100),
          before,
          after: parseFloat(getComputedStyle(node).fontSize),
          scene: node.closest('[data-gallery-demo]')?.getAttribute('data-gallery-demo') ?? null,
        }))
      );
    // Return evidence before assertions so a failed scale is retained too.
    return await read();
  } finally {
    await probe.dispose();
  }
}

async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
}
async function ready(page: Page, runtime: string, family: string) {
  await page.waitForFunction(
    ({ runtime, family, home }) => {
      const header = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      const root = document.querySelector<HTMLElement>(home);
      const generations = root?.querySelectorAll('[data-projection-generation-state="active"]');
      const scope = generations?.[0]?.querySelector<HTMLElement>('[data-projection-scope]');
      return (
        header?.dataset.runtimeState === 'ready' &&
        header.dataset.runtime === runtime &&
        header.dataset.family === family &&
        root?.dataset.runnerState === 'ready' &&
        root.dataset.runnerRuntime === runtime &&
        generations?.length === 1 &&
        scope?.dataset.projectionRuntime === runtime &&
        scope.dataset.projectionFamily === family &&
        scope.dataset.projectionState === 'ready' &&
        root.querySelector('[data-home-demo-host]')?.getAttribute('aria-busy') === 'false'
      );
    },
    { runtime, family, home: HOME },
    { timeout: 15_000 }
  );
  await settled(page);
}
async function selectPreference(page: Page, kind: 'runtime' | 'family', label: string) {
  await revealHeaderPreferences(page);
  const trigger = page.locator(
    `[data-homepage-runtime] [data-projection-generation-state="active"] [data-projection-control="${kind}"] [role="combobox"]`
  );
  await trigger.click();
  const controlled = await trigger.getAttribute('aria-controls');
  expect(controlled).toBeTruthy();
  await page
    .locator(`[id=${JSON.stringify(controlled)}]`)
    .getByRole('option', { name: label, exact: true })
    .click();
}
async function attribute(locator: Locator, name: string, value: string | null) {
  await expect.poll(() => locator.getAttribute(name), { timeout: 3_000 }).toBe(value);
}
async function hasFocus(locator: Locator) {
  expect(await locator.evaluate((element) => document.activeElement === element)).toBe(true);
}
async function plan(page: Page, value: number) {
  const progress = page
    .locator(ACTIVE)
    .getByRole('progressbar', { name: 'Example plan', exact: true });
  const slider = page
    .locator(ACTIVE)
    .getByRole('slider', { name: 'Adjust example plan progress', exact: true });
  for (const control of [progress, slider]) {
    await attribute(control, 'aria-valuenow', String(value));
    await attribute(control, 'aria-valuemin', '0');
    await attribute(control, 'aria-valuemax', '100');
  }
  await expect
    .poll(() =>
      page.locator(`${ACTIVE} [data-demo-ref="composition-progress-status"]`).textContent()
    )
    .toBe(`Plan progress: ${value}%`);
}

// Passive geometry observer: never repairs overflow or rewrites scene behavior.
async function layoutFacts(page: Page) {
  return page.evaluate((active) => {
    const scenes = [
      ...document.querySelectorAll<HTMLElement>(`${active} [data-gallery-demo^="workspace-"]`),
    ];
    const visible = (node: Element) => {
      for (let at: Element | null = node; at; at = at.parentElement) {
        const style = getComputedStyle(at);
        if (
          at.matches('[hidden],[aria-hidden="true"],[data-pui-view-detached]') ||
          style.display === 'none' ||
          style.visibility === 'hidden'
        )
          return false;
      }
      return node.getClientRects().length > 0;
    };
    const selection = [...document.querySelectorAll<HTMLElement>(`${active}`)].map((host) => ({
      hostGeneration: host.getAttribute('data-projection-generation-host'),
      scopes: [...host.querySelectorAll<HTMLElement>('[data-projection-scope]')].map((scope) => ({
        generation: scope.getAttribute('data-projection-generation'),
        runtime: scope.getAttribute('data-projection-runtime'),
        family: scope.getAttribute('data-projection-family'),
        state: scope.getAttribute('data-projection-state'),
        scenes: [...scope.querySelectorAll<HTMLElement>('[data-gallery-demo^="workspace-"]')].map(
          (scene) => ({
            name: scene.getAttribute('data-gallery-demo'),
            generation: scene.getAttribute('data-projection-generation'),
          })
        ),
      })),
    }));
    const issues: string[] = [];
    const cards = scenes.map((scene) => {
      const bounds = scene.getBoundingClientRect();
      const name = scene.dataset.galleryDemo!;
      if (!visible(scene) || bounds.width <= 0 || bounds.height <= 0)
        issues.push(`${name}: absent painted scene`);
      if (bounds.left < -1 || bounds.right > innerWidth + 1)
        issues.push(`${name}: outside viewport`);
      const boxes: Array<Record<string, unknown>> = [];
      const texts: Array<Record<string, unknown>> = [];
      for (const node of [scene, ...scene.querySelectorAll<HTMLElement>('*')]) {
        if (!visible(node)) continue;
        const style = getComputedStyle(node),
          rect = node.getBoundingClientRect();
        if (style.display === 'contents' || !rect.width || !rect.height) continue;
        if (rect.left < -1 || rect.right > innerWidth + 1)
          issues.push(`${name}: painted descendant outside viewport`);
        // Scrollable Command results may scroll vertically; horizontal loss is
        // not exempted, nor can overflow:hidden make clipped text into a pass.
        if (
          node instanceof HTMLElement &&
          node.clientWidth > 0 &&
          node.scrollWidth > node.clientWidth + 1
        )
          issues.push(
            `${name}: horizontal content overflow in ${node.getAttribute('data-projection-prototype') ?? node.tagName}`
          );
        boxes.push({
          tag: node.tagName,
          prototype: node.getAttribute('data-projection-prototype'),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        });
      }
      const walker = document.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || !node.parentElement || !visible(node.parentElement))
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = [...range.getClientRects()];
        const font = getComputedStyle(node.parentElement);
        texts.push({
          text: node.textContent.trim(),
          fontSize: font.fontSize,
          fontFamily: font.fontFamily,
          rects: rects.map((rect) => ({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          })),
        });
        for (const rect of rects) {
          if (!rect.width || !rect.height) continue;
          if (rect.left < -1 || rect.right > innerWidth + 1)
            issues.push(`${name}: text outside viewport`);
          for (
            let parent: HTMLElement | null = node.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const style = getComputedStyle(parent),
              clip = parent.getBoundingClientRect();
            if (style.display === 'contents') continue;
            if (
              /hidden|clip/.test(style.overflowX) &&
              (rect.left < clip.left - 2 || rect.right > clip.right + 2)
            )
              issues.push(`${name}: horizontally clipped text`);
            if (
              /hidden|clip/.test(style.overflowY) &&
              (rect.top < clip.top - 2 || rect.bottom > clip.bottom + 2)
            )
              issues.push(`${name}: vertically clipped text`);
            if (parent === scene) break;
          }
        }
      }
      return {
        name,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        height: bounds.height,
        boxes,
        texts,
      };
    });
    const documentWidth = document.documentElement.scrollWidth,
      bodyWidth = document.body.scrollWidth;
    if (Math.max(documentWidth, bodyWidth) > innerWidth + 1)
      issues.push('document horizontal overflow');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth,
      bodyWidth,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      cards,
      selection,
      issues: [...new Set(issues)],
    };
  }, ACTIVE);
}

describe.sequential(
  'Homepage compositions: native input and exact-source responsive evidence',
  () => {
    for (const runtime of RUNTIMES)
      for (const family of ['shadcn', 'brutalist'] as const) {
        it(`${runtime}/${family} connects the three scenes and keeps their content readable`, async () => {
          const prefix = `${source.exactSHA}-${runtime}-${family}`;
          const errors: string[] = [],
            blockedRequests: string[] = [];
          const record: Record<string, unknown> = {
            ...source,
            testSha256,
            runtime,
            family,
            route: '/en/',
            renderer: 'Astro dev server',
            theme: 'light',
            limitations: [
              'Chromium only',
              'English interaction/layout matrix; both locales covered without JavaScript',
              'Text-resize simulation, not browser page zoom',
            ],
            browser: browser.version(),
            startedAt: new Date().toISOString(),
            stage: 'context',
            outcome: 'running',
            browserZoomVerified: false,
            textScaleMethod:
              '200% text-resize simulation: pre-sampled computed font sizes doubled per text parent/input; no padding/height override',
            errors,
            blockedRequests,
            samples: [],
            screenshots: [],
          };
          const save = () =>
            writeFile(join(directory, `${prefix}.json`), JSON.stringify(record, null, 2));
          const stage = async (name: string) => {
            record.stage = name;
            await save();
          };
          let context: BrowserContext | undefined, page: Page | undefined;
          const capture = async (name: string) => {
            const filename = `${prefix}-${name}.png`;
            const bytes = await page!.screenshot({
              path: join(directory, filename),
              fullPage: true,
              timeout: 5_000,
            });
            (record.screenshots as unknown[]).push({
              file: filename,
              exactSHA: source.exactSHA,
              sha256: createHash('sha256').update(bytes).digest('hex'),
              stage: record.stage,
            });
            await save();
          };
          await save();
          try {
            context = await browser.newContext({
              viewport: { width: 1400, height: 1000 },
              deviceScaleFactor: 1,
              reducedMotion: 'reduce',
              colorScheme: 'light',
              serviceWorkers: 'block',
            });
            context.setDefaultTimeout(3_000);
            context.setDefaultNavigationTimeout(15_000);
            await restrictNetwork(context, blockedRequests);
            page = await context.newPage();
            page.on('pageerror', (error) => errors.push(error.message));
            await stage('navigate');
            await page.goto(`${baseUrl}/en/`, { waitUntil: 'networkidle' });
            await ready(page, 'wc', 'shadcn');
            if (runtime !== 'wc') {
              await selectPreference(page, 'runtime', RUNTIME_LABELS[runtime]);
              await ready(page, runtime, 'shadcn');
            }
            if (family !== 'shadcn') {
              await selectPreference(page, 'family', 'Brutalist');
              await ready(page, runtime, family);
            }
            expect(await page.locator(`${HOME} [data-home-demo-nojs]`).isVisible()).toBe(false);
            expect(
              await page.locator(`${HOME} [data-home-demo-status][aria-live="polite"]`).count()
            ).toBe(1);
            expect(await page.locator(`${HOME} [data-home-demo-nojs] [aria-live]`).count()).toBe(0);
            await stage('command');
            const command = page.locator(`${ACTIVE} [data-demo-ref="composition-command"]`);
            const input = command.getByRole('combobox', {
              name: 'Search example steps',
              exact: true,
            });
            await plan(page, 40);
            await input.fill('no-matching-workspace-step');
            await expect
              .poll(() => command.getByText('No matching steps', { exact: true }).isVisible())
              .toBe(true);
            await input.press('Enter');
            await plan(page, 40);
            await input.fill('publish');
            const disabled = command.getByRole('option', {
              name: 'Publish online (unavailable)',
              exact: true,
            });
            await attribute(disabled, 'aria-disabled', 'true');
            await input.press('ArrowDown');
            await input.press('Enter');
            await plan(page, 40);
            await input.fill('prototype');
            await expect.poll(() => command.getByRole('option').count()).toBe(1);
            await input.fill('a');
            await expect.poll(() => command.getByRole('option').count()).toBe(3);
            const activeText = async () => {
              const id = await input.getAttribute('aria-activedescendant');
              return id ? page!.locator(`[id=${JSON.stringify(id)}]`).textContent() : null;
            };
            await expect.poll(activeText).toBe('Outline an idea');
            await input.press('ArrowDown');
            await expect.poll(activeText).toBe('Build a prototype');
            await input.press('Enter');
            await plan(page, 60);
            await hasFocus(input);
            expect(
              await page
                .locator(`${ACTIVE} [data-demo-ref="composition-command-status"]`)
                .textContent()
            ).toBe('Selected: Build a prototype');
            record.command = {
              search: ['empty', 'disabled', 'prototype', 'a'],
              selected: 'Build a prototype',
              progress: 60,
            };
            await capture('command-60');

            await stage('slider');
            const slider = page
              .locator(ACTIVE)
              .getByRole('slider', { name: 'Adjust example plan progress', exact: true });
            const reset = page
              .locator(ACTIVE)
              .getByRole('button', { name: 'Start again', exact: true });
            await slider.focus();
            await slider.press('ArrowRight');
            await plan(page, 65);
            await hasFocus(slider);
            await slider.press('End');
            await plan(page, 100);
            await slider.press('Home');
            await plan(page, 0);
            for (let cycle = 0; cycle < 2; cycle++) {
              await reset.click();
              await plan(page, 40);
              await slider.press('ArrowRight');
              await plan(page, 45);
            }
            await reset.click();
            await plan(page, 40);
            record.slider = { observedValues: [65, 100, 0, 40, 45, 40, 45, 40] };
            await save();

            await stage('accordion');
            const help = page.locator(`${ACTIVE} [data-demo-ref="composition-help"]`);
            const questions = [
              'Where do I start?',
              'Can I use the keyboard?',
              'Where is this saved?',
            ];
            const bodies = [
              'Choose a result in the step finder',
              'Use Tab to move focus',
              'This is an interactive example',
            ];
            expect(await help.getByRole('heading', { level: 3 }).count()).toBe(3);
            await help.getByRole('button', { name: questions[0], exact: true }).press('Enter');
            await expect.poll(() => help.getByRole('region').count()).toBe(0);
            const relations: Array<{ trigger: string; panel: string }> = [];
            for (let index = 0; index < 3; index++) {
              const trigger = help.getByRole('button', { name: questions[index], exact: true });
              await trigger.press('Enter');
              await attribute(trigger, 'aria-expanded', 'true');
              const panel = help.getByRole('region');
              expect(await panel.count()).toBe(1);
              const triggerId = await trigger.getAttribute('id'),
                panelId = await panel.getAttribute('id');
              expect(triggerId).toBeTruthy();
              expect(panelId).toBeTruthy();
              await attribute(trigger, 'aria-controls', panelId);
              await attribute(panel, 'aria-labelledby', triggerId);
              for (const id of [triggerId, panelId])
                expect(await page.locator(`[id=${JSON.stringify(id)}]`).count()).toBe(1);
              expect(await panel.textContent()).toContain(bodies[index]);
              await hasFocus(trigger);
              relations.push({ trigger: triggerId!, panel: panelId! });
              await trigger.press('Enter');
              await attribute(trigger, 'aria-expanded', 'false');
              await attribute(trigger, 'aria-controls', null);
              await expect.poll(() => help.getByRole('region').count()).toBe(0);
              expect(await page.locator(`[id=${JSON.stringify(panelId)}]`).count()).toBe(0);
              await hasFocus(trigger);
            }
            expect(new Set(relations.map((edge) => edge.trigger)).size).toBe(3);
            expect(new Set(relations.map((edge) => edge.panel)).size).toBe(3);
            record.accordion = relations;
            await save();
            // Longest answer and all results remain visible during every layout sample.
            await help.getByRole('button', { name: questions[2], exact: true }).press('Enter');
            await input.fill('');
            for (const layout of LAYOUTS) {
              await stage(`layout-${layout.name}`);
              await page.setViewportSize({ width: layout.width, height: 1000 });
              if (layout.textScale === 200) {
                record.textResize = await resizeText200(page);
                await save();
              }
              await ready(page, runtime, family);
              const facts = await layoutFacts(page);
              (record.samples as unknown[]).push({
                name: layout.name,
                textScale: layout.textScale,
                browserZoomVerified: false,
                ...facts,
              });
              await save();
              await capture(layout.name);
              expect(facts.cards.map((card) => card.name).sort()).toEqual([
                'workspace-command',
                'workspace-help',
                'workspace-progress',
              ]);
              if (layout.textScale === 200) {
                const samples = record.textResize as Array<{
                  before: number;
                  after: number;
                  scene: string | null;
                }>;
                expect(samples.length).toBeGreaterThan(0);
                for (const scene of ['workspace-command', 'workspace-progress', 'workspace-help'])
                  expect(samples.some((sample) => sample.scene === scene)).toBe(true);
                for (const sample of samples)
                  expect(sample.after).toBeCloseTo(sample.before * 2, 3);
              }
              expect(captureSelectionIssues(facts.selection, runtime, family)).toEqual([]);
              expect(facts.issues, JSON.stringify(facts.issues)).toEqual([]);
              await plan(page, 40);
            }
            expect(errors).toEqual([]);
            expect(blockedRequests).toEqual([]);
            record.outcome = 'passed';
          } catch (error) {
            record.outcome = 'failed';
            record.failure = String(error);
            await save();
            if (page) {
              try {
                await capture('failure');
              } catch (captureError) {
                record.captureFailure = String(captureError);
                await save();
              }
            }
            throw error;
          } finally {
            record.finishedAt = new Date().toISOString();
            try {
              await save();
            } finally {
              await context?.close();
            }
          }
        }, 45_000);
      }
  }
);

it('without JavaScript both localized homepages retain a readable documentation route', async () => {
  for (const locale of ['en', 'zh-cn']) {
    const prefix = `${source.exactSHA}-nojs-${locale}`;
    const blockedRequests: string[] = [];
    const record: Record<string, unknown> = {
      ...source,
      testSha256,
      locale,
      javaScriptEnabled: false,
      outcome: 'running',
      stage: 'navigate',
      blockedRequests,
      screenshots: [],
    };
    const save = () =>
      writeFile(join(directory, `${prefix}.json`), JSON.stringify(record, null, 2));
    await save();
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 1000 },
      serviceWorkers: 'block',
    });
    context.setDefaultTimeout(3_000);
    context.setDefaultNavigationTimeout(10_000);
    let page: Page | undefined;
    const capture = async (name: string) => {
      const filename = `${prefix}-${name}.png`;
      const bytes = await page!.screenshot({
        path: join(directory, filename),
        fullPage: true,
        timeout: 3_000,
      });
      (record.screenshots as unknown[]).push({
        file: filename,
        exactSHA: source.exactSHA,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
      await save();
    };
    try {
      await restrictNetwork(context, blockedRequests);
      page = await context.newPage();
      await page.goto(`${baseUrl}/${locale}/`, { waitUntil: 'networkidle' });
      const fallback = page.locator(`${HOME} [data-home-demo-nojs]`);
      record.text = await fallback.textContent();
      record.hostVisible = await page.locator(`${HOME} [data-home-demo-host]`).isVisible();
      record.statusVisible = await page.locator(`${HOME} [data-home-demo-status]`).isVisible();
      await capture('fallback');
      expect(await fallback.isVisible()).toBe(true);
      expect(record.text).toContain(
        locale === 'en'
          ? 'These interactive examples need JavaScript.'
          : '这些交互示例需要 JavaScript。'
      );
      expect(record.hostVisible).toBe(false);
      expect(record.statusVisible).toBe(false);
      const link = fallback.getByRole('link');
      const destination = `/${locale}/ui-libraries/shadcn/accordion/`;
      expect(await link.count()).toBe(1);
      expect(await link.getAttribute('href')).toBe(destination);
      record.stage = 'native-documentation-navigation';
      await save();
      await link.click();
      await page.waitForURL(`${baseUrl}${destination}`, { waitUntil: 'domcontentloaded' });
      record.destination = new URL(page.url()).pathname;
      record.documentationTitle = await page.locator('h1').textContent();
      expect(record.destination).toBe(destination);
      expect(typeof record.documentationTitle).toBe('string');
      expect((record.documentationTitle as string).trim().length).toBeGreaterThan(0);
      expect(blockedRequests).toEqual([]);
      record.outcome = 'passed';
    } catch (error) {
      record.outcome = 'failed';
      record.failure = String(error);
      await save();
      if (page) {
        try {
          await capture('failure');
        } catch (captureError) {
          record.captureFailure = String(captureError);
          await save();
        }
      }
      throw error;
    } finally {
      try {
        await save();
      } finally {
        await context.close();
      }
    }
  }
}, 30_000);
