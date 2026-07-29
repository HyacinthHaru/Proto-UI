import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import {
  requestScrollPosition,
  SCROLL_AREA_CONTEXT,
  SCROLL_AREA_FAMILY,
  type ScrollAreaContextValue,
  type ScrollAreaMetrics,
} from './shared';
import type {
  ScrollAreaThumbAsHookContract,
  ScrollAreaThumbExposes,
  ScrollAreaThumbProps,
} from './types';

type ScrollAreaOrientation = 'horizontal' | 'vertical';

type PointerPoint = {
  clientX: number;
  clientY: number;
  pointerId?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readPointerPoint(event: unknown): PointerPoint {
  const payload = readRecord(event);
  const detail = readRecord(payload?.detail) ?? payload;
  const native = readRecord(detail?.nativeEvent) ?? detail;
  const pointerId = readNumber(native?.pointerId) ?? readNumber(detail?.pointerId);
  return {
    clientX: readNumber(native?.clientX) ?? readNumber(detail?.clientX) ?? 0,
    clientY: readNumber(native?.clientY) ?? readNumber(detail?.clientY) ?? 0,
    ...(pointerId === undefined ? {} : { pointerId }),
  };
}

function axisValues(metrics: ScrollAreaMetrics, orientation: ScrollAreaOrientation) {
  if (orientation === 'vertical') {
    return {
      client: metrics.clientHeight,
      scroll: metrics.scrollTop,
      scrollSize: metrics.scrollHeight,
    };
  }
  return {
    client: metrics.clientWidth,
    scroll: metrics.scrollLeft,
    scrollSize: metrics.scrollWidth,
  };
}

function setupScrollAreaThumb(def: DefHandle<ScrollAreaThumbProps, ScrollAreaThumbExposes>): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'thumb' });
  def.props.define({
    orientation: { type: 'enum', empty: 'fallback', options: ['horizontal', 'vertical'] },
  });
  def.props.setDefaults({ orientation: 'vertical' });

  const sizeRatio = def.state.numberDiscrete('sizeRatio', 1);
  const offsetRatio = def.state.numberDiscrete('offsetRatio', 0);
  const orientation = def.state.enum('orientation', 'vertical', {
    options: ['horizontal', 'vertical'] as const,
  });
  def.expose.state('sizeRatio', sizeRatio);
  def.expose.state('offsetRatio', offsetRatio);
  def.expose.state('orientation', orientation);

  let dragging = false;
  let dragStartClient = 0;
  let dragStartScroll = 0;
  let metrics: ScrollAreaMetrics = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
  };

  const syncFromMetrics = (next: ScrollAreaMetrics) => {
    metrics = { ...next };
    const axis = axisValues(next, orientation.get());
    const maxScroll = Math.max(axis.scrollSize - axis.client, 0);
    const nextSize = axis.scrollSize > 0 ? axis.client / axis.scrollSize : 1;
    sizeRatio.set(clamp(nextSize, 0, 1), 'reason: scroll-area thumb sizeRatio');
    offsetRatio.set(
      maxScroll > 0 ? clamp(axis.scroll / maxScroll, 0, 1) : 0,
      'reason: scroll-area thumb offsetRatio'
    );
  };

  def.context.subscribe(SCROLL_AREA_CONTEXT, (_run, next: ScrollAreaContextValue) => {
    syncFromMetrics(next.metrics);
  });

  def.lifecycle.onCreated((run) => {
    orientation.set(
      run.props.get().orientation ?? 'vertical',
      'reason: scroll-area thumb init orientation'
    );
    syncFromMetrics(run.context.read(SCROLL_AREA_CONTEXT).metrics);
  });

  def.props.watch(['orientation'], (_run, next) => {
    orientation.set(next.orientation ?? 'vertical', 'reason: scroll-area thumb prop orientation');
    syncFromMetrics(metrics);
  });

  def.event.on('pointer.down', (run, event) => {
    dragging = true;
    const point = readPointerPoint(event);
    const currentOrientation = orientation.get();
    const axis = axisValues(metrics, currentOrientation);
    dragStartClient = currentOrientation === 'vertical' ? point.clientY : point.clientX;
    dragStartScroll = axis.scroll;
    const host = run.host?.get();
    if (host instanceof HTMLElement && point.pointerId !== undefined && host.setPointerCapture) {
      try {
        host.setPointerCapture(point.pointerId);
      } catch {
        // Pointer capture is best-effort across adapters and test DOMs.
      }
    }
  });

  def.event.on('pointer.move', (run, event) => {
    if (!dragging) return;
    const point = readPointerPoint(event);
    const currentOrientation = orientation.get();
    const axis = axisValues(metrics, currentOrientation);
    const client = currentOrientation === 'vertical' ? point.clientY : point.clientX;
    const maxScroll = Math.max(axis.scrollSize - axis.client, 0);
    const thumbTravel = Math.max(axis.client * (1 - sizeRatio.get()), 0);
    const nextScroll =
      thumbTravel > 0
        ? clamp(
            dragStartScroll + ((client - dragStartClient) / thumbTravel) * maxScroll,
            0,
            maxScroll
          )
        : 0;
    requestScrollPosition(
      run,
      currentOrientation === 'vertical' ? { scrollTop: nextScroll } : { scrollLeft: nextScroll },
      'thumb.pointermove'
    );
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
