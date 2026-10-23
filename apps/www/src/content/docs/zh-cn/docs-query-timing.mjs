// Bounded diagnostic for the pinned Playwright 1.58.2 in-process SDK.
// No browser, filesystem, or protocol operation is started by importing this file.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance as nodePerformance } from 'node:perf_hooks';
import { join } from 'node:path';

const ownerSlot = Symbol.for('proto-ui.private.docs-call-timing-owner.v1');
const css = '[data-docs-site-header] [data-adapter-select] [data-site-select-trigger]';
const expectedSelector = `${css} >> nth=0`;
const sha = (value) => createHash('sha256').update(value).digest('hex');

// Constructed from the original SDK function text at runtime, so Vite cannot
// rewrite a browser global into a captured Node import. The original evaluator's
// selector expression, callbackText, return object, and error are retained.
function decorateEvaluation(originalText, marker) {
  const signature =
    '(injected, { info, callbackText: callbackText2, taskData: taskData2, callId, root }) => {';
  const query =
    'const element = injected.querySelector(info.parsed, root || document, info.strict);';
  const value = 'value: callback(injected, element, taskData2)';
  if (
    !originalText.startsWith(signature) ||
    originalText.split(query).length !== 2 ||
    originalText.split(value).length !== 2
  )
    throw new Error('Pinned _callOnElementOnceMatches evaluator shape changed');
  const header = `
    const __rows = [];
    let __errors = 0;
    const __record = (stage, facts) => {
      try {
        if (__rows.length < 64) __rows.push({ stage, pageMs: globalThis.performance.now(), timeOrigin: globalThis.performance.timeOrigin, dateNow: Date.now(), ...facts });
      } catch { ++__errors; }
    };
    const __flush = () => {
      try { globalThis.console.debug(${JSON.stringify(marker)} + JSON.stringify({ ...__puiTiming, callId, rows: __rows, diagnosticErrors: __errors })); } catch {}
    };
    try {
  `;
  let text = originalText.replace(
    signature,
    signature.replace(' root }', ' root, __puiTiming }') + header
  );
  text = text.replace(
    query,
    `const element = (() => {
      __record('selector.enter');
      try {
        const selected = injected.querySelector(info.parsed, root || document, info.strict);
        __record('selector.exit', { found: !!selected });
        return selected;
      } catch (error) {
        __record('selector.throw');
        throw error;
      }
    })();`
  );
  text = text.replace(
    value,
    `value: (() => {
      // The pinned callback is exactly element.getAttribute(data.name). This
      // brackets that original invocation, not an instrumented C++ engine entry.
      let getterNative = null;
      try { getterNative = /\\[native code\\]/.test(Function.prototype.toString.call(element.getAttribute)); } catch { ++__errors; }
      __record('getter.enter', { getterNative });
      try {
        const result = callback(injected, element, taskData2);
        __record('getter.exit', { value: result });
        return result;
      } catch (error) {
        __record('getter.throw');
        throw error;
      }
    })()`
  );
  const end = text.lastIndexOf('}');
  text = text.slice(0, end) + '\n    } finally { __flush(); }\n' + text.slice(end);
  return { source: text, fn: Function(`return (${text});`)() };
}

