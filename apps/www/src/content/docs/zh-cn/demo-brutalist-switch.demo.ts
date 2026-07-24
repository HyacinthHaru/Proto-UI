export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-5',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-switch-root',
        children: [{ kind: 'proto', prototypeId: 'brutalist-switch-thumb' }],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-switch-root',
        props: { defaultChecked: true },
        children: [{ kind: 'proto', prototypeId: 'brutalist-switch-thumb' }],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-switch-root',
        props: { disabled: true },
        children: [{ kind: 'proto', prototypeId: 'brutalist-switch-thumb' }],
      },
    ],
  },
};
