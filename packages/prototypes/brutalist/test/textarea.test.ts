import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistTextareaRoot } from '../src/textarea';

const TAG = 'pui-test-brutalist-textarea';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Textarea', () => {
  it('preserves Base multiline value exposure and brutalist state tokens', async () => {
    const def = defineReactComponent(BrutalistTextareaRoot, () => null).def;
    defineWebComponent(TAG, def);
    const textarea = document.createElement(TAG) as HTMLElement;
    textarea.setAttribute('value', 'Draft response');
    textarea.setAttribute('rows', '5');
    document.body.append(textarea);
    await settle();

    const exposes = (
      textarea as unknown as { getExposes: () => { value?: { get: () => string } } }
    ).getExposes();
    expect(exposes.value?.get()).toBe('Draft response');
    expect(styleContains(textarea, 'min-h-24')).toBe(true);
    expect(styleContains(textarea, 'resize-y')).toBe(true);
    expect(styleContains(textarea, 'rounded-none')).toBe(true);
    expect(styleContains(textarea, 'border-2')).toBe(true);
    expect(styleContains(textarea, 'font-mono')).toBe(true);
    expect(styleContains(textarea, 'shadow-[3px_3px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(textarea, 'data-[focus-visible]:ring-3')).toBe(true);
    expect(styleContains(textarea, 'data-[disabled]:opacity-50')).toBe(true);
  });
});
