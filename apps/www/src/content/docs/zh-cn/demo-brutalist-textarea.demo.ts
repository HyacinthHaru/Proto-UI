export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col gap-3',
    style: 'max-width:24rem',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-textarea-root',
        props: { placeholder: 'Write a message...', rows: 5 },
      },
    ],
  },
};
