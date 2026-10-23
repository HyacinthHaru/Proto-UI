import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import textarea from '../src/textarea';
import { fieldTextarea, fieldRoot, fieldLabel, fieldDescription, fieldError } from '../src/field';
import { styleScope } from '../src/style-scope';
import { TEXTAREA_PROJECTED_STYLES } from '../src/textarea/visual';
import { CONTEXT_INSTANCE_TOKEN_CAP, CONTEXT_PARENT_CAP } from '@proto.ui/module-context';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import { createRuntimeSession } from '@proto.ui/runtime';
for (const p of [
  textarea,
  fieldTextarea,
  fieldRoot,
  fieldLabel,
  fieldDescription,
  fieldError,
  styleScope,
])
  AdaptToWebComponent(p as any);
const flush = async () => {
  for (let i = 0; i < 25; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};
const el = (name: string, props: Record<string, unknown> = {}) => {
  const n = document.createElement(name) as any;
  setElementProps(n, props);
  return n;
};
const tokens = (control: HTMLElement) =>
  control.querySelector('textarea')!.getAttribute('data-pui-style') ?? '';
afterEach(async () => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
  await flush();
});
describe('production shared Textarea paint', () => {
  it('uses nearest scope, explicit precedence and alias while keeping editor/state identity', async () => {
    const outer = el(styleScope.name, { styleProfile: 'rhea' }),
      inner = el(styleScope.name),
      control = el(textarea.name, { defaultValue: 'value', rows: 5 });
    inner.append(control);
    outer.append(inner);
    document.body.append(outer);
    await flush();
    const editor = control.querySelector('textarea') as HTMLTextAreaElement;
    const value = control.getExposes().value;
    const composing = control.getExposes().composing;
    expect(editor.value).toBe('value');
    editor.focus();
    editor.setSelectionRange(1, 4);
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    await flush();
    expect(composing.get()).toBe(true);
    expect(tokens(control)).toContain('rounded-[var(--pui-radius-2xl)]');
    setElementProps(inner, { styleProfile: 'new-york' });
    await flush();
    expect(tokens(control)).toContain('rounded-md');
    expect(control.querySelector('textarea')).toBe(editor);
    expect(control.getExposes().value).toBe(value);
    expect(composing.get()).toBe(true);
    expect(editor.selectionStart).toBe(1);
    expect(editor.selectionEnd).toBe(4);
    expect(document.activeElement).toBe(editor);
    setElementProps(control, { styleProfile: 'rhea', rows: 5, defaultValue: 'value' });
    setElementProps(outer, { styleProfile: 'new-york' });
    await flush();
    expect(tokens(control)).toContain('rounded-[var(--pui-radius-2xl)]');
    setElementProps(control, { styleProfile: 'inherit', rows: 5, defaultValue: 'value' });
    await flush();
    expect(tokens(control)).toContain('rounded-md');
    expect(editor.value).toBe('value');
    expect(Number(editor.rows)).toBe(5);
  });
  it.each(['light', 'dark'])(
    'projects existing Field invalid and label relationships in %s',
    async (theme) => {
      document.documentElement.dataset.theme = theme;
      const scope = el(styleScope.name, { styleProfile: 'rhea' }),
        field = el(fieldRoot.name, { invalid: false }),
        control = el(fieldTextarea.name, { defaultValue: 'keep' }),
        label = el(fieldLabel.name),
        description = el(fieldDescription.name),
        error = el(fieldError.name);
      label.textContent = 'Message';
      description.textContent = 'Hint';
      field.append(label, description, control, error);
      scope.append(field);
      document.body.append(scope);
      await flush();
      const editor = control.querySelector('textarea') as HTMLTextAreaElement;
      const value = control.getExposes().value;
      expect(editor.getAttribute('aria-labelledby')).toBe(label.id);
      expect(editor.getAttribute('aria-describedby')).toContain(description.id);
      expect(control.getExposes().invalid.get()).toBe(false);
      editor.focus();
      editor.setSelectionRange(1, 3);
      setElementProps(field, { invalid: true, errors: ['Invalid message'] });
      await flush();
      expect(control.getExposes().invalid.get()).toBe(true);
      expect(editor.getAttribute('aria-invalid')).toBe('true');
      expect(tokens(control)).toContain(
        theme === 'dark' ? 'border-destructive/50' : 'border-destructive'
      );
      expect(tokens(control)).toContain(
        theme === 'dark' ? 'ring-destructive/40' : 'ring-destructive/20'
      );
      expect(tokens(control)).toContain('ring-3');
      expect(control.getExposes().value).toBe(value);
      expect(editor.value).toBe('keep');
      expect(editor.selectionStart).toBe(1);
      setElementProps(field, { invalid: false, errors: [] });
      await flush();
      expect(tokens(control).split(/\s+/)).not.toContain('border-destructive/50');
      expect(editor.hasAttribute('data-invalid')).toBe(false);
      expect(editor.getAttribute('aria-describedby')).toContain(description.id);
    }
  );
  it('uses inherited focusVisible fact for Rhea focus ring without a second focus state', async () => {
    const c = el(textarea.name, { styleProfile: 'rhea' });
    document.body.append(c);
    await flush();
    const editor = c.querySelector('textarea') as HTMLTextAreaElement;
    const original = editor.matches.bind(editor);
    vi.spyOn(editor, 'matches').mockImplementation(
      (selector) => selector === ':focus-visible' || original(selector)
    );
    editor.focus();
    await flush();
    expect(c.getExposes().focusVisible.get()).toBe(true);
    expect(tokens(c)).toContain('border-ring');
    expect(tokens(c)).toContain('ring-ring/30');
    expect(tokens(c)).toContain('ring-3');
    editor.blur();
    await flush();
    expect(tokens(c)).not.toContain('ring-ring/30');
  });
  it('keeps absent-width-source fallback safe and rejects unsupported profiles', async () => {
    expect(TEXTAREA_PROJECTED_STYLES).toEqual(['new-york-v4', 'rhea']);
    const session = createRuntimeSession(textarea, {
      prototypeName: textarea.name,
      getRawProps: () => ({ styleProfile: 'rhea' as const }),
      schedule: (fn) => fn(),
      commit: (_children, signal) => signal?.done(),
      onRuntimeReady(wiring) {
        wiring.attach('context', [
          [CONTEXT_INSTANCE_TOKEN_CAP, {}],
          [CONTEXT_PARENT_CAP, () => null],
        ]);
        wiring.attach('event', [
          [EVENT_GLOBAL_TARGET_CAP, () => new EventTarget()],
          [EVENT_ROOT_TARGET_CAP, () => new EventTarget()],
        ]);
      },
    });
    await session.mount();
    expect(session.controller.getRuleStyleTokens()).not.toContain('text-sm');
    await session.dispose();
    expect(() =>
      createRuntimeSession(textarea, {
        prototypeName: textarea.name,
        getRawProps: () => ({ styleProfile: 'nova' as const }),
        schedule: (fn) => fn(),
        commit: (_children, signal) => signal?.done(),
        onRuntimeReady(wiring) {
          wiring.attach('context', [
            [CONTEXT_INSTANCE_TOKEN_CAP, {}],
            [CONTEXT_PARENT_CAP, () => null],
          ]);
          wiring.attach('event', [
            [EVENT_GLOBAL_TARGET_CAP, () => new EventTarget()],
            [EVENT_ROOT_TARGET_CAP, () => new EventTarget()],
          ]);
        },
      })
    ).toThrow('Unsupported style');
  });
});
