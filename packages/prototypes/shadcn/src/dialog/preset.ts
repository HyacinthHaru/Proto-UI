import type { ShadcnComponentPresetRecipe } from '../component-presets.types';

/**
 * Component-local composition recipe for the Shadcn Dialog Content convenience facade.
 * Visual tokens remain owned by the referenced Content and CloseIcon prototypes.
 */
export const shadcnDialogComponentPreset = {
  kind: 'replaceable-default-part',
  placement: 'direct-child',
  exportName: 'ShadcnDialogContent',
  rootPrototype: 'shadcnDialogContent',
  defaultPartPrototype: 'shadcnDialogCloseIcon',
  inputName: 'close',
  elementName: 'proto-ui-shadcn-dialog-content',
  omissionAttribute: 'data-pui-no-default-close',
} as const satisfies ShadcnComponentPresetRecipe;

export default shadcnDialogComponentPreset;
