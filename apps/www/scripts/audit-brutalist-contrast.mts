import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { transform } from 'esbuild';
import { readContrastProvenance } from './contrast-provenance.mjs';
import type { Browser, BrowserContext, Page, Locator } from 'playwright-core';
import { PROJECTION_FAMILY_MANIFESTS } from '../src/components/PrototypePreviewer/projection-families';
import {
  launchBrowser,
  choosePreviewRuntime,
  applyColorScheme,
} from '../src/content/docs/zh-cn/browser-harness';

// Observation only: neither collected frames nor achieved target predicates are
// WCAG certification, cue-necessity decisions, migration approval or Issue closure.
const baseUrl = process.env.PROTO_UI_BROWSER_BASE_URL;
if (!baseUrl)
  throw new Error('Set PROTO_UI_BROWSER_BASE_URL to an independently supervised docs server.');
const runID = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`;
const output = resolve(
  process.env.PROTO_UI_CONTRAST_EVIDENCE_DIR ?? `/tmp/pui469-rendered-${runID}`
);
const runtimes = ['wc', 'react', 'vue'] as const;
const themes = ['light', 'dark'] as const;
const families = Object.keys(PROJECTION_FAMILY_MANIFESTS.brutalist.families);
const requestedFamilies = process.env.PROTO_UI_CONTRAST_FAMILIES?.split(',');
if (
  requestedFamilies &&
  (!requestedFamilies.length ||
    new Set(requestedFamilies).size !== requestedFamilies.length ||
    requestedFamilies.some((family) => !families.includes(family)))
) {
  throw new Error(
    'Choose distinct existing projection manifest family identities; an empty selection is not evidence.'
  );
}
const selectedFamilies = requestedFamilies ?? families;
const viewport = { width: 1440, height: 1000 };
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const baseline = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
}).trim();
const digest = (data: string | Buffer) =>
  `sha256:${createHash('sha256').update(data).digest('hex')}`;
const message = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
type Observation = { achieved: boolean; [key: string]: unknown };
type Case = {
  family: string;
  runtime: string;
  theme: string;
  route: string;
  status: 'pending' | 'running' | 'observed' | 'failed';
  plannedStates: string[];
  achievedTargets: string[];
  errors: { phase: string; error: string }[];
};
const passiveFamilies = new Set(['badge', 'card', 'skeleton', 'separator']);
function plannedStates(family: string): string[] {
  const states = ['rest'];
  if (passiveFamilies.has(family)) return states;
  states.push('hover', 'keyboard-focus');
  if (
    [
      'button',
      'toggle',
      'switch',
      'tabs',
      'checkbox',
      'dropdown-menu',
      'select',
      'dialog',
    ].includes(family)
  )
    states.push('pointer-down', 'activation-result');
  if (family === 'button') {
    for (const variant of ['surface', 'destructive']) {
      states.push(
        `${variant}-rest`,
        `${variant}-hover`,
        `${variant}-pointer-down`,
        `${variant}-activation-result`,
        `${variant}-keyboard-focus`
      );
    }
  }
  if (['toggle', 'switch', 'checkbox'].includes(family)) states.push('keyboard-activation');
  if (family === 'tabs') states.push('keyboard-selection-overview');
  if (family === 'toggle') states.push('already-active', 'active-and-pointer-held');
  if (family === 'tooltip') states.push('hover-open', 'focus-open');
  if (family === 'hover-card') states.push('hover-open');
  if (['dropdown-menu', 'select', 'dialog'].includes(family)) states.push('open');
  if (['dropdown-menu', 'select'].includes(family))
    states.push('item-focus-first', 'item-focus-last');
  if (family === 'dialog') states.push('close-icon-hover', 'close-icon-keyboard-focus');
  if (family === 'textarea')
    states.push('empty-placeholder', 'disabled-and-readonly', 'live-props-restored');
  if (family === 'scroll-area') states.push('scroll-end', 'wheel-both-axes');
  return states;
}
const cases: Case[] = selectedFamilies.flatMap((family) =>
  runtimes.flatMap((runtime) =>
    themes.map((theme) => ({
      family,
      runtime,
      theme,
      route: `/en/ui-libraries/brutalist/components/${family}/`,
      status: 'pending' as const,
      plannedStates: plannedStates(family),
      achievedTargets: [],
      errors: [],
    }))
  )
);
// An existing directory, including an old failed attempt, is never reused.
await mkdir(resolve(output, '..'), { recursive: true });
await mkdir(output);
const frames: Record<string, unknown>[] = [];
const failures: Record<string, unknown>[] = [];
const report: Record<string, unknown> = {
  schemaVersion: 2,
  runID,
  baseline,
  observedAt: new Date().toISOString(),
  output,
  sourceCodeVersion: {
    head: baseline,
    kind: 'baseline only; exact worktree source recording pending',
    status: 'pending',
  },
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    argv: process.argv,
    execArgv: process.execArgv,
    baseUrl,
    viewport,
    variables: Object.fromEntries(
      [
        'PROTO_UI_BROWSER_BASE_URL',
        'PROTO_UI_CONTRAST_EVIDENCE_DIR',
        'PROTO_UI_CONTRAST_FAMILIES',
        'CHROME_PATH',
        'LOCALAPPDATA',
        'DISPLAY',
      ].map((key) => [key, process.env[key] ?? null])
    ),
  },
  selectedFamilies,
  runtimes,
  themes,
  cases,
  frames,
  failedCases: failures,
  evidenceDebt: [
    'All cue necessity and required/redundant/decorative classifications remain independent-review debt; no frame is automatically a WCAG verdict.',
    'Rest-only families have no interaction journey in this runner; authored auxiliary controls and every possible cue are not covered by their rest frames.',
    'Portable Transition entered state is not directly exposed on every runtime DOM; modal entry observations use owned visibility and completed authored CSS animations, not an invented transition attribute.',
  ],
  authority: [
    'https://github.com/Proto-UI/Proto-UI/issues/469',
    'https://github.com/Proto-UI/Proto-UI/issues/427#issuecomment-5376913069',
    'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
    'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
  ],
  scope:
    'Selected current documented Brutalist consumers only; no historical attempt is merged or cleared by this run.',
  methodology: [
    'Native reader controls choose runtime/theme. Native pointer and keyboard input change subject state; helpers never write subject CSS, attributes or state.',
    'General keyboard focus uses a programmatic seed followed by native Tab/Shift+Tab; not a whole-page Tab-order claim. Modal CloseIcon uses native Tab inside the modal.',
    'Target predicates and collected states are distinct from coverage of all authored cues and from independent WCAG classification.',
    'One shared state fingerprint binds the pre-PNG state to measured facts and post-measurement state. Mismatch is a preserved failed attempt, never a retry.',
    'Scroll claims require observed offset movement after native input and stable offsets/geometry across consecutive animation frames; no timed sleep substitutes for movement.',
    'Every cue remains unclassified unless independently reviewed. Inactive compositing observations are not normal-text conformance assertions.',
  ],
  disposition: 'running; no acceptance determination',
};
let sequence = 0;
async function persist(reason: string): Promise<void> {
  report.summary = {
    collectedFrames: frames.length,
    pngFactMatchedFrames: frames.filter((frame) => frame.status === 'matched').length,
    achievedTargetPredicates: cases.reduce((sum, item) => sum + item.achievedTargets.length, 0),
    unresolvedRuntimeThemeCases: cases.filter((item) => item.status !== 'observed').length,
    distinctUnresolvedFamilies: new Set(
      cases.filter((item) => item.status !== 'observed').map((item) => item.family)
    ).size,
    caseCoverage: cases.map((item) => ({
      family: item.family,
      runtime: item.runtime,
      theme: item.theme,
      status: item.status,
      missingTargets: item.plannedStates.filter((state) => !item.achievedTargets.includes(state)),
    })),
    conformance: 'not evaluated; frame count and target predicate count are not full conformance',
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  await writeFile(
    join(output, `report-${String(sequence++).padStart(5, '0')}-${reason}.json`),
    json,
    { flag: 'wx' }
  );
  // Only this newly owned run's current report is updated; immutable snapshots remain.
  await writeFile(join(output, 'report.json'), json);
}
await persist('initial');
let browser: Browser | undefined;
let browserProbe = '';
let phase = 'source-provenance';
let cleanSource: ReturnType<typeof readContrastProvenance>;
let servedSource:
  | ({ schemaVersion: number; serverId: string } & ReturnType<typeof readContrastProvenance>)
  | undefined;

async function verifyServedSource(): Promise<void> {
  const local = readContrastProvenance(repositoryRoot);
  if (!isDeepStrictEqual(local, cleanSource))
    throw new Error('Local rendered source changed during the audit.');
  const response = await fetch(new URL('/__pui_contrast_provenance', baseUrl), {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(
      `Served contrast provenance unavailable (HTTP ${response.status}); start a clean opt-in audit server.`
    );
  const current = (await response.json()) as NonNullable<typeof servedSource>;
  if (
    current.schemaVersion !== 1 ||
    typeof current.serverId !== 'string' ||
    !current.serverId ||
    !isDeepStrictEqual(
      { head: current.head, tree: current.tree, generated: current.generated },
      cleanSource
    )
  ) {
    throw new Error(
      'Served build does not match the complete clean local source and generated CSS.'
    );
  }
  if (servedSource && !isDeepStrictEqual(current, servedSource))
    throw new Error('Audit server identity changed during the run.');
  servedSource = current;
}

async function settle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const scope = document.querySelector<HTMLElement>('[data-projection-scope]');
      const owner = scope?.dataset.projectionOwner ?? scope?.dataset.projectionScope;
      const generation = scope?.dataset.projectionGeneration;
      if (!owner || !generation || scope?.dataset.projectionState !== 'ready') return false;
      const roots = [...document.querySelectorAll<HTMLElement>('[data-pui-root]')].filter(
        (element) =>
          element.dataset.projectionOwner === owner &&
          element.dataset.projectionGeneration === generation
      );
      return (
        roots.length > 0 &&
        roots.every((element) => {
          const transition = element.getAttribute('data-transition-state');
          return (
            transition !== 'entering' &&
            transition !== 'leaving' &&
            element
              .getAnimations({ subtree: true })
              .every(
                (animation) => animation.playState === 'finished' || animation.playState === 'idle'
              )
          );
        })
      );
    },
    undefined,
    { timeout: 20_000 }
  );
}
async function fingerprint(page: Page): Promise<string> {
  return page.evaluate(() =>
    (
      globalThis as typeof globalThis & {
        puiContrastProbe: typeof import('./contrast-probe.browser');
      }
    ).puiContrastProbe.readContrastState()
  );
}
async function stableFingerprint(page: Page): Promise<string> {
  // Screenshot waits for fonts too; read the same painted text geometry before
  // the PNG instead of measuring fallback fonts that it will replace.
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  let previous = await fingerprint(page);
  let stableFrames = 0;
  for (let attempt = 0; attempt < 12 && stableFrames < 2; attempt++) {
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    );
    const next = await fingerprint(page);
    stableFrames = next === previous ? stableFrames + 1 : 0;
    previous = next;
  }
  if (stableFrames < 2) throw new Error('Measured state did not stabilize before capture.');
  return previous;
}
async function capture(
  page: Page,
  item: Case,
  state: string,
  observe: () => Promise<Observation>
): Promise<void> {
  phase = `capture:${state}`;
  const name = `${item.family}-${item.runtime}-${item.theme}-${state}`;
  const frame: Record<string, unknown> = {
    family: item.family,
    runtime: item.runtime,
    theme: item.theme,
    requestedState: state,
    status: 'attempting',
    image: null,
    facts: null,
  };
  frames.push(frame);
  try {
    const before = await stableFingerprint(page);
    frame.beforeFingerprintDigest = digest(before);
    // Default caret hiding writes native editor styles; preserve the reader's
    // state rather than weakening the exact PNG/fact fingerprint guards.
    const png = await page.screenshot({ caret: 'initial' });
    await writeFile(join(output, `${name}.png`), png, { flag: 'wx' });
    frame.image = {
      path: `${name}.png`,
      absolutePath: join(output, `${name}.png`),
      digest: digest(png),
      origin: 'native Playwright page.screenshot PNG',
      route: page.url(),
      capturedAt: new Date().toISOString(),
    };
    const facts = await page.evaluate(
      (input) =>
        (
          globalThis as typeof globalThis & {
            puiContrastProbe: typeof import('./contrast-probe.browser');
          }
        ).puiContrastProbe.collectContrastFrame(input),
      { image: png.toString('base64'), family: item.family }
    );
    const { stateFingerprint, ...storedFacts } = facts;
    frame.facts = { ...storedFacts, stateFingerprintDigest: digest(stateFingerprint) };
    const factsJSON = JSON.stringify(frame.facts, null, 2) + '\n';
    await writeFile(join(output, `${name}.facts.json`), factsJSON, { flag: 'wx' });
    frame.factsFile = { path: `${name}.facts.json`, digest: digest(factsJSON) };
    frame.targetObservation = await observe();
    const after = await fingerprint(page);
    frame.afterFingerprintDigest = digest(after);
    if (before !== facts.stateFingerprint || before !== after) {
      const mismatchJSON =
        JSON.stringify(
          {
            before: JSON.parse(before),
            facts: JSON.parse(facts.stateFingerprint),
            after: JSON.parse(after),
          },
          null,
          2
        ) + '\n';
      const mismatchPath = `${name}.mismatch.json`;
      await writeFile(join(output, mismatchPath), mismatchJSON, { flag: 'wx' });
      frame.mismatchFile = { path: mismatchPath, digest: digest(mismatchJSON) };
      throw new Error(
        'PNG/fact state mismatch: physical state or projection lease changed; raw attempt retained, no retry.'
      );
    }
    if (!(frame.targetObservation as Observation).achieved)
      throw new Error(`Requested target predicate not achieved: ${state}.`);
    frame.status = 'matched';
    item.achievedTargets.push(state);
    console.log(
      `Captured ${name}: PNG/facts matched; target predicate achieved, cues unclassified.`
    );
  } catch (error) {
    frame.status = 'failed';
    frame.error = message(error);
    throw error;
  } finally {
    await persist('frame');
  }
}
function primary(previewer: Locator, family: string): Locator | null {
  if (family === 'tabs') return previewer.getByRole('tab', { name: 'Details', exact: true });
  const selector = (
    {
      button: '[data-demo-ref="solidMain"]',
      toggle: '[role="button"][aria-pressed]',
      switch: '[role="switch"]',
      checkbox: '[role="checkbox"]',
      'dropdown-menu': '[data-projection-prototype="brutalist-dropdown-trigger"][data-pui-root]',
      select: '[data-projection-prototype="brutalist-select-trigger"][data-pui-root]',
      dialog: '[data-projection-prototype="brutalist-dialog-trigger"][data-pui-root]',
      'hover-card': '[data-projection-prototype="brutalist-hover-card-trigger"][data-pui-root]',
      textarea: 'textarea',
      'scroll-area': '[data-demo-ref="scrollViewport"]',
      tooltip: '[data-projection-prototype="brutalist-tooltip-trigger"][data-pui-root]',
    } as Record<string, string>
  )[family];
  return selector ? previewer.locator(`[data-projection-content] ${selector}`).first() : null;
}
async function targetObservation(target: Locator): Promise<Observation> {
  return target.evaluate((element) => ({
    achieved:
      element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
    prototype: element.getAttribute('data-projection-prototype'),
    text: element.textContent,
    focused: document.activeElement === element,
    focusVisible: element.matches(':focus-visible'),
    hovered: element.matches(':hover'),
    nativeActive: element.matches(':active'),
    ariaPressed: element.getAttribute('aria-pressed'),
    ariaSelected: element.getAttribute('aria-selected'),
    ariaChecked: element.getAttribute('aria-checked'),
    ariaExpanded: element.getAttribute('aria-expanded'),
    shadow: getComputedStyle(element).boxShadow,
  }));
}
async function requireTarget(
  target: Locator,
  predicate: (observation: Observation) => boolean
): Promise<Observation> {
  const observation = await targetObservation(target);
  return { ...observation, achieved: observation.achieved && predicate(observation) };
}
async function pointerJourney(
  page: Page,
  item: Case,
  target: Locator,
  previewer: Locator,
  prefix = ''
): Promise<void> {
  const before = await targetObservation(target);
  const family = item.family;
  if (family === 'tabs' && before.ariaSelected !== 'false') {
    throw new Error(
      'Details must initially be unselected; no selection transition can be claimed.'
    );
  }
  const popupName = (
    {
      dialog: 'brutalist-dialog-content',
      'dropdown-menu': 'brutalist-dropdown-content',
      select: 'brutalist-select-content',
    } as Record<string, string>
  )[family];
  const controlledId = popupName ? await target.getAttribute('aria-controls') : null;
  if (popupName && !controlledId)
    throw new Error('Popup trigger has no controls identity to bind its activation result.');
  // The runtime selector is itself a Select with the same owner/generation.
  // Use the product trigger's relation, not the first owned listbox.
  const popup = popupName
    ? (await owned(page, popupName)).and(page.locator(`[id=${JSON.stringify(controlledId)}]`))
    : null;
  const popupBefore = popup ? await popup.isVisible() : null;
  if (popupBefore)
    throw new Error('Pointer open journey requires an initially closed owned popup.');
  const clicks =
    family === 'button'
      ? await target.evaluateHandle((element) => {
          // This observes native click delivery only; no subject state or handler is replaced.
          const observation = {
            count: 0,
            listener(event: Event) {
              if (event instanceof MouseEvent && event.isTrusted && event.button === 0)
                observation.count++;
            },
            dispose() {
              element.removeEventListener('click', observation.listener);
            },
          };
          element.addEventListener('click', observation.listener);
          return observation;
        })
      : null;
  try {
    const bounds = await target.boundingBox();
    if (!bounds) throw new Error(`${family}: physical input target lacks bounds.`);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    try {
      await capture(page, item, `${prefix}pointer-down`, () =>
        requireTarget(target, (value) => value.nativeActive === true)
      );
    } finally {
      await page.mouse.up();
    }
    if (family === 'tabs') {
      await target.locator('xpath=self::*[@aria-selected="true"]').waitFor();
      await capture(page, item, `${prefix}activation-result`, () =>
        tabsObservation(previewer, 'Details')
      );
      return;
    }
    if (popup) await popup.waitFor({ state: 'visible' });
    await capture(page, item, `${prefix}activation-result`, async () => {
      const after = await targetObservation(target);
      if (family === 'button') {
        const delivered = await clicks!.evaluate((observation) => observation.count);
        return {
          ...after,
          achieved: after.achieved && delivered === 1,
          trustedNativeClicks: delivered,
          basis:
            'One trusted native click delivered to this Button after release; not application-effect or Expose-protocol acceptance.',
        };
      }
      if (popup) {
        const popupAfter = await popup.isVisible();
        const maskProof = family === 'dialog' ? await dialogOpenObservation(page, popup) : null;
        return {
          ...after,
          achieved:
            popupBefore === false &&
            popupAfter &&
            (family === 'dialog' || after.ariaExpanded === 'true') &&
            (!maskProof || maskProof.achieved),
          before,
          after,
          popupBefore,
          popupAfter,
          popupPrototype: popupName,
          maskProof,
        };
      }
      const attribute = family === 'toggle' ? 'ariaPressed' : 'ariaChecked';
      const oldValue = before[attribute];
      const expected = oldValue === 'true' ? 'false' : 'true';
      const validBefore =
        oldValue === 'true' ||
        oldValue === 'false' ||
        (family === 'checkbox' && oldValue === 'mixed');
      return {
        ...after,
        achieved: after.achieved && validBefore && after[attribute] === expected,
        attribute,
        before: oldValue,
        expected,
        after: after[attribute],
      };
    });
  } finally {
    if (clicks) {
      await clicks.evaluate((observation) => observation.dispose());
      await clicks.dispose();
    }
  }
}
async function owned(page: Page, prototype: string): Promise<Locator> {
  const lease = await page
    .locator('[data-projection-scope]')
    .first()
    .evaluate((scope: HTMLElement) => ({
      owner: scope.dataset.projectionOwner ?? scope.dataset.projectionScope,
      generation: scope.dataset.projectionGeneration,
    }));
  if (!lease.owner || !lease.generation) throw new Error('Current projection lease missing.');
  return page.locator(
    `[data-pui-root][data-projection-prototype=${JSON.stringify(prototype)}][data-projection-owner=${JSON.stringify(lease.owner)}][data-projection-generation=${JSON.stringify(lease.generation)}]`
  );
}
async function dialogOpenObservation(page: Page, modal: Locator): Promise<Observation> {
  const masks = await owned(page, 'brutalist-dialog-mask');
  if ((await masks.count()) !== 1)
    return { achieved: false, reason: 'Open Dialog requires exactly one owned mask.' };
  const handle = await masks.elementHandle();
  if (!handle) return { achieved: false, reason: 'Owned Dialog mask has no physical target.' };
  try {
    return await modal.evaluate((content, mask) => {
      const visibility = [content, mask].map((element): boolean => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        for (let current: Element | null = element; current; ) {
          const style = getComputedStyle(current);
          if (
            style.display === 'none' ||
            style.visibility !== 'visible' ||
            style.contentVisibility === 'hidden' ||
            Number(style.opacity) === 0
          )
            return false;
          const root = current.getRootNode();
          current =
            current.assignedSlot ??
            current.parentElement ??
            (root instanceof ShadowRoot ? root.host : null);
        }
        return true;
      });
      const rect = content.getBoundingClientRect();
      const maskRect = mask.getBoundingClientRect();
      const style = getComputedStyle(mask);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const paint = canvas.getContext('2d');
      if (!paint) return { achieved: false, reason: 'Mask fill could not be observed.' };
      paint.fillStyle = style.backgroundColor;
      paint.fillRect(0, 0, 1, 1);
      const fillAlpha = paint.getImageData(0, 0, 1, 1).data[3];
      const maskVisible = visibility[1] === true && fillAlpha > 0;
      const coversViewport =
        maskRect.left <= 0 &&
        maskRect.top <= 0 &&
        maskRect.right >= innerWidth &&
        maskRect.bottom >= innerHeight;
      // Same twelve one-CSS-pixel exterior locations sampled by the probe.
      // Hit ownership establishes the receiving layer, not a contrast verdict
      // or a claim that content box-shadow cannot paint over that layer.
      const exterior = [0.25, 0.5, 0.75]
        .flatMap((fraction) => [
          { side: 'top', x: rect.x + rect.width * fraction, y: rect.y - 1 },
          { side: 'left', x: rect.x - 1, y: rect.y + rect.height * fraction },
          { side: 'bottom', x: rect.x + rect.width * fraction, y: rect.bottom + 1 },
          { side: 'right', x: rect.right + 1, y: rect.y + rect.height * fraction },
        ])
        .map((point) => {
          const insideViewport =
            point.x >= 0 && point.y >= 0 && point.x < innerWidth && point.y < innerHeight;
          const hit = insideViewport ? document.elementFromPoint(point.x, point.y) : null;
          return {
            ...point,
            insideViewport,
            maskIsExteriorLayer: hit === mask,
            hitPrototype: hit?.getAttribute('data-projection-prototype') ?? null,
          };
        });
      const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const contentInFront = center !== null && content.contains(center);
      const ownedMask =
        mask.getAttribute('data-projection-owner') ===
          content.getAttribute('data-projection-owner') &&
        mask.getAttribute('data-projection-generation') ===
          content.getAttribute('data-projection-generation');
      return {
        achieved:
          content.getAttribute('role') === 'dialog' &&
          visibility[0] === true &&
          ownedMask &&
          maskVisible &&
          coversViewport &&
          style.position === 'fixed' &&
          contentInFront &&
          exterior.every((point) => point.insideViewport && point.maskIsExteriorLayer),
        maskVisible,
        coversViewport,
        ownedMask,
        fillAlpha,
        contentInFront,
        exterior,
        contentBounds: rect.toJSON(),
        maskBounds: maskRect.toJSON(),
        maskBackground: style.backgroundColor,
        basis:
          'Owned visible filled full-viewport mask is the hit-tested exterior receiving layer; content remains above it. Pixel ratios and shadow-overhang classification remain separate.',
      };
    }, handle);
  } finally {
    await handle.dispose();
  }
}
async function tooltipPortal(page: Page, target: Locator): Promise<Locator> {
  const content = await owned(page, 'brutalist-tooltip-content');
  // Opened content moves into the body portal; the first owned node may be a
  // different, closed Tooltip. Description tokens are additive, not one ID.
  const handle = await target.elementHandle();
  if (!handle) throw new Error('Tooltip physical trigger missing.');
  try {
    await page.waitForFunction(
      (trigger) => {
        const scope = document.querySelector<HTMLElement>('[data-projection-scope]');
        const owner = scope?.dataset.projectionOwner ?? scope?.dataset.projectionScope;
        return (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).some((id) => {
          const element = document.getElementById(id);
          return (
            element !== null &&
            element.dataset.projectionOwner === owner &&
            element.dataset.projectionGeneration === scope?.dataset.projectionGeneration &&
            element.dataset.projectionPrototype === 'brutalist-tooltip-content' &&
            element.getBoundingClientRect().width > 0 &&
            element.getBoundingClientRect().height > 0
          );
        });
      },
      handle,
      { timeout: 10_000 }
    );
  } finally {
    await handle.dispose();
  }
  const tokens = ((await target.getAttribute('aria-describedby')) ?? '').split(/\s+/);
  const ids = (
    await content.evaluateAll((elements) => elements.map((element) => element.id))
  ).filter((id) => id && tokens.includes(id));
  if (ids.length !== 1)
    throw new Error('Tooltip description does not resolve to exactly one current owned content.');
  const portal = content.and(page.locator(`[id=${JSON.stringify(ids[0])}]`));
  await portal.waitFor({ state: 'visible' });
  return portal;
}
async function tabsObservation(
  previewer: Locator,
  selected: 'Details' | 'Overview'
): Promise<Observation> {
  const overview = previewer.getByRole('tab', { name: 'Overview', exact: true });
  const details = previewer.getByRole('tab', { name: 'Details', exact: true });
  // The previewer itself has a tabpanel wrapper; only the materialized product
  // part proves that selection changed the current Tabs content.
  const panel = previewer.locator(
    '[data-projection-content] [data-pui-root][data-projection-prototype="brutalist-tabs-content"][role="tabpanel"]:visible'
  );
  const expectedText =
    selected === 'Details'
      ? 'Dark mode keeps black shadows on warm paper.'
      : 'Hard borders, loud yellow, no radius.';
  return {
    achieved:
      (await overview.getAttribute('aria-selected')) === String(selected === 'Overview') &&
      (await details.getAttribute('aria-selected')) === String(selected === 'Details') &&
      (await panel.count()) === 1 &&
      (await panel.innerText()).trim() === expectedText,
    overview: await targetObservation(overview),
    details: await targetObservation(details),
    panel: await panel.allTextContents(),
  };
}
async function scrollOffsets(target: Locator) {
  return target.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop,
    maxLeft: element.scrollWidth - element.clientWidth,
    maxTop: element.scrollHeight - element.clientHeight,
  }));
}
async function waitScroll(
  page: Page,
  target: Locator,
  before: Awaited<ReturnType<typeof scrollOffsets>>,
  axes: 'vertical-end' | 'vertical-start' | 'both'
) {
  const handle = await target.elementHandle();
  if (!handle) throw new Error('Scroll physical target missing.');
  try {
    await page.waitForFunction(
      ({ element, before, axes }) =>
        axes === 'vertical-end'
          ? element.scrollTop !== before.top &&
            Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight)) <= 1
          : axes === 'vertical-start'
            ? element.scrollTop !== before.top && element.scrollTop <= 1
            : element.scrollLeft !== before.left && element.scrollTop !== before.top,
      { element: handle, before, axes },
      { timeout: 10_000 }
    );
    // The browser callback must not capture tsx's Node-only naming helper.
    // Reuse the exact leased paint/scroll geometry guard on the Node boundary.
    await stableFingerprint(page);
  } finally {
    await handle.dispose();
  }
}

try {
  cleanSource = readContrastProvenance(repositoryRoot);
  if (cleanSource.head !== baseline) throw new Error('Source HEAD changed during audit startup.');
  await verifyServedSource();
  report.servedSource = servedSource;
  const sourceFiles = [
    ['runner', new URL('./audit-brutalist-contrast.mts', import.meta.url)],
    ['probe', new URL('./contrast-probe.browser.ts', import.meta.url)],
    ['provenance-guard', new URL('./contrast-provenance.mjs', import.meta.url)],
    ['browser-harness', new URL('../src/content/docs/zh-cn/browser-harness.ts', import.meta.url)],
    [
      'projection-manifest',
      new URL('../src/components/PrototypePreviewer/projection-families.ts', import.meta.url),
    ],
    ['www-package', new URL('../package.json', import.meta.url)],
    ['workspace-package', new URL('../../../package.json', import.meta.url)],
    ['workspace-lockfile', new URL('../../../pnpm-lock.yaml', import.meta.url)],
    [
      'textarea-live-props-setup',
      new URL('../src/content/docs/zh-cn/demo-base-textarea.demo.ts', import.meta.url),
    ],
    ...selectedFamilies.map((family) => [
      `recipe-${family}`,
      new URL(`../src/content/docs/zh-cn/demo-brutalist-${family}.demo.ts`, import.meta.url),
    ]),
  ] as const;
  const sources: Record<string, unknown>[] = [];
  report.sources = sources;
  let probeSource = '';
  for (const [identity, url] of sourceFiles) {
    const source = await readFile(url, 'utf8');
    const filename = `${identity}.source`;
    await writeFile(join(output, filename), source, { flag: 'wx' });
    sources.push({ identity, original: url.toString(), path: filename, digest: digest(source) });
    if (identity === 'probe') probeSource = source;
  }
  report.sourceCodeVersion = {
    head: baseline,
    status: 'captured',
    kind: 'complete clean Git tree plus generated CSS, bound to the opt-in dev server startup identity and current source checks',
    cleanTree: cleanSource.tree,
    generatedCSS: cleanSource.generated,
    sourceSetDigest: digest(
      JSON.stringify(sources.map(({ identity, digest }) => ({ identity, digest })))
    ),
    runnerDigest: sources.find((source) => source.identity === 'runner')?.digest,
    probeDigest: sources.find((source) => source.identity === 'probe')?.digest,
  };
  browserProbe = (
    await transform(probeSource, {
      loader: 'ts',
      format: 'iife',
      globalName: 'puiContrastProbe',
      keepNames: false,
    })
  ).code;
  await writeFile(join(output, 'probe-executed.js'), browserProbe, { flag: 'wx' });
  report.executedProbe = {
    path: 'probe-executed.js',
    digest: digest(browserProbe),
    transform: { loader: 'ts', format: 'iife', globalName: 'puiContrastProbe', keepNames: false },
  };
  phase = 'browser-launch';
  browser = await launchBrowser();
  report.browser = browser.version();
  await persist('ready');
  for (const item of cases) {
    const { family, runtime, theme } = item;
    let context: BrowserContext | undefined;
    item.status = 'running';
    phase = 'context-creation';
    try {
      phase = 'source-provenance';
      await verifyServedSource();
      // openRoute creates a context before readiness and leaks it on rejection.
      // Keep the same documented setup with ownership established before goto.
      phase = 'context-creation';
      context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(20_000);
      page.setDefaultNavigationTimeout(30_000);
      phase = 'route-opening';
      const response = await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'networkidle' });
      if (!response || !response.ok())
        throw new Error(`Route returned HTTP ${response?.status() ?? 'no response'}.`);
      if (response.headers()['x-proto-ui-contrast-server'] !== servedSource!.serverId)
        throw new Error('Rendered page came from a different audit server identity.');
      const previewer = page.locator('[data-previewer-id]').first();
      await previewer.waitFor({ state: 'visible' });
      phase = 'runtime-theme-readiness';
      await choosePreviewRuntime(page, previewer, runtime as (typeof runtimes)[number]);
      await page.waitForSelector(
        `[data-projection-scope][data-projection-runtime="${runtime}"][data-projection-state="ready"]`
      );
      await applyColorScheme(page, theme as (typeof themes)[number]);
      await previewer.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.addScriptTag({ content: browserProbe });
      const rest = () =>
        page
          .locator('[data-projection-scope]')
          .first()
          .evaluate((scope: HTMLElement) => ({
            achieved: scope.dataset.projectionState === 'ready',
            owner: scope.dataset.projectionOwner,
            generation: scope.dataset.projectionGeneration,
          }));
      await capture(page, item, 'rest', rest);
      const target = primary(previewer, family);
      if (!target) {
        if (!passiveFamilies.has(family))
          throw new Error(
            `${family}: no planned physical target; unsupported interaction coverage.`
          );
        phase = 'source-provenance';
        await verifyServedSource();
        item.status = 'observed';
        await persist('case');
        continue;
      }
      if (!(await target.count()))
        throw new Error(`${family}: planned native target was not materialized.`);
      await target.hover();
      if (family === 'tooltip') await tooltipPortal(page, target);
      if (family === 'hover-card')
        await (await owned(page, 'brutalist-hover-card-content'))
          .first()
          .waitFor({ state: 'visible' });
      await capture(page, item, 'hover', () =>
        requireTarget(target, (value) => value.hovered === true)
      );
      if (family === 'tooltip') {
        const portal = await tooltipPortal(page, target);
        await capture(page, item, 'hover-open', async () => ({
          achieved:
            (await portal.isVisible()) && (await targetObservation(target)).hovered === true,
          portal: await targetObservation(portal),
        }));
      }
      if (family === 'hover-card') {
        const portal = (await owned(page, 'brutalist-hover-card-content')).first();
        await portal.waitFor({ state: 'visible' });
        await capture(page, item, 'hover-open', async () => ({
          achieved: await portal.isVisible(),
          portal: await targetObservation(portal),
        }));
      }
      if (
        [
          'button',
          'toggle',
          'switch',
          'tabs',
          'checkbox',
          'dropdown-menu',
          'select',
          'dialog',
        ].includes(family)
      ) {
        await pointerJourney(page, item, target, previewer);
      }
      // Dismiss open menus before testing the trigger's native keyboard route.
      await page.keyboard.press('Escape');
      if (family === 'dialog')
        await (await owned(page, 'brutalist-dialog-content')).first().waitFor({ state: 'hidden' });
      await page.mouse.move(0, 0);
      await target.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      if (family === 'tooltip') await tooltipPortal(page, target);
      await capture(page, item, 'keyboard-focus', () =>
        requireTarget(target, (value) => value.focused === true && value.focusVisible === true)
      );
      if (family === 'button') {
        for (const variant of ['surface', 'destructive']) {
          const variantTarget = previewer.locator(
            `[data-projection-content] [data-pui-root][data-demo-ref="${variant}"]`
          );
          await page.mouse.move(0, 0);
          await capture(page, item, `${variant}-rest`, () => targetObservation(variantTarget));
          await variantTarget.hover();
          await capture(page, item, `${variant}-hover`, () =>
            requireTarget(variantTarget, (value) => value.hovered === true)
          );
          await pointerJourney(page, item, variantTarget, previewer, `${variant}-`);
          await page.mouse.move(0, 0);
          await variantTarget.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          await capture(page, item, `${variant}-keyboard-focus`, () =>
            requireTarget(
              variantTarget,
              (value) => value.focused === true && value.focusVisible === true
            )
          );
        }
      }
      if (family === 'tooltip') {
        const portal = await tooltipPortal(page, target);
        await capture(page, item, 'focus-open', async () => ({
          achieved:
            (await portal.isVisible()) && (await targetObservation(target)).focused === true,
          portal: await targetObservation(portal),
        }));
      }
      if (['dropdown-menu', 'select', 'dialog'].includes(family)) {
        if (family === 'dialog') {
          await target.press('Enter');
          const modal = (await owned(page, 'brutalist-dialog-content')).first();
          await modal.waitFor({ state: 'visible' });
          await settle(page);
          await capture(page, item, 'open', async () => ({
            ...(await dialogOpenObservation(page, modal)),
            modal: await targetObservation(modal),
            entryBasis:
              'Visible owned Dialog with authored CSS entry animations finished; portable transitionState is not inferred from a fabricated DOM attribute.',
          }));
          const icon = (await owned(page, 'brutalist-dialog-close-icon')).first();
          await icon.waitFor({ state: 'visible' });
          await icon.hover();
          await capture(page, item, 'close-icon-hover', async () => {
            const control = await requireTarget(icon, (value) => value.hovered === true);
            const maskProof = await dialogOpenObservation(page, modal);
            return {
              ...control,
              achieved: control.achieved && maskProof.achieved,
              maskProof,
              footerCloseCount: await modal
                .locator('[data-projection-prototype="brutalist-dialog-close"]')
                .count(),
              identity: 'brutalist-dialog-close-icon, not footer Close',
            };
          });
          await page.mouse.move(0, 0);
          let reached = false;
          for (let step = 0; step < 30; step++) {
            await page.keyboard.press('Tab');
            const inside = await modal.evaluate((element) =>
              element.contains(document.activeElement)
            );
            if (!inside) throw new Error('Native Tab focus escaped the entered modal.');
            const observation = await targetObservation(icon);
            if (observation.focused && observation.focusVisible) {
              reached = true;
              break;
            }
          }
          if (!reached)
            throw new Error('CloseIcon native keyboard focus not reached within 30 modal Tabs.');
          await capture(page, item, 'close-icon-keyboard-focus', async () => {
            const control = await requireTarget(
              icon,
              (value) => value.focused === true && value.focusVisible === true
            );
            const maskProof = await dialogOpenObservation(page, modal);
            return { ...control, achieved: control.achieved && maskProof.achieved, maskProof };
          });
        } else {
          if ((await target.getAttribute('aria-expanded')) === 'true') await target.click();
          await target.press('ArrowDown');
          const role = family === 'select' ? 'option' : 'menuitem';
          await page.waitForFunction(
            (role) => document.activeElement?.getAttribute('role') === role,
            role
          );
          const itemFocus = (edge?: 'first' | 'last') =>
            page.evaluate(
              ({ role, edge }) => {
                const focused = document.activeElement as HTMLElement | null;
                const candidates = [
                  ...document.querySelectorAll<HTMLElement>(`[role="${role}"]`),
                ].filter(
                  (element) =>
                    element.dataset.projectionOwner === focused?.dataset.projectionOwner &&
                    element.dataset.projectionGeneration ===
                      focused?.dataset.projectionGeneration &&
                    element.getAttribute('aria-disabled') !== 'true' &&
                    !element.hasAttribute('disabled') &&
                    element.getBoundingClientRect().width > 0 &&
                    element.getBoundingClientRect().height > 0
                );
                const expected =
                  edge === 'first' ? candidates[0] : edge === 'last' ? candidates.at(-1) : focused;
                return {
                  achieved: focused?.getAttribute('role') === role && focused === expected,
                  focusedText: focused?.textContent,
                  focusVisible: focused?.matches(':focus-visible'),
                  requestedEdge: edge ?? null,
                  eligibleItemTexts: candidates.map((element) => element.textContent),
                };
              },
              { role, edge }
            );
          await capture(page, item, 'open', itemFocus);
          await page.keyboard.press('Home');
          await capture(page, item, 'item-focus-first', () => itemFocus('first'));
          await page.keyboard.press('End');
          await capture(page, item, 'item-focus-last', () => itemFocus('last'));
        }
      }
      if (family === 'tabs') {
        const overview = previewer.getByRole('tab', { name: 'Overview', exact: true });
        await target.press('ArrowLeft');
        await overview.press('Space');
        await overview.locator('xpath=self::*[@aria-selected="true"]').waitFor();
        await capture(page, item, 'keyboard-selection-overview', () =>
          tabsObservation(previewer, 'Overview')
        );
      }
      if (['toggle', 'switch', 'checkbox'].includes(family)) {
        const attribute = family === 'toggle' ? 'aria-pressed' : 'aria-checked';
        const before = await target.getAttribute(attribute);
        await target.press('Space');
        await capture(page, item, 'keyboard-activation', async () => ({
          ...(await targetObservation(target)),
          achieved: (await target.getAttribute(attribute)) !== before,
          before,
          after: await target.getAttribute(attribute),
        }));
      }
      if (family === 'toggle') {
        const active = previewer.getByRole('button', { name: 'Active', exact: true });
        await capture(page, item, 'already-active', () =>
          requireTarget(active, (value) => value.ariaPressed === 'true')
        );
        await active.hover();
        const bounds = await active.boundingBox();
        if (!bounds) throw new Error('Already-active Toggle lacks physical bounds.');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        try {
          await capture(page, item, 'active-and-pointer-held', async () => {
            const value = await targetObservation(active);
            const layers = String(value.shadow)
              .split(/,(?![^()]*\))/)
              .map((layer) => layer.trim());
            const visibleLayers = layers.filter(
              (layer) => !/^rgba\([^)]*,\s*0(?:\.0*)?\)\s/.test(layer)
            );
            return {
              ...value,
              rawShadowLayers: layers,
              visibleShadowLayers: visibleLayers,
              achieved:
                value.ariaPressed === 'true' &&
                value.nativeActive === true &&
                visibleLayers.length === 1 &&
                visibleLayers[0].includes('inset'),
              basis:
                'Native pointer held on aria-pressed active Toggle; the sole visible inset is the authored active&&pressed cue. Transparent reset layers are not visible state indicators.',
            };
          });
        } finally {
          await page.mouse.up();
        }
      }
      if (family === 'scroll-area') {
        const beforeEnd = await scrollOffsets(target);
        await target.press('End');
        await waitScroll(page, target, beforeEnd, 'vertical-end');
        await capture(page, item, 'scroll-end', async () => {
          const after = await scrollOffsets(target);
          return {
            achieved: after.top !== beforeEnd.top && Math.abs(after.top - after.maxTop) <= 1,
            input: 'native End',
            before: beforeEnd,
            after,
          };
        });
        // End leaves the vertical axis saturated. Return with native Home so
        // a positive two-axis wheel can actually move both offsets.
        const beforeHome = await scrollOffsets(target);
        await target.press('Home');
        await waitScroll(page, target, beforeHome, 'vertical-start');
        const beforeWheel = await scrollOffsets(target);
        if (
          beforeWheel.top === beforeHome.top ||
          beforeWheel.maxLeft <= beforeWheel.left ||
          beforeWheel.maxTop <= beforeWheel.top
        )
          throw new Error('Native wheel setup has no available movement on both axes.');
        await target.hover();
        await page.mouse.wheel(1000, 1000);
        await waitScroll(page, target, beforeWheel, 'both');
        await capture(page, item, 'wheel-both-axes', async () => {
          const after = await scrollOffsets(target);
          return {
            achieved: after.left !== beforeWheel.left && after.top !== beforeWheel.top,
            input: 'native wheel(1000,1000)',
            before: beforeWheel,
            after,
          };
        });
      }
      if (family === 'textarea') {
        await target.click();
        await target.press('ControlOrMeta+A');
        await target.press('Backspace');
        await capture(page, item, 'empty-placeholder', () =>
          target.evaluate((element: HTMLTextAreaElement) => ({
            achieved: element.value === '' && element.matches(':placeholder-shown'),
            value: element.value,
            placeholder: element.placeholder,
          }))
        );
        const toggle = previewer.locator('[data-demo-ref="toggleProps"]');
        await toggle.click();
        await target.locator('xpath=self::*[@disabled and @readonly]').waitFor();
        await capture(page, item, 'disabled-and-readonly', () =>
          target.evaluate((element: HTMLTextAreaElement) => ({
            achieved:
              element.disabled && element.readOnly && getComputedStyle(element).opacity === '0.5',
            disabled: element.disabled,
            readOnly: element.readOnly,
            opacity: getComputedStyle(element).opacity,
            applicability:
              'coupled inactive disabled+readOnly observation; not a readOnly-only claim or active contrast verdict',
          }))
        );
        await toggle.click();
        await capture(page, item, 'live-props-restored', () =>
          target.evaluate((element: HTMLTextAreaElement) => ({
            achieved: !element.disabled && !element.readOnly,
            disabled: element.disabled,
            readOnly: element.readOnly,
          }))
        );
      }
      await page.keyboard.press('Escape');
      await page.mouse.move(0, 0);
      const missing = item.plannedStates.filter((state) => !item.achievedTargets.includes(state));
      if (missing.length) throw new Error(`Unachieved planned targets: ${missing.join(', ')}.`);
      phase = 'source-provenance';
      await verifyServedSource();
      item.status = 'observed';
    } catch (error) {
      item.status = 'failed';
      item.errors.push({ phase, error: message(error) });
      failures.push({
        family,
        runtime,
        theme,
        phase,
        error: message(error),
        disposition: 'unresolved case; achieved earlier targets retained, not excluded or passing',
      });
      console.error(`${family}/${runtime}/${theme}: ${phase}: ${message(error)}`);
      await persist('failure');
    } finally {
      if (context) {
        try {
          await context.close();
        } catch (error) {
          item.status = 'failed';
          item.errors.push({ phase: 'context-cleanup', error: message(error) });
          failures.push({
            family,
            runtime,
            theme,
            phase: 'context-cleanup',
            error: message(error),
          });
        }
      }
      await persist('case');
    }
  }
} catch (error) {
  report.fatalError = { phase, error: message(error) };
  for (const item of cases) {
    if (item.status === 'pending' || item.status === 'running') {
      item.status = 'failed';
      item.errors.push({
        phase,
        error: `Case not completed because run failed: ${message(error)}`,
      });
      failures.push({
        family: item.family,
        runtime: item.runtime,
        theme: item.theme,
        phase,
        error: message(error),
        disposition: 'not completed due to run failure; unresolved, not passing',
      });
    }
  }
  process.exitCode = 1;
  await persist('failure');
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      report.browserCleanupError = message(error);
      process.exitCode = 1;
    }
  }
  report.completedAt = new Date().toISOString();
  const unresolved = cases.filter((item) => item.status !== 'observed');
  report.disposition =
    unresolved.length || report.fatalError || report.browserCleanupError
      ? 'partial observation; unresolved evidence retained'
      : 'planned target observations collected; conformance and acceptance not evaluated';
  await persist('final');
  console.log(
    `Recorded ${frames.length} raw frame attempts; ${unresolved.length} unresolved runtime/theme cases in ${new Set(unresolved.map((item) => item.family)).size} distinct families. No conformance approval or Issue closure implied. Report: ${join(output, 'report.json')}`
  );
  if (unresolved.length) process.exitCode = 1;
}
