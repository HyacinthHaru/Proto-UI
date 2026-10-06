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
    'rectangularPerimeter',
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
    borderImageSource = 'none',
    width = 4,
    alpha = 1,
    inactive = false,
    inkUnmodified = true,
    rectangularPerimeter = true,
    color = [0, 0, 0, 255],
  } = {}) => {
    const ink = () => ({ rgba: color, alpha, limits: [] });
    const borders = readBorders(
      {
        borderImageSource,
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
      rectangularPerimeter,
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
    { rectangularPerimeter: false },
  ]) {
    for (const edge of measure(options).exterior) {
      assert.equal(edge.innerBorderVsBackground, null);
      assert.equal(edge.opaqueBorderVsPixel, null);
      assert.equal(
        edge.opaqueFillVsPixel,
        options.inactive ||
          options.inkUnmodified === false ||
          options.rectangularPerimeter === false
          ? null
          : 1
      );
    }
  }
});

test('border images withhold only border metrics while retaining independent fill evidence', async () => {
  const measure = await borderRatioFixture();
  for (const borderImageSource of [
    'linear-gradient(white, white)',
    'url("data:image/svg+xml,<svg/>")',
  ]) {
    const result = measure({ borderImageSource });
    for (const edge of result.exterior) {
      assert.equal(edge.innerBorderVsBackground, null);
      assert.equal(edge.opaqueBorderVsPixel, null);
      assert.equal(edge.opaqueFillVsPixel, 1);
      assert.ok(result.borders[edge.side].limits.includes('unsupported-border-image'));
    }
  }
});

