import type { TextRootProps } from '@proto.ui/prototypes-base/text';
import type { SiteLibraryFamily } from './site-library-family';

/** Content roles are application composition, never a Prototype API. */
export const SITE_TYPOGRAPHY_ROLES = [
  'slogan',
  'tagline',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'body',
  'label',
  'caption',
] as const;
export type SiteTypographyRole = (typeof SITE_TYPOGRAPHY_ROLES)[number];
export function siteTextRecipe(
  role: SiteTypographyRole,
  family: SiteLibraryFamily,
  compact = false
): TextRootProps {
  const heading = role === 'slogan' || /^h[1-6]$/.test(role);
  const size: TextRootProps['size'] =
    role === 'slogan'
      ? compact
        ? '2xl'
        : '4xl'
      : role === 'tagline'
        ? compact
          ? 'base'
          : 'lg'
        : (
            {
              h1: '4xl',
              h2: '3xl',
              h3: '2xl',
              h4: 'xl',
              h5: 'lg',
              h6: 'base',
              body: 'base',
              label: 'sm',
              caption: 'sm',
            } as const
          )[role];
  return {
    size,
    tone: role === 'tagline' || role === 'caption' ? 'muted' : 'default',
    weight: heading
      ? family === 'brutalist'
        ? 'bold'
        : 'semibold'
      : family === 'brutalist' || role === 'label'
        ? 'medium'
        : 'normal',
    font: heading && family === 'brutalist' ? 'heading' : 'body',
    leading:
      role === 'slogan' || role === 'h1' || role === 'h2'
        ? 'tight'
        : role === 'h3' || role === 'h4' || role === 'h5'
          ? 'snug'
          : role === 'body' || role === 'tagline'
            ? 'relaxed'
            : 'normal',
    tracking: role === 'slogan' || role === 'h1' || role === 'h2' ? 'tight' : 'normal',
    emphasis: 'normal',
    decoration: 'none',
  };
}
