// @vitest-environment node
import type { Browser, Locator, Page } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, RUNTIMES, startServer, stopServer } from './browser-harness';
import { nativeLinkEvidenceIssues } from './site-native-link-evidence';
import socialDestinations from '../../../../../../shared/links.json';

let browser: Browser;
let baseUrl: string;
const evidenceDirectory = path.join(
  process.env.RUNNER_TEMP ?? os.tmpdir(),
  'homepage-evidence',
  'native-links'
);
let evidenceSource: { sha: string; dirty: boolean };
async function captureLinks(
  page: Page,
  id: string,
  family: string,
  runtime: string,
  state: string,
  paintEvidence?: unknown
) {
  await mkdir(evidenceDirectory, { recursive: true });
  const file = `${id}.png`;
  await page.screenshot({ path: path.join(evidenceDirectory, file) });
  const observed = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    documentFamily: document.documentElement.dataset.siteLibraryFamily,
    homepageRuntime:
      document.querySelector<HTMLElement>('[data-homepage-runtime]')?.dataset.runtime ?? null,
    menuExpanded: document
      .querySelector('[data-site-menu-button], [data-homepage-menu-label] [role="button"]')
      ?.getAttribute('aria-expanded'),
    focusedName: document.activeElement?.getAttribute('aria-label'),
    focusedRole: document.activeElement?.tagName,
  }));
  await writeFile(
    path.join(evidenceDirectory, `${id}.json`),
    JSON.stringify(
      {
        schemaVersion: 1,
        source: evidenceSource,
        capturedAt: new Date().toISOString(),
        screenshot: file,
        url: page.url(),
        viewport: page.viewportSize(),
        family,
        runtime,
        state,
        observed,
        paintEvidence,
        renderer: 'Real Chromium via existing repository browser harness',
      },
      null,
      2
    )
  );
}
const labels = { wc: 'Web Components', react: 'React', vue: 'Vue', vue2: 'Vue 2' } as const;
beforeAll(async () => {
  evidenceSource = {
    sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
      encoding: 'utf8',
    }).trim(),
  };
  baseUrl = await startServer('/zh-cn/');
  browser = await launchBrowser();
}, 150_000);
afterAll(async () => {
  await browser?.close();
  await stopServer();
}, 60_000);
async function choose(page: Page, selector: string, label: string) {
  const trigger = page.locator(`${selector} [role="combobox"]`);
  await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  await page
    .locator(`[id=${JSON.stringify(id)}]`)
    .getByRole('option', { name: label, exact: true })
    .click();
}
async function ready(page: Page, runtime: string, family: string) {
  await page.waitForFunction(
    ({ runtime, family }) => {
      const root = document.querySelector<HTMLElement>('[data-homepage-runtime]');
      return (
        root?.dataset.runtimeState === 'ready' &&
        root.dataset.runtime === runtime &&
        root.dataset.family === family
      );
    },
    { runtime, family }
  );
}
async function openSettings(page: Page) {
  const button = page.locator(
    '[data-homepage-menu-label] [role="button"], [data-site-menu-button]'
  );
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}

