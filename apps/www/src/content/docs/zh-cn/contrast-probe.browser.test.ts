// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import type { Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  ContrastFrame,
  collectContrastFrame,
  readContrastState,
} from '../../../../scripts/contrast-probe.browser';
import { launchBrowser } from './browser-harness';

declare global {
  interface Window {
    puiContrastProbe: {
      collectContrastFrame: typeof collectContrastFrame;
      readContrastState: typeof readContrastState;
    };
  }
}

let browser: Browser;
let bundle: string;
beforeAll(async () => {
  const result = await build({
    entryPoints: [
      fileURLToPath(new URL('../../../../scripts/contrast-probe.browser.ts', import.meta.url)),
    ],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'puiContrastProbe',
    platform: 'browser',
    target: 'es2022',
  });
  bundle = result.outputFiles[0].text;
  browser = await launchBrowser();
});
afterAll(async () => {
  await browser?.close();
});

// Instrument calibration only: these authored DOM/CSS subjects are not shipped
// components and do not certify any family, Adapter, cue necessity or conformance.
const fixture = (markup: string) => `<!doctype html><html data-theme="light"><head><style>
  html { background: #000; }
  body { margin: 24px; background: #fff; color: #000; font: 16px/24px sans-serif; }
  [data-pui-root] { display: block; box-sizing: border-box; width: 220px; min-height: 32px; background: #fff; color: #000; margin: 8px 0; }
  svg { width: 24px; height: 24px; overflow: visible; }
  textarea { font: inherit; }
  textarea::placeholder { color: #000; opacity: 1; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style></head><body><main data-projection-scope="calibration" data-projection-owner="calibration" data-projection-generation="1">${markup}</main></body></html>`;

const calibrate = async (markup: string): Promise<ContrastFrame> => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 900 },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.setContent(fixture(markup));
    await page.locator('[data-pui-root]').evaluateAll((elements) => {
      for (const element of elements) {
        element.setAttribute('data-projection-owner', 'calibration');
        element.setAttribute('data-projection-generation', '1');
      }
    });
    await page.addScriptTag({ content: bundle });
    await page.evaluate(() => document.fonts.ready);
    const image = (await page.screenshot({ type: 'png', caret: 'initial' })).toString('base64');
    // Keep paint falsifiers independent of the new fingerprint API so a
    // preserved old probe fails on its bad ratios, not a missing export.
    return await page.evaluate(
      (image) =>
        window.puiContrastProbe.collectContrastFrame({ image, family: 'instrument-calibration' }),
      image
    );
  } finally {
    await context.close();
  }
};

const surface = (frame: ContrastFrame, ref: string) => {
  const found = frame.surfaces.find((candidate) => candidate.ref === ref);
  if (!found) throw new Error(`Calibration surface missing: ${ref}`);
  return found;
};

