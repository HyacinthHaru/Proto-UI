import { definePrototype, tw } from '@proto.ui/core';
import { asAvatarRoot } from '@proto.ui/prototypes-base';
import type { BrutalistAvatarRootExposes, BrutalistAvatarRootProps } from './types';

export const BrutalistAvatarRoot = definePrototype<
  BrutalistAvatarRootProps,
  BrutalistAvatarRootExposes
>({
  name: 'brutalist-avatar-root',
  setup(def) {
    asAvatarRoot();
    def.feedback.style.use(
      tw(
        'relative flex size-10 shrink-0 overflow-hidden rounded-none border-2 border-foreground bg-background shadow-[3px_3px_0_0_var(--pui-foreground)]'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
