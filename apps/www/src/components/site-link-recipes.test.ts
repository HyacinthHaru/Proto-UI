import { describe, expect, it } from 'vitest';
import { linkSurfaceLayout, linkSurfaceProps, linkTextProps } from './site-link-recipes';
const idle = { hovered: false, pressed: false, focusVisible: false, current: false, inView: false };
describe('consumer navigation density preserves native selection and family identity', () => {
  for (const family of ['shadcn', 'brutalist'] as const)
    for (const appearance of ['sidebar', 'toc'] as const) {
      it(`${family}/${appearance} shares the responsive geometry without changing its family paint`, () => {
        expect(linkSurfaceLayout(family, appearance, 'minimal')).toMatchObject({
          minHeight: 'var(--site-navigation-row-height, 2rem)',
          padding: '0.25rem 0.5rem',
        });
        expect(linkTextProps(appearance, idle, family)).toMatchObject({
          size: 'sm',
          weight: family === 'shadcn' ? 'normal' : 'medium',
        });
        expect(linkTextProps(appearance, { ...idle, current: true }, family).weight).toBe(
          family === 'shadcn' ? 'medium' : 'semibold'
        );
        expect(
          linkSurfaceProps(family, appearance, 'minimal', { ...idle, current: true }).variant
        ).toBe('accent');
      });
    }
  it('uses only a quiet foreground cue for visible non-current TOC sections', () => {
    const visible = { ...idle, inView: true };
    expect(linkTextProps('toc', idle, 'shadcn').tone).toBe('muted');
    expect(linkTextProps('toc', visible, 'shadcn')).toMatchObject({
      tone: 'inherit',
      weight: 'normal',
    });
    expect(linkSurfaceProps('shadcn', 'toc', 'minimal', visible)).toMatchObject({
      variant: 'transparent',
      current: false,
    });
    expect(linkSurfaceProps('shadcn', 'toc', 'minimal', visible)).not.toHaveProperty('inView');
  });
});
