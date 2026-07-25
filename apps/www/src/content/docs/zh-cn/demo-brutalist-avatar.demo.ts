export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-5',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-avatar-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-avatar-fallback',
            children: ['AL'],
          },
        ],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-avatar-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-avatar-image',
            props: { src: '/favicon.svg', alt: 'Proto UI' },
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-avatar-fallback',
            children: ['PU'],
          },
        ],
      },
    ],
  },
};
