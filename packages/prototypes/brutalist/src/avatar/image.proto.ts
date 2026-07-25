import { definePrototype, tw } from '@proto.ui/core';
import { asAvatarImage } from '@proto.ui/prototypes-base';
import type { BrutalistAvatarImageExposes, BrutalistAvatarImageProps } from './types';

export const BrutalistAvatarImage = definePrototype<
  BrutalistAvatarImageProps,
  BrutalistAvatarImageExposes
>({
  name: 'brutalist-avatar-image',
  setup(def) {
    asAvatarImage();
    def.feedback.style.use(tw('aspect-square size-full object-cover'));
    return (renderer) => [renderer.r.slot()];
  },
});
