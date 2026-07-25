import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { AVATAR_FAMILY } from './shared';
import type { AvatarRootAsHookContract, AvatarRootExposes, AvatarRootProps } from './types';

export type {
  AvatarRootProps,
  AvatarRootExposes,
  AvatarRootStateHandles,
  AvatarRootAsHookContract,
} from './types';

function setupAvatarRoot(def: DefHandle<AvatarRootProps, AvatarRootExposes>): void {
  // P-BASE-AVATAR-ROOT-ANATOMY-CLAIM, P-BASE-AVATAR-ROOT-ROLE
  def.anatomy.claim(AVATAR_FAMILY, { role: 'root' });
}

// P-BASE-AVATAR-ROOT-AUTHORING-ENTRIES
export const asAvatarRoot = defineAsHook<
  AvatarRootProps,
  AvatarRootExposes,
  AvatarRootAsHookContract
>({
  name: 'as-avatar-root',
  setup: setupAvatarRoot,
});

const avatarRoot = definePrototype({
  name: 'base-avatar-root',
  setup: setupAvatarRoot,
});

export default avatarRoot;
