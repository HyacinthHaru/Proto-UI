import { defineAsHook, definePrototype, tw, type DefHandle } from '@proto.ui/core';
import {
  publishScrollMetrics,
  SCROLL_AREA_CONTEXT,
  SCROLL_AREA_FAMILY,
  type ScrollAreaContextValue,
  type ScrollAreaMetrics,
} from './shared';
import type {
  ScrollAreaViewportAsHookContract,
  ScrollAreaViewportExposes,
  ScrollAreaViewportProps,
} from './types';

function readMetrics(el: HTMLElement): ScrollAreaMetrics {
  return {
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
    clientHeight: el.clientHeight,
    clientWidth: el.clientWidth,
  };
}

function setupScrollAreaViewport(
  def: DefHandle<ScrollAreaViewportProps, ScrollAreaViewportExposes>
): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'viewport' });

  const scrollTop = def.state.numberDiscrete('scrollTop', 0);
  const scrollLeft = def.state.numberDiscrete('scrollLeft', 0);
  const scrollHeight = def.state.numberDiscrete('scrollHeight', 0);
  const scrollWidth = def.state.numberDiscrete('scrollWidth', 0);
  const clientHeight = def.state.numberDiscrete('clientHeight', 0);
  const clientWidth = def.state.numberDiscrete('clientWidth', 0);

  def.expose.state('scrollTop', scrollTop);
  def.expose.state('scrollLeft', scrollLeft);
  def.expose.state('scrollHeight', scrollHeight);
  def.expose.state('scrollWidth', scrollWidth);
  def.expose.state('clientHeight', clientHeight);
  def.expose.state('clientWidth', clientWidth);

  // Base owns native overflow. Projections may add size tokens.
  def.feedback.style.use(tw('overflow-auto'));

  let lastRequestVersion = 0;

  const applyMetrics = (run: any, metrics: ScrollAreaMetrics) => {
    scrollTop.set(metrics.scrollTop, 'reason: scroll-area viewport metrics scrollTop');
    scrollLeft.set(metrics.scrollLeft, 'reason: scroll-area viewport metrics scrollLeft');
    scrollHeight.set(metrics.scrollHeight, 'reason: scroll-area viewport metrics scrollHeight');
    scrollWidth.set(metrics.scrollWidth, 'reason: scroll-area viewport metrics scrollWidth');
    clientHeight.set(metrics.clientHeight, 'reason: scroll-area viewport metrics clientHeight');
    clientWidth.set(metrics.clientWidth, 'reason: scroll-area viewport metrics clientWidth');
    publishScrollMetrics(run, metrics);
  };

  const refreshFromHost = (run: any) => {
    const hostEl = (run.host?.get?.() as HTMLElement | null) ?? null;
    if (!hostEl) return;
    applyMetrics(run, readMetrics(hostEl));
  };

  // Host-bound scroll is routed into callback scope by the adapter event router.
  def.event.on('host:scroll' as any, (run) => {
    refreshFromHost(run);
  });

  def.lifecycle.onMounted((run) => {
    // Initial publish once the host is attached.
    refreshFromHost(run);
  });

  def.lifecycle.onUpdated((run) => {
    refreshFromHost(run);
  });

  def.context.subscribe(SCROLL_AREA_CONTEXT, (run, next: ScrollAreaContextValue) => {
    if (next.requestVersion === lastRequestVersion) return;
    lastRequestVersion = next.requestVersion;
    const hostEl = (run.host?.get?.() as HTMLElement | null) ?? null;
    if (!hostEl) return;
    if (typeof next.requestScrollTop === 'number') hostEl.scrollTop = next.requestScrollTop;
    if (typeof next.requestScrollLeft === 'number') hostEl.scrollLeft = next.requestScrollLeft;
    applyMetrics(run, readMetrics(hostEl));
  });
}

export const asScrollAreaViewport = defineAsHook<
  ScrollAreaViewportProps,
  ScrollAreaViewportExposes,
  ScrollAreaViewportAsHookContract
>({
  name: 'as-scroll-area-viewport',
  setup: setupScrollAreaViewport,
});

const scrollAreaViewport = definePrototype({
  name: 'base-scroll-area-viewport',
  setup: setupScrollAreaViewport,
});

export default scrollAreaViewport;
