import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardRootAsHookContract, CardRootExposes, CardRootProps } from './types';

export type {
  CardRootProps,
  CardRootExposes,
  CardRootStateHandles,
  CardRootAsHookContract,
} from './types';

function setupCardRoot(def: DefHandle<CardRootProps, CardRootExposes>): void {
  // P-BASE-CARD-ROOT-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'root' });
}

// P-BASE-CARD-ROOT-AUTHORING-ENTRIES
export const asCardRoot = defineAsHook<CardRootProps, CardRootExposes, CardRootAsHookContract>({
  name: 'as-card-root',
  setup: setupCardRoot,
});

const cardRoot = definePrototype({
  name: 'base-card-root',
  setup: setupCardRoot,
});

export default cardRoot;
