import { Window as HappyWindow } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getWebPortalDestinationGeneration,
  registerWebPortalDestination,
  resolveWebPortalDestination,
  subscribeWebPortalDestinations,
} from '../src/platform/portal-destination';

const releases: Array<() => void> = [];
afterEach(() => {
  for (const release of releases.splice(0).reverse()) release();
  vi.restoreAllMocks();
});

function fixture() {
  const window = new HappyWindow();
  const view = window as unknown as Window & typeof globalThis;
  const doc = view.document;
  const scope = doc.createElement('section');
  const origin = doc.createComment('author');
  const target = doc.createElement('div');
  const destination = doc.createElement('div');
  scope.style.setProperty('container-type', 'inline-size');
  scope.append(origin, target, destination);
  doc.body.append(scope);
  releases.push(registerWebPortalDestination(scope, destination));
  releases.push(() => window.happyDOM.cancelAsync());
  return {
    view,
    doc,
    scope,
    origin,
    target,
    destination,
    resolve: () => resolveWebPortalDestination(origin, target),
  };
}
type Fixture = ReturnType<typeof fixture>;
type Mode = 'viewport' | 'ancestor' | 'mixed' | 'zero' | 'nan' | 'wrong-size';

// Explicit unit-only geometry model. No test here proves native layout support.
// The real no-layout environment is exercised separately and must fail closed.
function geometry(f: Fixture, initial: Mode = 'viewport') {
  let mode = initial;
  let calls = 0;
  let hosts = 0;
  let onRead: (() => void) | undefined;
  let onAppend: (() => void) | undefined;
  let onRemove: (() => void) | undefined;
  let brokenControl: 'normal' | 'layout' | 'transform' | undefined;
  let override: { property: string; value: string; hostOnly?: boolean } | undefined;
  const nodes: HTMLElement[] = [];
  const roots: ShadowRoot[] = [];
  const getStyle = f.view.getComputedStyle.bind(f.view);
  vi.spyOn(f.view, 'getComputedStyle').mockImplementation((element) => {
    const css = getStyle(element);
    const el = element as HTMLElement;
    if (el.style.getPropertyValue('all') !== 'initial') return css;
    if (!nodes.includes(el)) nodes.push(el);
    return new Proxy(css, {
      get(target, key) {
        if (key === 'getPropertyValue')
          return (property: string) => {
            if (override?.property === property && (!override.hostOnly || el.inert))
              return override.value;
            const direct = el.style.getPropertyValue(property);
            if (direct) return direct;
            if (
              /^(margin|padding)-(top|right|bottom|left)$/.test(property) ||
              /^border-(top|right|bottom|left)-width$/.test(property)
            )
              return '0px';
            if (property === 'overflow-x' || property === 'overflow-y') return 'visible';
            if (property === 'animation-name' || property === 'transition-property') return 'none';
            return css.getPropertyValue(property);
          };
        return Reflect.get(target, key, target);
      },
    });
  });
  const attach = f.view.HTMLElement.prototype.attachShadow;
  vi.spyOn(f.view.HTMLElement.prototype, 'attachShadow').mockImplementation(function (
    this: HTMLElement,
    options
  ) {
    const root = attach.call(this, options);
    expect(options.mode).toBe('closed');
    roots.push(root);
    return root;
  });
  const append = f.doc.body.append;
  vi.spyOn(f.doc.body, 'append').mockImplementation(function (this: HTMLElement, ...elements) {
    hosts++;
    append.apply(this, elements);
    onAppend?.();
  });
  const remove = f.view.HTMLElement.prototype.remove;
  vi.spyOn(f.view.HTMLElement.prototype, 'remove').mockImplementation(function (this: HTMLElement) {
    remove.call(this);
    if (this.inert) onRemove?.();
  });
  vi.spyOn(f.view.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    calls++;
    onRead?.();
    const el = this as HTMLElement;
    let x = parseFloat(el.style.left);
    let y = parseFloat(el.style.top);
    let width = parseFloat(el.style.width);
    const height = parseFloat(el.style.height);
    const parent = el.parentElement;
    if (!el.inert && parent?.parentElement && el.style.position === 'fixed') {
      const wrapper = parent.parentElement;
      const type = parent.style.containerType;
      const kind =
        parent.style.contain === 'layout'
          ? 'layout'
          : parent.style.transform !== 'none'
            ? 'transform'
            : 'normal';
      let follows =
        kind === 'layout' ||
        kind === 'transform' ||
        (type === 'inline-size' && mode === 'ancestor');
      if (brokenControl === kind && type !== 'inline-size') follows = !follows;
      if (type === 'inline-size' && mode === 'mixed') follows = wrapper.style.left === '83px';
      if (follows) {
        x += parseFloat(wrapper.style.left);
        y += parseFloat(wrapper.style.top);
      }
      if (type === 'inline-size' && mode === 'wrong-size') width++;
    } else if (parent && !el.inert) {
      x += parseFloat(parent.style.left);
      y += parseFloat(parent.style.top);
    }
    if (mode === 'zero') return new f.view.DOMRect();
    if (mode === 'nan') x = NaN;
    return new f.view.DOMRect(x, y, width, height);
  });
  return {
    get calls() {
      return calls;
    },
    get hosts() {
      return hosts;
    },
    nodes,
    roots,
    set mode(value: Mode) {
      mode = value;
    },
    set onRead(value: (() => void) | undefined) {
      onRead = value;
    },
    set onAppend(value: (() => void) | undefined) {
      onAppend = value;
    },
    set onRemove(value: (() => void) | undefined) {
      onRemove = value;
    },
    set brokenControl(value: typeof brokenControl) {
      brokenControl = value;
    },
    set override(value: typeof override) {
      override = value;
    },
  };
}

