export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap gap-5',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-card-root',
        style: 'max-width:32rem',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-card-header',
            children: [
              {
                kind: 'proto',
                prototypeId: 'brutalist-card-title',
                children: ['AI Support'],
              },
              {
                kind: 'proto',
                prototypeId: 'brutalist-card-description',
                children: ['Conversation workspace'],
              },
            ],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-card-content',
            children: ['Use Card as an explicit panel shell.'],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-card-footer',
            children: ['12 messages'],
          },
        ],
      },
    ],
  },
};