/** @param {{ sdkRoot: string, cap?: number, selector?: string, attribute?: string }} options */
export function installDocsCallTimingObserver(
  page,
  { sdkRoot, cap = 512, selector = expectedSelector, attribute = 'role' }
) {
  const targetSelector = selector;
  const rows = [];
  const browserBatches = [];
  const errors = [];
  const restorers = [];
  const requests = new Map();
  const handles = new WeakSet();
  const contexts = new WeakSet();
  const storage = new AsyncLocalStorage();
  const ownerToken = randomUUID();
  const marker = `PUI_DOCS_CALL_TIMING:${ownerToken}:`;
  let dropped = 0;
  let browserDropped = 0;
  let available = false;
  let disposed = false;
  let verdict = null;
  let evaluatorGuardPasses = 0;
  let evaluatorGuardFailures = 0;
  let serverContext;
  let onConsole;
  let connection;
  let expectedEvaluatorSha;
  const sourceBindings = [];
  const clock = () => ({
    nodeMs: nodePerformance.now(),
    nodeTimeOrigin: nodePerformance.timeOrigin,
    nodeDateNow: Date.now(),
  });
  const record = (stage, facts = {}) => {
    try {
      if (rows.length < cap) rows.push({ stage, ...clock(), ...facts });
      else ++dropped;
    } catch {}
  };
  const diagnosticError = (stage, error) => {
    try {
      if (errors.length < 16) errors.push({ stage, message: String(error), ...clock() });
      else ++dropped;
    } catch {}
  };
  const tap = (promise, fulfilled, rejected) => {
    // Observe, but return the exact original Promise. No await is inserted into
    // the caller's original chain. Each tap does add one Promise reaction.
    try {
      promise.then(
        (value) => {
          try {
            fulfilled(value);
          } catch (error) {
            diagnosticError('tap', error);
          }
        },
        (error) => {
          try {
            rejected?.(error);
          } catch (other) {
            diagnosticError('tap-rejection', other);
          }
        }
      );
    } catch (error) {
      diagnosticError('tap-install', error);
    }
    return promise;
  };
  const replace = (object, key, create) => {
    const own = Object.getOwnPropertyDescriptor(object, key);
    const original = object[key];
    if (typeof original !== 'function') throw new Error(`Missing pinned method: ${key}`);
    const replacement = create(original);
    Object.defineProperty(
      object,
      key,
      own
        ? { ...own, value: replacement }
        : { configurable: true, writable: true, value: replacement }
    );
    restorers.push(() => {
      if (object[key] !== replacement) {
        diagnosticError('restore-ownership', key);
        return;
      }
      if (own) Object.defineProperty(object, key, own);
      else delete object[key];
    });
  };
  const target = (selector, name) => selector === targetSelector && name === attribute;
  const observeWait = (object, key, stage, facts, fulfilled) => {
    replace(
      object,
      key,
      (original) =>
        function () {
          const request = storage.getStore();
          if (!request?.callId || !requests.has(request.callId))
            return Reflect.apply(original, this, arguments);
          try {
            record(`${stage}.enter`, { callId: request.callId, ...facts?.(this, arguments) });
          } catch {
            diagnosticError(`${stage}.facts`, 'Diagnostic facts could not be recorded');
          }
          let promise;
          try {
            promise = Reflect.apply(original, this, arguments);
          } catch (error) {
            try {
              record(`${stage}.throw`, { callId: request.callId, error: String(error) });
            } catch {
              diagnosticError(`${stage}.throw-observation`, 'Thrown value could not be recorded');
            }
            throw error;
          }
          return tap(
            promise,
            (value) => {
              // This is the observed original Promise settlement, before any diagnostic
              // patching. A caller continuation can still run later on the same clock.
              record(`${stage}.fulfilled`, { callId: request.callId });
              if (fulfilled) {
                record(`${stage}.observer.enter`, { callId: request.callId });
                fulfilled(value);
                record(`${stage}.observer.exit`, { callId: request.callId });
              }
            },
            (error) => record(`${stage}.reject`, { callId: request.callId, error: String(error) })
          );
        }
    );
  };
  const patchContext = (context) => {
    if (!context || contexts.has(context)) return;
    contexts.add(context);
    observeWait(
      context,
      'rawEvaluateHandle',
      'driver.context.raw-evaluate-handle',
      (_context, args) => ({
        expressionCharacters: typeof args[0] === 'string' ? args[0].length : null,
      })
    );
    observeWait(context, 'injectedScript', 'driver.context.injected-script', (context) => ({
      world: context.world,
      cachedAtEntry: !!context._injectedScriptPromise,
    }));
  };
  const patchHandle = (handle) => {
    if (!handle || handles.has(handle)) return;
    handles.add(handle);
    replace(
      handle,
      'evaluate',
      (original) =>
        function (fn, arg) {
          const request = requests.get(arg?.callId);
          if (!request || typeof fn !== 'function' || arg?.taskData?.name !== attribute)
            return Reflect.apply(original, this, arguments);
          let decorated;
          try {
            const text = Function.prototype.toString.call(fn);
            if (sha(text) !== expectedEvaluatorSha)
              throw new Error('Evaluator bytes do not match the pinned source');
            const callback = String(arg.callbackText).replace(/\s+/g, ' ').trim();
            if (callback !== '(injected, element, data) => element.getAttribute(data.name)')
              throw new Error('Unexpected original getAttribute callback');
            decorated = decorateEvaluation(text, marker);
            ++evaluatorGuardPasses;
          } catch (error) {
            ++evaluatorGuardFailures;
            diagnosticError('evaluate-unavailable', error);
            return Reflect.apply(original, this, arguments);
          }
          const attempt = ++request.attempts;
          record('utility.evaluate.dispatch', {
            callId: arg.callId,
            attempt,
            contextId: this._context?.delegate?._contextId ?? null,
            evaluatorSha256: sha(decorated.source),
          });
          const promise = Reflect.apply(original, this, [
            decorated.fn,
            { ...arg, __puiTiming: { ownerToken, attempt } },
          ]);
          return tap(
            promise,
            (result) =>
              record('utility.evaluate.return', {
                callId: arg.callId,
                attempt,
                success: result?.success,
                value: result?.value,
              }),
            (error) =>
              record('utility.evaluate.reject', {
                callId: arg.callId,
                attempt,
                error: String(error),
              })
          );
        }
    );
  };

  try {
    if (JSON.parse(readFileSync(join(sdkRoot, 'package.json'), 'utf8')).version !== '1.58.2')
      throw new Error('Playwright version mismatch');
    for (const path of [
      'lib/inProcessFactory.js',
      'lib/client/connection.js',
      'lib/server/dispatchers/dispatcher.js',
      'lib/server/frames.js',
      'lib/server/frameSelectors.js',
      'lib/server/javascript.js',
      'lib/server/dom.js',
    ]) {
      const bytes = readFileSync(join(sdkRoot, path));
      sourceBindings.push({ path, sha256: sha(bytes) });
    }
    const framesSource = readFileSync(join(sdkRoot, 'lib/server/frames.js'), 'utf8');
    const start = framesSource.indexOf(
      '(injected, { info, callbackText: callbackText2, taskData: taskData2, callId, root }) => {'
    );
    const end = framesSource.indexOf(
      '}, { info: resolved.info, callbackText, taskData, callId:',
      start
    );
    if (start < 0 || end < 0) throw new Error('Pinned evaluator source not found');
    expectedEvaluatorSha = sha(framesSource.slice(start, end + 1));
    const clientFrame = page.mainFrame();
    connection = clientFrame._connection;
    if (connection[ownerSlot]) throw new Error('This connection already has a timing observer');
    const dispatcher = connection.toImpl?.(connection);
    const frame = connection.toImpl?.(clientFrame);
    if (!dispatcher || !frame?.selectors)
      throw new Error('Not the pinned in-process Playwright connection');
    connection[ownerSlot] = ownerToken;
    serverContext = frame._page.browserContext;
    onConsole = (message) => {
      try {
        if (message.page() !== frame._page) return;
        const text = message.text();
        if (!text.startsWith(marker)) return;
        const data = JSON.parse(text.slice(marker.length));
        if (data.ownerToken !== ownerToken || !requests.has(data.callId)) return;
        if (browserBatches.length < 64) browserBatches.push({ ...data, received: clock() });
        else ++browserDropped;
      } catch (error) {
        diagnosticError('console-transport', error);
      }
    };
    // The existing server-side ConsoleMessage is used. No page subscription,
    // CDP session, binding, evaluate, or new execution context is requested.
    serverContext.on('console', onConsole);
    replace(
      clientFrame,
      'getAttribute',
      (original) =>
        function (selector, name) {
          const scope = storage.getStore();
          if (!scope?.original || !target(selector, name))
            return Reflect.apply(original, this, arguments);
          const query = scope.query;
          const args = arguments;
          record('node.frame.getAttribute.enter', { query, selector, name });
          return tap(
            Reflect.apply(original, this, args),
            (value) => record('node.frame.getAttribute.return', { query, value }),
            (error) => record('node.frame.getAttribute.reject', { query, error: String(error) })
          );
        }
    );
    replace(
      connection,
      'onmessage',
      (original) =>
        function (message) {
          const scope = storage.getStore();
          if (
            scope?.original &&
            message.guid === clientFrame._guid &&
            message.method === 'getAttribute' &&
            target(message.params?.selector, message.params?.name)
          ) {
            const callId = `call@${message.id}`;
            const request = {
              callId,
              id: message.id,
              query: scope.query ?? null,
              attempts: 0,
              settled: false,
            };
            if (requests.size < 64) requests.set(callId, request);
            else ++dropped;
            record('node.protocol.send', { ...request });
          }
          return Reflect.apply(original, this, arguments);
        }
    );
    replace(
      dispatcher,
      'dispatch',
      (original) =>
        function (message) {
          const callId = `call@${message.id}`;
          const request = requests.get(callId);
          if (!request) return Reflect.apply(original, this, arguments);
          record('driver.receive', { callId, query: request.query });
          const args = arguments;
          return storage.run(request, () => Reflect.apply(original, this, args));
        }
    );
    replace(
      dispatcher,
      'onmessage',
      (original) =>
        function (message) {
          const request = requests.get(`call@${message.id}`);
          if (request)
            record('driver.response.send', {
              callId: request.callId,
              error: message.error ?? null,
            });
          return Reflect.apply(original, this, arguments);
        }
    );
    replace(
      connection,
      'dispatch',
      (original) =>
        function (message) {
          const request = requests.get(`call@${message.id}`);
          if (request) {
            request.settled = true;
            record('node.protocol.response', {
              callId: request.callId,
              error: message.error ?? null,
            });
          }
          return Reflect.apply(original, this, arguments);
        }
    );
    replace(
      frame,
      'getAttribute',
      (original) =>
        function (progress, selector, name) {
          if (!target(selector, name)) return Reflect.apply(original, this, arguments);
          const request = requests.get(progress.metadata.id);
          if (!request) return Reflect.apply(original, this, arguments);
          record('driver.getAttribute.enter', { callId: request.callId });
          const args = arguments;
          return storage.run(request, () =>
            tap(
              Reflect.apply(original, this, args),
              (value) => record('driver.getAttribute.return', { callId: request.callId, value }),
              (error) =>
                record('driver.getAttribute.reject', {
                  callId: request.callId,
                  error: String(error),
                })
            )
          );
        }
    );
    replace(
      frame.selectors,
      '_parseSelector',
      (original) =>
        function () {
          const request = storage.getStore();
          if (!request?.callId || !requests.has(request.callId))
            return Reflect.apply(original, this, arguments);
          record('driver.selector.parse.enter', { callId: request.callId });
          try {
            const result = Reflect.apply(original, this, arguments);
            record('driver.selector.parse.exit', { callId: request.callId, world: result?.world });
            return result;
          } catch (error) {
            record('driver.selector.parse.throw', { callId: request.callId });
            throw error;
          }
        }
    );
    observeWait(frame.selectors, 'resolveFrameForSelector', 'driver.selector.frame');
    observeWait(
      frame,
      '_context',
      'driver.context',
      (_frame, args) => ({ world: args[0] }),
      patchContext
    );
    replace(
      frame.selectors,
      'resolveInjectedForSelector',
      (original) =>
        function () {
          const request = storage.getStore();
          if (!request?.callId || !requests.has(request.callId))
            return Reflect.apply(original, this, arguments);
          record('driver.selector.resolve.enter', { callId: request.callId });
          return tap(
            Reflect.apply(original, this, arguments),
            (resolved) => {
              record('driver.selector.resolve.fulfilled', { callId: request.callId });
              record('driver.selector.patch-handle.enter', { callId: request.callId });
              patchHandle(resolved?.injected);
              record('driver.selector.patch-handle.exit', { callId: request.callId });
              record('driver.selector.resolve.exit', {
                callId: request.callId,
                found: !!resolved,
                world: resolved?.info?.world,
              });
            },
            (error) =>
              record('driver.selector.resolve.reject', {
                callId: request.callId,
                error: String(error),
              })
          );
        }
    );
    available = true;
  } catch (error) {
    diagnosticError('install', error);
    for (const restore of restorers.reverse()) {
      try {
        restore();
      } catch (other) {
        diagnosticError('install-rollback', other);
      }
    }
    restorers.length = 0;
    if (onConsole && serverContext) serverContext.off('console', onConsole);
    if (connection?.[ownerSlot] === ownerToken) delete connection[ownerSlot];
  }
  return {
    available,
    runOriginalQuery(call, read) {
      record('node.original-query', { query: call });
      return storage.run({ query: call, original: true }, read);
    },
    freezeVerdict(passed) {
      verdict = {
        passed,
        ...clock(),
        pendingCallIds: [...requests.values()].filter((r) => !r.settled).map((r) => r.callId),
      };
    },
    markContextCloseStart() {
      record('node.context-close.before-call');
    },
    disposeAfterContextClosed(contextClosed) {
      if (!contextClosed) {
        diagnosticError('cleanup-deferred', 'Original context close was not confirmed');
        return false;
      }
      if (disposed) return true;
      disposed = true;
      for (const restore of restorers.reverse()) {
        try {
          restore();
        } catch (error) {
          diagnosticError('restore', error);
        }
      }
      if (onConsole && serverContext) serverContext.off('console', onConsole);
      if (connection?.[ownerSlot] === ownerToken) delete connection[ownerSlot];
      record('node.cleanup-after-context-close');
      return true;
    },
    snapshot() {
      const captured = [...requests.values()].map((r) => ({ ...r }));
      const keys = browserBatches.map((batch) => `${batch.callId}:${batch.attempt}`);
      const mapped = browserBatches.every((batch) => {
        const request = requests.get(batch.callId);
        return (
          request?.query != null &&
          Number.isInteger(batch.attempt) &&
          batch.attempt > 0 &&
          batch.attempt <= request.attempts
        );
      });
      const mappingCompleteAtSnapshot =
        available &&
        captured.length > 0 &&
        captured.every((r) => r.query != null && r.attempts > 0) &&
        mapped &&
        new Set(keys).size === keys.length &&
        browserBatches.length === captured.reduce((n, r) => n + r.attempts, 0) &&
        !errors.length &&
        !dropped &&
        !browserDropped &&
        !evaluatorGuardFailures &&
        browserBatches.every((batch) => batch.diagnosticErrors === 0);
      return {
        kind: 'private-playwright-call-timing-v1',
        available,
        ownerToken,
        sourceBindings,
        expectedEvaluatorSha,
        selector: targetSelector,
        attribute,
        verdict,
        rows: [...rows],
        browserBatches: [...browserBatches],
        requests: captured,
        errors: [...errors],
        dropped,
        browserDropped,
        disposed,
        capturedOriginalRequests: captured.length,
        pendingCapturedRequests: captured.filter((r) => !r.settled).length,
        evaluatorGuardPasses,
        evaluatorGuardFailures,
        mappingCompleteAtSnapshot,
        requestMapping:
          'actual protocol id -> call@id -> existing evaluator callId + per-call attempt',
        publicApi: false,
        promiseStrategy:
          'tap returns the original Promise; identity is a source property, with extra observation reactions',
        extraQueryOrRPC: false,
        prototypeHook: false,
        transportComplete: false,
        clockTickLengthMeasured: false,
      };
    },
  };
}
