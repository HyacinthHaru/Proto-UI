import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { transform } from 'esbuild';

// Execute the real source-reader loop and emitted exterior expression with
// controlled CSSOM/paint inputs. This is a model-domain regression, not native
// evidence that a sampled point lands on a dash, gap or double-border stripe.
const borderRatioFixture = async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const borderStart = source.indexOf("for (const side of ['top', 'right', 'bottom', 'left']) {");
  const borderEnd = source.indexOf('const nodes: Node[] = [];', borderStart);
  const exteriorStart = source.indexOf('exterior: exterior.map(') + 'exterior: '.length;
  const exteriorEnd = source.indexOf('\n        cueDisposition:', exteriorStart);
  assert.ok(borderStart >= 0 && borderEnd > borderStart);
  assert.ok(exteriorStart >= 'exterior: '.length && exteriorEnd > exteriorStart);
  const readBorders = new Function(
    'style',
    'border',
    'paint',
    `const borders = {}; ${source.slice(borderStart, borderEnd)} return borders;`
  );
  const readExterior = new Function(
    'exterior',
    'inactive',
    'inkUnmodified',
    'borders',
    'backdrop',
    'fill',
    'contrast',
    `return ${source.slice(exteriorStart, exteriorEnd).trim().replace(/,$/, '')};`
  );
  const sides = ['top', 'right', 'bottom', 'left'];
  const luminance = (color) =>
    color
      .slice(0, 3)
      .map((channel) => channel / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = (a, b) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  return ({
    styles = {},
    width = 4,
    alpha = 1,
    inactive = false,
    inkUnmodified = true,
    color = [0, 0, 0, 255],
  } = {}) => {
    const ink = () => ({ rgba: color, alpha, limits: [] });
    const borders = readBorders(
      {
        getPropertyValue: (property) => {
          const [, side, kind] = property.split('-');
          return kind === 'style'
            ? (styles[side] ?? 'solid')
            : kind === 'width'
              ? `${width}px`
              : 'black';
        },
      },
      ink(),
      ink
    );
    const exterior = readExterior(
      sides.map((side) => ({ side, point: { x: 1, y: 1, rgb: [255, 255, 255] } })),
      inactive,
      inkUnmodified,
      borders,
      { rgba: [255, 255, 255, 255] },
      { rgba: [255, 255, 255, 255], alpha: 1, limits: [] },
      contrast
    );
    return { borders, exterior };
  };
};

for (const style of [
  'dashed',
  'dotted',
  'double',
  'none',
  'hidden',
  'groove',
  'ridge',
  'inset',
  'outset',
]) {
  test(`border source ratios withhold unsupported ${style} geometry independently per side`, async () => {
    const measure = await borderRatioFixture();
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const { borders, exterior } = measure({ styles: { [side]: style } });
      for (const edge of exterior) {
        if (edge.side === side) {
          assert.equal(edge.innerBorderVsBackground, null);
          assert.equal(edge.opaqueBorderVsPixel, null);
          assert.equal(borders[side].style, style);
          assert.ok(borders[side].limits.includes('unsupported-border-style'));
        } else {
          assert.equal(edge.innerBorderVsBackground, 21);
          assert.equal(edge.opaqueBorderVsPixel, 21);
          assert.equal(borders[edge.side].style, 'solid');
          assert.deepEqual(borders[edge.side].limits, []);
        }
        assert.equal(edge.opaqueFillVsPixel, 1);
      }
    }
  });
}

test('border source ratios retain solid low/high contrasts and existing withholding guards', async () => {
  const measure = await borderRatioFixture();
  for (const edge of measure().exterior) {
    assert.equal(edge.innerBorderVsBackground, 21);
    assert.equal(edge.opaqueBorderVsPixel, 21);
  }
  for (const edge of measure({ color: [255, 255, 255, 255] }).exterior) {
    assert.equal(edge.innerBorderVsBackground, 1);
    assert.equal(edge.opaqueBorderVsPixel, 1);
  }
  for (const options of [
    { width: 0 },
    { alpha: 0.999 },
    { color: null },
    { inactive: true },
    { inkUnmodified: false },
  ]) {
    for (const edge of measure(options).exterior) {
      assert.equal(edge.innerBorderVsBackground, null);
      assert.equal(edge.opaqueBorderVsPixel, null);
      assert.equal(
        edge.opaqueFillVsPixel,
        options.inactive || options.inkUnmodified === false ? null : 1
      );
    }
  }
});

test('browser-side Focus diagnostics run without Node transpiler helpers', async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const compiled = await transform(source, {
    loader: 'ts',
    format: 'iife',
    globalName: 'puiContrastProbe',
    keepNames: false,
  });
  const sandbox = { document: { activeElement: null } };
  vm.runInNewContext(compiled.code, sandbox);
  const center = { entries: new Map(), activeScopes: [] };
  const result = sandbox.puiContrastProbe.readContrastFocusDiagnostics(center, 'fixture-source');
  assert.equal(result.entryCount, 0);
  assert.equal(result.source, 'fixture-source');
  assert.match(result.boundary, /separate module identity/);
  assert.equal(center.entries.size, 0);
  assert.equal(center.activeScopes.length, 0);
});