describe('contrast probe / real Chromium instrument calibration', () => {
  it('measures real text and glyph controls, not empty or descendant-only host ink', async () => {
    // Baseline falsifier: all opaque host boxes received 21:1, including empty,
    // SVG-only, child-only and empty-placeholder boxes with no direct black text.
    const frame = await calibrate(`
      <div data-pui-root data-demo-ref="empty"></div>
      <div data-pui-root data-demo-ref="glyph"><svg viewBox="0 0 24 24"><path d="M2 2L22 22" stroke="black" stroke-width="4" fill="none"/></svg></div>
      <div data-pui-root data-demo-ref="child"><span style="color:#777">Child ink</span></div>
      <div data-pui-root data-demo-ref="normal">Normal ink</div>
      <textarea data-pui-root data-demo-ref="placeholder" data-projection-prototype="brutalist-textarea-root" placeholder="Placeholder ink"></textarea>
      <textarea data-pui-root data-demo-ref="value" data-projection-prototype="brutalist-textarea-root">Native ink</textarea>
    `);
    for (const ref of ['empty', 'glyph', 'child', 'placeholder'])
      expect(surface(frame, ref).textContrast).toBeNull();
    expect(surface(frame, 'normal').textContrast?.ratio).toBeCloseTo(21, 8);
    expect(surface(frame, 'normal').textRuns[0].classification).toBe('source-model-only');
    expect(surface(frame, 'value').textContrast?.ratio).toBeCloseTo(21, 8);
    expect(surface(frame, 'placeholder').placeholder?.shown).toBe(true);
    expect(surface(frame, 'placeholder').placeholder?.ratio).toBeCloseTo(21, 8);
    const child = surface(frame, 'child').textRuns[0];
    expect(child.ratio).toBeGreaterThan(4);
    expect(child.ratio).toBeLessThan(4.5);
    const glyph = surface(frame, 'glyph').glyphs.find(
      (candidate) => candidate.tag.toLowerCase() === 'path'
    );
    expect(glyph?.strokeContrast).toBeCloseTo(21, 8);
    expect(glyph?.fillContrast).toBeNull();
  });

  it('withholds ratios for hidden, sr-only, overflow-clipped and offscreen runs', async () => {
    // Baseline falsifier: nonzero Range geometry admitted all these non-painted
    // runs. Exempt and unsupported are both honest; neither is a numerical pass.
    const frame = await calibrate(`
      <div data-pui-root data-demo-ref="visibility"><span style="visibility:hidden">Hidden ink</span><span class="sr-only">Accessible label</span></div>
      <div data-pui-root data-demo-ref="clipping"><div style="width:100px;height:20px;overflow:hidden"><span style="display:block;margin-top:50px">Clipped ink</span></div></div>
      <div data-pui-root data-demo-ref="offscreen"><span style="position:absolute;left:-10000px">Offscreen ink</span></div>
      <div data-pui-root data-demo-ref="control">Visible ink</div>
    `);
    const hidden = surface(frame, 'visibility').textRuns.find((run) => run.text === 'Hidden ink')!;
    expect(hidden.ratio).toBeNull();
    expect(hidden.classification).toBe('exempt');
    expect(hidden.limits).toContain('visibility-hidden-or-collapse');
    const sr = surface(frame, 'visibility').textRuns.find(
      (run) => run.text === 'Accessible label'
    )!;
    expect(sr.ratio).toBeNull();
    expect(sr.classification).toBe('unsupported');
    expect(sr.limits).toContain('unsupported-legacy-clip');
    for (const ref of ['clipping', 'offscreen']) {
      const run = surface(frame, ref).textRuns[0];
      expect(run.ratio).toBeNull();
      expect(run.classification).toBe('unsupported');
      expect(run.limits).toContain('offscreen-or-fully-clipped');
    }
    expect(surface(frame, 'control').textContrast?.ratio).toBeCloseTo(21, 8);
  });

  it('rejects SVG paint-server fallback and independently translucent stroke/fill', async () => {
    // Baseline falsifiers: url(...) silently retained canvas black; separately
    // inherited stroke-opacity/fill-opacity were ignored, inventing 21:1 ink.
    const frame = await calibrate(`
      <div data-pui-root data-demo-ref="stroke"><svg viewBox="0 0 24 24" stroke-opacity="0.1"><path d="M2 2L22 22" stroke="black" stroke-width="4" fill="none"/></svg></div>
      <div data-pui-root data-demo-ref="fill"><svg viewBox="0 0 24 24" fill-opacity="0.1"><path d="M2 2L22 2L22 22Z" fill="black" stroke="black" stroke-width="2"/></svg></div>
      <div data-pui-root data-demo-ref="gradient"><svg viewBox="0 0 24 24"><defs><linearGradient id="white"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient></defs><path d="M2 2L22 2L22 22Z" fill="url(#white)"/></svg></div>
      <div data-pui-root data-demo-ref="opaque"><svg viewBox="0 0 24 24"><path d="M2 2L22 2L22 22Z" fill="black" stroke="black" stroke-width="2"/></svg></div>
    `);
    const path = (ref: string) =>
      surface(frame, ref).glyphs.find((candidate) => candidate.tag.toLowerCase() === 'path')!;
    expect(path('stroke').strokeContrast).toBeNull();
    expect(Number(path('stroke').strokeOpacity)).toBeCloseTo(0.1, 8);
    expect(path('stroke').strokeLimits).toContain('unsupported-svg-stroke-alpha');
    expect(path('fill').fillContrast).toBeNull();
    expect(path('fill').fillLimits).toContain('unsupported-svg-fill-alpha');
    // Independent stroke is still opaque: blanket rejection would hide evidence.
    expect(path('fill').strokeContrast).toBeCloseTo(21, 8);
    expect(path('gradient').fillContrast).toBeNull();
    expect(path('gradient').fillLimits).toContain('unsupported-paint-server');
    expect(path('opaque').fillContrast).toBeCloseTo(21, 8);
  });

  it('retains fractional CSS alpha before raster bytes can round it opaque', async () => {
    // CSS Color 4 retains the fractional value in this user agent. Legacy rgba
    // already quantizes .999 to opaque in CSSOM, before the probe can see it.
    // The baseline canvas byte still rounds this retained alpha to 255.
    const frame = await calibrate(`
      <div data-pui-root data-demo-ref="alpha-ink" style="color:color(srgb 0 0 0 / .999)">Near opaque ink</div>
      <div style="background:black"><div data-pui-root data-demo-ref="alpha-fill" style="background:color(srgb 1 1 1 / .999)">Opaque ink over fractional fill</div></div>
      <div data-pui-root data-demo-ref="opaque">Opaque control</div>
    `);
    const ink = surface(frame, 'alpha-ink');
    expect(ink.textContrast).toBeNull();
    expect(ink.textRuns[0].ratio).toBeNull();
    expect(ink.textRuns[0].limits).toContain('unsupported-translucent-text-ink');
    expect(ink.paint.textAlpha).toBeCloseTo(0.999, 8);
    const fill = surface(frame, 'alpha-fill');
    expect(fill.paint.fillAlpha).toBeCloseTo(0.999, 8);
    expect(fill.paint.compositedBackground?.[0]).toBeCloseTo(254.745, 6);
    expect(fill.textContrast?.ratio).toBeLessThan(21);
    expect(fill.textContrast?.ratio).toBeGreaterThan(20.9);
    expect(fill.exterior.every((edge) => edge.opaqueFillVsPixel === null)).toBe(true);
    expect(surface(frame, 'opaque').textContrast?.ratio).toBeCloseTo(21, 8);
  });

  it('labels inset source-model ratios without claiming receiving-pixel adjacency', async () => {
    // Baseline falsifier: a white inset ring on white child paint over a black
    // parent had model 21:1 and no receiving samples but claimed pixel evidence.
    const frame = await calibrate(`
      <div data-pui-root data-demo-ref="inset" style="background:black;box-shadow:inset 0 0 0 4px white;padding:4px"><div style="background:white;height:24px">White child</div></div>
    `);
    const shadow = surface(frame, 'inset').shadows[0];
    expect('insetVsFill' in shadow && shadow.insetVsFill).toBeCloseTo(21, 8);
    expect('insetBasis' in shadow && shadow.insetBasis).toBe('source-model-only');
    expect('renderedAdjacency' in shadow && shadow.renderedAdjacency).toBe('unresolved');
    expect('receiving' in shadow && shadow.receiving).toEqual([]);
    expect(shadow.limitation).toContain('no receiving pixels measured');
  });

  it('binds facts to actual native targets, composed slot constraints and state changes', async () => {
    const context = await browser.newContext({ viewport: { width: 800, height: 900 } });
    try {
      const page = await context.newPage();
      await page.setContent(
        fixture(
          `<div data-pui-root data-demo-ref="editor" data-projection-owner="calibration" data-projection-generation="1" data-projection-prototype="brutalist-textarea-root"><textarea>Native target</textarea></div><div id="slotted"><span slot="label">Slotted ink</span></div>`
        )
      );
      await page.evaluate(() => {
        const host = document.querySelector('#slotted')!;
        host.attachShadow({ mode: 'open' }).innerHTML =
          '<div style="overflow:hidden;height:30px"><slot name="label"></slot></div>';
        const child = host.querySelector('span')!;
        child.setAttribute('data-pui-root', '');
        child.setAttribute('data-projection-owner', 'calibration');
        child.setAttribute('data-projection-generation', '1');
      });
      await page.addScriptTag({ content: bundle });
      const before = await page.evaluate(() => window.puiContrastProbe.readContrastState());
      expect(await page.evaluate(() => window.puiContrastProbe.readContrastState())).toBe(before);
      await page.locator('textarea').fill('Changed native target');
      const changedValue = await page.evaluate(() => window.puiContrastProbe.readContrastState());
      expect(changedValue).not.toBe(before);
      await page.evaluate(() => {
        const editor = document.querySelector('textarea')!;
        const replacement = editor.cloneNode(true) as HTMLTextAreaElement;
        replacement.value = editor.value;
        editor.replaceWith(replacement);
      });
      const replacedTarget = await page.evaluate(() => window.puiContrastProbe.readContrastState());
      expect(replacedTarget).not.toBe(changedValue);
      await page.evaluate(() => {
        (
          document.querySelector('#slotted')!.shadowRoot!.querySelector('div') as HTMLElement
        ).style.clipPath = 'inset(100%)';
      });
      const changedAncestor = await page.evaluate(() =>
        window.puiContrastProbe.readContrastState()
      );
      expect(changedAncestor).not.toBe(replacedTarget);
      const image = (await page.screenshot({ type: 'png', caret: 'initial' })).toString('base64');
      const frame = await page.evaluate(
        (image) =>
          window.puiContrastProbe.collectContrastFrame({ image, family: 'instrument-calibration' }),
        image
      );
      expect(frame.stateFingerprint).toBe(changedAncestor);
      expect(surface(frame, 'editor').text).toBe('Changed native target');
      const slotted = frame.surfaces.find((candidate) => candidate.ref === null)!;
      expect(slotted.textContrast).toBeNull();
      expect(slotted.textRuns[0].limits).toContain('unsupported-slot-background-model');
      expect(slotted.textRuns[0].limits).toContain('unsupported-clip-path-or-mask');
    } finally {
      await context.close();
    }
  });
});
