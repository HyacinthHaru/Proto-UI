/** Passive visual facts. The semantic host remains their sole owner. */
export interface SurfaceRootProps {
  variant?: 'transparent' | 'outline' | 'secondary' | 'muted' | 'accent' | 'solid';
  radius?: 'default' | 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  border?: 'all' | 'bottom' | 'none';
  elevation?: 'none' | 'raised';
  hovered?: boolean;
  focusVisible?: boolean;
  pressed?: boolean;
  current?: boolean;
}
export type SurfaceRootExposes = {};
export type SurfaceRootAsHookContract = { state: {} };
