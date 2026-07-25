import { definePrototype, tw } from '@proto.ui/core';
import { asAvatarFallback } from '@proto.ui/prototypes-base';
import type { BrutalistAvatarFallbackExposes, BrutalistAvatarFallbackProps } from './types';

export const BrutalistAvatarFallback = definePrototype<
  BrutalistAvatarFallbackProps,
  BrutalistAvatarFallbackExposes
>({
  name: 'brutalist-avatar-fallback',
  setup(def) {
    asAvatarFallback();
    def.feedback.style.use(
      tw(
        'flex size-full items-center justify-center bg-sky text-sky-foreground font-mono text-sm font-bold uppercase'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
