import { definePrototype, tw } from '@proto.ui/core';
import { asToggle } from '@proto.ui/prototypes-base/toggle';
import type { ShadcnToggleExposes, ShadcnToggleProps } from './types';

// shadcn-ui/ui 02cad611, new-york-v4/ui/toggle.tsx.
// Preserve Base ownership; select-none remains the declared action-surface policy.
const TOGGLE_BASE_TOKENS = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'rounded-md',
  'text-sm',
  'font-medium',
  'transition-[color,box-shadow]',
  'outline-none',
  'whitespace-nowrap',
  'select-none',
].join(' ');

const VARIANT_TOKENS: Record<NonNullable<ShadcnToggleProps['variant']>, string> = {
  default: 'bg-transparent',
  outline: 'border border-input bg-transparent shadow-xs',
};

const SIZE_TOKENS: Record<NonNullable<ShadcnToggleProps['size']>, string> = {
  default: 'h-9 min-w-9 px-2',
  sm: 'h-8 min-w-8 px-1.5',
  lg: 'h-10 min-w-10 px-2.5',
};

const toggle = definePrototype<ShadcnToggleProps, ShadcnToggleExposes>({
  name: 'shadcn-toggle',
  setup(def) {
    // P-SHADCN-TOGGLE-VARIANT-PROP, P-SHADCN-TOGGLE-SIZE-PROP
    def.props.define({
      variant: { type: 'enum', empty: 'fallback', options: ['default', 'outline'] },
      size: { type: 'enum', empty: 'fallback', options: ['default', 'sm', 'lg'] },
      active: { type: 'boolean', empty: 'fallback' },
      defaultActive: { type: 'boolean', empty: 'fallback' },
      disabled: { type: 'boolean', empty: 'fallback' },
    });
    def.props.setDefaults({
      variant: 'default',
      size: 'default',
      defaultActive: false,
      disabled: false,
    });

    // P-SHADCN-TOGGLE-BASE-INHERITANCE,
    // P-SHADCN-TOGGLE-CURRENT-BASE-DEVIATIONS
    // The current projection keeps every asToggle-introduced behavior. A future
    // setup-only negative patch must first be declared as a P-entity deviation.
    const toggleState = asToggle().stateHandles;
    if (!toggleState) {
      throw new Error('[shadcn-toggle] asToggle must project Toggle state handles.');
    }
    const { active, disabled, hovered, focusVisible } = toggleState;

    // P-SHADCN-TOGGLE-DIRECT-ENTRY
    def.feedback.style.use(tw(TOGGLE_BASE_TOKENS));

    (Object.keys(VARIANT_TOKENS) as Array<NonNullable<ShadcnToggleProps['variant']>>).forEach(
      (variant) => {
        def.rule({
          when: (w) => w.prop('variant').eq(variant),
          intent: (i) => i.feedback.style.use(tw(VARIANT_TOKENS[variant])),
        });
      }
    );

    (Object.keys(SIZE_TOKENS) as Array<NonNullable<ShadcnToggleProps['size']>>).forEach((size) => {
      def.rule({
        when: (w) => w.prop('size').eq(size),
        intent: (i) => i.feedback.style.use(tw(SIZE_TOKENS[size])),
      });
    });

    // P-SHADCN-TOGGLE-STATE-DRIVEN-STYLES
    def.rule({
      when: (w) => w.state(active).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-accent text-accent-foreground')),
    });

    def.rule({
      when: (w) =>
        w.all(
          w.prop('variant').eq('default'),
          w.state(hovered).eq(true),
          w.state(active).eq(false)
        ),
      intent: (i) => i.feedback.style.use(tw('bg-muted text-muted-foreground')),
    });

    def.rule({
      when: (w) =>
        w.all(
          w.prop('variant').eq('outline'),
          w.state(hovered).eq(true),
          w.state(active).eq(false)
        ),
      intent: (i) => i.feedback.style.use(tw('bg-accent text-accent-foreground')),
    });

    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw('border-ring ring-3 ring-ring/50')),
    });

    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });
  },
});

/**
 * P-SHADCN-TOGGLE-COMPATIBILITY-SUBSET:
 * The one catalog open question centralizes every upstream difference.
 * P-SHADCN-TOGGLE-AS-CHILD-OMISSION is intentional under D-AS-CHILD-OMISSION-0001;
 * pressed API aliases, native/className forwarding, invalid/SVG selectors, and
 * native cascade/pixel parity remain review gaps. The size and state recipe
 * follows New York 02cad611; Base activation/active ownership is unchanged.
 */

export type {
  ShadcnToggleProps,
  ShadcnToggleExposes,
  ShadcnToggleStateHandles,
  ShadcnToggleAsHookContract,
} from './types';
export default toggle;
