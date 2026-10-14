import { expect, it, vi } from 'vitest';
import {
  collectCollapsibleFocusFailure,
  collectCollapsibleFocusSample,
} from './collapsible-focus-observation';

it('distinguishes a real focus mismatch without changing focus or admission', () => {
  const previewer = document.createElement('div');
  previewer.dataset.previewerId = 'focus-observation';
  previewer.dataset.projectionRuntime = 'vue2';
  previewer.dataset.projectionState = 'ready';
  const button = document.createElement('button');
  button.textContent = 'Disclosure';
  const foreign = document.createElement('button');
  foreign.id = 'other-focus-owner';
  previewer.append(button, foreign);
  document.body.append(previewer);
  try {
    foreign.focus();
    const mismatch = collectCollapsibleFocusFailure([button]);
    expect(mismatch.focused).toBe(false);
    expect(mismatch.active?.id).toBe('other-focus-owner');
    expect(document.activeElement).toBe(foreign);
    expect(mismatch.runtime).toBe('vue2');
    (
      previewer as HTMLElement & { __puiCollapsibleLastPointerTarget?: Element }
    ).__puiCollapsibleLastPointerTarget = foreign;
    expect(collectCollapsibleFocusFailure([button]).pointerTargetIsExpected).toBe(false);
    foreign.remove();
    expect(collectCollapsibleFocusFailure([button]).pointerTarget?.connected).toBe(false);
    button.focus();
    expect(collectCollapsibleFocusFailure([button]).focused).toBe(true);
    button.setAttribute('data-pui-view-pending', '');
    button.setAttribute('inert', '');
    const pending = collectCollapsibleFocusFailure([button]);
    expect(pending.expected?.pendingAncestor).toBe(true);
    expect(pending.expected?.inertAncestor).toBe(true);
    expect(button.hasAttribute('data-pui-view-pending')).toBe(true);
  } finally {
    previewer.remove();
  }
});

it.each([0, 2])('reports %i matches without inventing an expected focus target', (count) => {
  const active = document.createElement('button');
  active.id = 'observation-active';
  const matches = Array.from({ length: count }, () => document.createElement('button'));
  document.body.append(active, ...matches);
  try {
    active.focus();
    const facts = collectCollapsibleFocusFailure(matches);
    expect(facts.matchCount).toBe(count);
    expect(facts.focused).toBeNull();
    expect(facts.expected).toBeNull();
    expect(facts.matches).toHaveLength(count);
    expect(facts.active?.id).toBe('observation-active');
    expect(document.activeElement).toBe(active);
  } finally {
    active.remove();
    for (const match of matches) match.remove();
  }
});

it.each([0, 2])(
  'normal sampling rejects %i matches instead of accepting a first match',
  (count) => {
    const matches = Array.from({ length: count }, () => document.createElement('button'));
    document.body.append(...matches);
    matches[0]?.focus();
    try {
      expect(() => collectCollapsibleFocusSample(matches)).toThrow(`received ${count}`);
    } finally {
      for (const match of matches) match.remove();
    }
  }
);

it('normal sampling keeps exact focus and pointer identities without layout or focus side effects', () => {
  const host = document.createElement('div') as HTMLDivElement & {
    __puiCollapsibleLastPointerTarget?: Element;
  };
  host.dataset.previewerId = 'sample';
  const expected = document.createElement('button');
  const other = document.createElement('button');
  expected.textContent = other.textContent = 'Same description';
  host.append(expected, other);
  document.body.append(host);
  host.__puiCollapsibleLastPointerTarget = expected;
  other.focus();
  const layout = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => {
    throw new Error('Unexpected layout read');
  });
  const style = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
    throw new Error('Unexpected style read');
  });
  try {
    expect(collectCollapsibleFocusSample([expected])).toMatchObject({
      focused: false,
      expectedIsPointerTarget: true,
      activeIsPointerTarget: false,
    });
    expect(document.activeElement).toBe(other);
    expected.focus();
    const focus = vi.spyOn(expected, 'focus');
    expect(collectCollapsibleFocusSample([expected])).toMatchObject({
      focused: true,
      matchCount: 1,
      expectedIsPointerTarget: true,
      activeIsPointerTarget: true,
    });
    expect(focus).not.toHaveBeenCalled();
    expect(layout).not.toHaveBeenCalled();
    expect(style).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
    host.remove();
  }
});

it('normal sampling rejects a detached target even if the observed active reference equals it', () => {
  const target = document.createElement('button');
  const descriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');
  Object.defineProperty(document, 'activeElement', { configurable: true, get: () => target });
  try {
    expect(collectCollapsibleFocusSample([target]).focused).toBe(false);
  } finally {
    if (descriptor) Object.defineProperty(document, 'activeElement', descriptor);
    else Reflect.deleteProperty(document, 'activeElement');
  }
});

it('normal sampling propagates observation errors instead of reporting success', () => {
  const target = document.createElement('button');
  document.body.append(target);
  const error = new Error('activeElement observation failed');
  const descriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');
  Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => {
      throw error;
    },
  });
  try {
    expect(() => collectCollapsibleFocusSample([target])).toThrow(error);
  } finally {
    if (descriptor) Object.defineProperty(document, 'activeElement', descriptor);
    else Reflect.deleteProperty(document, 'activeElement');
    target.remove();
  }
});

it('normal sampling does not replace document focus with shadow-root focus', () => {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const inner = document.createElement('button');
  shadow.append(inner);
  document.body.append(host);
  try {
    inner.focus();
    expect(document.activeElement).toBe(host);
    expect(shadow.activeElement).toBe(inner);
    expect(collectCollapsibleFocusSample([inner]).focused).toBe(false);
    expect(collectCollapsibleFocusSample([host]).focused).toBe(true);
  } finally {
    host.remove();
  }
});

it('normal sampling does not replace the evaluation document with a foreign ownerDocument', () => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const foreignDocument = frame.contentDocument!;
  const foreign = foreignDocument.createElement('button');
  foreignDocument.body.append(foreign);
  try {
    foreign.focus();
    expect(foreign.isConnected).toBe(true);
    expect(foreignDocument.activeElement).toBe(foreign);
    expect(document.activeElement).not.toBe(foreign);
    expect(collectCollapsibleFocusSample([foreign]).focused).toBe(false);
  } finally {
    frame.remove();
  }
});

it('normal sampling observes replacement identity rather than accepting a stale handle', () => {
  const old = document.createElement('button');
  const replacement = document.createElement('button');
  document.body.append(old);
  old.focus();
  old.replaceWith(replacement);
  replacement.focus();
  try {
    expect(collectCollapsibleFocusSample([old]).focused).toBe(false);
    expect(collectCollapsibleFocusSample([replacement]).focused).toBe(true);
  } finally {
    replacement.remove();
  }
});
