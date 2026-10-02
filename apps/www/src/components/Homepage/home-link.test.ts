import { describe, expect, it } from 'vitest';
import { assertDemoSpec, type DemoSpec } from '../PrototypePreviewer/demo-types';
import { renderDemo } from '../PrototypePreviewer/demo-renderer';
import { getDemoSourcePath } from '../PrototypePreviewer/demo-modules';

const demo = {
  type: 'demo',
  root: {
    kind: 'box',
    tag: 'a',
    attrs: { href: '/docs/', target: '_blank', rel: 'noopener', 'aria-label': 'Documentation' },
    children: ['Docs'],
  },
} satisfies DemoSpec;

describe('Website native-link host composition', () => {
  it('keeps a real Website-owned anchor in the selected runtime renderer', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const rendered = await renderDemo({ runtime: 'wc', demo, host });
    try {
      const link = host.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/docs/');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener');
      expect(link?.getAttribute('aria-label')).toBe('Documentation');
      expect(link?.textContent).toBe('Docs');
      expect(link?.getAttribute('role')).not.toBe('button');
      expect(host.querySelector('[data-pui-root]')).toBeNull();
    } finally {
      await rendered.destroy();
      host.remove();
    }
  });
  it('rejects arbitrary tags, event attributes, and script URLs', () => {
    const box = (tag: string, attrs: Record<string, string>) =>
      ({ type: 'demo', root: { kind: 'box', tag, attrs } }) as unknown as DemoSpec;
    expect(() => assertDemoSpec(box('script', {}))).toThrow('tag');
    expect(() => assertDemoSpec(box('a', { href: '/docs/', onclick: 'bad()' }))).toThrow(
      'attribute'
    );
    for (const href of ['javascript:alert(1)', ' java\nscript:alert(1)', 'data:text/html,bad'])
      expect(() => assertDemoSpec(box('a', { href }))).toThrow('safe href');
    expect(() => assertDemoSpec(demo)).not.toThrow();
  });
  it('derives nested and top-level source links from the actual executable module registry', () => {
    expect(getDemoSourcePath('demo-shadcn-button')).toBe(
      'apps/www/src/content/docs/zh-cn/demo-shadcn-button.demo.ts'
    );
    expect(getDemoSourcePath('demo-shadcn-tabs')).toBe(
      'apps/www/src/content/docs/demo_components/tabs/demo-shadcn-tabs.demo.ts'
    );
    expect(() => getDemoSourcePath('invented-demo')).toThrow('missing source path');
  });
});
