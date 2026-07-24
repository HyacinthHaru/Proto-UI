import { definePrototype, tw } from '@proto.ui/core';
import { asDialogTrigger } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogTriggerExposes, BrutalistDialogTriggerProps } from './types';

const TRIGGER_TOKENS = [
  'group/brutalist-dialog-trigger',
  'inline-flex',
  'shrink-0',
  'items-center',
  'justify-center',
  'rounded-none',
  'border-2',
  'border-black',
  'bg-main',
  'text-main-foreground',
  'font-bold',
  'uppercase',
  'text-sm',
  'whitespace-nowrap',
  'outline-none',
  'select-none',
  'h-10',
  'gap-2',
  'px-4',
  'shadow-[5px_5px_0_0_#000]',
].join(' ');

const dialogTrigger = definePrototype<BrutalistDialogTriggerProps, BrutalistDialogTriggerExposes>({
  name: 'brutalist-dialog-trigger',
  setup(def) {
    asDialogTrigger();
    def.feedback.style.use(tw(TRIGGER_TOKENS));
  },
});

export default dialogTrigger;
