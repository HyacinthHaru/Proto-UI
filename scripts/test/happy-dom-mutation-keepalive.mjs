import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Repair only happy-dom 15.11.7's prematurely collected internal observer
 * forwarding closures. Notifications, records, filters and scheduling remain
 * the installed implementation. Never install this in a real browser.
 */
export function retainHappyDomMutationCallbacks(view) {
  const version = require('happy-dom/package.json').version;
  if (version !== '15.11.7' || !view.happyDOM)
    throw new Error(`Mutation callback keepalive is only for happy-dom 15.11.7, got ${version}`);
  const prototype = view.MutationObserver.prototype;
  const observe = prototype.observe;
  const disconnect = prototype.disconnect;
  const retained = new Map();
  prototype.observe = function (target, options) {
    const key = Object.getOwnPropertySymbols(target).find(
      (symbol) => symbol.description === 'mutationListeners'
    );
    if (!key || !Array.isArray(target[key]))
      throw new Error('Pinned happy-dom mutation listener shape changed');
    const before = new Set(target[key]);
    const result = observe.call(this, target, options);
    const callbacks = retained.get(this) ?? new Set();
    for (const listener of target[key]) {
      if (!before.has(listener)) {
        const callback = listener.callback.deref();
        if (!callback) throw new Error('New observer forwarding callback is already unavailable');
        callbacks.add(callback);
      }
    }
    retained.set(this, callbacks);
    return result;
  };
  prototype.disconnect = function () {
    try {
      return disconnect.call(this);
    } finally {
      retained.delete(this);
    }
  };
  return {
    retainedCount: () => [...retained.values()].reduce((sum, values) => sum + values.size, 0),
    restore() {
      for (const observer of retained.keys()) disconnect.call(observer);
      retained.clear();
      prototype.observe = observe;
      prototype.disconnect = disconnect;
    },
  };
}
