import type { DemoSpec } from '@/components/PrototypePreviewer/demo-types';
export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-3',
    children: [
      {
        kind: 'proto',
        prototypeId: 'bootstrap-2-3-2-button',
        ref: 'action',
        props: {},
        children: ['Back'],
      },
      {
        kind: 'proto',
        prototypeId: 'bootstrap-2-3-2-button',
        props: { variant: 'primary' },
        children: ['Continue'],
      },
      {
        kind: 'proto',
        prototypeId: 'bootstrap-2-3-2-button',
        props: { disabled: true },
        children: ['Unavailable'],
      },
      ...(['large', 'small', 'mini'] as const).flatMap((size) =>
        (['default', 'primary'] as const).map((variant) => ({
          kind: 'proto' as const,
          prototypeId: 'bootstrap-2-3-2-button',
          ref: `${size}-${variant}`,
          props: { size, variant },
          children: [`${size} ${variant}`],
        }))
      ),
      {
        kind: 'box',
        ref: 'count',
        attrs: { role: 'status', 'aria-live': 'polite' },
        children: ['0 activations'],
      },
    ],
  },
  setup({ refs, api }) {
    let count = 0;
    const update = () => {
      refs.count.textContent = `${++count} activations`;
    };
    api.setProps('action', { onClick: update });
    for (const size of ['large', 'small', 'mini']) {
      for (const variant of ['default', 'primary']) {
        api.setProps(`${size}-${variant}`, { onClick: update });
      }
    }
  },
} satisfies DemoSpec;
