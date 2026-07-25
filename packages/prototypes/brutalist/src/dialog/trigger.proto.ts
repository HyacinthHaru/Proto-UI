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
  'border-foreground',
  'bg-sky',
  'text-sky-foreground',
  'font-bold',
  'uppercase',
  'text-sm',
  'whitespace-nowrap',
  'outline-none',
  'select-none',
  'h-10',
  'gap-2',
  'px-4',
  'shadow-[3px_3px_0_0_var(--pui-foreground)]',
].join(' ');

const dialogTrigger = definePrototype<BrutalistDialogTriggerProps, BrutalistDialogTriggerExposes>({
  name: 'brutalist-dialog-trigger',
  setup(def) {
    const state = asDialogTrigger().stateHandles;
    if (!state) {
      throw new Error('[brutalist-dialog-trigger] missing Dialog Trigger state handles.');
    }
    const { disabled, hovered, focusVisible, pressed } = state;
    def.feedback.style.use(tw(TRIGGER_TOKENS));
    def.rule({
      when: (w) => w.state(hovered).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('-translate-x-px -translate-y-px shadow-[4px_4px_0_0_var(--pui-foreground)]')
        ),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-x-px translate-y-px shadow-none')),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('outline-none ring-2 ring-ring ring-offset-2 ring-offset-background')
        ),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });
  },
});

export default dialogTrigger;
