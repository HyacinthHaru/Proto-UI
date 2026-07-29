import { createAnatomyFamily, createContextKey, type RunHandle } from '@proto.ui/core';
import type { PropsBaseType } from '@proto.ui/types';

export type ScrollAreaMetrics = {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
};

export type ScrollAreaContextValue = {
  metrics: ScrollAreaMetrics;
  metricsVersion: number;
  requestScrollTop: number | null;
  requestScrollLeft: number | null;
  requestVersion: number;
  requestReason: string | null;
};

export const EMPTY_SCROLL_METRICS: ScrollAreaMetrics = {
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 0,
  scrollWidth: 0,
  clientHeight: 0,
  clientWidth: 0,
};

export function requestScrollPosition(
  run: RunHandle<PropsBaseType>,
  patch: { scrollTop?: number; scrollLeft?: number },
  reason: string
): boolean {
  try {
    run.context.update(SCROLL_AREA_CONTEXT, (prev) => ({
      ...prev,
      requestScrollTop: typeof patch.scrollTop === 'number' ? patch.scrollTop : null,
      requestScrollLeft: typeof patch.scrollLeft === 'number' ? patch.scrollLeft : null,
      requestVersion: prev.requestVersion + 1,
      requestReason: reason,
    }));
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === 'CONTEXT_DISCONNECTED') return false;
    throw error;
  }
}

export function publishScrollMetrics(
  run: RunHandle<PropsBaseType>,
  metrics: ScrollAreaMetrics
): boolean {
  try {
    run.context.update(SCROLL_AREA_CONTEXT, (prev) => ({
      ...prev,
      metrics: { ...metrics },
      metricsVersion: prev.metricsVersion + 1,
    }));
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === 'CONTEXT_DISCONNECTED') return false;
    throw error;
  }
}

export const SCROLL_AREA_FAMILY = createAnatomyFamily('base-scroll-area', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    viewport: { cardinality: { min: 1, max: 1 } },
    scrollbar: { cardinality: { min: 0, max: 2 } },
    thumb: { cardinality: { min: 0, max: 2 } },
    corner: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'viewport' },
    { kind: 'contains', parent: 'root', child: 'scrollbar' },
    { kind: 'contains', parent: 'scrollbar', child: 'thumb' },
    { kind: 'contains', parent: 'root', child: 'corner' },
  ],
});

export const SCROLL_AREA_CONTEXT = createContextKey<ScrollAreaContextValue>('base-scroll-area');