// Synthetic geometry and computed styles calibrate the actual serialized browser
// function. They do not establish native CSS rendering or hit testing.
const targetObservationFixture = async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const compiled = await transform(source, {
    loader: 'ts',
    format: 'iife',
    globalName: 'puiContrastProbe',
    keepNames: false,
  });
  const style = {
    visibility: 'visible',
    display: 'block',
    contentVisibility: 'visible',
    opacity: '1',
    mixBlendMode: 'normal',
    backgroundColor: '#5294ff',
    color: '#000',
    filter: 'none',
    backdropFilter: 'none',
    clip: 'auto',
    clipPath: 'none',
    maskImage: 'none',
    perspective: 'none',
    transformStyle: 'flat',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
    contain: 'none',
    overflowX: 'visible',
    overflowY: 'visible',
    boxShadow: 'none',
  };
  const bounds = { x: 10, y: 10, left: 10, top: 10, right: 50, bottom: 40, width: 40, height: 30 };
  const element = {
    parentElement: null,
    assignedSlot: null,
    textContent: 'Native-state fixture',
    isConnected: true,
    getRootNode: () => ({}),
    getClientRects: () => [bounds],
    getBoundingClientRect: () => bounds,
    getAttribute: () => null,
    matches: () => true,
  };
  const ancestor = { ...element, textContent: '' };
  const ancestorStyle = { ...style };
  element.parentElement = ancestor;
  const sandbox = {
    document: {
      activeElement: element,
      createElement: () => ({ getContext: () => ({ fillStyle: '' }) }),
    },
    CSS: { supports: () => true },
    innerWidth: 800,
    innerHeight: 600,
    ShadowRoot: class {},
    getComputedStyle: (current) => (current === element ? style : ancestorStyle),
  };
  vm.runInNewContext(compiled.code, sandbox);
  const observe = () => sandbox.puiContrastProbe.readContrastTargetObservation(element);
  const observePair = (held = true) =>
    sandbox.puiContrastProbe.readContrastPointerPair(
      element,
      { fill: '#5294ff', foreground: '#000' },
      held
    );
  return { style, ancestorStyle, element, observe, observePair };
};

test('shared interactive target predicate rejects non-painted boxes without losing native state facts', async () => {
  const { style, element, observe } = await targetObservationFixture();
  assert.equal(observe().achieved, true);
  // The old bounds-only predicate accepts this fixture. The new predicate must
  // reject it for paint, not merely because native interaction flags vanished.
  style.opacity = '0';
  assert.equal(
    element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
    true
  );
  const transparent = observe();
  assert.equal(transparent.achieved, false);
  assert.equal(transparent.focused, true);
  assert.equal(transparent.hovered, true);
  assert.equal(transparent.nativeActive, true);
  style.opacity = '1';
  style.clipPath = 'inset(100%)';
  assert.equal(observe().achieved, false);
  assert.equal(observe().visibility.classification, 'unsupported');
  style.clipPath = 'none';
  assert.equal(observe().achieved, true);
});

for (const placement of ['target', 'ancestor']) {
  for (const [property, value] of [
    ['filter', 'opacity(0)'],
    ['filter', 'blur(2px)'],
    ['backdropFilter', 'blur(2px)'],
  ]) {
    test(`shared target predicate rejects ${placement} ${property}: ${value}`, async () => {
      const { style, ancestorStyle, element, observe } = await targetObservationFixture();
      assert.equal(observe().achieved, true);
      const filteredStyle = placement === 'target' ? style : ancestorStyle;
      filteredStyle[property] = value;
      // Only the filter changes. Opacity, nonempty geometry and native-state
      // facts must not let unsupported paint count as an achieved target.
      assert.equal(style.opacity, '1');
      assert.equal(ancestorStyle.opacity, '1');
      assert.equal(element.getBoundingClientRect().width > 0, true);
      const filtered = observe();
      assert.equal(filtered.achieved, false);
      assert.equal(filtered.visibility.classification, 'unsupported');
      assert.ok(filtered.visibility.limits.includes('unsupported-filter-or-backdrop-filter'));
      assert.equal(filtered.focused, true);
      assert.equal(filtered.hovered, true);
      assert.equal(filtered.nativeActive, true);
      filteredStyle[property] = 'none';
      assert.equal(observe().achieved, true);
      assert.equal(observe().visibility.classification, 'source-model-visible');
    });
  }
}

for (const placement of ['target', 'ancestor']) {
  for (const [property, value, normal, limit] of [
    ['opacity', '0.5', '1', 'ancestor-or-target-opacity'],
    ['mixBlendMode', 'multiply', 'normal', 'blend-mode'],
  ]) {
    test(`pointer pair rejects ${placement} ${property} without redefining visibility`, async () => {
      const { style, ancestorStyle, observe, observePair } = await targetObservationFixture();
      assert.equal(observePair().achieved, true);
      const changedStyle = placement === 'target' ? style : ancestorStyle;
      changedStyle[property] = value;
      // Synthetic CSSOM injection: expected tokens and native-state flags stay
      // fixed, while the actual serialized pair predicate must reject paint.
      assert.equal(observe().achieved, true);
      const changed = observePair();
      assert.equal(changed.achieved, false);
      assert.equal(changed.hovered, true);
      assert.equal(changed.nativeActive, true);
      assert.equal(changed.fill, '#5294ff');
      assert.equal(changed.foreground, '#000');
      assert.ok(changed.paintLimits.includes(limit));
      changedStyle[property] = normal;
      assert.equal(observePair().achieved, true);
      assert.deepEqual(Array.from(observePair().paintLimits), []);
    });
  }
}
