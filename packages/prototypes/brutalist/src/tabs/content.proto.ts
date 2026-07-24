import { definePrototype, tw } from '@proto.ui/core';
import { asTabsContent } from '@proto.ui/prototypes-base/tabs';
import { BRUTALIST_PANEL_TOKENS } from '../style';
import type { BrutalistTabsContentExposes, BrutalistTabsContentProps } from './types';

const tabsContent = definePrototype<BrutalistTabsContentProps, BrutalistTabsContentExposes>({
  name: 'brutalist-tabs-content',
  setup(def) {
    const contentState = asTabsContent().stateHandles;
    if (!contentState) {
      throw new Error(
        '[brutalist-tabs-content] asTabsContent must project Tabs content state handles.'
      );
    }
    const { hidden } = contentState;

    def.feedback.style.use(
      tw(`block w-full min-h-28 p-4 text-sm leading-6 outline-none ${BRUTALIST_PANEL_TOKENS}`)
    );
    def.rule({
      when: (w) => w.state(hidden).eq(true),
      intent: (i) => i.feedback.style.use(tw('hidden')),
    });
  },
});

export default tabsContent;
