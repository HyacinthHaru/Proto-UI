export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col max-w-lg',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-composer-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-composer-input',
            children: ['Type a message…'],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-composer-actions',
            children: [
              {
                kind: 'proto',
                prototypeId: 'brutalist-composer-send-button',
                children: ['→'],
              },
            ],
          },
        ],
      },
    ],
  },
};
