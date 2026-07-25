import dialogClose from './close.proto';
import dialogContent from './content.proto';
import dialogCloseIcon from './close-icon.proto';
import dialogDescription from './description.proto';
import dialogMask from './overlay.proto';
import dialogRoot from './root.proto';
import dialogTitle from './title.proto';
import dialogTrigger from './trigger.proto';
import dialogHeader from './header.proto';
import dialogFooter from './footer.proto';

export type {
  ShadcnDialogRootProps,
  ShadcnDialogRootExposes,
  ShadcnDialogRootAsHookContract,
  ShadcnDialogTriggerProps,
  ShadcnDialogTriggerExposes,
  ShadcnDialogTriggerAsHookContract,
  ShadcnDialogMaskProps,
  ShadcnDialogMaskExposes,
  ShadcnDialogMaskAsHookContract,
  ShadcnDialogContentProps,
  ShadcnDialogContentExposes,
  ShadcnDialogContentAsHookContract,
  ShadcnDialogTitleProps,
  ShadcnDialogTitleExposes,
  ShadcnDialogTitleAsHookContract,
  ShadcnDialogDescriptionProps,
  ShadcnDialogDescriptionExposes,
  ShadcnDialogDescriptionAsHookContract,
  ShadcnDialogCloseProps,
  ShadcnDialogCloseExposes,
  ShadcnDialogCloseAsHookContract,
} from './types';

export {
  dialogRoot,
  dialogTrigger,
  dialogMask,
  dialogContent,
  dialogTitle,
  dialogDescription,
  dialogClose,
  dialogCloseIcon,
  dialogHeader,
  dialogFooter,
};

export { default as shadcnDialogRoot } from './root.proto';
export { default as shadcnDialogTrigger } from './trigger.proto';
export { default as shadcnDialogMask } from './overlay.proto';
export { default as shadcnDialogContent } from './content.proto';
export { default as shadcnDialogTitle } from './title.proto';
export { default as shadcnDialogDescription } from './description.proto';
export { default as shadcnDialogClose } from './close.proto';
export { default as shadcnDialogCloseIcon } from './close-icon.proto';
export { default as shadcnDialogHeader } from './header.proto';
export { default as shadcnDialogFooter } from './footer.proto';
export { default as componentPreset, shadcnDialogComponentPreset } from './preset';
