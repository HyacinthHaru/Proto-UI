// Private to the Web portal destination policy; never an application override.
type Result = 'supported' | 'unsupported' | 'inconclusive';
type Capability = {
  body: HTMLElement;
  view: Window;
  state: Result | 'checking';
  retry: boolean;
  stop: () => void;
};
const capabilities = new WeakMap<Document, Capability>();

/** Cache engine geometry, never a destination's current eligibility. */
export function hasViewportFixedInlineSize(doc: Document): boolean {
  const body = doc.body;
  const view = doc.defaultView;
  if (!body || !view || !active(doc, body, view)) return false;
  let record = capabilities.get(doc);
  if (record && (record.body !== body || record.view !== view)) {
    record.stop();
    capabilities.delete(doc);
    record = undefined;
  }
  if (record && !record.retry) return record.state === 'supported';
  record?.stop();
  record = { body, view, state: 'checking', retry: false, stop() {} };
  // Publish checking before any insertion or host read can reenter resolution.
  capabilities.set(doc, record);
  record.state = probe(doc, body, view);
  if (!active(doc, body, view)) record.state = 'inconclusive';
  // Body replacement may synchronously resolve again and supersede checking.
  // An orphan record must neither acquire listeners nor publish its result.
  if (capabilities.get(doc) !== record) return false;
  const current = record;
  const restore = () => {
    // A restored page can have a different native layout environment.
    if (current.state !== 'checking') current.retry = true;
  };
  const retry = () => {
    // Invalidation is passive: no probe, registry signal or live-view move.
    if (current.state === 'inconclusive') current.retry = true;
  };
  view.addEventListener('pageshow', restore);
  view.addEventListener('resize', retry);
  doc.addEventListener('visibilitychange', retry);
  record.stop = () => {
    view.removeEventListener('pageshow', restore);
    view.removeEventListener('resize', retry);
    doc.removeEventListener('visibilitychange', retry);
  };
  // Final state is visible before deferred MutationObserver deliveries.
  return record.state === 'supported';
}

function active(doc: Document, body: HTMLElement, view: Window): boolean {
  return (
    doc.body === body &&
    doc.defaultView === view &&
    view.document === doc &&
    body.ownerDocument === doc &&
    body.isConnected &&
    body.getRootNode() === doc
  );
}

const common: Record<string, string> = {
  all: 'initial',
  display: 'block',
  position: 'absolute',
  visibility: 'hidden',
  'pointer-events': 'none',
  direction: 'ltr',
  'writing-mode': 'horizontal-tb',
  'box-sizing': 'border-box',
  margin: '0px',
  padding: '0px',
  border: '0px',
  left: '0px',
  top: '0px',
  width: '101px',
  height: '103px',
  contain: 'none',
  'container-type': 'normal',
  transform: 'none',
  animation: 'none',
  transition: 'none',
};

function node(doc: Document, overrides: Record<string, string> = {}): HTMLElement {
  const element = doc.createElement('div');
  for (const [key, value] of Object.entries({ ...common, ...overrides })) {
    element.style.setProperty(key, value, 'important');
  }
  return element;
}

function controlled(view: Window, element: HTMLElement): boolean {
  const css = view.getComputedStyle(element);
  const value = (key: string) => css.getPropertyValue(key).trim();
  // Verify effective declarations, not merely accepted syntax. The closed root
  // isolates descendants; these checks also catch overridden host styles.
  for (const key of [
    'display',
    'position',
    'visibility',
    'pointer-events',
    'direction',
    'writing-mode',
    'box-sizing',
    'left',
    'top',
    'width',
    'height',
    'contain',
    'container-type',
  ]) {
    if (value(key) !== element.style.getPropertyValue(key)) return false;
  }
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    if (
      value(`margin-${edge}`) !== '0px' ||
      value(`padding-${edge}`) !== '0px' ||
      value(`border-${edge}-width`) !== '0px'
    )
      return false;
  }
  for (const key of [
    'translate',
    'rotate',
    'scale',
    'perspective',
    'filter',
    'backdrop-filter',
    '-webkit-backdrop-filter',
    'clip-path',
    'mask-image',
    '-webkit-mask-image',
    'mask-border-source',
    'animation-name',
    'transition-property',
  ]) {
    if (value(key) && value(key) !== 'none') return false;
  }
  if (
    value('overflow-x') !== 'visible' ||
    value('overflow-y') !== 'visible' ||
    (value('clip') && value('clip') !== 'auto') ||
    (value('content-visibility') && value('content-visibility') !== 'visible') ||
    (value('will-change') && value('will-change') !== 'auto') ||
    (value('zoom') && !['1', 'normal'].includes(value('zoom')))
  )
    return false;
  return element.style.transform === 'none'
    ? value('transform') === 'none'
    : !!value('transform') && value('transform') !== 'none';
}

