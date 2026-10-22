import type { SurfaceRootProps } from '@proto.ui/prototypes-base/surface';
import type { TextRootProps } from '@proto.ui/prototypes-base/text';

export interface ShadcnActionAppearanceOptions {
  emphasis?: 'primary' | 'secondary' | 'minimal';
  hovered?: boolean;
  pressed?: boolean;
  focusVisible?: boolean;
}

/** Public Web composition recipe, not a Link or Button interaction owner.
 * The native anchor supplies every fact and retains navigation/focus semantics.
 * Geometry follows the family's default wrapped Button; tests compare its
 * compiled dimensions rather than maintaining a website-specific height.
 */
export function shadcnActionAppearance(options: ShadcnActionAppearanceOptions = {}): {
  surface: SurfaceRootProps;
  text: TextRootProps;
  layout: Readonly<Record<string, string>>;
} {
  const emphasis = options.emphasis ?? 'primary';
  return {
    surface: {
      variant:
        emphasis === 'primary' ? 'solid' : emphasis === 'secondary' ? 'outline' : 'transparent',
      radius: 'md',
      border: emphasis === 'secondary' ? 'all' : 'none',
      elevation: 'none',
      hovered: options.hovered ?? false,
      pressed: options.pressed ?? false,
      focusVisible: options.focusVisible ?? false,
      current: false,
    },
    text: {
      size: 'sm',
      tone: 'inherit',
      weight: 'medium',
      font: 'body',
      leading: 'normal',
      decoration: 'none',
    },
    layout: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      minHeight: '2.25rem',
      padding: '0.25rem 1rem',
      gap: '0.5rem',
      minWidth: '0',
      maxWidth: '100%',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      // The passive body translates, not its native navigation owner.
      // Preserve the one-pixel native hit envelope during the existing press.
      marginBottom: '1px',
    },
  };
}
