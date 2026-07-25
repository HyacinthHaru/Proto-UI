import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type {
  CardDescriptionAsHookContract,
  CardDescriptionExposes,
  CardDescriptionProps,
} from './types';

export type {
  CardDescriptionProps,
  CardDescriptionExposes,
  CardDescriptionStateHandles,
  CardDescriptionAsHookContract,
} from './types';

function setupCardDescription(def: DefHandle<CardDescriptionProps, CardDescriptionExposes>): void {
  // P-BASE-CARD-DESCRIPTION-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'description' });
}

// P-BASE-CARD-DESCRIPTION-AUTHORING-ENTRIES
export const asCardDescription = defineAsHook<
  CardDescriptionProps,
  CardDescriptionExposes,
  CardDescriptionAsHookContract
>({
  name: 'as-card-description',
  setup: setupCardDescription,
});

const cardDescription = definePrototype({
  name: 'base-card-description',
  setup: setupCardDescription,
});

export default cardDescription;
