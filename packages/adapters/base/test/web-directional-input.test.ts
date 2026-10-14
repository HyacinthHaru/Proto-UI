import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MoveGestureHostBinding } from '@proto.ui/core';
import { createWebMoveGestureHost } from '../src/gestures/web-move-gesture-host';
import { createWebProtoEventRouter } from '../src/events/web-event-router';

// Explicit nonbrowser host/router evidence. Native touch scrolling needs a browser.
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((off) => off());
  document.body.replaceChildren();
  vi.useRealTimers();
});
function pointer(type: string, init: PointerEventInit = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 17,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    ...init,
  });
}
function fixture(axis: 'horizontal' | 'vertical' = 'horizontal') {
  const target = document.createElement('button');
  document.body.append(target);
  target.style.touchAction = 'manipulation';
  const capture = vi.fn();
  Object.assign(target, { setPointerCapture: capture, hasPointerCapture: () => false });
  const phases: string[] = [];
  const samples: unknown[] = [];
  const commit = vi.fn();
  const router = createWebProtoEventRouter({ rootEl: target, isEnabled: () => true });
  router.rootTarget.addEventListener('press.commit', commit);
  const binding: MoveGestureHostBinding = {
    target,
    axis,
    activation: 'directional',
    onStart: (s) => {
      phases.push('start');
      samples.push(s);
    },
    onMove: (s) => {
      phases.push('move');
      samples.push(s);
    },
    onEnd: (s) => {
      phases.push('end');
      samples.push(s);
    },
    onCancel: () => phases.push('cancel'),
  };
  const lease = createWebMoveGestureHost().attach(binding);
  cleanups.push(
    () => router.dispose(),
    () => lease.dispose()
  );
  const send = (type: string, init: PointerEventInit = {}, to: EventTarget = target) => {
    const event = pointer(type, init);
    to.dispatchEvent(event);
    return event;
  };
  return { target, capture, phases, samples, commit, router, binding, lease, send };
}

