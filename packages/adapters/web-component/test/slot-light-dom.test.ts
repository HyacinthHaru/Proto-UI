// packages/adapters/web-component/test/slot-light-dom.test.ts
import { describe, it, expect } from 'vitest';
import { tw, type Prototype } from '@proto.ui/core';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';

describe('adapter-web-component light DOM slot (v0)', () => {
  it('projects initial light children into slot position; <slot> must not exist in DOM', () => {
    const P: Prototype = {
      name: 'x-light-slot-1',
      setup() {
        return (r) => [r.el('div', [r.slot()])];
      },
    };

    AdaptToWebComponent(P); // default: shadow=false (light DOM)

    const el = document.createElement('x-light-slot-1') as any;

    // ✅ initial light children BEFORE connected
    el.innerHTML = `<span>a</span><span>b</span>`;

    document.body.appendChild(el);

    // slot marker must not be rendered as <slot>
    expect(el.querySelector('slot')).toBeNull();

    // projected into template
    expect(el.innerHTML).toBe(`<div><span>a</span><span>b</span></div>`);
  });

  it('keeps correct order around slot (prefix/suffix siblings remain in place)', () => {
    const P: Prototype = {
      name: 'x-light-slot-2',
      setup() {
        return (r) => [r.el('div', [r.el('span', 'prefix'), r.slot(), r.el('span', 'suffix')])];
      },
    };

    AdaptToWebComponent(P);

    const el = document.createElement('x-light-slot-2') as any;
    el.innerHTML = `<em>x</em><strong>y</strong>`;
    document.body.appendChild(el);

    expect(el.querySelector('slot')).toBeNull();
    expect(el.innerHTML).toBe(
      `<div><span>prefix</span><em>x</em><strong>y</strong><span>suffix</span></div>`
    );
  });

  it('supports text nodes in light children pool (not only elements)', () => {
    const P: Prototype = {
      name: 'x-light-slot-3',
      setup() {
        return (r) => [r.el('div', [r.slot()])];
      },
    };

    AdaptToWebComponent(P);

    const el = document.createElement('x-light-slot-3') as any;

    // create a mixed pool: text + element
    el.appendChild(document.createTextNode('hello'));
    el.appendChild(document.createElement('span'));
    el.querySelector('span')!.textContent = 'world';

    document.body.appendChild(el);

    expect(el.querySelector('slot')).toBeNull();
    expect(el.innerHTML).toBe(`<div>hello<span>world</span></div>`);
  });

  it('update() must not duplicate or drop projected light children', async () => {
    const P: Prototype = {
      name: 'x-light-slot-4',
      setup(def) {
        // no props needed; we only test update semantics
        return (r) => [r.el('div', [r.slot()])];
      },
    };

    AdaptToWebComponent(P);

    const el = document.createElement('x-light-slot-4') as any;
    el.innerHTML = `<span>x</span>`;
    document.body.appendChild(el);

    expect(el.innerHTML).toBe(`<div><span>x</span></div>`);

    // call update explicitly
    el.update();
    await Promise.resolve();

    // ✅ must remain exactly one 'x' (no duplication)
    // ✅ must not become empty (no dropping)
    expect(el.innerHTML).toBe(`<div><span>x</span></div>`);
  });

  it('projects new children appended after connected', async () => {
    const P: Prototype = {
      name: 'x-light-slot-mo',
      setup() {
        return (r) => [r.el('div', [r.slot()])];
      },
    };

    AdaptToWebComponent(P);
    const el = document.createElement('x-light-slot-mo') as any;
    document.body.appendChild(el);

    // 初始为空：<div></div>
    expect(el.innerHTML).toBe('<div></div>');

    // runtime append
    const s = document.createElement('span');
    s.textContent = 'k';
    el.appendChild(s);

    // MO 是异步触发，等一个 microtask（在 jsdom/vitest 通常够）
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(el.innerHTML).toBe('<div><span>k</span></div>');
  });

  it('does not re-project endlessly when template has slot plus owned siblings', async () => {
    const P: Prototype = {
      name: 'x-light-slot-with-sibling',
      setup() {
        return (r) => [r.slot(), r.el('i', 'owned')];
      },
    };

    AdaptToWebComponent(P);

    const el = document.createElement('x-light-slot-with-sibling') as any;
    el.appendChild(document.createTextNode('Actions'));
    document.body.appendChild(el);

    await new Promise<void>((r) => setTimeout(r, 0));
    expect(el.innerHTML).toBe('Actions<i>owned</i>');

    // A follow-up update must stay stable (no duplicate/mutation loop side effects).
    el.update();
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(el.innerHTML).toBe('Actions<i>owned</i>');
  });

  it('clears owned nodes and the old observer while preserving pending and later caller mutations', async () => {
    let decorated = true;
    const P: Prototype = {
      name: 'x-light-slot-cleanup-transition',
      setup() {
        return (r) =>
          decorated
            ? [
                r.slot(),
                r.el(
                  'span',
                  { style: tw('p-4') },
                  r.el('span', { style: tw('opacity-50') }, 'owned')
                ),
              ]
            : r.slot();
      },
    };
    AdaptToWebComponent(P);
    const root = document.createElement(P.name) as HTMLElement & { update(): void };
    const caller = document.createElement('b');
    caller.className = 'caller-class';
    caller.setAttribute('data-pui-style', 'p-8');
    const text = document.createTextNode('caller-text');
    root.append(caller, text);
    document.body.append(root);
    const deliverMutations = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      await deliverMutations();
      const oldOwned = [...root.querySelectorAll('span')];
      const pending = document.createElement('i');
      root.append(pending); // No observer delivery before switching to slot-only.
      decorated = false;
      root.update();
      await deliverMutations();
      expect([...root.childNodes]).toEqual([caller, text, pending]);
      expect(root.querySelectorAll('span')).toHaveLength(0);
      for (const node of oldOwned) expect(root.contains(node)).toBe(false);

      const later = document.createElement('em');
      root.append(later);
      pending.remove();
      await deliverMutations();
      expect([...root.childNodes]).toEqual([caller, text, later]);
      expect(caller.className).toBe('caller-class');
      expect(caller.getAttribute('data-pui-style')).toBe('p-8');

      decorated = true;
      root.update();
      await deliverMutations();
      expect(root.querySelectorAll('span')).toHaveLength(2);
      expect(root.querySelector('b')).toBe(caller);
      expect(root.querySelector('em')).toBe(later);
      expect(root.querySelector('i')).toBeNull();
      for (const node of oldOwned) expect(root.contains(node)).toBe(false);
      later.remove();
      await deliverMutations();
      decorated = false;
      root.update();
      await deliverMutations();
      expect([...root.childNodes]).toEqual([caller, text]);
    } finally {
      root.remove();
    }
  });

  it('initial and repeated slot-only commits do not mutate caller children', async () => {
    const P: Prototype = {
      name: 'x-light-slot-only-no-owned',
      setup() {
        return (r) => r.slot();
      },
    };
    AdaptToWebComponent(P);
    const root = document.createElement(P.name) as HTMLElement & { update(): void };
    const caller = document.createElement('b');
    const text = document.createTextNode('caller-text');
    root.append(caller, text);
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(root, { childList: true, subtree: true });
    try {
      document.body.append(root);
      root.update();
      for (let i = 0; i < 8; i++) await Promise.resolve();
      expect(mutations).toEqual([]);
      expect(observer.takeRecords()).toEqual([]);
      expect([...root.childNodes]).toEqual([caller, text]);
    } finally {
      observer.disconnect();
      root.remove();
    }
  });
});
