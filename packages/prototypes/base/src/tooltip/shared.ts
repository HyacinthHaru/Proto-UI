import { createAnatomyFamily, createContextKey } from '@proto.ui/core';

export type TooltipInteractionReason =
  | 'trigger.pointerenter'
  | 'trigger.pointerleave'
  | 'trigger.focus'
  | 'trigger.blur'
  | 'content.pointerenter'
  | 'content.pointerleave'
  | 'escape';

export type TooltipContextValue = {
  open: boolean;
  controlled: boolean;
  disabled: boolean;
  delayDuration: number;
  closeDelay: number;
  triggerHovered: boolean;
  triggerFocused: boolean;
  contentHovered: boolean;
  interactionReason: TooltipInteractionReason | null;
  interactionVersion: number;
  requestedOpen: boolean;
  requestReason: string | null;
  requestVersion: number;
};

export function deriveTooltipInteractionOpen(ctx: TooltipContextValue): boolean {
  return ctx.triggerHovered || ctx.triggerFocused || ctx.contentHovered;
}

export function updateTooltipInteraction(
  run: any,
  patch: Partial<Pick<TooltipContextValue, 'triggerHovered' | 'triggerFocused' | 'contentHovered'>>,
  reason: TooltipInteractionReason
): boolean {
  try {
    run.context.update(TOOLTIP_CONTEXT, (prev: TooltipContextValue) => ({
      ...prev,
      ...patch,
      interactionReason: reason,
      interactionVersion: prev.interactionVersion + 1,
    }));
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === 'CONTEXT_DISCONNECTED') return false;
    throw error;
  }
}

export function requestTooltipOpen(run: any, nextOpen: boolean, reason: string): boolean {
  try {
    run.context.update(TOOLTIP_CONTEXT, (prev: TooltipContextValue) => ({
      ...prev,
      open: prev.controlled ? prev.open : nextOpen,
      requestedOpen: nextOpen,
      requestReason: reason,
      requestVersion: prev.requestVersion + 1,
    }));
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === 'CONTEXT_DISCONNECTED') return false;
    throw error;
  }
}

/** Escape dismisses open content and clears sticky pointer/focus intent so close sticks. */
export function dismissTooltipFromEscape(run: any): boolean {
  try {
    run.context.update(TOOLTIP_CONTEXT, (prev: TooltipContextValue) => ({
      ...prev,
      triggerHovered: false,
      triggerFocused: false,
      contentHovered: false,
      interactionReason: 'escape',
      interactionVersion: prev.interactionVersion + 1,
      open: prev.controlled ? prev.open : false,
      requestedOpen: false,
      requestReason: 'escape',
      requestVersion: prev.requestVersion + 1,
    }));
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === 'CONTEXT_DISCONNECTED') return false;
    throw error;
  }
}

export const TOOLTIP_FAMILY = createAnatomyFamily('base-tooltip', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    trigger: { cardinality: { min: 0, max: 1 } },
    portal: { cardinality: { min: 0, max: 1 } },
    content: { cardinality: { min: 0, max: 1 } },
    arrow: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'trigger' },
    { kind: 'contains', parent: 'root', child: 'portal' },
    { kind: 'contains', parent: 'portal', child: 'content' },
    { kind: 'contains', parent: 'content', child: 'arrow' },
    { kind: 'contains', parent: 'root', child: 'content' },
  ],
});

export const TOOLTIP_CONTEXT = createContextKey<TooltipContextValue>('base-tooltip');
