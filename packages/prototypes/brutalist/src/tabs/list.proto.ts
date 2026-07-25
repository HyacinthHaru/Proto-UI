import { definePrototype, tw } from '@proto.ui/core';
import { asTabsList } from '@proto.ui/prototypes-base/tabs';
import type { BrutalistTabsListExposes, BrutalistTabsListProps } from './types';

const tabsList = definePrototype<BrutalistTabsListProps, BrutalistTabsListExposes>({
  name: 'brutalist-tabs-list',
  setup(def) {
    asTabsList();
    def.feedback.style.use(
      tw(
        'inline-flex h-11 items-center rounded-none border-2 border-black bg-secondary-background p-1 text-foreground shadow-[5px_5px_0_0_var(--pui-foreground)]'
      )
    );
  },
});

export default tabsList;
