import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import {
  requestScrollPosition,
  SCROLL_AREA_CONTEXT,
  SCROLL_AREA_FAMILY,
  type ScrollAreaContextValue,
} from './shared';
import type {
  ScrollAreaThumbAsHookContract,
  ScrollAreaThumbExposes,
  ScrollAreaThumbProps,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setupScrollAreaThumb(def: DefHandle<ScrollAreaThumbProps, ScrollAreaThumbExposes>): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'thumb' });

  const sizeRatio = def.state.numberDiscrete('sizeRatio', 1);
  const offsetRatio = def.state.numberDiscrete('offsetRatio', 0);
  def.expose.state('sizeRatio', sizeRatio);
  def.expose.state('offsetRatio', offsetRatio);

  let dragging = false;
  let dragStartClient = 0;
  let dragStartScroll = 0;
  let orientation: 'vertical' | 'horizontal' = 'vertical';
  let metrics = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
  };

  const syncFromMetrics = (next: ScrollAreaContextValue['metrics']) => {
    metrics = { ...next };
    if (orientation === 'vertical') {
      const max = Math.max(next.scrollHeight - next.clientHeight, 0);
      const ratio = next.scrollHeight > 0 ? next.clientHeight / next.scrollHeight : 1;
      sizeRatio.set(clamp(ratio, 0.1, 1), 'reason: scroll-area thumb sizeRatio');
      offsetRatio.set(max > 0 ? next.scrollTop / max : 0, 'reason: scroll-area thumb offsetRatio');
      return;
    }
    const max = Math.max(next.scrollWidth - next.clientWidth, 0);
    const ratio = next.scrollWidth > 0 ? next.clientWidth / next.scrollWidth : 1;
    sizeRatio.set(clamp(ratio, 0.1, 1), 'reason: scroll-area thumb sizeRatio');
    offsetRatio.set(max > 0 ? next.scrollLeft / max : 0, 'reason: scroll-area thumb offsetRatio');
  };

  def.context.subscribe(SCROLL_AREA_CONTEXT, (_run, next: ScrollAreaContextValue) => {
    syncFromMetrics(next.metrics);
  });

  def.lifecycle.onCreated((run) => {
    // Infer orientation from parent scrollbar if present via prop inheritance is projection-owned.
    // Default vertical; projections can still style independently.
    const ctx = run.context.read(SCROLL_AREA_CONTEXT);
    syncFromMetrics(ctx.metrics);
  });

  // Parent scrollbar orientation is not directly readable here without extra context.
  // Keep vertical as default protocol; horizontal thumb drag uses clientX when orientation state
  // is later extended. For v1 tests and demos we drive vertical.
  orientation = 'vertical';

  const readPointerPoint = (ev: any) => {
    // Adapter router payload: CustomEvent.detail { nativeEvent, ... }.
    // Host-free unit tests may dispatch CustomEvent/Event directly.
    const detail = ev?.detail ?? ev ?? {};
    const native = detail?.nativeEvent ?? detail;
    return {
      clientX: Number(native?.clientX ?? detail?.clientX ?? 0),
      clientY: Number(native?.clientY ?? detail?.clientY ?? 0),
      pointerId: native?.pointerId ?? detail?.pointerId,
    };
  };

  def.event.on('pointer.down', (run, ev: any) => {
    dragging = true;
    const point = readPointerPoint(ev);
    dragStartClient = orientation === 'vertical' ? point.clientY : point.clientX;
    dragStartScroll = orientation === 'vertical' ? metrics.scrollTop : metrics.scrollLeft;
    // best-effort pointer capture when host exists
    const host = run.host?.get?.() as HTMLElement | undefined;
    const pointerId = point.pointerId;
    if (host && typeof pointerId === 'number' && host.setPointerCapture) {
      try {
        host.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
  });

  def.event.on('pointer.move', (run, ev: any) => {
    if (!dragging) return;
    const point = readPointerPoint(ev);
    const client = orientation === 'vertical' ? point.clientY : point.clientX;
    const delta = client - dragStartClient;
    if (orientation === 'vertical') {
      const track = Math.max(metrics.clientHeight, 1);
      const max = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
      const next = clamp(dragStartScroll + (delta / track) * metrics.scrollHeight, 0, max);
      requestScrollPosition(run, { scrollTop: next }, 'thumb.pointermove');
      return;
    }
    const track = Math.max(metrics.clientWidth, 1);
    const max = Math.max(metrics.scrollWidth - metrics.clientWidth, 0);
    const next = clamp(dragStartScroll + (delta / track) * metrics.scrollWidth, 0, max);
    requestScrollPosition(run, { scrollLeft: next }, 'thumb.pointermove');
  });

  const endDrag = () => {
    dragging = false;
  };
  def.event.on('pointer.up', endDrag);
  def.event.on('pointer.cancel', endDrag);
  def.lifecycle.onUnmounted(endDrag);
}

export const asScrollAreaThumb = defineAsHook<
  ScrollAreaThumbProps,
  ScrollAreaThumbExposes,
  ScrollAreaThumbAsHookContract
>({
  name: 'as-scroll-area-thumb',
  setup: setupScrollAreaThumb,
});

const scrollAreaThumb = definePrototype({
  name: 'base-scroll-area-thumb',
  setup: setupScrollAreaThumb,
});

export default scrollAreaThumb;
