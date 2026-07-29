import { defineAsHook, definePrototype, tw, type DefHandle, type RunHandle } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { asTransition } from '../tools';
import {
  dismissTooltipFromEscape,
  createTooltipContentId,
  TOOLTIP_CONTEXT,
  TOOLTIP_FAMILY,
  updateTooltipInteraction,
  type TooltipContextValue,
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
  return { stateHandles: { open }, asTransition: asTransitionHandle };
}

function setupTooltipContent(def: DefHandle<TooltipContentProps, TooltipContentExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'content' });
  const contentId = def.state.string('tooltipContentId', '');
  const role = def.state.string('tooltipRole', 'tooltip');
  def.a11y.id(contentId);
  def.a11y.role(role);
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

  const syncPosition = (run: RunHandle<TooltipContentProps>) => {
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

  const syncContext = (next: TooltipContextValue) => {
    contentId.set(createTooltipContentId(next.rootId), 'reason: tooltip content identity sync');
    updateOpen(next.open, 'reason: tooltip context sync => content open');
  };
  def.context.subscribe(TOOLTIP_CONTEXT, (_run, next) => syncContext(next));
  const store: { run: RunHandle<TooltipContentProps> | null } = { run: null };

  def.lifecycle.onCreated((run) => {
    store.run = run;
    syncPosition(run);
    const ctx = run.context.read(TOOLTIP_CONTEXT);
    syncContext(ctx);
  });
  def.lifecycle.onMounted((run) => {
    store.run = run;
    const trigger = run.anatomy.partsOf(TOOLTIP_FAMILY, 'trigger')[0] ?? null;
    if (trigger) overlay.registerAnchorPart(trigger);
    syncPosition(run);
    const ctx = run.context.read(TOOLTIP_CONTEXT);
    syncContext(ctx);
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
const tooltipContent = definePrototype<TooltipContentProps, TooltipContentExposes>({
  name: 'base-tooltip-content',
  setup(def) {
    setupTooltipContent(def);
    def.feedback.style.use(tw('absolute z-50'));
  },
});

export default tooltipContent;
