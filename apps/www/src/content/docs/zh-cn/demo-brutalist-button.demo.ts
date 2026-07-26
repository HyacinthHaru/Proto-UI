export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-wrap items-center gap-4',
    children: [
      { kind: 'proto', prototypeId: 'brutalist-button', children: ['Default'] },
      {
        kind: 'proto',
        prototypeId: 'brutalist-button',
        props: { variant: 'outline' },
        children: ['Outline'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-button',
        props: { variant: 'secondary' },
        children: ['Secondary'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-button',
        props: { variant: 'destructive' },
        children: ['Destructive'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-button',
        props: { variant: 'reverse' },
        children: ['Reverse'],
      },
      { kind: 'proto', prototypeId: 'brutalist-button', props: { size: 'icon' }, children: ['!'] },
      {
        kind: 'proto',
        prototypeId: 'brutalist-button',
        props: { disabled: true },
        children: ['Disabled'],
      },
    ],
  },
};
