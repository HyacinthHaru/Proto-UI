import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import type { SurfaceRootProps, SurfaceRootExposes, SurfaceRootAsHookContract } from './types';

function setupSurfaceRoot(def: DefHandle<SurfaceRootProps, SurfaceRootExposes>) {
  def.props.define({
    variant: {
      type: 'enum',
      empty: 'fallback',
      options: ['transparent', 'outline', 'secondary', 'muted', 'accent', 'solid'],
    },
    radius: {
      type: 'enum',
      empty: 'fallback',
      options: ['default', 'none', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    border: { type: 'enum', empty: 'fallback', options: ['all', 'bottom', 'none'] },
    elevation: { type: 'enum', empty: 'fallback', options: ['none', 'raised'] },
    hovered: { type: 'boolean', empty: 'fallback' },
    focusVisible: { type: 'boolean', empty: 'fallback' },
    pressed: { type: 'boolean', empty: 'fallback' },
    current: { type: 'boolean', empty: 'fallback' },
  });
  def.props.setDefaults({
    variant: 'outline',
    radius: 'default',
    border: 'all',
    elevation: 'none',
    hovered: false,
    focusVisible: false,
    pressed: false,
    current: false,
  });
  // No semantic role, focus, activation, native property, or host event channel.
  return (renderer: Parameters<import('@proto.ui/core').RenderFn>[0]) => renderer.r.slot();
}
export const asSurfaceRoot = defineAsHook<
  SurfaceRootProps,
  SurfaceRootExposes,
  SurfaceRootAsHookContract
>({ name: 'as-surface-root', setup: setupSurfaceRoot });
export const surfaceRoot = definePrototype<SurfaceRootProps, SurfaceRootExposes>({
  name: 'base-surface-root',
  setup: setupSurfaceRoot,
});
export default surfaceRoot;
