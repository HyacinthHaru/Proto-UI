import { definePrototype, tw } from '@proto.ui/core';
import { asSwitchThumb } from '@proto.ui/prototypes-base/switch';
import type { BrutalistSwitchThumbExposes, BrutalistSwitchThumbProps } from './types';

const THUMB_TOKENS = [
  'pointer-events-none',
  'block',
  'size-5',
  'rounded-none',
  'border-2',
  'border-black',
  'bg-foreground',
  'shadow-[3px_3px_0_0_#000]',
  'translate-x-0',
  'transition-none',
].join(' ');

const switchThumb = definePrototype<BrutalistSwitchThumbProps, BrutalistSwitchThumbExposes>({
  name: 'brutalist-switch-thumb',
  setup(def) {
    const switchState = asSwitchThumb().stateHandles;
    if (!switchState) {
      throw new Error(
        '[brutalist-switch-thumb] asSwitchThumb must project Switch thumb state handles.'
      );
    }
    const { checked, pressed } = switchState;
    def.feedback.style.use(tw(THUMB_TOKENS));
    def.rule({
      when: (w) => w.state(checked).eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-x-5 bg-canary')),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-x-px translate-y-px shadow-none')),
    });
  },
});

export default switchThumb;
