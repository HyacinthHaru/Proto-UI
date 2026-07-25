export interface ShadcnComponentPresetRecipe {
  readonly kind: 'replaceable-default-part';
  readonly placement: 'direct-child';
  readonly exportName: string;
  readonly rootPrototype: string;
  readonly defaultPartPrototype: string;
  readonly inputName: string;
  readonly elementName: string;
  readonly omissionAttribute: string;
}
