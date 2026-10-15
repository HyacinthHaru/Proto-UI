import type { DemoSpec } from '@/components/PrototypePreviewer/demo-types';

// The page observes the Base outward signal; it does not implement selection.
export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-8 liquid-functional-demo',
    children: [
      { kind: 'proto', prototypeId: 'liquid-glass-toggle', ref: 'bold', children: ['Bold'] },
      {
        kind: 'proto',
        prototypeId: 'liquid-glass-toggle',
        ref: 'italic',
        props: { defaultActive: true },
        children: ['Italic'],
      },
      {
        kind: 'proto',
        prototypeId: 'liquid-glass-toggle',
        ref: 'opaque',
        props: { material: 'opaque' },
        children: ['Opaque'],
      },
      {
        kind: 'proto',
        prototypeId: 'liquid-glass-toggle',
        ref: 'disabled',
        props: { defaultActive: true, disabled: true },
        children: ['Unavailable'],
      },
      {
        kind: 'box',
        ref: 'status',
        attrs: { role: 'status', 'aria-live': 'polite' },
        children: ['0 activeChange requests'],
      },
    ],
  },
  setup({ refs, api }) {
    let count = 0;
    for (const ref of ['bold', 'italic', 'opaque', 'disabled'])
      api.setProps(ref, {
        onActiveChange: (detail: { active: boolean }) => {
          refs.status.textContent = `${++count} activeChange requests · ${ref}: ${detail.active}`;
        },
      });
  },
} satisfies DemoSpec;
