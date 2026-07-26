import { describe, expect, it } from 'vitest';
import {
  AdaptToWebComponent,
  setElementProps,
  type WebComponentAdapterElement,
} from '@proto.ui/adapter-web-component';
import type { ProtoAdapterExposes } from '@proto.ui/adapter-base';
import textareaRoot, { type TextareaRootProps } from '../src/textarea';

AdaptToWebComponent(textareaRoot);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/base: textarea', () => {
  it('edits multiline value through a real textarea without converting Enter to submit', async () => {
    const el = document.createElement('base-textarea-root') as WebComponentAdapterElement<
      typeof textareaRoot
    >;
    const inputs: string[] = [];
    const changes: string[] = [];
    el.addEventListener('input', (event) => {
      inputs.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    el.addEventListener('change', (event) => {
      changes.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    setElementProps(el, {
      defaultValue: 'first',
      rows: 5,
      wrap: 'hard',
    } satisfies TextareaRootProps);
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('textarea');
    if (!host) throw new Error('Textarea physical host missing');
    expect(host.value).toBe('first');
    expect(Number(host.rows)).toBe(5);
    expect(host.wrap).toBe('hard');
    host.value = 'first\nsecond';
    host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertLineBreak' }));
    host.dispatchEvent(new Event('change', { bubbles: true }));
    const exposes: ProtoAdapterExposes<typeof textareaRoot> = el.getExposes();
    expect(exposes.value.get()).toBe('first\nsecond');
    expect(inputs).toEqual(['first\nsecond']);
    expect(changes).toEqual(['first\nsecond']);
    el.remove();
  });

  it('preserves controlled value and composition', async () => {
    const el = document.createElement('base-textarea-root') as WebComponentAdapterElement<
      typeof textareaRoot
    >;
    const proposals: string[] = [];
    el.addEventListener('input', (event) => {
      proposals.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    setElementProps(el, { value: 'controlled' } satisfies TextareaRootProps);
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('textarea');
    if (!host) throw new Error('Textarea physical host missing');
    host.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    host.value = '編集中';
    host.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' })
    );
    expect(host.value).toBe('編集中');
    host.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await flush();
    expect(host.value).toBe('controlled');
    expect(proposals).toEqual(['編集中']);
    el.remove();
  });

  it('focuses and blurs the physical textarea and defines no resize style', async () => {
    const el = document.createElement('base-textarea-root') as WebComponentAdapterElement<
      typeof textareaRoot
    >;
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('textarea');
    if (!host) throw new Error('Textarea physical host missing');
    const exposes: ProtoAdapterExposes<typeof textareaRoot> = el.getExposes();
    exposes.focus();
    expect(document.activeElement).toBe(host);
    exposes.blur();
    expect(document.activeElement).not.toBe(host);
    expect(host.style.resize).toBe('');
    el.remove();
  });

  it('projects disabled, readOnly, required, name, placeholder, and length limits', async () => {
    const el = document.createElement('base-textarea-root') as WebComponentAdapterElement<
      typeof textareaRoot
    >;
    setElementProps(el, {
      disabled: true,
      readOnly: true,
      required: true,
      name: 'body',
      placeholder: 'Write',
      minLength: 2,
      maxLength: 200,
    } satisfies TextareaRootProps);
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('textarea');
    expect(host?.disabled).toBe(true);
    expect(host?.readOnly).toBe(true);
    expect(host?.required).toBe(true);
    expect(host?.name).toBe('body');
    expect(host?.placeholder).toBe('Write');
    expect(host?.minLength).toBe(2);
    expect(host?.maxLength).toBe(200);
    el.remove();
  });
});
