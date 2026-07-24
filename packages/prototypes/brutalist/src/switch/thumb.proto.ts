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
  'bg-main',
  'shadow-[3px_3px_0_0_#000]',
  'translate-x-0',
].join(' ');

const switchThumb = definePrototype<BrutalistSwitchThumbProps, BrutalistSwitchThumbExposes>({
  name: 'brutalist-switch-thumb',
  setup(def) {
    asSwitchThumb();
    def.feedback.style.use(tw(THUMB_TOKENS));
  },
});

export default switchThumb;
