export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col gap-3',
    style: 'max-width:24rem',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-skeleton-root',
        style: 'display:block;width:45%;height:1rem',
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-skeleton-root',
        style: 'display:block;width:100%;height:3rem',
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-skeleton-root',
        style: 'display:block;width:70%;height:1rem',
      },
    ],
  },
};
