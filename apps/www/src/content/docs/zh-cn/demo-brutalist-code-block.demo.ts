export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex max-w-2xl',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-code-block-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-code-block-header',
            children: ['index.ts / TypeScript'],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-code-block-content',
            children: ['console.log("Hello, Neo-Brutalist!")'],
          },
        ],
      },
    ],
  },
};
