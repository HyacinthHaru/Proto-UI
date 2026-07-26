import { describe, expect, it } from 'vitest';
import {
  AdaptToWebComponent,
  setElementProps,
  type WebComponentAdapterElement,
} from '@proto.ui/adapter-web-component';
import type { ProtoAdapterExposes } from '@proto.ui/adapter-base';
import inputRoot, { type InputRootProps } from '../src/input';

AdaptToWebComponent(inputRoot);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/base: input', () => {
  it('edits through a real input host and emits input/change proposals', async () => {
    const el = document.createElement('base-input-root') as WebComponentAdapterElement<
      typeof inputRoot
    >;
    const seen: Array<{ type: string; value: string }> = [];
    el.addEventListener('input', (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      seen.push({ type: 'input', value: detail?.value ?? '' });
    });
    el.addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      seen.push({ type: 'change', value: detail?.value ?? '' });
    });
    setElementProps(el, {
      defaultValue: 'initial',
      placeholder: 'Search',
    } satisfies InputRootProps);
    document.body.appendChild(el);
    await flush();

    const host = el.querySelector('input');
    expect(host?.value).toBe('initial');
    expect(host?.placeholder).toBe('Search');
    if (!host) throw new Error('Input physical host missing');
    host.value = 'rewritten';
    host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    host.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const exposes: ProtoAdapterExposes<typeof inputRoot> = el.getExposes();
    expect(exposes.value.get()).toBe('rewritten');
    expect(seen).toContainEqual({ type: 'input', value: 'rewritten' });
    expect(seen).toContainEqual({ type: 'change', value: 'rewritten' });
    el.remove();
  });

  it('restores a controlled value after reporting the edit proposal', async () => {
    const el = document.createElement('base-input-root') as WebComponentAdapterElement<
      typeof inputRoot
    >;
    const proposals: string[] = [];
    el.addEventListener('input', (event) => {
      proposals.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    setElementProps(el, { value: 'controlled' } satisfies InputRootProps);
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('input');
    if (!host) throw new Error('Input physical host missing');
    host.value = 'attempt';
    host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    await flush();
    expect(host.value).toBe('controlled');
    const exposes: ProtoAdapterExposes<typeof inputRoot> = el.getExposes();
    expect(exposes.value.get()).toBe('controlled');
    expect(proposals).toEqual(['attempt']);
    el.remove();
  });
  it('focuses and blurs the physical input while rejecting disabled focus', async () => {
    const el = document.createElement('base-input-root') as WebComponentAdapterElement<
      typeof inputRoot
    >;
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('input');
    if (!host) throw new Error('Input physical host missing');
    const exposes: ProtoAdapterExposes<typeof inputRoot> = el.getExposes();
    exposes.focus();
    expect(document.activeElement).toBe(host);
    exposes.blur();
    expect(document.activeElement).not.toBe(host);
    setElementProps(el, { disabled: true } satisfies InputRootProps);
    await flush();
    exposes.focus();
    expect(document.activeElement).not.toBe(host);
    el.remove();
  });

  it('projects the single-line native control properties', async () => {
    const el = document.createElement('base-input-root') as WebComponentAdapterElement<
      typeof inputRoot
    >;
    setElementProps(el, {
      disabled: true,
      readOnly: true,
      required: true,
      name: 'q',
      type: 'search',
      autoComplete: 'off',
      minLength: 2,
      maxLength: 8,
    } satisfies InputRootProps);
    document.body.appendChild(el);
    await flush();
    const host = el.querySelector('input');
    expect(host?.disabled).toBe(true);
    expect(host?.readOnly).toBe(true);
    expect(host?.required).toBe(true);
    expect(host?.name).toBe('q');
    expect(host?.type).toBe('search');
    expect(host?.getAttribute('autocomplete')).toBe('off');
    expect(host?.minLength).toBe(2);
    expect(host?.maxLength).toBe(8);
    el.remove();
  });
});
