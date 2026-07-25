import { definePrototype, tw } from '@proto.ui/core';
import { asSwitchRoot } from '@proto.ui/prototypes-base/switch';
import { BRUTALIST_DISABLED_TOKENS, BRUTALIST_FOCUS_TOKENS } from '../style';
import type { BrutalistSwitchRootExposes, BrutalistSwitchRootProps } from './types';

const ROOT_BASE_TOKENS = [
  'peer',
  'inline-flex',
  'h-7',
  'w-12',
  'shrink-0',
  'items-center',
  'rounded-none',
  'border-2',
  'border-black',
  'bg-secondary-background',
  'pl-0.5',
  'pr-5',
  'shadow-[5px_5px_0_0_var(--pui-foreground)]',
  'outline-none',
  'select-none',
].join(' ');

const switchRoot = definePrototype<BrutalistSwitchRootProps, BrutalistSwitchRootExposes>({
  name: 'brutalist-switch-root',
  setup(def) {
    const switchState = asSwitchRoot().stateHandles;
    if (!switchState) {
      throw new Error(
        '[brutalist-switch-root] asSwitchRoot must project Switch root state handles.'
      );
    }
    const { checked, disabled, focusVisible } = switchState;

    def.feedback.style.use(tw(ROOT_BASE_TOKENS));

    def.rule({
      when: (w) => w.state(checked).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground pl-5 pr-0.5')),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_FOCUS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_DISABLED_TOKENS)),
    });
  },
});

export default switchRoot;
