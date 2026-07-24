import { definePrototype, tw } from '@proto.ui/core';
import { asDropdownItem } from '@proto.ui/prototypes-base/dropdown';
import type { BrutalistDropdownItemExposes, BrutalistDropdownItemProps } from './types';

const ITEM_BASE_TOKENS =
  'relative flex w-full cursor-default select-none items-center gap-2 rounded-none px-2 py-1.5 text-left font-mono text-sm outline-none';

const dropdownItem = definePrototype<BrutalistDropdownItemProps, BrutalistDropdownItemExposes>({
  name: 'brutalist-dropdown-item',
  setup(def) {
    // P-BRUTALIST-DROPDOWN-MENU-ITEM-VISUAL-PROPS
    def.props.define({
      inset: { type: 'boolean', empty: 'fallback' },
      variant: { type: 'enum', empty: 'fallback', options: ['default', 'destructive'] },
    });
    def.props.setDefaults({ inset: false, variant: 'default' });

    // P-BRUTALIST-DROPDOWN-MENU-ITEM-BASE-INHERITANCE,
    // P-BRUTALIST-DROPDOWN-MENU-ITEM-CURRENT-BASE-DEVIATIONS
    const itemState = asDropdownItem().stateHandles;
    if (!itemState) {
      throw new Error('[brutalist-dropdown-item] Dropdown Item must project command states.');
    }
    const { disabled, hovered, focused, focusVisible, pressed, active } = itemState;

    // P-BRUTALIST-DROPDOWN-MENU-ITEM-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw(ITEM_BASE_TOKENS));
    // P-BRUTALIST-DROPDOWN-MENU-ITEM-STATE-DRIVEN-STYLES
    def.rule({
      when: (w) => w.prop('inset').eq(true),
      intent: (i) => i.feedback.style.use(tw('pl-8')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('destructive'),
      intent: (i) => i.feedback.style.use(tw('text-destructive')),
    });
    def.rule({
      when: (w) =>
        w.any(
          w.state(active).eq(true),
          w.state(hovered).eq(true),
          w.state(focused).eq(true),
          w.state(focusVisible).eq(true)
        ),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    def.rule({
      when: (w) => w.all(w.state(active).eq(true), w.prop('variant').eq('destructive')),
      intent: (i) => i.feedback.style.use(tw('bg-destructive/10 text-destructive')),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });
  },
});

/** P-BRUTALIST-DROPDOWN-MENU-ITEM-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DROPDOWN-MENU-ITEM-COMPATIBILITY-SUBSET. */

export default dropdownItem;