async function installNativeTrace(page: Page, currentDocument = false) {
  const initialize = () => {
    const state = {
      action: 'initial',
      events: [] as Array<{
        event: Event;
        target: Node;
        anchor: HTMLAnchorElement;
        at: number;
        action: string;
        targetTag: string;
        hitIsAnchor: boolean;
        connectedAtCapture: boolean;
        x: number;
        y: number;
      }>,
    };
    (window as Window & { __siteNativeTrace?: typeof state }).__siteNativeTrace = state;
    for (const type of [
      'pointerenter',
      'pointerleave',
      'pointerdown',
      'pointerup',
      'mousedown',
      'mouseup',
      'click',
      'auxclick',
      'focus',
      'blur',
      'keydown',
      'keyup',
    ]) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const anchor = target.closest('a');
          if (!anchor) return;
          const { clientX: x = 0, clientY: y = 0 } = event as MouseEvent;
          state.events.push({
            event,
            target,
            anchor,
            at: performance.now(),
            action: state.action,
            targetTag: target.tagName,
            hitIsAnchor: document.elementFromPoint(x, y) === anchor,
            connectedAtCapture: target.isConnected,
            x,
            y,
          });
          if (state.events.length > 150) state.events.shift();
        },
        { capture: true }
      );
    }
  };
  await page.addInitScript(initialize);
  if (currentDocument) await page.evaluate(initialize);
}
async function nativeActionLabel(page: Page, action: string) {
  await page.evaluate((action) => {
    const state = (window as Window & { __siteNativeTrace?: { action: string } }).__siteNativeTrace;
    if (state) state.action = action;
  }, action);
}
async function saveNativeTrace(page: Page, id: string, detail: unknown = null) {
  const events = await page.evaluate(() => {
    const state = (
      window as Window & {
        __siteNativeTrace?: {
          events: Array<{
            event: Event;
            target: Node;
            anchor: HTMLAnchorElement;
            at: number;
            action: string;
            targetTag: string;
            hitIsAnchor: boolean;
            connectedAtCapture: boolean;
            x: number;
            y: number;
          }>;
        };
      }
    ).__siteNativeTrace;
    return (state?.events ?? []).map(({ event, target, anchor, ...entry }) => ({
      ...entry,
      type: event.type,
      trusted: event.isTrusted,
      preventedAfterDispatch: event.defaultPrevented,
      button: (event as MouseEvent).button,
      buttons: (event as MouseEvent).buttons,
      key: (event as KeyboardEvent).key,
      ctrl: (event as MouseEvent).ctrlKey,
      meta: (event as MouseEvent).metaKey,
      targetConnectedAfterDispatch: target.isConnected,
      anchorConnected: anchor.isConnected,
      targetWasAnchor: target === anchor,
      href: anchor.getAttribute('href'),
      name: anchor.getAttribute('aria-label'),
    }));
  });
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    path.join(evidenceDirectory, `${id}-events.json`),
    JSON.stringify(
      { source: evidenceSource, url: page.url(), viewport: page.viewportSize(), detail, events },
      null,
      2
    )
  );
  return events;
}

async function nativePopup(
  page: Page,
  link: Locator,
  action: 'modifier' | 'middle' | 'enter',
  owner: string
) {
  const label = `${owner}:${action}`;
  const href = await link.getAttribute('href');
  console.info(`[native-link] ${label} begin href=${href}`);
  await nativeActionLabel(page, label);
  const outcome = page
    .context()
    .waitForEvent('page')
    .then(
      (popup) => ({ popup }),
      (error: unknown) => ({ error })
    );
  try {
    if (action === 'modifier') await link.click({ modifiers: ['Control'] });
    else if (action === 'middle') await link.click({ button: 'middle' });
    else {
      await link.focus();
      await page.keyboard.press('Enter');
    }
    const result = await outcome;
    if ('error' in result) throw result.error;
    // A popup can first report the initial empty document as loaded. Wait
    // for this activation's exact routed destination before accepting it.
    if (!href) throw new Error('Native navigation destination is missing');
    await result.popup.waitForURL(href, { waitUntil: 'domcontentloaded' });
    expect(result.popup.url(), label).toBe(href);
    await result.popup.close();
    console.info(`[native-link] ${label} passed`);
  } catch (error) {
    await saveNativeTrace(page, `${owner}-${action}-failure`, {
      action,
      owner,
      href,
      error: String(error),
    });
    throw new Error(`[native-link] ${label} failed for ${href}`, { cause: error });
  }
}

async function linkPaint(link: Locator) {
  return link.evaluate((anchor) => {
    const surface = anchor.querySelector<HTMLElement>('[data-pui-root]')!;
    const style = getComputedStyle(surface);
    const box = surface.getBoundingClientRect();
    const ringExtent = 4;
    let unclipped =
      box.left >= ringExtent &&
      box.top >= ringExtent &&
      box.right + ringExtent <= innerWidth &&
      box.bottom + ringExtent <= innerHeight;
    for (let parent = surface.parentElement; parent; parent = parent.parentElement) {
      const clip = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (['hidden', 'clip', 'scroll', 'auto'].includes(clip.overflowX))
        unclipped &&=
          box.left - ringExtent >= bounds.left && box.right + ringExtent <= bounds.right;
      if (['hidden', 'clip', 'scroll', 'auto'].includes(clip.overflowY))
        unclipped &&=
          box.top - ringExtent >= bounds.top && box.bottom + ringExtent <= bounds.bottom;
    }
    return {
      tokens: (surface.getAttribute('data-pui-style') ?? '').split(/\s+/),
      background: style.backgroundColor,
      shadow: style.boxShadow,
      transform: style.transform,
      weight: style.fontWeight,
      decoration: style.textDecorationLine,
      whiteSpace: style.whiteSpace,
      ringWidth: style.getPropertyValue('--pui-ring-width').trim(),
      ringOffset: style.getPropertyValue('--pui-ring-offset-width').trim(),
      ringColor: style.getPropertyValue('--pui-ring-color').trim(),
      focused: anchor === document.activeElement && anchor.matches(':focus-visible'),
      visibleTarget:
        box.width > 0 &&
        box.height > 0 &&
        anchor === document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
      unclipped,
      // Record the native root outline too: the Prototype ring alone does not
      // prove that a browser focus outline is absent or visually acceptable.
      nativeOutline: getComputedStyle(anchor).outline,
    };
  });
}

