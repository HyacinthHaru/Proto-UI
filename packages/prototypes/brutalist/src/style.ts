export const BRUTALIST_FOCUS_TOKENS =
  'outline-none ring-2 ring-ring ring-offset-2 ring-offset-background';

/** Shared structure without fill colors — fills come from paired variant/color rules. */
export const BRUTALIST_STRUCTURE_TOKENS = [
  'rounded-none',
  'border-2',
  'border-black',
  'shadow-[3px_3px_0_0_#000]',
  'font-mono',
].join(' ');

/** Default control shell: structure + theme-paired surface fill. */
export const BRUTALIST_CONTROL_TOKENS = [
  BRUTALIST_STRUCTURE_TOKENS,
  'bg-secondary-background',
  'text-foreground',
].join(' ');

export const BRUTALIST_PANEL_TOKENS = [
  'rounded-none',
  'border-2',
  'border-black',
  'shadow-[3px_3px_0_0_#000]',
  'bg-secondary-background',
  'text-foreground',
].join(' ');

export const BRUTALIST_HOVER_LIFT_TOKENS =
  '-translate-x-px -translate-y-px shadow-[4px_4px_0_0_#000]';
export const BRUTALIST_PRESS_TOKENS = 'translate-x-px translate-y-px shadow-none';
export const BRUTALIST_DISABLED_TOKENS = 'pointer-events-none opacity-50';
