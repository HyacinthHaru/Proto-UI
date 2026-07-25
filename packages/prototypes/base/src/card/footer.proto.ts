import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardFooterAsHookContract, CardFooterExposes, CardFooterProps } from './types';

export type {
  CardFooterProps,
  CardFooterExposes,
  CardFooterStateHandles,
  CardFooterAsHookContract,
} from './types';

function setupCardFooter(def: DefHandle<CardFooterProps, CardFooterExposes>): void {
  // P-BASE-CARD-FOOTER-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'footer' });
}

// P-BASE-CARD-FOOTER-AUTHORING-ENTRIES
export const asCardFooter = defineAsHook<
  CardFooterProps,
  CardFooterExposes,
  CardFooterAsHookContract
>({
  name: 'as-card-footer',
  setup: setupCardFooter,
});

const cardFooter = definePrototype({
  name: 'base-card-footer',
  setup: setupCardFooter,
});

export default cardFooter;
