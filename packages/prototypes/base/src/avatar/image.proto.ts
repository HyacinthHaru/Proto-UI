import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { AVATAR_FAMILY } from './shared';
import type { AvatarImageAsHookContract, AvatarImageExposes, AvatarImageProps } from './types';

export type {
  AvatarImageProps,
  AvatarImageExposes,
  AvatarImageStateHandles,
  AvatarImageAsHookContract,
} from './types';

function setupAvatarImage(def: DefHandle<AvatarImageProps, AvatarImageExposes>): void {
  // P-BASE-AVATAR-IMAGE-ANATOMY-CLAIM, P-BASE-AVATAR-IMAGE-ROLE
  def.anatomy.claim(AVATAR_FAMILY, { role: 'image' });

  // P-BASE-AVATAR-IMAGE-PROPS
  def.props.define({
    src: { type: 'string', empty: 'fallback' },
    alt: { type: 'string', empty: 'fallback' },
  });
  def.props.setDefaults({ src: '', alt: '' });

  // P-BASE-AVATAR-IMAGE-LOADED-STATE
  const loaded = def.state.bool('loaded', false);
  def.expose.state('loaded', loaded);

  // P-BASE-AVATAR-IMAGE-INIT-LOADED
  def.lifecycle.onCreated((run) => {
    const props = run.props.get();
    loaded.set(props.src ? false : true, 'reason: avatar image init loaded');
  });
}

// P-BASE-AVATAR-IMAGE-AUTHORING-ENTRIES
export const asAvatarImage = defineAsHook<
  AvatarImageProps,
  AvatarImageExposes,
  AvatarImageAsHookContract
>({
  name: 'as-avatar-image',
  setup: setupAvatarImage,
});

const avatarImage = definePrototype({
  name: 'base-avatar-image',
  setup: setupAvatarImage,
});

export default avatarImage;
