import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { runS4PaintJourney } from './shadow-s4-paint-browser.mjs';

function fixture({ failure, detach = async () => {}, deferCleanup = false } = {}) {
  const markers = [];
  const observers = [];
  const window = {};
  const document = {
    body: {},
    createElement: () => ({
      dataset: {},
      style: {},
      setAttribute() {},
      remove() {
        markers.splice(markers.indexOf(this), 1);
      },
    }),
    querySelectorAll(selector) {
      if (selector === '[data-s4-part=content]')
        return [{ append: (marker) => markers.push(marker) }];
      const token = selector.match(/data-s4-paint-marker="([^"]+)"/)?.[1];
      return markers.filter((marker) => marker.dataset.s4PaintMarker === token);
    },
  };
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  // Model the browser's window/global identity, not native DOM or timing.
  Object.assign(window, { window, document, MutationObserver, Date });
  const context = vm.createContext(window);
  const evaluate = (fn, argument) => {
    window.argument = argument;
    return vm.runInContext(`(${fn.toString()})(argument)`, context);
  };
  let evaluations = 0;
  let pendingCleanup;
  let detachCalls = 0;
  const cdp = {
    on() {},
    off() {},
    send: async () => {},
    detach: () => {
      detachCalls++;
      return detach();
    },
  };
  const page = {
    context: () => ({ newCDPSession: async () => cdp }),
    locator: () => ({
      waitFor: async () => {},
      click: async () => {
        throw failure;
      },
    }),
    evaluate: async (fn, argument) => {
      evaluations++;
      if (deferCleanup && evaluations === 2)
        return await new Promise((resolve) => {
          pendingCleanup = () => resolve(evaluate(fn, argument));
        });
      return evaluate(fn, argument);
    },
  };
  return {
    page,
    window,
    markers,
    observers,
    detachCalls: () => detachCalls,
    finishCleanup: () => pendingCleanup(),
  };
}

test('keeps the original rejection when detach also rejects', async () => {
  const failure = new Error('original click failure');
  const cleanup = new Error('detach failed');
  const f = fixture({
    failure,
    detach: async () => {
      throw cleanup;
    },
  });
  await assert.rejects(runS4PaintJourney(f.page), (error) => error === failure);
  assert.equal(f.detachCalls(), 1);
  assert.equal(f.markers.length, 0);
  assert.equal(f.observers[0].disconnected, true);
});

for (const failure of [0, undefined]) {
  test(`bounds pending detach without replacing throw ${String(failure)}`, async () => {
    const f = fixture({ failure, detach: () => new Promise(() => {}) });
    await assert.rejects(runS4PaintJourney(f.page), (error) => error === failure);
    assert.equal(f.detachCalls(), 1);
    assert.equal(f.markers.length, 0);
    assert.equal(f.observers[0].disconnected, true);
  });
}

test('late DOM cleanup releases only its original owner', async () => {
  const failure = new Error('original click failure');
  const f = fixture({ failure, deferCleanup: true });
  await assert.rejects(runS4PaintJourney(f.page), (error) => error === failure);
  const previous = f.window.__s4Paint;
  const next = {
    ownerToken: 'next',
    events: [],
    observer: {
      disconnect() {
        assert.fail('new owner');
      },
    },
  };
  const marker = { dataset: { s4PaintMarker: 'next' } };
  f.window.__s4Paint = next;
  f.markers.push(marker);
  f.observers[0].callback([
    { target: { matches: () => true, dataset: { s4Profile: 'old' }, hasAttribute: () => false } },
  ]);
  assert.equal(previous.events.length, 1);
  assert.equal(next.events.length, 0);
  f.finishCleanup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.window.__s4Paint, next);
  assert.deepEqual(f.markers, [marker]);
  assert.equal(f.observers[0].disconnected, true);
});

test('does not turn a cleanup rejection into success without an original failure', async () => {
  const cleanup = new Error('detach failed');
  const f = fixture({
    detach: async () => {
      throw cleanup;
    },
  });
  await assert.rejects(runS4PaintJourney(f.page, { profiles: [] }), (error) => error === cleanup);
  assert.equal(f.detachCalls(), 1);
  assert.equal(f.markers.length, 0);
});
