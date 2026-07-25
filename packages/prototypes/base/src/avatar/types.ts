import { ExposeState, State } from '@proto.ui/core';

// P-BASE-AVATAR-ROOT
export interface AvatarRootProps {}

export type AvatarRootExposes = {};

export type AvatarRootStateHandles = {};

export type AvatarRootAsHookContract = {};

// P-BASE-AVATAR-IMAGE
export interface AvatarImageProps {
  src?: string;
  alt?: string;
}

export type AvatarImageExposes = {
  loaded: ExposeState<boolean>;
};

export type AvatarImageStateHandles = {
  loaded: State<boolean>;
};

export type AvatarImageAsHookContract = {
  state: AvatarImageStateHandles;
};

// P-BASE-AVATAR-FALLBACK
export interface AvatarFallbackProps {}

export type AvatarFallbackExposes = {};

export type AvatarFallbackStateHandles = {};

export type AvatarFallbackAsHookContract = {};
