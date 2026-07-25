export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col gap-3',
    children: [
      'Today',
      { kind: 'proto', prototypeId: 'brutalist-separator-root' },
      'Yesterday',
      {
        kind: 'proto',
        prototypeId: 'brutalist-separator-root',
        props: { orientation: 'vertical' },
        style: 'height:3rem',
      },
    ],
  },
};