type Rect = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;
const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
const box = (rect: Rect, x: number, y: number, width: number, height: number) =>
  [rect.x, rect.y, rect.width, rect.height, x, y, width, height].every(Number.isFinite) &&
  rect.width > 0 &&
  rect.height > 0 &&
  near(rect.x, x) &&
  near(rect.y, y) &&
  near(rect.width, width) &&
  near(rect.height, height);

function probe(doc: Document, body: HTMLElement, view: Window): Result {
  let host: HTMLElement | undefined;
  let result: Result = 'inconclusive';
  try {
    host = node(doc, { position: 'fixed', width: '1px', height: '1px', opacity: '0' });
    host.inert = true;
    host.setAttribute('aria-hidden', 'true');
    const root = host.attachShadow({ mode: 'closed' });
    const wrapper = node(doc, { left: '37px', top: '41px', width: '181px', height: '191px' });
    const scopes = [
      node(doc),
      node(doc, { 'container-type': 'inline-size' }),
      node(doc, { contain: 'layout' }),
      node(doc, { transform: 'translateX(0px)' }),
    ];
    const children = scopes.map((scope) => {
      const child = node(doc, {
        position: 'fixed',
        left: '11px',
        top: '13px',
        width: '17px',
        height: '19px',
      });
      scope.append(child);
      wrapper.append(scope);
      return child;
    });
    root.append(wrapper);
    body.append(host);
    const frames: Array<{ scopes: DOMRect[]; children: DOMRect[] }> = [];
    for (const [left, top] of [
      [37, 41],
      [83, 97],
    ]) {
      wrapper.style.setProperty('left', `${left}px`, 'important');
      wrapper.style.setProperty('top', `${top}px`, 'important');
      if (
        !active(doc, body, view) ||
        !host.isConnected ||
        ![host, wrapper, ...scopes, ...children].every((el) => controlled(view, el)) ||
        view.getComputedStyle(host).opacity !== '0' ||
        !box(host.getBoundingClientRect(), 0, 0, 1, 1) ||
        !box(wrapper.getBoundingClientRect(), left, top, 181, 191)
      )
        return result;
      const frame = {
        scopes: scopes.map((el) => el.getBoundingClientRect()),
        children: children.map((el) => el.getBoundingClientRect()),
      };
      if (!frame.scopes.every((rect) => box(rect, left, top, 101, 103))) return result;
      frames.push(frame);
    }
    const viewport = (index: number) => frames.every((f) => box(f.children[index], 11, 13, 17, 19));
    const ancestor = (index: number) =>
      frames.every((f) =>
        box(f.children[index], f.scopes[index].x + 11, f.scopes[index].y + 13, 17, 19)
      );
    const moved = frames[0].scopes.every(
      (rect, i) =>
        Math.abs(frames[1].scopes[i].x - rect.x) > 1 && Math.abs(frames[1].scopes[i].y - rect.y) > 1
    );
    if (moved && viewport(0) && ancestor(2) && ancestor(3)) {
      result = viewport(1) ? 'supported' : ancestor(1) ? 'unsupported' : 'inconclusive';
    }
  } catch {
    result = 'inconclusive';
  } finally {
    try {
      host?.remove();
      if (host?.isConnected || host?.parentNode) result = 'inconclusive';
    } catch {
      result = 'inconclusive';
    }
  }
  return result;
}
