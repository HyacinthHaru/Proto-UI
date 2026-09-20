import Vue from 'vue';
import {
  ShadcnRadioGroupRoot as Root,
  ShadcnRadioGroupItem as Item,
  ShadcnRadioGroupIndicator as Indicator,
} from './proto-ui/components/vue2/index.ts';
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

if (runtime !== 'vue2') throw new Error(`Unsupported isolated Vue 2 runtime ${runtime}`);
const vm = new Vue({
  render(h) {
    return h(
      Root,
      { attrs: rootProps(), on: { valueChange: recordChange }, ref: 'group' },
      values.map((value, index) =>
        h('div', { key: value, class: 'choice-row' }, [
          h(Item, { attrs: { value, disabled: value === 'c' } }, [
            ...(value === 'c' ? [] : [h(Indicator)]),
            h('span', { class: 'sr-only' }, [labels[index]!]),
          ]),
          h('span', [labels[index]!]),
        ])
      )
    );
  },
});
mount.append(vm.$mount().$el);
bindRoot(vm.$refs.group as any);
finish(() => vm.$forceUpdate());
