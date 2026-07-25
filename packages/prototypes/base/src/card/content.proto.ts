import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardContentAsHookContract, CardContentExposes, CardContentProps } from './types';

export type {
  CardContentProps,
  CardContentExposes,
  CardContentStateHandles,
  CardContentAsHookContract,
} from './types';

function setupCardContent(def: DefHandle<CardContentProps, CardContentExposes>): void {
  // P-BASE-CARD-CONTENT-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'content' });
}

// P-BASE-CARD-CONTENT-AUTHORING-ENTRIES
export const asCardContent = defineAsHook<
  CardContentProps,
  CardContentExposes,
  CardContentAsHookContract
>({
  name: 'as-card-content',
  setup: setupCardContent,
});

const cardContent = definePrototype({
  name: 'base-card-content',
  setup: setupCardContent,
});

export default cardContent;
