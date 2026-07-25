import { definePrototype, tw } from '@proto.ui/core';
import { asSwitchRoot } from '@proto.ui/prototypes-base/switch';
import type { ShadcnSwitchRootExposes, ShadcnSwitchRootProps } from './types';

const ROOT_BASE_TOKENS = [
  'peer',
  'inline-flex',
  'h-6',
  'w-11',
  'shrink-0',
  'items-center',
  'rounded-full',
  'border',
  'border-transparent',
  'px-0.5',
  'shadow-xs',
  'transition-all',
  'duration-200',
  'ease-in-out',
  'outline-none',
  'bg-input/80',
  'select-none',
].join(' ');

const switchRoot = definePrototype<ShadcnSwitchRootProps, ShadcnSwitchRootExposes>({
  name: 'shadcn-switch-root',
  setup(def) {
    // P-SHADCN-SWITCH-BASE-INHERITANCE,
    // P-SHADCN-SWITCH-CURRENT-BASE-DEVIATIONS
    const switchState = asSwitchRoot().stateHandles;
    if (!switchState) {
      throw new Error('[shadcn-switch-root] asSwitchRoot must project Switch root state handles.');
    }
    const { checked, disabled, hovered, focusVisible, pressed } = switchState;
    // P-SHADCN-SWITCH-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw(ROOT_BASE_TOKENS));

    // P-SHADCN-SWITCH-STATE-DRIVEN-STYLES
    def.rule({
      when: (w) => w.state(checked).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-primary text-primary-foreground')),
    });

    def.rule({
      when: (w) => w.all(w.state(checked).eq(false), w.state(hovered).eq(true)),
      intent: (i) => i.feedback.style.use(tw('bg-input')),
    });

    def.rule({
      when: (w) => w.all(w.state(checked).eq(true), w.state(hovered).eq(true)),
      intent: (i) => i.feedback.style.use(tw('bg-primary/90')),
    });

    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw('scale-[0.98]')),
    });

    def.rule({
      // Use the Switch-root focusVisible handle so web style projection can emit
      // data-[focus-visible] tokens for custom-element focus.
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) =>
        i.feedback.style.use(tw('ring-3 ring-ring/50 ring-offset-2 ring-offset-background')),
    });

    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });

    def.rule({
      when: (w) => w.all(w.meta('colorScheme').eq('dark'), w.state(checked).eq(false)),
      intent: (i) => i.feedback.style.use(tw('bg-input/50')),
    });

    def.rule({
      when: (w) => w.all(w.meta('colorScheme').eq('dark'), w.state(checked).eq(true)),
      intent: (i) => i.feedback.style.use(tw('bg-primary')),
    });
  },
});

/**
 * P-SHADCN-SWITCH-DIRECT-ENTRY exposes the current Root projection.
 * P-SHADCN-SWITCH-COMPATIBILITY-SUBSET and P-SHADCN-SWITCH-AS-CHILD-OMISSION
 * keep upstream parity outside the passing claim unless it is implemented and tested.
 */

export default switchRoot;
