import { definePrototype, tw } from '@proto.ui/core';
import { asDropdownLabel } from '@proto.ui/prototypes-base/dropdown';
import type { ShadcnDropdownLabelProps } from './types';
export default definePrototype<ShadcnDropdownLabelProps>({
  name: 'shadcn-dropdown-label',
  setup(def) {
    asDropdownLabel();
    // P-SHADCN-DROPDOWN-MENU-LABEL-INSET: family paint only; Base owns naming.
    def.props.define({ inset: { type: 'boolean', empty: 'fallback' } });
    def.props.setDefaults({ inset: false });
    def.feedback.style.use(tw('py-1.5 text-sm font-medium'));
    // Fixed New York uses physical LEFT inset, including RTL (not inline-start).
    // Mutually exclusive complete sides avoid overlapping px/pl declarations.
    def.rule({
      when: (w) => w.prop('inset').eq(false),
      intent: (i) => i.feedback.style.use(tw('pl-2 pr-2')),
    });
    def.rule({
      when: (w) => w.prop('inset').eq(true),
      intent: (i) => i.feedback.style.use(tw('pl-8 pr-2')),
    });
  },
});
