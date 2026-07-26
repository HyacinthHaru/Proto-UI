export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'h-48 w-80',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-scroll-area-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-scroll-area-viewport',
            children: [
              {
                kind: 'box',
                className: 'flex flex-col gap-2 p-3',
                children: [
                  'Scrollable conversation content.',
                  'Row 2',
                  'Row 3',
                  'Row 4',
                  'Row 5',
                  'Row 6',
                  'Row 7',
                  'Row 8',
                  'Row 9',
                  'Row 10',
                  'Row 11',
                  'Row 12',
                  'Row 13',
                  'Row 14',
                  'Row 15',
                ],
              },
            ],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-scroll-area-scrollbar',
            props: { orientation: 'vertical' },
            children: [{ kind: 'proto', prototypeId: 'brutalist-scroll-area-thumb' }],
          },
          { kind: 'proto', prototypeId: 'brutalist-scroll-area-corner' },
        ],
      },
    ],
  },
};