describe('private inline-size portal capability (unit geometry model only)', () => {
  it('fails closed with actual happy-dom no-layout geometry', () => {
    const f = fixture();
    expect(f.resolve()).toBe(f.doc.body);
    expect(f.doc.body.children).toHaveLength(1);
  });

  it('admits only a successful viewport result, caches it and leaves no application DOM change', () => {
    const f = fixture();
    const model = geometry(f);
    const before = f.doc.body.innerHTML;
    const generation = getWebPortalDestinationGeneration();
    expect(f.resolve()).toBe(f.destination);
    expect(model.calls).toBe(20);
    for (let i = 0; i < 5; i++) expect(f.resolve()).toBe(f.destination);
    expect(model.hosts).toBe(1);
    expect(model.calls).toBe(20);
    expect(f.doc.body.innerHTML).toBe(before);
    expect(getWebPortalDestinationGeneration()).toBe(generation);
    expect(model.nodes).toHaveLength(10);
    expect(model.roots[0].host.shadowRoot).toBeNull();
    for (const node of model.nodes) {
      expect(node.style.getPropertyValue('all')).toBe('initial');
      expect(node.style.getPropertyPriority('all')).toBe('important');
      expect(node.style.getPropertyValue('visibility')).toBe('hidden');
      expect(node.style.getPropertyPriority('visibility')).toBe('important');
    }
    const host = model.roots[0].host as HTMLElement;
    expect(host.inert).toBe(true);
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.style.opacity).toBe('0');
    expect(host.isConnected).toBe(false);
  });

  it('caches an affirmative ancestor-coordinate result across resize and visibility events', () => {
    const f = fixture();
    const model = geometry(f, 'ancestor');
    expect(f.resolve()).toBe(f.doc.body);
    model.mode = 'viewport';
    for (const event of ['resize']) f.view.dispatchEvent(new f.view.Event(event));
    f.doc.dispatchEvent(new f.view.Event('visibilitychange'));
    expect(f.resolve()).toBe(f.doc.body);
    expect(model.hosts).toBe(1);
  });

  it.each<Mode>(['mixed', 'zero', 'nan', 'wrong-size'])(
    'fails closed and does not repeatedly probe %s geometry',
    (mode) => {
      const f = fixture();
      const model = geometry(f, mode);
      expect(f.resolve()).toBe(f.doc.body);
      model.mode = 'viewport';
      expect(f.resolve()).toBe(f.doc.body);
      expect(model.hosts).toBe(1);
    }
  );

  it.each(['normal', 'layout', 'transform'] as const)(
    'requires the effective %s control',
    (control) => {
      const f = fixture();
      const model = geometry(f);
      model.brokenControl = control;
      expect(f.resolve()).toBe(f.doc.body);
      model.brokenControl = undefined;
      f.view.dispatchEvent(new f.view.Event('pageshow'));
      expect(f.resolve()).toBe(f.destination);
      expect(model.hosts).toBe(2);
    }
  );

  it.each(['pageshow', 'resize', 'visibilitychange'])(
    'only permits a later resolve to retry after %s',
    (event) => {
      const f = fixture();
      const model = geometry(f, 'zero');
      expect(f.resolve()).toBe(f.doc.body);
      model.mode = 'viewport';
      const listener = vi.fn();
      releases.push(subscribeWebPortalDestinations(listener));
      const generation = getWebPortalDestinationGeneration();
      (event === 'visibilitychange' ? f.doc : f.view).dispatchEvent(new f.view.Event(event));
      expect(model.hosts).toBe(1);
      expect(listener).not.toHaveBeenCalled();
      expect(getWebPortalDestinationGeneration()).toBe(generation);
      expect(f.resolve()).toBe(f.destination);
      expect(model.hosts).toBe(2);
    }
  );

  it('keeps opposite documents independent and reevaluates adopted registrations in the new document', () => {
    const a = fixture();
    const b = fixture();
    const positive = geometry(a);
    expect(a.resolve()).toBe(a.destination);
    vi.restoreAllMocks();
    const negative = geometry(b, 'ancestor');
    expect(b.resolve()).toBe(b.doc.body);
    expect(a.resolve()).toBe(a.destination);
    // Happy DOM does not recursively update descendant ownerDocument during
    // subtree adoption. Explicitly adopt each leaf for this policy unit control;
    // native iframe/subtree adoption remains a separate browser requirement.
    b.doc.adoptNode(a.scope);
    for (const leaf of [a.origin, a.target, a.destination]) a.scope.append(b.doc.adoptNode(leaf));
    b.doc.body.append(a.scope);
    expect(a.target.ownerDocument).toBe(b.doc);
    expect(a.origin.ownerDocument).toBe(b.doc);
    expect(a.resolve()).toBe(b.doc.body);
    releases.push(registerWebPortalDestination(a.scope, a.destination));
    expect(a.resolve()).toBe(b.doc.body);
    expect(positive.hosts).toBe(1);
    expect(negative.calls).toBe(20);
  });

  it.each(['viewport', 'ancestor'] as const)(
    'invalidates cached %s capability passively on pageshow',
    (mode) => {
      const f = fixture();
      const model = geometry(f, mode);
      expect(f.resolve()).toBe(mode === 'viewport' ? f.destination : f.doc.body);
      model.mode = mode === 'viewport' ? 'ancestor' : 'viewport';
      const generation = getWebPortalDestinationGeneration();
      f.view.dispatchEvent(new f.view.Event('pageshow'));
      expect(model.hosts).toBe(1);
      expect(getWebPortalDestinationGeneration()).toBe(generation);
      expect(f.resolve()).toBe(mode === 'viewport' ? f.doc.body : f.destination);
      expect(model.hosts).toBe(2);
    }
  );

  it('rechecks capability when the document view identity changes', () => {
    const f = fixture();
    const model = geometry(f, 'ancestor');
    expect(f.resolve()).toBe(f.doc.body);
    const view = new Proxy(f.view, {
      get(target, key) {
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    Object.defineProperty(f.doc, 'defaultView', { configurable: true, value: view });
    model.mode = 'viewport';
    expect(f.resolve()).toBe(f.destination);
    expect(model.calls).toBe(40);
  });

  it('rechecks capability on body replacement', () => {
    const f = fixture();
    const model = geometry(f, 'ancestor');
    expect(f.resolve()).toBe(f.doc.body);
    const replacement = f.doc.createElement('body');
    replacement.append(f.scope);
    f.doc.body.replaceWith(replacement);
    model.mode = 'viewport';
    expect(f.resolve()).toBe(f.destination);
    expect(model.calls).toBe(40);
  });

  it('cleans up an exception and retains fail-closed state until a relevant event', () => {
    const f = fixture();
    const model = geometry(f);
    model.onRead = () => {
      throw new Error('geometry unavailable');
    };
    expect(f.resolve()).toBe(f.doc.body);
    expect(f.doc.body.children).toHaveLength(1);
    model.onRead = undefined;
    expect(f.resolve()).toBe(f.doc.body);
    f.view.dispatchEvent(new f.view.Event('resize'));
    expect(f.resolve()).toBe(f.destination);
  });

  it('downgrades a successful geometry result when fixture cleanup throws', () => {
    const f = fixture();
    const model = geometry(f);
    model.onRemove = () => {
      throw new Error('cleanup failed');
    };
    expect(f.resolve()).toBe(f.doc.body);
    expect(model.calls).toBe(20);
    expect(f.doc.body.children).toHaveLength(1);
  });

  it('never invokes focus or scrolling APIs', () => {
    const f = fixture();
    geometry(f);
    for (const [object, key] of [
      [f.view, 'scrollBy'],
      [f.view.HTMLElement.prototype, 'scrollIntoView'],
    ] as const) {
      if (!(key in object))
        Object.defineProperty(object, key, { configurable: true, value: vi.fn() });
    }
    const spies = [
      vi.spyOn(f.view.HTMLElement.prototype, 'focus'),
      vi.spyOn(f.view, 'scrollTo'),
      vi.spyOn(f.view, 'scrollBy'),
      vi.spyOn(f.view.HTMLElement.prototype, 'scrollIntoView'),
    ];
    expect(f.resolve()).toBe(f.destination);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('publishes checking before insertion can reenter and caches before deferred observers resolve', async () => {
    const f = fixture();
    const model = geometry(f);
    let reentrant: HTMLElement | undefined;
    model.onAppend = () => {
      reentrant = f.resolve();
    };
    let batches = 0;
    const observer = new f.view.MutationObserver(() => {
      batches++;
      if (batches > 4) {
        observer.disconnect();
        throw new Error('probe feedback loop');
      }
      expect(f.resolve()).toBe(f.destination);
    });
    observer.observe(f.doc, { childList: true, subtree: true });
    expect(f.resolve()).toBe(f.destination);
    expect(reentrant).toBe(f.doc.body);
    await new Promise((resolve) => setTimeout(resolve, 20));
    observer.disconnect();
    expect(batches).toBeGreaterThan(0);
    expect(batches).toBeLessThanOrEqual(2);
    expect(model.hosts).toBe(1);
  });

  it.each([
    ['visibility', 'visible'],
    ['position', 'static'],
    ['direction', 'rtl'],
    ['writing-mode', 'vertical-rl'],
    ['width', '0px'],
    ['contain', 'paint'],
    ['container-type', 'normal'],
    ['overflow-x', 'hidden'],
    ['filter', 'blur(1px)'],
  ])('rejects hostile effective probe style %s=%s', (property, value) => {
    const f = fixture();
    const model = geometry(f);
    model.override = { property, value };
    expect(f.resolve()).toBe(f.doc.body);
    expect(f.doc.body.children).toHaveLength(1);
  });

  it('rereads real ancestor styles after fixture cleanup', () => {
    const f = fixture();
    const model = geometry(f);
    model.onRemove = () => f.scope.style.setProperty('contain', 'paint');
    expect(f.resolve()).toBe(f.doc.body);
    expect(model.calls).toBe(20);
    f.scope.style.removeProperty('contain');
    expect(f.resolve()).toBe(f.destination);
    expect(model.hosts).toBe(1);
  });

  it.each([
    ['contain', 'layout'],
    ['contain', 'paint'],
    ['contain', 'strict'],
    ['contain', 'content'],
    ['transform', 'translateX(1px)'],
    ['translate', '1px'],
    ['rotate', '1deg'],
    ['scale', '2'],
    ['perspective', '10px'],
    ['filter', 'blur(1px)'],
    ['backdrop-filter', 'blur(1px)'],
    ['clip', 'rect(0px, 1px, 1px, 0px)'],
    ['transform-style', 'preserve-3d'],
    ['-webkit-backdrop-filter', 'blur(1px)'],
    ['-webkit-mask-image', 'linear-gradient(red, blue)'],
    ['mask-border-source', 'url(test.svg)'],
    ['clip-path', 'inset(1px)'],
    ['mask-image', 'linear-gradient(red, blue)'],
    ['will-change', 'transform'],
    ['will-change', 'contain'],
    ['content-visibility', 'auto'],
    ['zoom', '2'],
    ['overflow', 'hidden'],
    ['display', 'none'],
    ['visibility', 'hidden'],
  ])('preserves actual destination guard %s=%s after support is cached', (property, value) => {
    const f = fixture();
    const model = geometry(f);
    expect(f.resolve()).toBe(f.destination);
    f.destination.style.setProperty(property, value);
    expect(f.resolve()).toBe(f.doc.body);
    expect(model.hosts).toBe(1);
  });

  it.each(['size', 'scroll-state', 'inline-size scroll-state', 'size scroll-state', 'unknown'])(
    'rejects non-exact container-type %s without probing',
    (value) => {
      const f = fixture();
      const model = geometry(f);
      f.scope.style.setProperty('container-type', value);
      expect(f.resolve()).toBe(f.doc.body);
      expect(model.hosts).toBe(0);
    }
  );

  it('returns the current body when geometry replaces the original body', () => {
    const f = fixture();
    const model = geometry(f);
    const replacement = f.doc.createElement('body');
    model.onRead = () => {
      model.onRead = undefined;
      replacement.append(f.scope);
      f.doc.body.replaceWith(replacement);
    };
    expect(f.resolve()).toBe(replacement);
    expect(model.roots[0].host.isConnected).toBe(false);
    expect(f.resolve()).toBe(f.destination);
  });

  it('returns the target current document body after adoption during cleanup', () => {
    const f = fixture();
    const model = geometry(f);
    const other = fixture();
    model.onRemove = () => {
      model.onRemove = undefined;
      other.doc.body.append(other.doc.adoptNode(f.target));
    };
    expect(f.resolve()).toBe(other.doc.body);
    expect(f.target.ownerDocument).toBe(other.doc);
  });

  it('retires a checking record superseded by body-replacement reentry', () => {
    const f = fixture();
    const model = geometry(f);
    const added = vi.spyOn(f.view, 'addEventListener');
    const removed = vi.spyOn(f.view, 'removeEventListener');
    const docAdded = vi.spyOn(f.doc, 'addEventListener');
    const docRemoved = vi.spyOn(f.doc, 'removeEventListener');
    model.onRead = () => {
      model.onRead = undefined;
      const replacement = f.doc.createElement('body');
      replacement.append(f.scope);
      f.doc.body.replaceWith(replacement);
      f.resolve();
    };
    expect(f.resolve()).not.toBe(f.destination);
    expect(f.resolve()).toBe(f.destination);
    for (const name of ['pageshow', 'resize']) {
      const add = added.mock.calls.filter(([type]) => type === name).length;
      const remove = removed.mock.calls.filter(([type]) => type === name).length;
      expect(add - remove).toBe(1);
    }
    expect(
      docAdded.mock.calls.filter(([type]) => type === 'visibilitychange').length -
        docRemoved.mock.calls.filter(([type]) => type === 'visibilitychange').length
    ).toBe(1);
  });

  it('rejects a registration replaced during capability geometry', () => {
    const f = fixture();
    const model = geometry(f);
    const replacement = f.doc.createElement('div');
    f.scope.append(replacement);
    model.onRead = () => {
      model.onRead = undefined;
      releases.push(registerWebPortalDestination(f.scope, replacement));
    };
    expect(f.resolve()).toBe(f.doc.body);
    expect(f.resolve()).toBe(replacement);
  });

  it('rejects ancestry changed during the probe even if the destination remains in scope', () => {
    const f = fixture();
    const model = geometry(f);
    const wrapper = f.doc.createElement('div');
    f.scope.append(wrapper);
    model.onRead = () => {
      model.onRead = undefined;
      wrapper.append(f.destination);
    };
    expect(f.resolve()).toBe(f.doc.body);
    expect(f.resolve()).toBe(f.destination);
  });
});
