import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { AVATAR_FAMILY } from './shared';
import type {
  AvatarFallbackAsHookContract,
  AvatarFallbackExposes,
  AvatarFallbackProps,
} from './types';

export type {
  AvatarFallbackProps,
  AvatarFallbackExposes,
  AvatarFallbackStateHandles,
  AvatarFallbackAsHookContract,
} from './types';

function setupAvatarFallback(def: DefHandle<AvatarFallbackProps, AvatarFallbackExposes>): void {
  // P-BASE-AVATAR-FALLBACK-ANATOMY-CLAIM, P-BASE-AVATAR-FALLBACK-ROLE
  def.anatomy.claim(AVATAR_FAMILY, { role: 'fallback' });
}

// P-BASE-AVATAR-FALLBACK-AUTHORING-ENTRIES
export const asAvatarFallback = defineAsHook<
  AvatarFallbackProps,
  AvatarFallbackExposes,
  AvatarFallbackAsHookContract
>({
  name: 'as-avatar-fallback',
  setup: setupAvatarFallback,
});

const avatarFallback = definePrototype({
  name: 'base-avatar-fallback',
  setup: setupAvatarFallback,
});

export default avatarFallback;
