import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PUI_WWW_PACKAGE);
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const rows = [];
const failures = [];
try {
  const page = await browser.newPage();
  await page.setContent('<main></main>');
  await page.addScriptTag({ path: process.argv[2] });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () =>
    Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value])
    );
  for (const mode of [
    'empty',
    'forward',
    'backward',
    'crossing',
    'registered-forward',
    'registered-backward',
    'input-forward',
    'input-backward',
    'textarea-forward',
    'textarea-backward',
  ])
    for (const variant of ['legacy', 'candidate']) {
      const before = await page.evaluate(
        ({ mode, variant }) => {
          const selection = document.getSelection();
          selection.removeAllRanges();
          const from = document.createElement('div'),
            destination = document.createElement('div');
          const source = document.createElement('span'),
            text = document.createTextNode('Retained authored source');
          const input = document.createElement(mode.startsWith('textarea') ? 'textarea' : 'input');
          input.value = 'Uncontrolled input';
          source.append(text, input);
          from.append(source);
          const outside = document.createTextNode('Other owner text');
          const marker = document.createElement('div');
          marker.textContent = 'Layout witness';
          marker.style.width = '100px';
          document.body.replaceChildren(from, outside, destination, marker);
          if (mode.startsWith('input-') || mode.startsWith('textarea-')) {
            input.focus();
            input.setSelectionRange(3, 8, mode.endsWith('backward') ? 'backward' : 'forward');
          }
          if (mode === 'forward' || mode === 'backward')
            selection.setBaseAndExtent(
              text,
              mode === 'forward' ? 2 : 10,
              text,
              mode === 'forward' ? 10 : 2
            );
          if (mode === 'crossing') selection.setBaseAndExtent(text, 2, outside, 5);
          if (mode.startsWith('registered')) {
            window.nativeLease[
              variant === 'legacy' ? 'control' : 'candidate'
            ].registerNativeContentContainer(from, [source]);
            selection.setBaseAndExtent(
              from,
              mode.endsWith('forward') ? 0 : 1,
              from,
              mode.endsWith('forward') ? 1 : 0
            );
          }
          if (mode === 'no-api') destination.moveBefore = undefined;
          window.__atomicFixture = { from, destination, source, text, outside, input };
          const old = Document.prototype.getSelection;
          const native = Element.prototype.moveBefore;
          const count = (window.__nativeLeaseCounts = { selection: 0, atomic: 0, track: false });
          Document.prototype.getSelection = function () {
            if (count.track) count.selection++;
            return old.call(this);
          };
          if (native)
            Element.prototype.moveBefore = function (...args) {
              if (count.track) count.atomic++;
              return Reflect.apply(native, this, args);
            };
          window.__restoreNative = () => {
            Document.prototype.getSelection = old;
            if (native) Element.prototype.moveBefore = native;
          };
          // Resolve setup layout before the following deliberate dirty write.
          marker.getBoundingClientRect();
          marker.style.width = '101px';
          return { mode, hasNative: typeof native === 'function' };
        },
        { mode, variant }
      );
      const statsBefore = await metric();
      const operation = await page.evaluate(
        ({ variant }) => {
          const { source, destination } = window.__atomicFixture,
            c = window.__nativeLeaseCounts;
          c.track = true;
          try {
            window.nativeLease[
              variant === 'legacy' ? 'control' : 'candidate'
            ].withNativeContentLease(source, () => destination.insertBefore(source, null));
          } finally {
            c.track = false;
          }
          return { selectionReads: c.selection, nativeMoves: c.atomic };
        },
        { variant }
      );
      const statsAfter = await metric();
      const result = await page.evaluate(
        ({ mode }) => {
          const { source, text, outside, input, destination } = window.__atomicFixture;
          const sel = document.getSelection();
          const name = (node) =>
            node === text
              ? 'text'
              : node === outside
                ? 'outside'
                : node === destination
                  ? 'destination'
                  : (node?.nodeName ?? null);
          const out = {
            sourceRetained: destination.firstChild === source,
            activeInput: document.activeElement === input,
            inputValue: input.value,
            selectionStart: input.selectionStart,
            selectionEnd: input.selectionEnd,
            selectionDirection: input.selectionDirection,
            anchor: name(sel.anchorNode),
            anchorOffset: sel.anchorOffset,
            focus: name(sel.focusNode),
            focusOffset: sel.focusOffset,
          };
          window.__restoreNative();
          return out;
        },
        { mode }
      );
      const row = {
        mode,
        variant,
        before,
        operation,
        layoutDelta: statsAfter.LayoutCount - statsBefore.LayoutCount,
        result,
      };
      rows.push(row);
      console.info(
        mode,
        variant,
        JSON.stringify({ operation, layoutDelta: row.layoutDelta, result })
      );
      try {
        assert(result.sourceRetained);
        if (mode.startsWith('input-') || mode.startsWith('textarea-')) {
          assert(result.activeInput && result.inputValue === 'Uncontrolled input');
          assert.deepEqual(
            [result.selectionStart, result.selectionEnd, result.selectionDirection],
            [3, 8, mode.endsWith('backward') ? 'backward' : 'forward']
          );
        }
        if (mode === 'forward' || mode === 'backward')
          assert.deepEqual(
            [result.anchor, result.anchorOffset, result.focus, result.focusOffset],
            ['text', mode === 'forward' ? 2 : 10, 'text', mode === 'forward' ? 10 : 2]
          );
        if (mode === 'crossing')
          assert.deepEqual(
            [result.anchor, result.anchorOffset, result.focus, result.focusOffset],
            ['text', 2, 'outside', 5]
          );
        if (mode.startsWith('registered'))
          assert.deepEqual(
            [result.anchor, result.anchorOffset, result.focus, result.focusOffset],
            [
              'destination',
              mode.endsWith('forward') ? 0 : 1,
              'destination',
              mode.endsWith('forward') ? 1 : 0,
            ]
          );
      } catch (error) {
        failures.push({ mode, variant, message: error.message });
      }
    }
  await writeFile(
    process.argv[3],
    JSON.stringify({ browser: browser.version(), rows, failures }, null, 2) + '\n'
  );
  if (failures.some((row) => row.variant === 'candidate')) {
    console.info('Retained failures', JSON.stringify(failures));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
