import { definePrototype, tw } from '@proto.ui/core';
import { asTextareaRoot } from '@proto.ui/prototypes-base';
import { BRUTALIST_DISABLED_TOKENS, BRUTALIST_FOCUS_TOKENS } from '../shared';
import type { BrutalistTextareaRootExposes, BrutalistTextareaRootProps } from './types';

export const BrutalistTextareaRoot = definePrototype<
  BrutalistTextareaRootProps,
  BrutalistTextareaRootExposes
>({
  name: 'brutalist-textarea-root',
  setup(def) {
    const state = asTextareaRoot().stateHandles;
    if (!state) throw new Error('[brutalist-textarea-root] Base Textarea states are required.');
    const { disabled, focusVisible } = state;
    def.feedback.style.use(
      tw(
        'flex min-h-24 w-full min-w-0 resize-y rounded-none border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground shadow-[3px_3px_0_0_var(--pui-foreground)] outline-none'
      )
    );
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
