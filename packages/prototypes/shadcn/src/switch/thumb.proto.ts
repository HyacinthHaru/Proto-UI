import { definePrototype, tw } from '@proto.ui/core';
import { asSwitchThumb } from '@proto.ui/prototypes-base/switch';
import type { ShadcnSwitchThumbExposes, ShadcnSwitchThumbProps } from './types';

const THUMB_TOKENS = [
  'pointer-events-none',
  'block',
  'size-5',
  'rounded-full',
  'bg-background',
  'border',
  'border-border/50',
  'shadow-lg',
  'ring-0',
  'transition-all',
  'duration-200',
  'ease-in-out',
  'will-change-transform',
  'translate-x-0',
].join(' ');

const switchThumb = definePrototype<ShadcnSwitchThumbProps, ShadcnSwitchThumbExposes>({
  name: 'shadcn-switch-thumb',
  setup(def) {
    // P-SHADCN-SWITCH-THUMB-BASE-INHERITANCE,
    // P-SHADCN-SWITCH-THUMB-CURRENT-BASE-DEVIATIONS,
    // P-SHADCN-SWITCH-THUMB-CONTEXT-INDICATOR
    const switchState = asSwitchThumb().stateHandles;
    if (!switchState) {
      throw new Error(
        '[shadcn-switch-thumb] asSwitchThumb must project Switch thumb state handles.'
      );
    }
    const { checked } = switchState;
    // P-SHADCN-SWITCH-THUMB-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw(THUMB_TOKENS));
    def.rule({
      when: (w) => w.state(checked).eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-x-5')),
    });
  },
});

/**
 * P-SHADCN-SWITCH-THUMB-DIRECT-ENTRY exposes the current anatomy part.
 * P-SHADCN-SWITCH-THUMB-COMPATIBILITY-SUBSET keeps the upstream composition
 * and token differences outside the passing claim.
 */

export default switchThumb;