describe('draft directional recognition and native click correlation', () => {
  it('preserves pending down defaults and below-threshold tap exactly once', () => {
    const f = fixture();
    expect(f.target.style.touchAction).toBe('pan-y');
    expect(f.send('pointerdown', { clientX: 10 }).defaultPrevented).toBe(false);
    expect(f.send('pointermove', { clientX: 13 }).defaultPrevented).toBe(false);
    expect(f.capture).not.toHaveBeenCalled();
    f.send('pointerup', { clientX: 13 });
    f.send('click', { clientX: 13, detail: 1 });
    expect(f.phases).toEqual([]);
    expect(f.commit).toHaveBeenCalledTimes(1);
    f.lease.dispose();
    expect(f.target.style.touchAction).toBe('manipulation');
  });
  it.each(['horizontal', 'vertical'] as const)(
    'accepts %s at four pixels with original grab anchor',
    (axis) => {
      const f = fixture(axis);
      const point = (n: number) =>
        axis === 'horizontal' ? { clientX: n, clientY: 20 } : { clientX: 20, clientY: n };
      f.send('pointerdown', point(10));
      const move = f.send('pointermove', point(14));
      expect(move.defaultPrevented).toBe(true);
      expect(f.capture).toHaveBeenCalledTimes(1);
      expect(f.phases).toEqual(['start', 'move']);
      expect(f.samples[0]).toMatchObject({ delta: { x: 0, y: 0 }, totalDelta: { x: 0, y: 0 } });
      expect(f.samples[1]).toMatchObject({
        totalDelta: axis === 'horizontal' ? { x: 4, y: 0 } : { x: 0, y: 4 },
      });
      f.send('pointerup', point(19));
      f.send('click', { ...point(19), detail: 1 });
      expect(f.phases).toEqual(['start', 'move', 'end']);
      expect(f.commit).not.toHaveBeenCalled();
    }
  );
  it.each([
    { clientX: 4, clientY: 4 },
    { clientX: 3, clientY: 8 },
  ])('yields cross-axis/tied intent without capture or later activation: %o', (p) => {
    const f = fixture();
    f.send('pointerdown');
    expect(f.send('pointermove', p).defaultPrevented).toBe(false);
    f.send('pointermove', { clientX: 40, clientY: 8 });
    f.send('pointerup', p);
    f.send('click', { ...p, detail: 1 });
    expect(f.phases).toEqual([]);
    expect(f.capture).not.toHaveBeenCalled();
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('keeps an accepted outside stream, then permits the next ordinary tap', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 }, document.body);
    f.send('pointerup', { clientX: 18 }, document.body);
    f.send('click', { clientX: 18, detail: 1 });
    expect(f.phases).toEqual(['start', 'move', 'end']);
    expect(f.commit).not.toHaveBeenCalled();
    f.send('pointerdown');
    f.send('pointerup');
    f.send('click', { detail: 1 });
    expect(f.commit).toHaveBeenCalledTimes(1);
  });
  it('does not swallow keyboard, assistive, unrelated pointer or another control activation', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.send('pointerup', { clientX: 8 });
    f.send('click', { detail: 0 });
    f.send('click', { detail: 1, pointerId: 99 });
    expect(f.commit).toHaveBeenCalledTimes(2);
    f.send('click', { detail: 1, clientX: 8 });
    expect(f.commit).toHaveBeenCalledTimes(2);
    const other = fixture();
    other.send('click', { detail: 1 });
    expect(other.commit).toHaveBeenCalledTimes(1);
    f.target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(f.commit).toHaveBeenCalledTimes(3);
  });
  it('cancels once on disposal and disqualifies that contact after a late release', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.lease.dispose();
    f.send('pointermove', { clientX: 20 });
    f.send('pointerup', { clientX: 20 });
    f.send('click', { detail: 1, clientX: 20 });
    expect(f.phases).toEqual(['start', 'move', 'cancel']);
    expect(f.commit).not.toHaveBeenCalled();
    f.send('pointerdown');
    f.send('pointerup');
    f.send('click', { detail: 1 });
    expect(f.commit).toHaveBeenCalledTimes(1);
  });
  it('retires lost same-type primary records when a new primary down arrives', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.send('lostpointercapture');
    // The old primary contact ended outside the document; its up was lost.
    f.send('pointerdown', { pointerId: 18 });
    f.send('pointerup', { pointerId: 18 });
    f.send('click', { pointerId: 18, detail: 1 });
    expect(f.commit).toHaveBeenCalledTimes(1);
    f.send('pointerup', { clientX: 8 });
    f.send('click', { clientX: 8, detail: 1 });
    expect(f.commit).toHaveBeenCalledTimes(2);
  });
  it('bounds legacy MouseEvent fallback to the exact release task and point', () => {
    vi.useFakeTimers();
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.send('pointerup', { clientX: 8 });
    f.target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 7 }));
    expect(f.commit).toHaveBeenCalledTimes(1);
    f.target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 8 }));
    expect(f.commit).toHaveBeenCalledTimes(1);
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.send('pointerup', { clientX: 8 });
    vi.runAllTimers();
    f.target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 8 }));
    expect(f.commit).toHaveBeenCalledTimes(2);
  });
  it('removes pending listeners on policy replacement without callbacks', () => {
    const f = fixture();
    f.send('pointerdown');
    f.lease.update({ ...f.binding, axis: 'vertical' });
    f.send('pointermove', { clientX: 20 });
    f.send('pointerup', { clientX: 20 });
    expect(f.phases).toEqual([]);
    expect(f.target.style.touchAction).toBe('pan-x');
  });
  it.each([
    [{ clientX: 20, clientY: 0 }, ['start', 'end']],
    [{ clientX: 0, clientY: 20 }, []],
    [{ clientX: 4, clientY: 4 }, []],
  ] as const)('recognizes final up-only displacement %o', (position, phases) => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointerup', position);
    f.send('click', { ...position, detail: 1 });
    expect(f.phases).toEqual(phases);
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('keeps cancelled contact correlation while another pointer is accepted', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 8 });
    f.send('lostpointercapture');
    f.send('pointerdown', { pointerId: 99, pointerType: 'touch' });
    f.send('pointermove', { pointerId: 99, pointerType: 'touch', clientX: 8 });
    f.send('pointerup', { clientX: 8 });
    f.send('click', { clientX: 8, detail: 1 });
    expect(f.commit).not.toHaveBeenCalled();
    f.send('pointerup', { pointerId: 99, pointerType: 'touch', clientX: 8 });
    f.send('click', { pointerId: 99, pointerType: 'touch', clientX: 8, detail: 1 });
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('preserves the immediate capture reentrancy revision guard', () => {
    const f = fixture();
    const oldStart = vi.fn();
    const replacementStart = vi.fn();
    f.lease.update({ ...f.binding, activation: 'immediate', onStart: oldStart });
    Object.assign(f.target, {
      setPointerCapture: () => {
        f.lease.update({ ...f.binding, activation: 'immediate', onStart: replacementStart });
      },
    });
    f.send('pointerdown');
    expect(oldStart).not.toHaveBeenCalled();
    expect(replacementStart).not.toHaveBeenCalled();
  });
  it('rejects ambiguous directional axis atomically', () => {
    const f = fixture();
    for (const axis of ['both', null, undefined, 'diagonal'])
      expect(() => f.lease.update({ ...f.binding, axis: axis as any })).toThrow(/one axis/);
    expect(f.target.style.touchAction).toBe('pan-y');
  });
});
