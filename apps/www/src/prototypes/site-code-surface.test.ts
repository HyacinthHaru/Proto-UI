import { afterEach, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import ShadcnSurface from '@proto.ui/prototypes-shadcn/surface';
import BrutalistSurface from '@proto.ui/prototypes-brutalist/surface';
const constructors = {
  shadcn: AdaptToWebComponent(ShadcnSurface),
  brutalist: AdaptToWebComponent(BrutalistSurface),
};
afterEach(() => document.body.replaceChildren());
for (const family of ['shadcn', 'brutalist'] as const)
  it(`${family}: generic Surface owns frame and separator paint without code semantics`, async () => {
    const surface = new constructors[family]();
    document.body.append(surface);
    for (const part of ['frame', 'toolbar']) {
      setElementProps(surface, {
        variant: part === 'toolbar' ? 'transparent' : family === 'shadcn' ? 'muted' : 'outline',
        radius: part === 'toolbar' ? 'none' : 'default',
        border: part === 'toolbar' ? 'bottom' : 'all',
        elevation: 'none',
      });
      surface.update();
      for (let i = 0; i < 12; i++) await Promise.resolve();
      const tokens = surface.getAttribute('data-pui-style')!;
      expect(tokens).toContain(
        part === 'toolbar'
          ? family === 'brutalist'
            ? 'border-b-2'
            : 'border-b'
          : family === 'brutalist'
            ? 'border-2'
            : 'border'
      );
      expect(tokens).toContain(
        part === 'toolbar'
          ? 'bg-transparent'
          : family === 'brutalist'
            ? 'bg-background'
            : 'bg-muted'
      );
      expect(tokens).not.toContain('shadow-');
      expect(surface.hasAttribute('role')).toBe(false);
      expect(surface.hasAttribute('tabindex')).toBe(false);
      expect(surface.getExposes()).toEqual({});
    }
  });
