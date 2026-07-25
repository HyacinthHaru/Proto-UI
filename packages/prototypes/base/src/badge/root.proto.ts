import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type { BadgeRootAsHookContract, BadgeRootExposes, BadgeRootProps } from './types';

export type {
  BadgeRootProps,
  BadgeRootExposes,
  BadgeRootStateHandles,
  BadgeRootAsHookContract,
} from './types';

function setupBadgeRoot(def: DefHandle<BadgeRootProps, BadgeRootExposes>): void {
  // P-BASE-BADGE-ROOT-PROPS
  def.props.define({
    variant: {
      type: 'enum',
      empty: 'fallback',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  });
  def.props.setDefaults({ variant: 'default' });
}

// P-BASE-BADGE-ROOT-AUTHORING-ENTRIES
export const asBadgeRoot = defineAsHook<BadgeRootProps, BadgeRootExposes, BadgeRootAsHookContract>({
  name: 'as-badge-root',
  setup: setupBadgeRoot,
});

const badgeRoot = definePrototype({
  name: 'base-badge-root',
  setup: setupBadgeRoot,
});

export default badgeRoot;
