export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col gap-3',
    style: 'max-width:24rem',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-input-root',
        props: { placeholder: 'Search conversations...' },
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-input-root',
        props: { disabled: true, value: 'Disabled field' },
      },
    ],
  },
};
