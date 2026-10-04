import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import * as Vue from 'vue';
import { describe, expect, it } from 'vitest';
import { createReactAdapter } from '../../adapters/react/src';
import { createVueAdapter } from '../../adapters/vue/src';
import { createVue2Adapter } from '../../adapters/vue2/src';
import { Vue2Any, Vue2RuntimeAny } from '../../adapters/vue2/test/utils/vue2';
import { AdaptToWebComponent, setElementProps } from '../../adapters/web-component/src';
import baseSurface from '../../prototypes/base/src/surface';
import shadcnSurface from '../../prototypes/shadcn/src/surface';
import brutalistSurface from '../../prototypes/brutalist/src/surface';
import type { SurfaceRootProps } from '../../prototypes/base/src/surface';
import type { Prototype } from '../../core/src';

const TEXT = 'Preserved 文本, emphasis & link';
import bootstrapSurface from '../../prototypes/bootstrap-2-3-2/src/surface';
import liquidSurface from '../../prototypes/liquid-glass/src/surface';
const families = {
  base: baseSurface,
  shadcn: shadcnSurface,
  brutalist: brutalistSurface,
  bootstrap: bootstrapSurface,
  liquid: liquidSurface,
};
const wcClasses = new Map(
  Object.values(families).map((proto) => [proto, AdaptToWebComponent(proto)])
);
const runtimes = ['wc', 'react', 'vue', 'vue2'] as const;
async function settle() {
  await Promise.resolve();
  await Vue.nextTick();
  await Vue2Any.nextTick();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function mount(
  runtime: (typeof runtimes)[number],
  proto: Prototype<SurfaceRootProps, {}>,
  owner: HTMLElement
) {
  let update: (props: SurfaceRootProps) => void;
  let unmount: () => void;
  if (runtime === 'wc') {
    const Constructor = wcClasses.get(proto)!;
    const element = new Constructor();
    element.textContent = TEXT;
    owner.append(element);
    update = (props) => {
      setElementProps(element, props);
      element.update();
    };
    unmount = () => element.remove();
  } else if (runtime === 'react') {
    const Surface = createReactAdapter(React)(proto, { rootTag: 'span' });
    const root = createRoot(owner);
    update = (props) => flushSync(() => root.render(React.createElement(Surface, props, TEXT)));
    unmount = () => flushSync(() => root.unmount());
  } else if (runtime === 'vue') {
    const Surface = createVueAdapter(Vue)(proto, { rootTag: 'span' });
    const props = Vue.shallowRef<SurfaceRootProps>({});
    const app = Vue.createApp({
      render: () => Vue.h(Surface, props.value, { default: () => TEXT }),
    });
    app.mount(owner);
    update = (next) => {
      props.value = next;
    };
    unmount = () => app.unmount();
  } else {
    const Surface = createVue2Adapter(Vue2RuntimeAny)(proto, { rootTag: 'span' });
    const vm = new Vue2Any({
      data: () => ({ surfaceProps: {} }),
      render(this: { surfaceProps: SurfaceRootProps }, h: any) {
        return h(Surface, { attrs: this.surfaceProps }, [TEXT]);
      },
    }).$mount();
    owner.append(vm.$el);
    update = (next) => {
      vm.surfaceProps = next;
    };
    unmount = () => {
      vm.$destroy();
      vm.$el.remove();
    };
  }
  update({});
  await settle();
  const element = owner.firstElementChild as HTMLElement;
  return {
    element,
    update: async (props: SurfaceRootProps) => {
      update(props);
      await settle();
    },
    unmount,
  };
}

describe.each(runtimes)('real %s passive Surface', (runtime) => {
  for (const [family, proto] of Object.entries(families)) {
    it(`${family}: preserves native content and never becomes a second interaction owner`, async () => {
      const owner = document.createElement('a');
      owner.href = '#retained-destination';
      document.body.append(owner);
      const mounted = await mount(runtime, proto, owner);
      let clicks = 0;
      owner.addEventListener('click', () => clicks++);
      try {
        const node = mounted.element;
        for (const props of [
          {},
          {
            variant: 'solid',
            radius: 'full',
            elevation: 'raised',
            hovered: true,
            pressed: true,
            focusVisible: true,
            current: true,
          },
          { variant: 'transparent', border: 'none', radius: 'none' },
          {},
        ] as SurfaceRootProps[]) {
          await mounted.update(props);
          expect(owner.firstElementChild).toBe(node);
          expect(owner.textContent).toBe(TEXT);
          expect(node.hasAttribute('role')).toBe(false);
          expect(node.hasAttribute('tabindex')).toBe(false);
          expect(owner.getAttribute('href')).toBe('#retained-destination');
          expect(node.querySelector('a,button,input')).toBeNull();
          const tokens = node.getAttribute('data-pui-style') ?? '';
          if (family === 'base') expect(tokens).toBe('');
          else {
            expect(tokens).not.toMatch(/font-|text-(sm|base|lg|xl)/);
            if (props.focusVisible) expect(tokens).toContain('ring-2');
            if (props.radius === 'full') expect(tokens).toContain('rounded-full');
          }
        }
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
      } finally {
        mounted.unmount();
        owner.remove();
      }
    });
  }
});
