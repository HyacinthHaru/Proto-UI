export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex items-center gap-5 p-8',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-tooltip-root',
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-trigger',
            children: ['Tooltip trigger'],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-portal',
            children: [
              {
                kind: 'proto',
                prototypeId: 'brutalist-tooltip-content',
                children: [
                  'Static tooltip content',
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