async function assertSocialPaint(
  page: Page,
  links: Locator,
  family: string,
  capture: (state: string, evidence: unknown) => Promise<void>
) {
  const first = links.first();
  await page.mouse.move(1400, 950);
  const hoverToken = family === 'brutalist' ? 'bg-main' : 'bg-muted';
  await expect.poll(async () => (await linkPaint(first)).tokens).not.toContain(hoverToken);
  const baseline = await linkPaint(first);
  await capture('baseline', { observed: baseline });
  await first.hover();
  await expect.poll(async () => (await linkPaint(first)).tokens).toContain(hoverToken);
  await expect.poll(async () => (await linkPaint(first)).background).not.toBe(baseline.background);
  const hovered = await linkPaint(first);
  await capture('hover', { baseline, observed: hovered });

  await nativeActionLabel(page, `social-${family}-primary-down`);
  await page.mouse.down();
  try {
    await expect.poll(async () => (await linkPaint(first)).tokens).toContain('translate-y-px');
  } catch (error) {
    await saveNativeTrace(page, `social-${family}-press-failure`, {
      family,
      observed: await linkPaint(first),
    });
    throw error;
  }
  const pressed = await linkPaint(first);
  expect(pressed.tokens).toContain('shadow-none');
  expect(pressed.transform).not.toBe(hovered.transform);
  if (family === 'brutalist') expect(pressed.shadow).not.toBe(hovered.shadow);
  await capture('pressed', { baseline: hovered, observed: pressed });
  // Release off the link: observe real pointer facts without navigating.
  await page.mouse.move(1400, 950);
  await page.mouse.up();
  await expect.poll(async () => (await linkPaint(first)).tokens).not.toContain('translate-y-px');
  await expect.poll(async () => (await linkPaint(first)).background).toBe(baseline.background);

  await first.focus();
  await page.keyboard.press('Tab');
  expect(await links.nth(1).evaluate((anchor) => anchor === document.activeElement)).toBe(true);
  const unfocused = await linkPaint(first);
  expect(unfocused.tokens).not.toContain('ring-2');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(async () => (await linkPaint(first)).tokens).toContain('ring-2');
  const focused = await linkPaint(first);
  expect(focused.focused).toBe(true);
  expect(focused.tokens).toEqual(
    expect.arrayContaining(['ring-ring', 'ring-offset-2', 'ring-offset-background'])
  );
  expect(focused.ringWidth).toBe('2px');
  expect(focused.ringOffset).toBe('2px');
  expect(focused.ringColor).not.toMatch(/^(?:|transparent|rgba\(0, 0, 0, 0\))$/);
  expect(focused.shadow).not.toBe(unfocused.shadow);
  expect(focused.visibleTarget).toBe(true);
  expect(focused.unclipped).toBe(true);
  await capture('focus', { baseline: unfocused, observed: focused });
}

async function assertHostCurrentProjection(link: Locator) {
  const baseline = await linkPaint(link);
  const original = await link.getAttribute('aria-current');
  // Explicit host fixture, not a claim that route selection changed itself.
  await link.evaluate((anchor) => anchor.setAttribute('aria-current', 'page'));
  try {
    await expect.poll(async () => (await linkPaint(link)).tokens).toContain('underline');
    const current = await linkPaint(link);
    expect(current.tokens).toContain('font-semibold');
    expect(current.decoration).toContain('underline');
    expect(current.decoration).not.toBe(baseline.decoration);
    expect(Number(current.weight)).toBeGreaterThan(Number(baseline.weight));
  } finally {
    await link.evaluate((anchor, original) => {
      if (original === null) anchor.removeAttribute('aria-current');
      else anchor.setAttribute('aria-current', original);
    }, original);
  }
  await expect.poll(async () => (await linkPaint(link)).decoration).toBe(baseline.decoration);
  await expect.poll(async () => (await linkPaint(link)).weight).toBe(baseline.weight);
}

