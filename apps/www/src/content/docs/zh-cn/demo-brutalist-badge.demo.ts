export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-3',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        children: [{ kind: 'text', value: 'Default' }],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        props: { variant: 'secondary' },
        children: [{ kind: 'text', value: 'Secondary' }],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        props: { variant: 'destructive' },
        children: [{ kind: 'text', value: 'Error' }],
      },
    ],
  },
};
