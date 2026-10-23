import * as React from '../../packages/adapters/react/node_modules/react';
import { createRoot } from '../../packages/adapters/react/node_modules/react-dom/client';
import * as Vue from '../../packages/adapters/vue/node_modules/vue';
import Vue2 from '../../packages/adapters/vue2/node_modules/vue';
import { createReactAdapter } from '../../packages/adapters/react/src';
import { createVueAdapter } from '../../packages/adapters/vue/src';
import { createVue2Adapter } from '../../packages/adapters/vue2/src';
import { AdaptToWebComponent, setElementProps } from '../../packages/adapters/web-component/src';
import { styleScope } from '../../packages/prototypes/shadcn/src/style-scope';
import {
  fieldRoot,
  fieldTextarea,
  fieldLabel,
  fieldDescription,
  fieldError,
} from '../../packages/prototypes/shadcn/src/field';
const protos = [styleScope, fieldRoot, fieldTextarea, fieldLabel, fieldDescription, fieldError];
const records = [];
for (const kind of ['wc', 'react', 'vue', 'vue2']) {
  const section = document.createElement('section');
  section.dataset.runtime = kind;
  section.innerHTML = `<h2>${kind}</h2>`;
  const host = document.createElement('div');
  section.append(host);
  document.querySelector('main').append(section);
  let set;
  if (kind === 'wc') {
    protos.forEach((p) => AdaptToWebComponent(p));
    const [scope, field, control, label, description, error] = protos.map((p) =>
      document.createElement(p.name)
    );
    label.textContent = 'Message';
    description.textContent = 'Shared field and style scope';
    setElementProps(control, { placeholder: 'Write a message', rows: 3 });
    field.append(label, description, control, error);
    scope.append(field);
    host.append(scope);
    set = (style, invalid) => {
      setElementProps(scope, { styleProfile: style });
      setElementProps(field, { invalid, errors: invalid ? ['Invalid message'] : [] });
    };
  } else if (kind === 'react') {
    const [Scope, Field, Control, Label, Description, ErrorView] = protos.map((p) =>
      createReactAdapter(React)(p)
    );
    const root = createRoot(host);
    set = (style, invalid) =>
      root.render(
        React.createElement(
          Scope,
          { styleProfile: style },
          React.createElement(
            Field,
            { invalid, errors: invalid ? ['Invalid message'] : [] },
            React.createElement(Label, null, 'Message'),
            React.createElement(Description, null, 'Shared field and style scope'),
            React.createElement(Control, { placeholder: 'Write a message', rows: 3 }),
            React.createElement(ErrorView)
          )
        )
      );
  } else if (kind === 'vue') {
    const [Scope, Field, Control, Label, Description, ErrorView] = protos.map((p) =>
      createVueAdapter(Vue)(p)
    );
    const state = Vue.reactive({ style: 'rhea', invalid: false });
    Vue.createApp({
      render: () =>
        Vue.h(Scope, { styleProfile: state.style }, () =>
          Vue.h(
            Field,
            { invalid: state.invalid, errors: state.invalid ? ['Invalid message'] : [] },
            () => [
              Vue.h(Label, null, () => 'Message'),
              Vue.h(Description, null, () => 'Shared field and style scope'),
              Vue.h(Control, { placeholder: 'Write a message', rows: 3 }),
              Vue.h(ErrorView),
            ]
          )
        ),
    }).mount(host);
    set = (style, invalid) => {
      state.style = style;
      state.invalid = invalid;
    };
  } else {
    const runtime = {
      extend: Vue2.extend.bind(Vue2),
      nextTick: Vue2.nextTick.bind(Vue2),
      set: Vue2.set.bind(Vue2),
      delete: Vue2.delete.bind(Vue2),
    };
    const [Scope, Field, Control, Label, Description, ErrorView] = protos.map((p) =>
      createVue2Adapter(runtime)(p)
    );
    const state = Vue2.observable({ style: 'rhea', invalid: false });
    const app = new Vue2({
      render(h) {
        return h(Scope, { attrs: { styleProfile: state.style } }, [
          h(
            Field,
            { attrs: { invalid: state.invalid, errors: state.invalid ? ['Invalid message'] : [] } },
            [
              h(Label, ['Message']),
              h(Description, ['Shared field and style scope']),
              h(Control, { attrs: { placeholder: 'Write a message', rows: 3 } }),
              h(ErrorView),
            ]
          ),
        ]);
      },
    });
    app.$mount();
    host.append(app.$el);
    set = (style, invalid) => {
      state.style = style;
      state.invalid = invalid;
    };
  }
  set('rhea', false);
  records.push({ kind, host, set, editor: () => host.querySelector('textarea') });
}
window.textareaEvidence = {
  records,
  set: (style, invalid = false) => records.forEach((r) => r.set(style, invalid)),
};
requestAnimationFrame(() =>
  requestAnimationFrame(() => (document.documentElement.dataset.ready = 'true'))
);
