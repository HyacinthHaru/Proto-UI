export default {
  type: 'demo',
  root: {
    kind: 'box',
    className: 'flex flex-col gap-4 max-w-md',
    children: [
      {
        kind: 'proto',
        prototypeId: 'brutalist-message-root',
        children: ['How do I set up the Neo-Brutalist theme?'],
      },
      {
        kind: 'proto',
        prototypeId: 'brutalist-message-root',
        props: { direction: 'outgoing' },
        children: ['Use the generated CSS variables and preset tokens.'],
      },
    ],
  },
};
