import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardActionAsHookContract, CardActionExposes, CardActionProps } from './types';

export type {
  CardActionProps,
  CardActionExposes,
  CardActionStateHandles,
  CardActionAsHookContract,
} from './types';

function setupCardAction(def: DefHandle<CardActionProps, CardActionExposes>): void {
  // P-BASE-CARD-ACTION-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'action' });
}

// P-BASE-CARD-ACTION-AUTHORING-ENTRIES
export const asCardAction = defineAsHook<
  CardActionProps,
  CardActionExposes,
  CardActionAsHookContract
>({
  name: 'as-card-action',
  setup: setupCardAction,
});

const cardAction = definePrototype({
  name: 'base-card-action',
  setup: setupCardAction,
});

export default cardAction;
