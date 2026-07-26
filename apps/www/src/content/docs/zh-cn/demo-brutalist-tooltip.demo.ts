export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex items-center gap-5 p-8',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-tooltip-root',
        props: { delayDuration: 100 },
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-trigger',
            children: ['Hover me'],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-portal',
            children: [
              {
                kind: 'proto',
                prototypeId: 'brutalist-tooltip-content',
                children: [
                  'Tooltip content',
                  { kind: 'proto', prototypeId: 'brutalist-tooltip-arrow' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
