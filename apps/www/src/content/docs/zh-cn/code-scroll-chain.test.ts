// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import vm from 'node:vm';
import ts from 'typescript';
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
    'before.scrollHeight - before.clientHeight).toBeGreaterThan(internalDelta)',
    'const internalDelta = 80',
    'inside.scrollTop).toBeLessThan(inside.scrollHeight - inside.clientHeight)',
    "entry.outcome = 'not-reproduced'",
    "if (entry.outcome !== 'not-reproduced') entry.passed = true",
    "entry.acceptance = false",
    'expect(hit.belongsToSelectedPre).toBe(true)',
    'item.documentTop > 1000',
    'expect(before.scrollY).toBeGreaterThan(500)',
    'inside.scrollY).toBe(before.scrollY)',
    'boundary.scrollHeight - boundary.clientHeight',
    'toBeGreaterThan(boundary.scrollY)',
    'page.mouse.wheel(80, 0)',
    'after.scrollX).toBe(horizontal.scrollX)',
    'entry.failure = String(error)',
    'throw error',
    'primaryFailure = error',
    'if (primaryFailure === undefined) throw new Error',
    'entry.evidenceErrors = evidenceErrors',
    "sha256: createHash('sha256').update(image).digest('hex')",
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

it('retains dispatch-time identity snapshots without replacing the original wheel oracle', () => {
  const required = [
    'const eventIds = new WeakMap<Event, number>()', 'eventId: eventIds.get(event)',
    'eventTimeStamp: event.timeStamp', 'observedAt: performance.now()',
    "trace(event, 'capture')", "trace(event, 'bubble')", 'event.composedPath()',
    'selectedInPath:', 'selectedContainsTarget:', 'selectedConnected:', 'selectedScrollTop:',
    'entry.inputReadings.push', 'document.elementFromPoint(args.point.x, args.point.y)',
    'wheel.preScrollTop === 0', 'entry.eventTrace = await page.evaluate',
  ];
  const check = (source: string) => { for (const token of required) expect(source).toContain(token); };
  check(browser);
  for (const token of required) expect(() => check(browser.replaceAll(token, ''))).toThrow();
});
it('keeps retargeted and missing targets distinct from the selected PRE in the actual observer', () => {
  const start = browser.indexOf('    const eventIds =');
  const end = browser.indexOf("    addEventListener('wheel', event => trace", start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const source = ts.transpileModule(browser.slice(start, end) + '\n globalThis.recordWheel = trace;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  class ElementFixture {
    tagName: string; isConnected = true; scrollTop = 0; children: ElementFixture[] = [];
    constructor(tag: string) { this.tagName = tag; }
    getAttribute() { return 'fixture'; }
    getBoundingClientRect() { return { toJSON: () => ({ top: 12 }) }; }
    contains(node: unknown) { return node === this || this.children.includes(node as ElementFixture); }
  }
  const selected = new ElementFixture('PRE'); const inner = new ElementFixture('SPAN');
  selected.children.push(inner); const retarget = new ElementFixture('WC-TEXT-ROOT');
  const window = { __selectedScrollPre: selected, __codeScrollEventTrace: [] as any[], __scrollInputSequence: 0 };
  const state: any = { window, document: { elementFromPoint: () => inner }, Element: ElementFixture, Node: ElementFixture, scrollY: 777, performance: { now: () => 40 } };
  vm.runInNewContext(source, state);
  const nativePath = [inner, selected, window];
  const event = { target: retarget, composedPath: () => nativePath, timeStamp: 30, isTrusted: false, clientX: 4, clientY: 5, deltaX: 0, deltaY: -220, defaultPrevented: false };
  state.recordWheel(event, 'capture');
  state.scrollY = 557; state.recordWheel(event, 'bubble');
  const first = window.__codeScrollEventTrace[0]; const second = window.__codeScrollEventTrace[1];
  expect(first.target.tag).toBe('WC-TEXT-ROOT'); expect(first.selectedContainsTarget).toBe(false);
  expect(first.selectedInPath).toBe(true); expect(first.trusted).toBe(false);
  expect(first.scrollY).toBe(777); expect(second.scrollY).toBe(557);
  expect(first.eventId).toBe(second.eventId); expect(first.eventTimeStamp).toBe(second.eventTimeStamp);
  nativePath.length = 0; expect(first.composedPath).toHaveLength(3);
  state.recordWheel({ ...event, target: null, composedPath: () => [] }, 'capture');
  const missing = window.__codeScrollEventTrace[2];
  expect(missing.selectedContainsTarget).toBe(false); expect(missing.selectedInPath).toBe(false);
  expect(missing.eventId).toBeGreaterThan(first.eventId);
});

it('keeps the non-passive scheduling control separate from passive product acceptance', () => {
  const start = browser.indexOf("it('chains reverse wheel");
  const split = browser.indexOf("it('diagnoses wheel scheduling", start);
  const end = browser.indexOf('for (const width of [1440, 320])', split);
  expect(start).toBeGreaterThan(0); expect(split).toBeGreaterThan(start); expect(end).toBeGreaterThan(split);
  const original = browser.slice(start, split), control = browser.slice(split, end);
  expect(original).not.toContain('passive: false');
  for (const body of [original, control]) for (const token of [
    'i < 14', 'page.mouse.wheel(0, -220)', 'before.scrollY - 500',
    'wheel.preScrollTop === 0', 'expect(hit.belongsToSelectedPre).toBe(true)',
    'requestedDeltaX: 0, requestedDeltaY: -220', 'requestedClientX: args.point.x',
    'requestedClientY: args.point.y', 'selectedIsObservedPre:', 'selectedPreIndex:',
  ]) expect(body).toContain(token);
  const required = [
    "entry.kind = 'non-passive-scheduling-control'", 'entry.acceptance = false',
    "element.addEventListener('wheel'", '{ passive: false }',
    'row.selectedInPath && row.targetInsideSelected && row.scrollY === before.scrollY',
    'row.preScrollTop === 0 && row.defaultPrevented === false',
  ];
  const check = (source: string) => { for (const token of required) expect(source).toContain(token); };
  check(control);
  for (const token of required) expect(() => check(control.replaceAll(token, ''))).toThrow();
  expect(control).not.toMatch(/\.(?:preventDefault|stopPropagation|stopImmediatePropagation)\s*\(/);
  expect(300 + 5 * 45 + 10).toBeLessThan(560);
});

it('replaces no product behavior while retaining the late-target mismatch as an explicit diagnostic', () => {
  const required = [
    "entry.lateTargetDiagnostic = { kind: 'observer-diagnostic', acceptance: false",
    'expected: true, actual:', 'entry.lateTargetDiagnostic.failure = String(error)',
    'wheel.preScrollTop === 0)).toBe(true)', 'short-passive-observer-diagnostic.png',
    'await verifyPassiveCausality(page, pre, entry)',
  ];
  const check = (source: string) => { for (const token of required) expect(source).toContain(token); };
  check(browser);
  for (const token of required) expect(() => check(browser.replaceAll(token, ''))).toThrow();
});
it('requires contain negative control, restored product auto, exact input identity and independent zero-vs-positive movement', () => {
  const start = browser.indexOf('async function verifyPassiveCausality(');
  const end = browser.indexOf("it('chains reverse wheel", start);
  const helper = browser.slice(start, end);
  const required = [
    "['contain-negative', 'product-auto']", "style.setProperty('overscroll-behavior-y', 'contain', 'important')",
    'else await restore()', 'expect(original.samePre).toBe(true)',
    'expect(input.samePre && input.connected).toBe(true)',
    "if (i === 0 || stageName === 'contain-negative') expect(input.hitInsidePre).toBe(true)",
    "expect(input.computedY).toBe(stageName === 'contain-negative' ? 'contain' : 'auto')",
    'initial.scrollHeight).toBe(initial.clientHeight)', 'expect(input.preScrollTop).toBe(0)',
    "if (stageName === 'contain-negative') expect(measured.scrollY).toBe(initial.scrollY)",
    "if (stageName === 'contain-negative') expect(final.scrollY).toBe(initial.scrollY)",
    '.toBeLessThan(initial.scrollY - 500)', 'expect(stage.inputs).toHaveLength(14)',
    'stage.preDeliveryFinal = await observe', 'stage.deliveryEndAt = await page.evaluate', '\${stageName}-post-delivery-final',
    'stage.final = final', 'else expect(final.scrollY).toBeLessThan(initial.scrollY - 500)',
    'expect(stage.events.length).toBeGreaterThan(0)', 'expect(event.trusted).toBe(true)',
    'expect(event.deltaX).toBe(0)', 'expect(event.deltaY).toBeLessThan(0)', 'expect(event.deltaMode).toBe(0)',
    'expect(event.clientX).toBe(Math.floor(firstInput.requestedClientX))',
    'expect(event.clientY).toBe(Math.floor(firstInput.requestedClientY))',
    'expect(event.eventTimeStamp).toBeGreaterThanOrEqual(firstInput.observedAt)',
    'expect(event.eventTimeStamp).toBeLessThanOrEqual(stage.inputEndAt)',
    'expect(event.observedAt).toBeLessThanOrEqual(stage.deliveryEndAt)',
    'sum + event.deltaY, 0)', '.toBe(-220 * 14)',
    'expect(event.defaultPreventedAtObservation).toBe(false)',
    'expect(event.selectedInPath && event.selectedContainsTarget).toBe(true)',
    'expect(event.scrollY).toBe(initial.scrollY)',
    'expect(initial[key]).toBe(negative[key])',
    'expect(entry.causality.restored).toEqual(original)', 'if (primary) throw primary',
  ];
  const check = (source: string) => { for (const token of required) expect(source).toContain(token); };
  check(helper);
  for (const token of required) expect(() => check(helper.replaceAll(token, ''))).toThrow();
  expect(helper.indexOf('entry.causality.acceptance = true')).toBeGreaterThan(helper.indexOf('if (primary) throw primary'));
  const measuredLoop = helper.slice(helper.indexOf('for (let i = 0; i < 14; i++)'), helper.indexOf('stage.passed = true'));
  expect(measuredLoop).not.toMatch(/scrollIntoView|scrollTo\(|scrollBy\(|scrollTop\s*=|dispatchEvent|preventDefault|stopPropagation/);
  expect(browser.match(/}, 45_000\);/g)).toHaveLength(4); // three explicit cases and one two-width loop
});

it('correlates actual stage capture logic without assuming one DOM event per wheel command', () => {
  const source = ts.createSourceFile('probe.ts', browser, ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'captureStageWheelEvents');
  expect(declaration).toBeDefined();
  const js = ts.transpileModule(declaration!.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({});
  vm.runInContext(js + ';globalThis.collect = captureStageWheelEvents;', context);
  const collect = context.collect as (trace: any[], start: number, end: number) => any[];
  for (const [count, deltaY] of [[14, -220], [7, -440]]) {
    const trace = Array.from({ length: count }, (_, i) => ({ phase: 'capture', eventTimeStamp: 110 + i, deltaY }));
    trace.push({ phase: 'bubble', eventTimeStamp: 110, deltaY: -220 });
    trace.push({ phase: 'capture', eventTimeStamp: 99, deltaY: -220 });
    trace.push({ phase: 'capture', eventTimeStamp: 201, deltaY: -220 });
    const rows = collect(trace, 100, 200);
    expect(rows).toHaveLength(count);
    expect(rows.reduce((sum, row) => sum + row.deltaY, 0)).toBe(-3080);
    expect(collect(trace.slice(1), 100, 200).reduce((sum, row) => sum + row.deltaY, 0)).not.toBe(-3080);
  }
  expect(collect([{ phase: 'bubble', eventTimeStamp: 150, deltaY: -3080 }], 100, 200)).toHaveLength(0);
});


it('isolates every causal policy boundary with observed quiet, preserving final restoration on timeout', () => {
  const required = ['receipt.browserVersion = browser.version()', 'requiredQuietMs: 750',
    "await waitForWheelQuiet(page, entry, 'before-' + stageName)",
    "await waitForWheelQuiet(page, entry, 'before-final-restore')",
    'lastCaptureObservedAt: last?.observedAt', 'lastNativeTimeStamp: last?.eventTimeStamp',
    'captureCount: captures.length', 'record.samples.push(sample)',
    'expect(stable[key]).toBe(initial[key])'];
  const check = (input: string) => { for (const token of required) expect(input).toContain(token); };
  check(browser);
  for (const token of required) expect(() => check(browser.replaceAll(token, ''))).toThrow();
  const source = ts.createSourceFile('probe.ts', browser, ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'wheelQuietElapsed');
  expect(declaration).toBeDefined();
  const js = ts.transpileModule(declaration!.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({});
  vm.runInContext(js + ';globalThis.elapsed = wheelQuietElapsed;', context);
  const elapsed = context.elapsed as (sample: any, start: number) => number;
  expect(elapsed({ observedAt: 850, lastCaptureObservedAt: 50, lastNativeTimeStamp: 40 }, 100)).toBe(750);
  expect(elapsed({ observedAt: 850, lastCaptureObservedAt: 840, lastNativeTimeStamp: 830 }, 100)).toBe(10);
  for (let t = 100; t <= 2000; t += 50)
    expect(elapsed({ observedAt: t + 20, lastCaptureObservedAt: t, lastNativeTimeStamp: t - 2 }, 100)).toBeLessThan(750);
  expect(elapsed({ observedAt: 850, lastCaptureObservedAt: null, lastNativeTimeStamp: null }, 100)).toBe(750);
});
