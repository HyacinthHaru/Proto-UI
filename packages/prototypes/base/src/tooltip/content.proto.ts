import { defineAsHook, definePrototype, tw, type DefHandle } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { asTransition } from '../tools';
import {
  dismissTooltipFromEscape,
  TOOLTIP_CONTEXT,
  TOOLTIP_FAMILY,
  updateTooltipInteraction,
} from './shared';
import type {
  TooltipContentAsHookContract,
  TooltipContentExposes,
  TooltipContentHandles,
  TooltipContentProps,
} from './types';

function projectTooltipContentHandle(
  result: import('@proto.ui/core').AsHookResult<TooltipContentProps, TooltipContentAsHookContract>
): TooltipContentHandles {
  const open = result.getState?.('open');
  const asTransitionHandle = result.getAsHookHandle?.('asTransition');
  if (!open || !asTransitionHandle) {
    throw new Error('[as-tooltip-content] missing captured Tooltip or Transition handles.');
  }
  return { stateHandles: { open }, asTransition: asTransitionHandle as any };
}

function setupTooltipContent(def: DefHandle<TooltipContentProps, TooltipContentExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'content' });
  def.props.define({
    side: {
      type: 'enum',
      empty: 'fallback',
      options: ['top', 'right', 'bottom', 'left'],
    },
    align: {
      type: 'enum',
      empty: 'fallback',
      options: ['start', 'center', 'end'],
    },
    sideOffset: { type: 'number', empty: 'fallback' },
    alignOffset: { type: 'number', empty: 'fallback' },
    avoidCollisions: { type: 'boolean', empty: 'fallback' },
    collisionPadding: { type: 'number', empty: 'fallback' },
  });
  def.props.setDefaults({
    side: 'top',
    align: 'center',
    sideOffset: 4,
    alignOffset: 0,
    avoidCollisions: true,
    collisionPadding: 0,
  });

  const overlay = asOverlay<TooltipContentProps>();
  overlay.configure({
    closeOnEscape: true,
    closeOnOutsidePress: false,
    closeOnFocusOutside: false,
    restore: 'none',
    entry: 'manual',
    placement: 'top',
    align: 'center',
    sideOffset: 4,
    alignOffset: 0,
    anchored: true,
    strategy: 'fixed',
    avoidCollisions: true,
    collisionBoundary: 'clippingAncestors',
    collisionPadding: 0,
    portal: true,
    modal: false,
    layerRole: 'tooltip-content',
    meta: { overlayKind: 'tooltip' },
  });

  const transition = asTransition();
  overlay.bindPresence({
    enter: transition.controls.enter,
    leave: transition.controls.leave,
    present: transition.isPresent,
  });

  const open = def.state.bool('open', false);
  const hovered = def.state.bool('hovered', false);
  def.expose.state('open', open);

  const updateOpen = (nextOpen: boolean, reason: string) => {
    open.set(nextOpen, reason);
    if (nextOpen) overlay.openOverlay(reason);
    else overlay.close(reason);
  };

  const syncPosition = (run: any) => {
    const props = run.props.get();
    overlay.updatePosition({
      placement: props.side,
      align: props.align,
      sideOffset: props.sideOffset,
      alignOffset: props.alignOffset,
      avoidCollisions: props.avoidCollisions,
      collisionPadding: props.collisionPadding,
      strategy: 'fixed',
      collisionBoundary: 'clippingAncestors',
    });
  };

  def.props.watch(
    ['side', 'align', 'sideOffset', 'alignOffset', 'avoidCollisions', 'collisionPadding'],
    (run) => syncPosition(run)
  );

  def.context.subscribe(TOOLTIP_CONTEXT, (_run, next) => {
    updateOpen(next.open, 'reason: tooltip context sync => content open');
  });
  const store: { run: any | null } = { run: null };

  def.lifecycle.onCreated((run) => {
    store.run = run;
    syncPosition(run);
    const ctx = run.context.read(TOOLTIP_CONTEXT);
    updateOpen(ctx.open, 'reason: lifecycle.onCreated => tooltip content open sync');
  });
  def.lifecycle.onMounted((run) => {
    store.run = run;
    const trigger = run.anatomy.partsOf(TOOLTIP_FAMILY, 'trigger')[0] ?? null;
    if (trigger) overlay.registerAnchorPart(trigger);
    syncPosition(run);
    const ctx = run.context.read(TOOLTIP_CONTEXT);
    updateOpen(ctx.open, 'reason: lifecycle.onMounted => tooltip content open sync');
  });
  def.lifecycle.onUnmounted(() => {
    store.run = null;
    hovered.set(false, 'reason: tooltip content unmounted => hovered false');
  });

  // Bridge overlay Escape dismiss into Tooltip owner open state (dropdown pattern).
  overlay.open.watch((_ctx, event) => {
    if (event.type !== 'next' || event.next || event.reason !== 'escape') return;
    const run = store.run;
    if (!run) return;
    const ctx = run.context.read(TOOLTIP_CONTEXT);
    if (!ctx.open) return;
    dismissTooltipFromEscape(run);
    if (ctx.controlled) overlay.openOverlay('controlled.sync');
  });

  def.event.on('pointer.enter', (run) => {
    hovered.set(true, 'reason: tooltip content pointer.enter');
    updateTooltipInteraction(run, { contentHovered: true }, 'content.pointerenter');
  });
  def.event.on('pointer.leave', (run) => {
    hovered.set(false, 'reason: tooltip content pointer.leave');
    updateTooltipInteraction(run, { contentHovered: false }, 'content.pointerleave');
  });

  def.rule({
    when: (w) => w.state(transition.isPresent).eq(false),
    intent: (i) => i.feedback.style.use(tw('hidden')),
  });
}

export const asTooltipContent = defineAsHook<
  TooltipContentProps,
  TooltipContentExposes,
  TooltipContentAsHookContract,
  TooltipContentHandles
>({
  name: 'as-tooltip-content',
  setup: setupTooltipContent,
  projectHandle: projectTooltipContentHandle,
});

const tooltipContent = definePrototype({
  name: 'base-tooltip-content',
  setup(def) {
    setupTooltipContent(def);
    def.feedback.style.use(tw('absolute z-50'));
  },
});

export default tooltipContent;
