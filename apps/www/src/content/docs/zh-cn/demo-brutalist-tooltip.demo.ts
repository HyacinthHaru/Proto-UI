export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex items-center gap-5',
    style: 'padding:2rem',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-tooltip-root',
        props: { delayDuration: 100 },
        children: [
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-trigger',
            children: [{ kind: 'text', value: 'Hover me' }],
          },
          {
            kind: 'proto',
            prototypeId: 'brutalist-tooltip-portal',
            children: [
              {
                kind: 'proto',
                prototypeId: 'brutalist-tooltip-content',
                children: [
                  { kind: 'text', value: 'Tooltip content' },
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
