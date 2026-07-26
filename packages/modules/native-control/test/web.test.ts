import { describe, expect, it } from 'vitest';
import { createWebNativeControlHost } from '../src/web';

describe('module-native-control web bridge', () => {
  it('projects properties, normalizes events, and disposes listeners', () => {
    const input = document.createElement('input');
    const seen: string[] = [];
    const lease = createWebNativeControlHost(() => input).attach({
      patch: {
        valueMode: 'uncontrolled',
        defaultValue: 'initial',
        disabled: true,
        readOnly: true,
        required: true,
        fieldName: 'query',
        controlType: 'search',
        placeholder: 'Search',
        autoComplete: 'off',
        minLength: 2,
        maxLength: 8,
      },
      onEvent(event) {
        seen.push(`${event.type}:${event.value}:${String(event.composing)}`);
      },
    });
    expect(input.value).toBe('initial');
    expect(input.disabled).toBe(true);
    expect(input.name).toBe('query');
    expect(input.placeholder).toBe('Search');
    expect(input.readOnly).toBe(true);
    expect(input.required).toBe(true);
    expect(input.type).toBe('search');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.minLength).toBe(2);
    expect(input.maxLength).toBe(8);
    expect(() => lease.update({ minLength: null, maxLength: null })).not.toThrow();
    expect(input.hasAttribute('minlength')).toBe(false);
    expect(input.hasAttribute('maxlength')).toBe(false);
    input.value = 'next';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(seen).toEqual(['input:next:false']);
    lease.update({ valueMode: 'controlled', value: 'fixed' });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '編';
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' })
    );
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(seen).toEqual([
      'input:next:false',
      'change:fixed:false',
      'compositionstart:fixed:true',
      'input:編:true',
      'compositionend:編:false',
    ]);
    lease.dispose();
    input.value = 'ignored';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(seen).toHaveLength(5);

    const textarea = document.createElement('textarea');
    const textareaLease = createWebNativeControlHost(() => textarea).attach({
      patch: { rows: 6, wrap: 'hard' },
      onEvent() {},
    });
    expect(Number(textarea.rows)).toBe(6);
    expect(textarea.wrap).toBe('hard');
    textareaLease.dispose();
  });
});
