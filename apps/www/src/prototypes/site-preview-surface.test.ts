import { afterEach, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import SitePreviewSurface from './site-preview-surface.proto';

const Surface = AdaptToWebComponent(SitePreviewSurface, {
  registerAs: 'test-site-preview-surface',
});
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
afterEach(() => document.body.replaceChildren());

it('owns actual family tokens while leaving native content and focus semantics passive', async () => {
  const surface = new Surface();
  const content = document.createElement('p');
  content.textContent = 'Actual example result';
  surface.append(content);
  document.body.append(surface);
  await settle();
  const update = async (family: string, emphasis = 'plain') => {
    setElementProps(surface, { family, emphasis });
    surface.update();
    await settle();
    return surface.getAttribute('data-pui-style')!.split(/\s+/);
  };
  expect(await update('shadcn')).toEqual(
    expect.arrayContaining(['rounded-2xl', 'border-border', 'bg-background'])
  );
  expect(await update('brutalist', 'accent')).toEqual(
    expect.arrayContaining(['rounded-none', 'border-2', 'bg-main'])
  );
  const plain = await update('shadcn');
  expect(plain).not.toContain('bg-main');
  expect(plain).not.toContain('rounded-none');
  expect(surface.contains(content)).toBe(true);
  expect(content.textContent).toBe('Actual example result');
  expect(surface.hasAttribute('role')).toBe(false);
  expect(surface.hasAttribute('tabindex')).toBe(false);
  expect(surface.getExposes()).toEqual({});
});
