import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { CARD_FAMILY } from './shared';
import type { CardTitleAsHookContract, CardTitleExposes, CardTitleProps } from './types';

export type {
  CardTitleProps,
  CardTitleExposes,
  CardTitleStateHandles,
  CardTitleAsHookContract,
} from './types';

function setupCardTitle(def: DefHandle<CardTitleProps, CardTitleExposes>): void {
  // P-BASE-CARD-TITLE-ANATOMY
  def.anatomy.claim(CARD_FAMILY, { role: 'title' });
}

// P-BASE-CARD-TITLE-AUTHORING-ENTRIES
export const asCardTitle = defineAsHook<CardTitleProps, CardTitleExposes, CardTitleAsHookContract>({
  name: 'as-card-title',
  setup: setupCardTitle,
});

const cardTitle = definePrototype({
  name: 'base-card-title',
  setup: setupCardTitle,
});

export default cardTitle;
