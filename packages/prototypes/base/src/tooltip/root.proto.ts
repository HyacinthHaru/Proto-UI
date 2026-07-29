import {
  defineAsHook,
  definePrototype,
  delay,
  type DelayTask,
  type DefHandle,
  type RunHandle,
} from '@proto.ui/core';
import { useOpenState } from '../tools';
import {
  deriveTooltipInteractionOpen,
  createTooltipRootId,
  requestTooltipOpen,
  TOOLTIP_CONTEXT,
  TOOLTIP_FAMILY,
  type TooltipContextValue,
} from './shared';
import type { TooltipRootAsHookContract, TooltipRootExposes, TooltipRootProps } from './types';

const DEFAULT_OPEN_DELAY = 200;
const DEFAULT_CLOSE_DELAY = 100;

function normalizeDelay(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sameContext(a: TooltipContextValue, b: TooltipContextValue): boolean {
  return (
    a.open === b.open &&
    a.controlled === b.controlled &&
    a.disabled === b.disabled &&
    a.delayDuration === b.delayDuration &&
    a.closeDelay === b.closeDelay &&
    a.triggerHovered === b.triggerHovered &&
    a.triggerFocused === b.triggerFocused &&
    a.contentHovered === b.contentHovered &&
    a.interactionReason === b.interactionReason &&
    a.interactionVersion === b.interactionVersion &&
    a.requestedOpen === b.requestedOpen &&
    a.requestReason === b.requestReason &&
    a.requestVersion === b.requestVersion
  );
}

function setupTooltipRoot(def: DefHandle<TooltipRootProps, TooltipRootExposes>): void {
  const rootId = createTooltipRootId();
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'root' });

  def.props.define({
    open: { type: 'boolean', empty: 'fallback' },
    defaultOpen: { type: 'boolean', empty: 'fallback' },
    disabled: { type: 'boolean', empty: 'fallback' },
    delayDuration: { type: 'number', empty: 'fallback' },
    closeDelay: { type: 'number', empty: 'fallback' },
  });
  def.props.setDefaults({
    defaultOpen: false,
    disabled: false,
    delayDuration: DEFAULT_OPEN_DELAY,
    closeDelay: DEFAULT_CLOSE_DELAY,
  });

  const initialContext: TooltipContextValue = {
    rootId,
    open: false,
    controlled: false,
    disabled: false,
    delayDuration: DEFAULT_OPEN_DELAY,
    closeDelay: DEFAULT_CLOSE_DELAY,
    triggerHovered: false,
    triggerFocused: false,
    contentHovered: false,
    interactionReason: null,
    interactionVersion: 0,
    requestedOpen: false,
    requestReason: null,
    requestVersion: 0,
  };
  def.context.provide(TOOLTIP_CONTEXT, initialContext);

  const openState = useOpenState({
    exposeOpenMethodKey: 'openTooltip',
    requestOpen(run, nextOpen, reason) {
      const ctx = run.context.read(TOOLTIP_CONTEXT);
      if (ctx.disabled) return;
      requestTooltipOpen(run, nextOpen, reason);
    },
  });
  const open = openState.getState?.('open');
  def.expose.event('openChange', { payload: 'json' });

  let snapshot = initialContext;
  let published = initialContext;
  let lastRequestVersion = 0;
  let lastInteractionVersion = 0;
  let pendingIntent: boolean | null = null;
  let pendingDelay: DelayTask | null = null;

  const cancelPending = () => {
    pendingDelay?.cancel();
    pendingDelay = null;
    pendingIntent = null;
  };

  const syncContext = (run: RunHandle<TooltipRootProps>) => {
    const next = { ...snapshot, open: open?.get() ?? false };
    snapshot = next;
    if (sameContext(published, next)) return;
    published = next;
    run.context.update(TOOLTIP_CONTEXT, next);
  };

  const scheduleInteractionRequest = (
    run: RunHandle<TooltipRootProps>,
    nextOpen: boolean,
    reason: string
  ) => {
    cancelPending();
    if (snapshot.disabled || nextOpen === (open?.get() ?? false)) return;
    const duration = nextOpen ? snapshot.delayDuration : snapshot.closeDelay;
    pendingIntent = nextOpen;
    pendingDelay = delay(duration, () => {
      if (pendingIntent !== nextOpen) return;
      pendingDelay = null;
      pendingIntent = null;
      const latest = run.context.read(TOOLTIP_CONTEXT);
      if (latest.disabled || deriveTooltipInteractionOpen(latest) !== nextOpen) return;
      requestTooltipOpen(run, nextOpen, reason);
    });
  };

  def.context.subscribe(TOOLTIP_CONTEXT, (run, next) => {
    snapshot = next;
    published = next;

    if (next.requestVersion !== lastRequestVersion) {
      lastRequestVersion = next.requestVersion;
      if (!next.controlled) {
        open?.set(next.requestedOpen, 'reason: tooltip request => uncontrolled sync');
      }
      run.expose.emit('openChange', {
        open: next.requestedOpen,
        reason: next.requestReason,
      });
      return;
    }

    if (next.interactionVersion !== lastInteractionVersion) {
      lastInteractionVersion = next.interactionVersion;
      scheduleInteractionRequest(
        run,
        deriveTooltipInteractionOpen(next),
        next.interactionReason ?? 'interaction'
      );
    }
  });

  def.lifecycle.onCreated((run) => {
    const props = run.props.get();
    snapshot = {
      ...snapshot,
      controlled: run.props.isProvided('open'),
      disabled: !!props.disabled,
      delayDuration: normalizeDelay(props.delayDuration, DEFAULT_OPEN_DELAY),
      closeDelay: normalizeDelay(props.closeDelay, DEFAULT_CLOSE_DELAY),
    };
    syncContext(run);
  });

  def.props.watch(['open', 'disabled', 'delayDuration', 'closeDelay'], (run, next) => {
    snapshot = {
      ...snapshot,
      controlled: run.props.isProvided('open'),
      disabled: !!next.disabled,
      delayDuration: normalizeDelay(next.delayDuration, DEFAULT_OPEN_DELAY),
      closeDelay: normalizeDelay(next.closeDelay, DEFAULT_CLOSE_DELAY),
    };
    if (snapshot.disabled) cancelPending();
    syncContext(run);
  });

  open?.watch((run, event) => {
    if (event.type !== 'next') return;
    if (pendingIntent === event.next) cancelPending();
    syncContext(run);
  });

  def.lifecycle.onBeforeDispose(cancelPending);
}

export const asTooltipRoot = defineAsHook<
  TooltipRootProps,
  TooltipRootExposes,
  TooltipRootAsHookContract
>({
  name: 'as-tooltip-root',
  setup: setupTooltipRoot,
});

const tooltipRoot = definePrototype({
  name: 'base-tooltip-root',
  setup: setupTooltipRoot,
});

export default tooltipRoot;
