import './src/styles/proto-ui-style.css';
const runtime = new URLSearchParams(location.search).get('runtime') ?? 'wc';
const mount = document.querySelector('#mount')!;
document.querySelector('h1')!.textContent = `CLI ${runtime}`;
document.querySelector('main')!.setAttribute('data-runtime', runtime);
let update: () => void;
if (runtime === 'react') {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const {
    ShadcnRadioGroupRoot: Root,
    ShadcnRadioGroupItem: Item,
    ShadcnRadioGroupIndicator: Indicator,
  } = await import('./proto-ui/components/react/index.ts');
  const root = createRoot(mount);
  const render = (value: string) =>
    root.render(
      React.createElement(
        Root,
        { value, a11yLabel: 'Packed Radio Group' },
        ...['a', 'b', 'c'].map((itemValue) =>
          React.createElement(
            Item,
            { key: itemValue, value: itemValue, disabled: itemValue === 'c' },
            itemValue,
            itemValue === 'c' ? null : React.createElement(Indicator)
          )
        )
      )
    );
  render('b');
  update = () => render('a');
} else if (runtime === 'vue') {
  const Vue = await import('vue');
  const {
    ShadcnRadioGroupRoot: Root,
    ShadcnRadioGroupItem: Item,
    ShadcnRadioGroupIndicator: Indicator,
  } = await import('./proto-ui/components/vue/index.ts');
  const value = Vue.ref('b');
  Vue.createApp({
    render: () =>
      Vue.h(Root, { value: value.value, a11yLabel: 'Packed Radio Group' }, () =>
        ['a', 'b', 'c'].map((itemValue) =>
          Vue.h(Item, { key: itemValue, value: itemValue, disabled: itemValue === 'c' }, () =>
            itemValue === 'c' ? [itemValue] : [itemValue, Vue.h(Indicator)]
          )
        )
      ),
  }).mount(mount);
  update = () => {
    value.value = 'a';
  };
} else {
  await import('./proto-ui/components/wc/index.ts');
  const { setElementProps } = await import('@proto.ui/adapter-web-component');
  const radioContainer = document.createElement('div');
  const radioRoot = document.createElement('proto-ui-shadcn-radio-group-root');
  setElementProps(radioRoot, { value: 'b', a11yLabel: 'Packed Radio Group' });
  for (const value of ['a', 'b', 'c']) {
    const item = document.createElement('proto-ui-shadcn-radio-group-item');
    setElementProps(item, { value, disabled: value === 'c' });
    item.append(value);
    if (value !== 'c')
      item.appendChild(document.createElement('proto-ui-shadcn-radio-group-indicator'));
    radioRoot.appendChild(item);
  }
  radioContainer.appendChild(radioRoot);
  mount.appendChild(radioContainer);
  update = () => setElementProps(radioRoot, { value: 'a', a11yLabel: 'Packed Radio Group' });
}
(window as any).readPackedRadio = () => {
  const group = mount.querySelector('[role="radiogroup"]');
  const items = [...mount.querySelectorAll<HTMLElement>('[role="radio"]')];
  return {
    runtime,
    groupLabel: group?.getAttribute('aria-label'),
    count: items.length,
    checked: items.map((item) => item.getAttribute('aria-checked')),
    tabIndex: items.map((item) => item.tabIndex),
    svgCounts: items.map((item) => item.querySelectorAll('svg').length),
    dotOpacity: items.slice(0, 2).map((item) => {
      const svg = item.querySelector('svg');
      return svg ? getComputedStyle(svg.parentElement!).opacity : null;
    }),
    disabled: items.map((item) => item.getAttribute('aria-disabled')),
  };
};
(window as any).updatePackedRadio = update;
