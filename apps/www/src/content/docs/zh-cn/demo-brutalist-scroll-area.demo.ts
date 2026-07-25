export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex gap-5',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-scroll-area-root',
        style: 'display:block;width:22rem;height:12rem',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-scroll-area-viewport',
            children: [
              {
                kind: 'text',
                value:
                  'Scrollable conversation content.\\nRow 2\\nRow 3\\nRow 4\\nRow 5\\nRow 6\\nRow 7\\nRow 8\\nRow 9\\nRow 10',
              },
            ],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-scroll-area-scrollbar',
            children: [{ kind: 'proto', prototypeId: 'brutalist-scroll-area-thumb' }],
          },
          { kind: 'proto', prototypeId: 'brutalist-scroll-area-corner' },
        ],
      },
    ],
  },
};
