import { shadcnCheckboxLabelComposition as recipe } from '@proto.ui/prototypes-shadcn/checkbox';
import type { DemoChild, DemoNode } from './demo-types';

type PrototypeNode = Extract<DemoNode, { kind: 'proto' }>;
export type CheckboxDemoNodeFactory = (
  id: string,
  children: DemoChild[],
  props: Record<string, unknown>,
  ref?: string,
  associationKey?: string
) => DemoNode;

const prototypeNode: CheckboxDemoNodeFactory = (prototypeId, children, props, ref, key) => ({
  kind: 'proto',
  prototypeId,
  children,
  props,
  ...(ref ? { ref } : {}),
  ...(key ? { associations: { controlLabel: key } } : {}),
});

/** Website projection of the public recommendation, not another component contract.
 * Only serializable intent leaves this function. The existing render-local association
 * scope creates opaque refs; no prototype setup, input handler or checked owner lives here.
 */
export function shadcnCheckboxDemoChildren(
  options: {
    associationKey: string;
    label: DemoChild[];
    controlProps?: PrototypeNode['props'];
    controlRef?: string;
    labelRef?: string;
  },
  node: CheckboxDemoNodeFactory = prototypeNode
): DemoChild[] {
  if (!options.associationKey.trim())
    throw new Error('Checkbox composition needs an association key.');
  if (
    recipe.defaultPart.kind !== 'replaceable-default-part' ||
    recipe.defaultPart.placement !== 'direct-child'
  ) {
    throw new Error('Unsupported public Checkbox default-part placement.');
  }
  const children: Record<'control' | 'label', DemoChild[]> = { control: [], label: options.label };
  children[recipe.structure.indicatorParent].push(node(recipe.parts.indicator.name, [], {}));
  const props = { control: options.controlProps ?? {}, label: { ...recipe.labelProps } };
  const refs = { control: options.controlRef, label: options.labelRef };
  return recipe.structure.siblings.map((part) =>
    node(
      recipe.parts[part].name,
      children[part],
      props[part],
      refs[part],
      recipe.association.participants.includes(part) ? options.associationKey : undefined
    )
  );
}
