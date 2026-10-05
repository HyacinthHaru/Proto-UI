import type { TransitionState } from '../transition/types';
/** Passive visual facts. The semantic host remains their sole owner. */
export interface SurfaceRootProps {
  variant?: 'transparent' | 'outline' | 'secondary' | 'muted' | 'accent' | 'solid' | 'scrim';
  radius?: 'default' | 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  border?: 'all' | 'bottom' | 'none';
  elevation?: 'none' | 'raised';
  /** Observed phase of the existing Transition owner, never a second clock. */
  transitionState?: TransitionState;
  fade?: boolean;
  hovered?: boolean;
  focusVisible?: boolean;
  pressed?: boolean;
  current?: boolean;
}
export type SurfaceRootExposes = {};
export type SurfaceRootAsHookContract = { state: {} };
