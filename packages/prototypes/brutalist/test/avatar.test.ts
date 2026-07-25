import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineVueComponent } from '../../adapters/vue/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistAvatarFallback, BrutalistAvatarImage, BrutalistAvatarRoot } from '../src/avatar';

const ROOT_TAG = 'pui-test-brutalist-avatar-root';
const IMAGE_TAG = 'pui-test-brutalist-avatar-image';
const FALLBACK_TAG = 'pui-test-brutalist-avatar-fallback';

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

const setupAvatar = async () => {
  document.body.innerHTML = '';
  const rootDef = defineReactComponent(BrutalistAvatarRoot, () => null).def;
  const imageDef = defineReactComponent(BrutalistAvatarImage, () => null).def;
  const fallbackDef = defineReactComponent(BrutalistAvatarFallback, () => null).def;

  defineWebComponent(ROOT_TAG, rootDef);
  defineWebComponent(IMAGE_TAG, imageDef);
  defineWebComponent(FALLBACK_TAG, fallbackDef);

  const root = document.createElement(ROOT_TAG) as HTMLElement;
  const image = document.createElement(IMAGE_TAG) as HTMLElement;
  image.setAttribute('src', '/avatar.png');
  image.setAttribute('alt', 'Ada Lovelace');
  const fallback = document.createElement(FALLBACK_TAG) as HTMLElement;
  fallback.textContent = 'AL';
  root.append(image, fallback);
  document.body.append(root);
  await settle();

  return { root, image, fallback, rootDef, imageDef, fallbackDef };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Avatar', () => {
  it('inherits the Base Avatar family through every styled part', async () => {
    const { rootDef, imageDef, fallbackDef } = await setupAvatar();

    expect(() => defineVueComponent(BrutalistAvatarRoot)).not.toThrow();
    expect(rootDef.anatomy.some((entry) => entry.as === 'asAvatarRoot')).toBe(true);
    expect(imageDef.anatomy.some((entry) => entry.as === 'asAvatarImage')).toBe(true);
    expect(fallbackDef.anatomy.some((entry) => entry.as === 'asAvatarFallback')).toBe(true);
  });

  it('projects square hard-shadow image and Yandu fallback tokens', async () => {
    const { root, image, fallback } = await setupAvatar();

    expect(styleContains(root, 'size-10')).toBe(true);
    expect(styleContains(root, 'rounded-none')).toBe(true);
    expect(styleContains(root, 'border-2')).toBe(true);
    expect(styleContains(root, 'border-foreground')).toBe(true);
    expect(styleContains(root, 'bg-background')).toBe(true);
    expect(styleContains(root, 'shadow-[3px_3px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(image, 'size-full')).toBe(true);
    expect(styleContains(image, 'object-cover')).toBe(true);
    expect(styleContains(fallback, 'bg-sky')).toBe(true);
    expect(styleContains(fallback, 'text-sky-foreground')).toBe(true);
    expect(styleContains(fallback, 'font-mono')).toBe(true);
    expect(styleContains(fallback, 'font-bold')).toBe(true);
  });

  it('preserves Base image loaded exposure', async () => {
    const { image } = await setupAvatar();
    const getExposes = (image as unknown as { getExposes: () => Record<string, unknown> })
      .getExposes;
    expect(getExposes).toBeTypeOf('function');
    expect(getExposes().loaded).toBeDefined();
  });
});
