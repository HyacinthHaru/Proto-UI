/** Source: neobrutalism-components 3306a802; see THIRD_PARTY_NOTICES.md. */
export const BRUTALIST_FOCUS_TOKENS =
  'outline-none ring-2 ring-ring ring-offset-2 ring-offset-background';

/** Text-bearing prototypes carry their family, independently of surrounding page CSS. */
const BRUTALIST_TEXT_TOKENS = 'font-sans font-medium';

/** Common geometry; elevation belongs to the component role, not every surface. */
export const BRUTALIST_STRUCTURE_TOKENS = [
  'rounded-base',
  'border-2',
  'border-black',
  'shadow-[4px_4px_0_0_#000]',
  BRUTALIST_TEXT_TOKENS,
].join(' ');
export const BRUTALIST_CONTROL_TOKENS = [
  BRUTALIST_STRUCTURE_TOKENS,
  'bg-secondary-background',
  'text-foreground',
].join(' ');

/** Popup/menu surface: upstream panels do not all receive Button elevation. */
export const BRUTALIST_PANEL_TOKENS = [
  'rounded-base',
  'border-2',
  'border-black',
  'bg-background',
  'text-foreground',
  BRUTALIST_TEXT_TOKENS,
].join(' ');

/** Legacy export retained for consumers; the canonical default now settles into its shadow. */
export const BRUTALIST_HOVER_LIFT_TOKENS = 'translate-x-1 translate-y-1 shadow-none';
export const BRUTALIST_PRESS_TOKENS = 'translate-x-1 translate-y-1 shadow-none';
export const BRUTALIST_DISABLED_TOKENS = 'pointer-events-none opacity-50';

/** A translated interactive body must retain the original pointer envelope.
 * The transparent pseudo-element belongs to the same host (no second event
 * owner); include its 2px border because absolute insets start at the padding
 * edge. It exists only while feedback moves the body into its hard shadow. */
export const BRUTALIST_MOTION_HIT_TOKENS = 'relative hit-envelope-translate-1';
