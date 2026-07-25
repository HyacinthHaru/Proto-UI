export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-3',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        children: ['Default'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        props: { variant: 'secondary' },
        children: ['Secondary'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-badge-root',
        props: { variant: 'destructive' },
        children: ['Error'],
      },
    ],
  },
};
