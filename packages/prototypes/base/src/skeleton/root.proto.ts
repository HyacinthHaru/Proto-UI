import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type { SkeletonRootAsHookContract, SkeletonRootExposes, SkeletonRootProps } from './types';

export type {
  SkeletonRootProps,
  SkeletonRootExposes,
  SkeletonRootStateHandles,
  SkeletonRootAsHookContract,
} from './types';

function setupSkeletonRoot(def: DefHandle<SkeletonRootProps, SkeletonRootExposes>): void {
  def.a11y.tree({ hidden: true });
}

export const asSkeletonRoot = defineAsHook<
  SkeletonRootProps,
  SkeletonRootExposes,
  SkeletonRootAsHookContract
>({ name: 'as-skeleton-root', setup: setupSkeletonRoot });

const skeletonRoot = definePrototype({ name: 'base-skeleton-root', setup: setupSkeletonRoot });
export default skeletonRoot;
