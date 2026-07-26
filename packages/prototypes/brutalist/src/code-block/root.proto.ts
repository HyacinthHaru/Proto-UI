import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockRoot } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockRootExposes, BrutalistCodeBlockRootProps } from './types';

export const BrutalistCodeBlockRoot = definePrototype<
  BrutalistCodeBlockRootProps,
  BrutalistCodeBlockRootExposes
>({
  name: 'brutalist-code-block-root',
  setup(def) {
    asCodeBlockRoot();
    def.feedback.style.use(
      tw(
        'flex flex-col overflow-hidden rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_var(--pui-foreground)]'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});

export default BrutalistCodeBlockRoot;
