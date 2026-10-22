import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import shadcnButton from '@proto.ui/prototypes-shadcn/button';
import brutalistButton from '@proto.ui/prototypes-brutalist/button';
import { shadcnActionAppearance } from '@proto.ui/prototypes-shadcn/surface';
import { brutalistActionAppearance } from '@proto.ui/prototypes-brutalist/surface';
import { renderProtoStyleTokenCss } from '../../../../packages/cli/src/services/proto-style-css';
import { linkSurfaceLayout, linkSurfaceProps, linkTextProps } from './site-link-recipes';

const owned: HTMLElement[] = [];
const flush = async () => {
  for (let i = 0; i < 25; i++) await Promise.resolve();
};
afterEach(async () => {
  for (const element of owned.splice(0)) element.remove();
  await flush();
});

for (const [family, prototype, appearance, sizeToken, height] of [
  ['shadcn', shadcnButton, shadcnActionAppearance, 'min-h-9', '2.25rem'],
  ['brutalist', brutalistButton, brutalistActionAppearance, 'min-h-10', '2.5rem'],
] as const) {
  describe(`${family} public passive action appearance`, () => {
    it('matches the real default wrapped Button geometry without taking its semantics', async () => {
      if (!customElements.get(prototype.name)) AdaptToWebComponent(prototype);
      const button = document.createElement(prototype.name);
      owned.push(button);
      document.body.append(button);
      setElementProps(button, { size: 'default', wrap: true });
      await flush();
      const tokens = (button.getAttribute('data-pui-style') ?? '').split(/\s+/);
      expect(tokens).toContain(sizeToken);
      const css = renderProtoStyleTokenCss([sizeToken]);
      expect(css).toContain(`min-height: ${height}`);
      const recipe = appearance();
      expect(recipe.layout).toMatchObject({
        minHeight: height,
        boxSizing: 'border-box',
        whiteSpace: 'normal',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        padding: '0.25rem 1rem',
      });
      expect(Object.keys(recipe).sort()).toEqual(['layout', 'surface', 'text']);
      for (const key of ['role', 'tabIndex', 'href', 'disabled', 'onClick', 'onKeyDown']) {
        expect(recipe.surface).not.toHaveProperty(key);
        expect(recipe.layout).not.toHaveProperty(key);
      }
      expect(button.getAttribute('role')).toBe('button');
      expect(linkSurfaceLayout(family, 'action', 'primary')).toEqual({
        ...recipe.layout,
        pointerEvents: 'none',
      });
      expect(linkTextProps('action', undefined, family)).toEqual(recipe.text);
    });
    it('projects only observed facts and leaves ordinary navigation selection unchanged', () => {
      const recipe = appearance({
        emphasis: 'secondary',
        hovered: true,
        pressed: true,
        focusVisible: true,
      });
      expect(recipe.surface).toMatchObject({
        hovered: true,
        pressed: true,
        focusVisible: true,
        current: false,
      });
      expect(
        linkSurfaceProps(family, 'action', 'secondary', {
          hovered: true,
          pressed: true,
          focusVisible: true,
          current: false,
        })
      ).toEqual(recipe.surface);
      for (const kind of ['text', 'nav', 'toc', 'sidebar'] as const) {
        expect(linkSurfaceLayout(family, kind, 'minimal')).not.toHaveProperty('userSelect');
      }
    });
  });
}

it('opts only authored action anchors into the SSR recipe and preserves native destinations', () => {
  const source = readFileSync('apps/www/src/components/Homepage/HomeActions.astro', 'utf8');
  const hero = readFileSync('apps/www/src/components/override/Hero.astro', 'utf8');
  expect(source).toContain("appearance === 'action' && !icon");
  expect(source).toContain('linkActionAppearance(initialFamily, variant).layout');
  expect(source).toContain('href={link}');
  expect(source).toContain('{...attrs}');
  expect(source).toContain("appearance ?? attrs['data-site-link-appearance']");
  expect(hero).toContain('appearance="action"');
  expect(source).not.toContain('role="button"');
  expect(source).not.toContain('pointerEvents:');
});
