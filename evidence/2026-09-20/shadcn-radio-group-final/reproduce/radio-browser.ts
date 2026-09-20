import {
  bindRoot,
  finish,
  labels,
  mount,
  recordChange,
  rootProps,
  runtime,
  values,
} from './radio-shared';
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
  update = () =>
    root.render(
      React.createElement(
        Root,
        { ...rootProps(), ref: bindRoot, onValueChange: recordChange },
        ...values.map((value, index) =>
          React.createElement(
            'div',
            { key: value, className: 'choice-row' },
            React.createElement(
              Item,
              { value, disabled: value === 'c' },
              value === 'c' ? null : React.createElement(Indicator),
              React.createElement('span', { className: 'sr-only' }, labels[index])
            ),
            React.createElement('span', null, labels[index])
          )
        )
      )
    );
  update();
} else if (runtime === 'vue') {
  const Vue = await import('vue');
  const {
    ShadcnRadioGroupRoot: Root,
    ShadcnRadioGroupItem: Item,
    ShadcnRadioGroupIndicator: Indicator,
  } = await import('./proto-ui/components/vue/index.ts');
  const revision = Vue.ref(0);
  Vue.createApp({
    render() {
      void revision.value;
      return Vue.h(Root, { ...rootProps(), ref: bindRoot, onValueChange: recordChange }, () =>
        values.map((value, index) =>
          Vue.h('div', { key: value, class: 'choice-row' }, [
            Vue.h(Item, { value, disabled: value === 'c' }, () => [
              ...(value === 'c' ? [] : [Vue.h(Indicator)]),
              Vue.h('span', { class: 'sr-only' }, labels[index]),
            ]),
            Vue.h('span', labels[index]),
          ])
        )
      );
    },
  }).mount(mount);
  update = () => {
    revision.value++;
  };
} else if (runtime === 'wc') {
  await import('./proto-ui/components/wc/index.ts');
  const { setElementProps } = await import('@proto.ui/adapter-web-component');
  const root = document.createElement('proto-ui-shadcn-radio-group-root');
  setElementProps(root, rootProps());
  root.addEventListener('valueChange', (event) => recordChange((event as CustomEvent).detail));
  for (const [index, value] of values.entries()) {
    const row = document.createElement('div');
    row.className = 'choice-row';
    const item = document.createElement('proto-ui-shadcn-radio-group-item');
    setElementProps(item, { value, disabled: value === 'c' });
    if (value !== 'c') item.append(document.createElement('proto-ui-shadcn-radio-group-indicator'));
    const name = document.createElement('span');
    name.className = 'sr-only';
    name.textContent = labels[index]!;
    item.append(name);
    const label = document.createElement('span');
    label.textContent = labels[index]!;
    row.append(item, label);
    root.append(row);
  }
  mount.append(root);
  bindRoot(root as any);
  update = () => setElementProps(root, rootProps());
} else throw new Error(`Unsupported web consumer runtime ${runtime}`);
finish(update);
