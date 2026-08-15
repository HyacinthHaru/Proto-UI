import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import separatorRoot, { shadcnSeparatorRoot } from '../src/separator';

AdaptToWebComponent(separatorRoot);

const GEOMETRY_TOKENS = [
  'data-[orientation=horizontal]:h-px',
  'data-[orientation=horizontal]:w-full',
  'data-[orientation=vertical]:h-full',
  'data-[orientation=vertical]:w-px',
];

const UNSCOPED_GEOMETRY_TOKENS = ['h-px', 'w-full', 'h-full', 'w-px'];

describe('prototypes/shadcn: separator', () => {
  it('exposes the Root projection through exact package entries', () => {
    // T-SHADCN-SEPARATOR-0001-CASE-EXPORTS
    expect(shadcnSeparatorRoot).toBe(separatorRoot);
    expect(separatorRoot.name).toBe('shadcn-separator-root');
  });

  it('inherits decorative defaults and projects the upstream horizontal surface', async () => {
    // T-SHADCN-SEPARATOR-0001-CASE-DEFAULTS
    const el = document.createElement('shadcn-separator-root');
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-orientation')).toBe(false);
    expect(el.getAttribute('data-orientation')).toBe('horizontal');

    for (const token of ['shrink-0', 'bg-border', ...GEOMETRY_TOKENS]) {
      expect(styleContains(el, token)).toBe(true);
    }
    for (const token of UNSCOPED_GEOMETRY_TOKENS) {
      expect(styleContains(el, token)).toBe(false);
    }
    el.remove();
  });

  it('inherits dynamic semantic state and switches to vertical geometry', async () => {
    // T-SHADCN-SEPARATOR-0001-CASE-DYNAMIC-SEMANTICS
    const el = document.createElement('shadcn-separator-root');
    document.body.appendChild(el);
    await Promise.resolve();

    setElementProps(el, { decorative: false, orientation: 'vertical' });
    await Promise.resolve();
    await Promise.resolve();

    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
    expect(el.getAttribute('aria-hidden')).toBe('false');
    expect(el.getAttribute('data-orientation')).toBe('vertical');

    for (const token of GEOMETRY_TOKENS) {
      expect(styleContains(el, token)).toBe(true);
    }
    for (const token of UNSCOPED_GEOMETRY_TOKENS) {
      expect(styleContains(el, token)).toBe(false);
    }
    el.remove();
  });

  it('stays contentless and adds no interaction surface', async () => {
    // T-SHADCN-SEPARATOR-0001-CASE-PASSIVE-BOUNDARY
    const el = document.createElement('shadcn-separator-root');
    el.innerHTML = '<span data-authored-child>hidden by decorative semantics</span>';
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();

    expect(el.querySelector('[data-authored-child]')).toBeNull();
    expect(el.innerHTML).toBe('');
    expect(el.hasAttribute('tabindex')).toBe(false);
    for (const token of ['pointer-events-none', 'outline-none', 'cursor-pointer']) {
      expect(styleContains(el, token)).toBe(false);
    }
    el.remove();
  });
});
