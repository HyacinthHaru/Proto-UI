import type { ShadcnComponentPresetRecipe } from '../component-presets.types';

/**
 * Component-local composition recipe for the Shadcn Switch convenience facade.
 * Visual tokens remain owned by the referenced Root and Thumb prototypes.
 */
export const shadcnSwitchComponentPreset = {
  kind: 'replaceable-default-part',
  placement: 'direct-child',
  exportName: 'ShadcnSwitch',
  rootPrototype: 'shadcnSwitchRoot',
  defaultPartPrototype: 'shadcnSwitchThumb',
  inputName: 'thumb',
  elementName: 'proto-ui-shadcn-switch',
  omissionAttribute: 'data-pui-no-default-thumb',
} as const satisfies ShadcnComponentPresetRecipe;

export default shadcnSwitchComponentPreset;
