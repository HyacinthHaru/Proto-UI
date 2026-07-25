import composerRoot from './root.proto';
import composerInput from './input.proto';
import composerActions from './actions.proto';
import composerSendButton from './send-button.proto';

export type * from './types';

export type ComposerParts = {
  root: typeof composerRoot;
  input: typeof composerInput;
  actions: typeof composerActions;
  sendButton: typeof composerSendButton;
};
export { composerRoot, composerInput, composerActions, composerSendButton };
export { asComposerRoot } from './root.proto';
export { asComposerInput } from './input.proto';
export { asComposerActions } from './actions.proto';
export { asComposerSendButton } from './send-button.proto';

export default composerRoot;