test('shadow source metrics withhold unsupported receiving sides without rejecting covered negative offsets', async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const start = source.indexOf('const shadowParts: string[] = [];');
  const end = source.indexOf('      return {\n        prototype:', start);
  assert.ok(start >= 0 && end > start);
  const compiled = await transform(`${source.slice(start, end)}; return shadows;`, {
    loader: 'ts',
  });
  const measure = new Function(
    'style',
    'rect',
    'measurablePerimeter',
    'rectangularPerimeter',
    'inkUnmodified',
    'paint',
    'sample',
    'contrast',
    'backdrop',
    'visibility',
    'perimeterLimits',
    compiled.code
  );
  const read = (x, y, spread, rectangular = true) =>
    measure(
      { boxShadow: `rgb(0, 0, 0) ${x}px ${y}px 0px ${spread}px` },
      { x: 40, y: 40, right: 140, bottom: 80, width: 100, height: 40 },
      true,
      rectangular,
      true,
      () => ({ rgba: [0, 0, 0, 255], alpha: 1, limits: [] }),
      (x, y) => ({ x, y, rgb: [255, 255, 255] }),
      () => 21,
      { rgba: [255, 255, 255, 255] },
      { limits: [] },
      rectangular ? [] : ['unsupported-rounded-perimeter']
    )[0];
  for (const args of [
    [0, 0, 0],
    [-8, -6, 0],
    [60, 60, -21],
  ]) {
    assert.deepEqual(read(...args).receiving, [
      { side: 'right', point: null, ratio: null },
      { side: 'bottom', point: null, ratio: null },
    ]);
  }
  assert.deepEqual(read(-2, -3, 8).receiving, [
    { side: 'right', point: { x: 147, y: 57, rgb: [255, 255, 255] }, ratio: 21 },
    { side: 'bottom', point: { x: 88, y: 86, rgb: [255, 255, 255] }, ratio: 21 },
  ]);
  assert.deepEqual(read(-8, 6, 0).receiving[0], { side: 'right', point: null, ratio: null });
  assert.equal(read(-8, 6, 0).receiving[1].ratio, 21);
  assert.deepEqual(read(8, 6, 0, false).receiving, []);
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
    backgroundImage: 'none',
    backgroundClip: 'border-box',
    color: '#000',
    webkitTextFillColor: '#000',
    webkitTextStrokeWidth: '0px',
    textShadow: 'none',
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
    zoom: '1',
    contain: 'none',
    overflowX: 'visible',
    overflowY: 'visible',
    borderTopLeftRadius: '0px',
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderBottomLeftRadius: '0px',
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
  const ancestor = {
    ...element,
    textContent: '',
    clientLeft: 0,
    clientTop: 0,
    clientWidth: 40,
    clientHeight: 30,
  };
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

for (const overflow of ['hidden', 'clip', 'auto', 'scroll']) {
  test(`shared target acceptance withholds rounded ${overflow} clipping without inventing hidden bounds`, async () => {
    const { ancestorStyle, observe } = await targetObservationFixture();
    ancestorStyle.overflowX = overflow;
    ancestorStyle.overflowY = overflow;
    assert.equal(observe().achieved, true); // Square clipping control.
    ancestorStyle.borderTopLeftRadius = '50%';
    const rounded = observe();
    assert.equal(rounded.achieved, false);
    assert.equal(rounded.visibility.visible, true); // Intersecting bounds remain evidence.
    assert.equal(rounded.visibility.classification, 'unsupported');
    assert.ok(rounded.visibility.limits.includes('unsupported-rounded-overflow-clip'));
    ancestorStyle.borderTopLeftRadius = '5px';
    const center = {
      x: 20,
      y: 20,
      left: 20,
      top: 20,
      right: 30,
      bottom: 30,
      width: 10,
      height: 10,
    };
    // Proof applies only when the entire target lies in the unaffected rectangle.
    const fixture = await targetObservationFixture();
    fixture.ancestorStyle.overflowX = fixture.ancestorStyle.overflowY = overflow;
    fixture.ancestorStyle.borderTopLeftRadius = '5px';
    fixture.element.getClientRects = () => [center];
    fixture.element.getBoundingClientRect = () => center;
    assert.equal(fixture.observe().achieved, true);
    fixture.ancestorStyle.zoom = '2';
    assert.equal(fixture.observe().achieved, false);
    assert.ok(fixture.observe().visibility.limits.includes('unsupported-zoomed-paint'));
    ancestorStyle.overflowX = ancestorStyle.overflowY = 'visible';
    assert.equal(observe().achieved, true); // Radius alone is not clipping.
  });
}

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

for (const [property, value, normal, limit] of [
  ['backgroundImage', 'linear-gradient(white, white)', 'none', 'unsupported-background-image'],
  ['webkitTextFillColor', '#fff', '#000', 'unsupported-text-fill-color'],
  ['textShadow', 'white 0px 0px 3px', 'none', 'unsupported-text-shadow'],
  ['webkitTextStrokeWidth', '2px', '0px', 'unsupported-text-stroke'],
  ['boxShadow', 'white 0px 0px 0px 100px inset', 'none', 'unsupported-inset-shadow'],
  ['backgroundClip', 'text', 'border-box', 'unsupported-background-clip'],
]) {
  test(`pointer pair rejects alternate ${property} while tokens and native facts survive`, async () => {
    const { style, observe, observePair } = await targetObservationFixture();
    assert.equal(observePair().achieved, true);
    style[property] = value;
    assert.equal(observe().achieved, true);
    const changed = observePair();
    assert.equal(changed.achieved, false);
    assert.equal(changed.hovered, true);
    assert.equal(changed.nativeActive, true);
    assert.equal(changed.fill, changed.expectedFill);
    assert.equal(changed.foreground, changed.expectedForeground);
    assert.ok(changed.paintLimits.includes(limit));
    style[property] = normal;
    assert.equal(observePair().achieved, true);
  });
}

test('pointer pair keeps an opaque target over unrelated ancestor image and outer shadow', async () => {
  const { style, ancestorStyle, observePair } = await targetObservationFixture();
  ancestorStyle.backgroundImage = 'linear-gradient(white, white)';
  ancestorStyle.boxShadow = 'white 0px 0px 0px 100px inset';
  style.boxShadow = 'black 4px 4px 0px 0px';
  assert.equal(observePair().achieved, true);
});
