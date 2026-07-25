import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardHeaderAsHookContract, CardHeaderExposes, CardHeaderProps } from './types';

export type {
  CardHeaderProps,
  CardHeaderExposes,
  CardHeaderStateHandles,
  CardHeaderAsHookContract,
} from './types';

function setupCardHeader(def: DefHandle<CardHeaderProps, CardHeaderExposes>): void {
  // P-BASE-CARD-HEADER-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'header' });
}

// P-BASE-CARD-HEADER-AUTHORING-ENTRIES
export const asCardHeader = defineAsHook<
  CardHeaderProps,
  CardHeaderExposes,
  CardHeaderAsHookContract
>({
  name: 'as-card-header',
  setup: setupCardHeader,
});

const cardHeader = definePrototype({
  name: 'base-card-header',
  setup: setupCardHeader,
});

export default cardHeader;
