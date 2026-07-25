import type { ExposeState } from '@proto.ui/core';

export interface ComposerRootProps {
  disabled?: boolean;
}

export type ComposerRootStateHandles = {
  disabled: ExposeState<boolean>;
};

export interface ComposerRootExposes extends ComposerRootStateHandles {}

export type ComposerRootAsHookContract = {
  state: ComposerRootStateHandles;
};

export interface ComposerInputProps {
  disabled?: boolean;
}

export type ComposerInputStateHandles = {
  disabled: ExposeState<boolean>;
};

export interface ComposerInputExposes extends ComposerInputStateHandles {}

export type ComposerInputAsHookContract = {
  state: ComposerInputStateHandles;
};

export interface ComposerActionsProps {
  disabled?: boolean;
}

export type ComposerActionsStateHandles = {
  disabled: ExposeState<boolean>;
};

export interface ComposerActionsExposes extends ComposerActionsStateHandles {}

export type ComposerActionsAsHookContract = {
  state: ComposerActionsStateHandles;
};

export interface ComposerSendButtonProps {
  disabled?: boolean;
}

export type ComposerSendButtonStateHandles = {
  disabled: ExposeState<boolean>;
};

export interface ComposerSendButtonExposes extends ComposerSendButtonStateHandles {}

export type ComposerSendButtonAsHookContract = {
  state: ComposerSendButtonStateHandles;
};