describe.sequential('native links with app-owned Proto visual surfaces', () => {
  it('preserves real link targets and uniform social visuals through all runtime/family transitions', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'light',
    });
    const page = await context.newPage();
    await installNativeTrace(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
      await ready(page, 'wc', 'shadcn');
      for (const family of ['brutalist', 'shadcn'] as const) {
        await choose(
          page,
          '[data-homepage-runtime] [data-projection-generation-state="active"] [data-projection-control="family"]',
          family === 'brutalist' ? 'Brutalist' : 'Shadcn'
        );
        await page.waitForFunction((family) => {
          const root = document.querySelector<HTMLElement>('[data-homepage-runtime]');
          return root?.dataset.runtimeState === 'ready' && root.dataset.family === family;
        }, family);
        for (const runtime of RUNTIMES) {
          await choose(
            page,
            '[data-homepage-runtime] [data-projection-generation-state="active"] [data-projection-control="runtime"]',
            labels[runtime]
          );
          await ready(page, runtime, family);
          await openSettings(page);
          const links = page.locator('#home-social [data-projection-generation-state="active"] a');
          await expect.poll(() => links.count()).toBe(4);
          const facts = await links.evaluateAll((anchors) =>
            anchors.map((anchor) => {
              const surface = anchor.querySelector<HTMLElement>('[data-pui-root]')!;
              const box = anchor.getBoundingClientRect();
              const visual = surface.getBoundingClientRect();
              const style = getComputedStyle(surface);
              return {
                name: anchor.getAttribute('aria-label'),
                href: anchor.getAttribute('href'),
                target: anchor.getAttribute('target'),
                rel: anchor.getAttribute('rel'),
                role: anchor.getAttribute('role'),
                tag: anchor.tagName,
                tabStops: anchor.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')
                  .length,
                anchorRect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
                surfaceRect: {
                  left: visual.left,
                  top: visual.top,
                  right: visual.right,
                  bottom: visual.bottom,
                },
                width: visual.width,
                height: visual.height,
                border: style.borderTopWidth,
                radius: style.borderTopLeftRadius,
                shadow: style.boxShadow,
                nativeCoversSurface:
                  box.left <= visual.left + 0.5 &&
                  box.top <= visual.top + 0.5 &&
                  box.right >= visual.right - 0.5 &&
                  box.bottom >= visual.bottom - 0.5,
                topLeftHitInside:
                  anchor === document.elementFromPoint(visual.left + 3, visual.top + 3),
                centerHitIsAnchor:
                  anchor ===
                  document.elementFromPoint(
                    visual.left + visual.width / 2,
                    visual.top + visual.height / 2
                  ),
              };
            })
          );
          expect(facts.map((fact) => fact.name)).toEqual(['GitHub', 'Discord', 'X', 'Bluesky']);
          expect(
            new Set(
              facts.map((fact) => `${fact.width}/${fact.height}/${fact.border}/${fact.radius}`)
            ).size
          ).toBe(1);
          const expectedSocial = [
            { name: 'GitHub', href: socialDestinations.github },
            { name: 'Discord', href: socialDestinations.discord },
            { name: 'X', href: socialDestinations.x },
            { name: 'Bluesky', href: socialDestinations.bluesky },
          ];
          for (const [index, fact] of facts.entries()) {
            expect(
              nativeLinkEvidenceIssues(
                { ...fact, nestedFocus: fact.tabStops, cornerHitIsAnchor: fact.topLeftHitInside },
                { ...expectedSocial[index]!, target: '_blank', rel: 'noreferrer' }
              )
            ).toEqual([]);
            expect(fact.tag).toBe('A');
            expect(fact.role).toBeNull();
            expect(fact.target).toBe('_blank');
            expect(fact.rel).toBe('noreferrer');
            expect(fact.href).toMatch(/^https:\/\//);
            expect(fact.tabStops).toBe(0);
            expect(fact.width).toBeGreaterThanOrEqual(44);
            expect(fact.height).toBeGreaterThanOrEqual(44);
            expect(fact.nativeCoversSurface).toBe(true);
            expect(fact.topLeftHitInside).toBe(true);
            expect(fact.centerHitIsAnchor).toBe(true);
            if (family === 'brutalist') {
              expect(fact.border).toBe('2px');
              expect(fact.radius).toBe('0px');
              expect(fact.shadow).not.toBe('none');
            }
          }
          const footprints = await page
            .locator(
              '[data-homepage-actions] [data-projection-generation-state="active"] a:visible'
            )
            .evaluateAll((anchors) =>
              anchors.map((anchor) => {
                const surface = anchor.querySelector<HTMLElement>('[data-pui-root]')!;
                const visual = surface.getBoundingClientRect();
                const native = anchor.getBoundingClientRect();
                const group = anchor.closest('[data-homepage-actions]')!;
                const index = [
                  ...group.querySelectorAll('[data-projection-generation-state="active"] a'),
                ].indexOf(anchor);
                const source = group.querySelectorAll('[data-homepage-fallback] a')[index]!;
                const identity = (link: Element) => ({
                  href: link.getAttribute('href'),
                  name: link.getAttribute('aria-label') ?? link.textContent?.trim() ?? null,
                  target: link.getAttribute('target'),
                  rel: link.getAttribute('rel'),
                });
                return {
                  ...identity(anchor),
                  expected: identity(source),
                  tag: anchor.tagName,
                  role: anchor.getAttribute('role'),
                  centerHitIsAnchor:
                    document.elementFromPoint(
                      visual.left + visual.width / 2,
                      visual.top + visual.height / 2
                    ) === anchor,
                  cornerHitIsAnchor:
                    document.elementFromPoint(visual.left + 3, visual.top + 3) === anchor,
                  anchorRect: {
                    left: native.left,
                    top: native.top,
                    right: native.right,
                    bottom: native.bottom,
                  },
                  surfaceRect: {
                    left: visual.left,
                    top: visual.top,
                    right: visual.right,
                    bottom: visual.bottom,
                  },
                  nestedFocus: anchor.querySelectorAll(
                    'a[href],button,input,select,textarea,[tabindex]'
                  ).length,
                };
              })
            );
          expect(footprints.length).toBeGreaterThan(4);
          for (const footprint of footprints)
            expect(
              nativeLinkEvidenceIssues(footprint, footprint.expected),
              String(footprint.name)
            ).toEqual([]);
          await assertSocialPaint(page, links, family, async (state, evidence) => {
            if (runtime === 'wc')
              await captureLinks(
                page,
                `homepage-${family}-${state}`,
                family,
                runtime,
                `menu-open; first-social-${state}`,
                evidence
              );
          });
          await assertHostCurrentProjection(
            page.locator('#home-navigation [data-projection-generation-state="active"] a').first()
          );
          expect(
            (
              await linkPaint(
                page
                  .locator('#homepage-whitepaper [data-projection-generation-state="active"] a')
                  .first()
              )
            ).whiteSpace
          ).toBe('normal');
          await page.keyboard.press('Escape');
        }
      }
      expect(errors).toEqual([]);
    } finally {
      await saveNativeTrace(page, 'homepage-native-paint-final');
      await context.close();
    }
  }, 150_000);

  it('keeps Enter/new-tab/modifier/middle/context-menu semantics native and does not activate on Space', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'light',
    });
    // Isolate browser navigation semantics from availability of the external site.
    await context.route('https://github.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>External link fixture</title>' })
    );
    const page = await context.newPage();
    await installNativeTrace(page);
    try {
      await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
      await ready(page, 'wc', 'shadcn');
      await openSettings(page);
      const link = page.locator(
        '#home-social [data-projection-generation-state="active"] a[aria-label="GitHub"]'
      );
      const href = (await link.getAttribute('href'))!;
      // Plain-native controls distinguish a broken browser/popup fixture from
      // the application bridge. This page is not claimed as product UI.
      const controlPage = await context.newPage();
      await controlPage.setContent(
        '<a id="native-control" target="_blank" rel="noreferrer">Native navigation control</a>'
      );
      await installNativeTrace(controlPage, true);
      const control = controlPage.locator('#native-control');
      await control.evaluate((anchor, href) => anchor.setAttribute('href', href), href);
      try {
        await nativeActionLabel(controlPage, 'plain-native:cancel-negative-control');
        await control.evaluate((anchor) =>
          anchor.addEventListener('click', (event) => event.preventDefault(), { once: true })
        );
        const count = context.pages().length;
        await control.click({ modifiers: ['Control'] });
        const cancelled = await saveNativeTrace(controlPage, 'plain-native-negative-control');
        expect(cancelled.filter((event) => event.type === 'click').at(-1)).toMatchObject({
          trusted: true,
          preventedAfterDispatch: true,
        });
        expect(context.pages()).toHaveLength(count);
        for (const action of ['modifier', 'middle', 'enter'] as const)
          await nativePopup(controlPage, control, action, 'plain-native');
        await saveNativeTrace(controlPage, 'plain-native-positive-controls');
      } finally {
        await controlPage.close();
      }
      await page.bringToFront();
      await openSettings(page);
      for (const action of ['modifier', 'middle', 'enter'] as const)
        await nativePopup(page, link, action, 'homepage-social');
      const location = page.url();
      await link.focus();
      await page.keyboard.press('Space');
      // Store the actual Event during capture, then inspect it in a new
      // evaluate task after right-click dispatch has returned. A capture-phase
      // microtask can run before native target/bubble handlers finish.
      for (const cancelAtTarget of [true, false]) {
        await link.evaluate((anchor, cancelAtTarget) => {
          const observed = anchor as HTMLElement & { __testContextMenuEvent?: Event };
          delete observed.__testContextMenuEvent;
          document.addEventListener(
            'contextmenu',
            (event) => {
              observed.__testContextMenuEvent = event;
            },
            { capture: true, once: true }
          );
          if (cancelAtTarget)
            anchor.addEventListener('contextmenu', (event) => event.preventDefault(), {
              once: true,
            });
        }, cancelAtTarget);
        await link.click({ button: 'right' });
        const observed = await link.evaluate((anchor) => {
          const event = (anchor as HTMLElement & { __testContextMenuEvent?: Event })
            .__testContextMenuEvent;
          return { prevented: event?.defaultPrevented, trusted: event?.isTrusted };
        });
        // The negative control must catch a later target listener's cancel.
        expect(observed.prevented).toBe(cancelAtTarget);
        expect(observed.trusted).toBe(true);
      }
      expect(page.url()).toBe(location);
      expect(context.pages()).toHaveLength(1);
      expect(await link.getAttribute('role')).toBeNull();
    } finally {
      await saveNativeTrace(page, 'homepage-native-navigation-final');
      await context.close();
    }
  }, 90_000);

  it('records the documentation menu with four same-family social links and native focus', async () => {
    for (const [family, route] of [
      ['shadcn', '/zh-cn/ui-libraries/shadcn/button/'],
      ['brutalist', '/zh-cn/ui-libraries/brutalist/components/button/'],
    ] as const) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        colorScheme: family === 'brutalist' ? 'dark' : 'light',
      });
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
        await page
          .locator('a[data-site-native-link][aria-label="GitHub"] wc-site-link-surface')
          .waitFor({ state: 'attached' });
        await openSettings(page);
        const links = page.locator('.site-social-links a[data-site-native-link]');
        expect(await links.count()).toBe(4);
        await assertSocialPaint(page, links, family, async (state, evidence) => {
          await captureLinks(
            page,
            `docs-${family}-${state}`,
            family,
            'wc',
            `menu-open; four-social-group; first-social-${state}`,
            evidence
          );
        });
        await assertHostCurrentProjection(page.locator('[data-site-header-navigation] a').first());
      } finally {
        await context.close();
      }
    }
  }, 90_000);

  it('keeps all social destinations available without JavaScript', async () => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/zh-cn/`, { waitUntil: 'networkidle' });
      const links = page.locator('#home-social a');
      expect(await links.count()).toBe(4);
      for (let index = 0; index < 4; index++) {
        expect(await links.nth(index).isVisible()).toBe(true);
        expect(await links.nth(index).getAttribute('href')).toMatch(/^https:\/\//);
      }
    } finally {
      await context.close();
    }
  }, 60_000);
});
