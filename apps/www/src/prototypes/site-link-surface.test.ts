import { afterEach, describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { collectProtoStyleTokens } from '../../../../packages/cli/src/services/prototype-style-tokens';
import { renderProtoStyleTokenCss } from '../../../../packages/cli/src/services/proto-style-css';
import SiteLinkSurface from './site-link-surface.proto';
const Constructor = AdaptToWebComponent(SiteLinkSurface, { registerAs: 'test-site-link-surface' });
const settle = async () => {
  for (let index = 0; index < 12; index++) await Promise.resolve();
};
afterEach(() => document.body.replaceChildren());
describe('app-owned passive link surface', () => {
  it('compiles every website token and leaves text wrapping unforced', async () => {
    const collected = await collectProtoStyleTokens(
      fileURLToPath(new NodeURL('.', import.meta.url))
    );
    const tokens = collected.filter((token): token is string => typeof token === 'string');
    expect(tokens).toHaveLength(collected.length);
    expect(renderProtoStyleTokenCss(tokens)).not.toContain('Unsupported Proto UI style tokens');
    const element = new Constructor();
    setElementProps(element, { appearance: 'text' });
    document.body.append(element);
    await settle();
    expect(element.getAttribute('data-pui-style')).not.toContain('whitespace-nowrap');
    for (const appearance of ['action', 'icon', 'nav', 'brand']) {
      setElementProps(element, { appearance });
      (element as HTMLElement & { update?(): void }).update?.();
      await settle();
      expect(element.getAttribute('data-pui-style')).toContain('whitespace-nowrap');
    }
  });
  it('uses one family visual contract for all four social glyphs without adding control semantics', async () => {
    for (const icon of ['github', 'discord', 'x', 'bluesky']) {
      const element = new Constructor();
      setElementProps(element, { family: 'brutalist', appearance: 'icon', icon });
      document.body.append(element);
      await settle();
      const tokens = element.getAttribute('data-pui-style')!;
      for (const token of ['size-11', 'border-2', 'border-foreground', 'rounded-none'])
        expect(tokens).toContain(token);
      expect(element.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(element.querySelector('path')?.getAttribute('d')).toBeTruthy();
      expect(element.hasAttribute('role')).toBe(false);
      expect(element.hasAttribute('tabindex')).toBe(false);
      expect(element.getExposes()).toEqual({});
    }
  });
  it('responds to controlled focus and press facts without any event or focus API', async () => {
    const element = new Constructor();
    document.body.append(element);
    const update = async (facts: Record<string, unknown>) => {
      setElementProps(element, {
        family: 'shadcn',
        appearance: 'action',
        emphasis: 'primary',
        ...facts,
      });
      (element as HTMLElement & { update?(): void }).update?.();
      await settle();
    };
    await update({ focusVisible: true, pressed: true });
    expect(element.getAttribute('data-pui-style')).toContain('ring-2');
    expect(element.getAttribute('data-pui-style')).toContain('translate-y-px');
    await update({ focusVisible: false, pressed: false });
    expect(element.getAttribute('data-pui-style')).not.toContain('ring-2');
    expect(element.getAttribute('data-pui-style')).not.toContain('translate-y-px');
    expect(element.getExposes()).toEqual({});
  });
});
