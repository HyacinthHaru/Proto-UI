export interface ShadcnComponentPresetRecipe {
  readonly kind: 'replaceable-default-part';
  readonly exportName: string;
  readonly rootPrototype: string;
  readonly defaultPartPrototype: string;
  readonly inputName: string;
  readonly elementName: string;
  readonly omissionAttribute: string;
}

/**
 * Prototype-library-owned composition recipes.
 *
 * Recipes declare part identity and replacement policy only. Host facade names
 * for the referenced prototypes remain adapter/CLI registry concerns, and all
 * visual tokens remain owned by the referenced prototypes.
 */
export const shadcnComponentPresets = {
  'shadcn-switch': {
    kind: 'replaceable-default-part',
    exportName: 'ShadcnSwitch',
    rootPrototype: 'shadcnSwitchRoot',
    defaultPartPrototype: 'shadcnSwitchThumb',
    inputName: 'thumb',
    elementName: 'proto-ui-shadcn-switch',
    omissionAttribute: 'data-pui-no-default-thumb',
  },
  'shadcn-dialog': {
    kind: 'replaceable-default-part',
    exportName: 'ShadcnDialogContent',
    rootPrototype: 'shadcnDialogContent',
    defaultPartPrototype: 'shadcnDialogCloseIcon',
    inputName: 'close',
    elementName: 'proto-ui-shadcn-dialog-content',
    omissionAttribute: 'data-pui-no-default-close',
  },
} as const satisfies Record<string, ShadcnComponentPresetRecipe>;

export default shadcnComponentPresets;
