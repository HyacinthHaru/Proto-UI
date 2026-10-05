import { definePrototype, type Prototype } from '@proto.ui/core';
import { asFocusEntry, asFocusable } from '@proto.ui/hooks';
import { mountNativeFocusIntentReact } from '../../../react/test/fixtures/focus-intent-mount-native';
import { createMountedVueAdapter, flushVue } from '../../../vue/test/utils/vue';
import { createMountedVue2Adapter, flushVue2 } from '../../../vue2/test/utils/vue2';
import { AdaptToWebComponent } from '../../../web-component/src';

export type Runtime = 'react' | 'vue' | 'vue2' | 'wc';
type Kind = 'programmatic' | 'native' | 'entry';
const frames = async (count: number) => {
  for (let i = 0; i < count; i++)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
const microtasks = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

// These mount helpers use each Adapter's actual installed framework. No focus,
// event-gate, frame, or eligibility API is replaced or patched by this fixture.
async function mount(runtime: Runtime, proto: Prototype<any, any>) {
  if (runtime === 'react') return mountNativeFocusIntentReact(proto);
  if (runtime === 'vue') {
    const mounted = createMountedVueAdapter(proto);
    await flushVue();
    await flushVue();
    return {
      get root() {
        return mounted.host.firstElementChild as HTMLElement;
      },
      getExposes: () => mounted.vm.getExposes(),
      act: async (callback: () => void) => {
        callback();
        await flushVue();
        await flushVue();
      },
      unmount: async () => mounted.unmount(),
    };
  }
  if (runtime === 'vue2') {
    const mounted = createMountedVue2Adapter(proto);
    await flushVue2();
    return {
      get root() {
        return mounted.host.firstElementChild as HTMLElement;
      },
      getExposes: () => mounted.vm.getExposes(),
      act: async (callback: () => void) => {
        callback();
        await flushVue2();
      },
      unmount: async () => mounted.unmount(),
    };
  }
  AdaptToWebComponent(proto);
  const root = document.createElement(proto.name) as HTMLElement & { getExposes(): any };
  document.body.append(root);
  await microtasks();
  return {
    root,
    getExposes: () => root.getExposes(),
    act: async (callback: () => void) => {
      callback();
      await microtasks();
    },
    unmount: async () => {
      root.remove();
      await microtasks();
    },
  };
}

export async function observeIntentBudget(runtime: Runtime, kind: Kind) {
  const reusedOptions = Object.freeze({ preventScroll: true });
  const proto = definePrototype({
    name: `native-intent-${runtime}-${kind}`,
    setup(def) {
      if (kind === 'entry') {
        const entry = asFocusEntry();
        entry.configure({ strategy: 'descendant-first', fallback: 'none' });
        def.expose.method('request', (reused: boolean) =>
          entry.focus(reused ? reusedOptions : undefined)
        );
      } else {
        const target = asFocusable();
        def.expose.state('focused', target.focused);
        def.expose.method('request', (reused: boolean) => {
          const options = reused ? reusedOptions : undefined;
          if (kind === 'native') target.focusSelf(options);
          else target.focus(options);
        });
      }
      return (r) => r.el('button', 'Native retry target');
    },
  });
  const mounted = await mount(runtime, proto);
  try {
    await frames(3);
    const target = kind === 'entry' ? mounted.root.querySelector('button')! : mounted.root;
    let trustedFocusEvents = 0;
    target.addEventListener('focus', (event) => {
      if (event.isTrusted) trustedFocusEvents++;
    });
    const cycles: Array<{
      options: string;
      rejected: boolean;
      exhaustedAfterReveal: boolean;
      newRejected: boolean;
      recovered: boolean;
    }> = [];
    for (const reused of [false, true]) {
      await mounted.act(() => target.blur());
      // Authored CSS makes an otherwise connected resolved target reject focus.
      // Three bounded retries each cross two genuine animation frames.
      target.style.display = 'none';
      await mounted.act(() => mounted.getExposes().request(reused));
      const rejected = document.activeElement !== target;
      await frames(8);
      target.style.removeProperty('display');
      await frames(3);
      const exhaustedAfterReveal = document.activeElement !== target;
      target.style.display = 'none';
      await mounted.act(() => mounted.getExposes().request(reused));
      const newRejected = document.activeElement !== target;
      target.style.removeProperty('display');
      await frames(3);
      const recovered = document.activeElement === target;
      cycles.push({
        options: reused ? 'reused' : 'omitted',
        rejected,
        exhaustedAfterReveal,
        newRejected,
        recovered,
      });
    }
    return { cycles, trustedFocusEvents };
  } finally {
    await mounted.unmount();
  }
}

export async function observeFocusedRootBudget(runtime: Runtime) {
  let run: any;
  let descendantPresent = false;
  const proto = definePrototype({
    name: `native-intent-${runtime}-focused-root`,
    setup(def) {
      const target = asFocusable();
      const entry = asFocusEntry();
      entry.configure({ strategy: 'descendant-first', fallback: 'self' });
      def.lifecycle.onCreated((value) => {
        run = value;
      });
      def.expose.state('focused', target.focused);
      def.expose.method('focusRoot', () => target.focus());
      def.expose.method('enter', () => entry.focus());
      def.expose.method('addDescendant', () => {
        descendantPresent = true;
        run.update();
      });
      return (r) =>
        descendantPresent ? r.el('button', 'Rejecting descendant') : 'Initial focusable fallback';
    },
  });
  const mounted = await mount(runtime, proto);
  try {
    await frames(3);
    // Establish the root while entry self-fallback is eligible, then author a
    // descendant. Removing its Tab stop must not manufacture a blur/focus.
    await mounted.act(() => mounted.getExposes().focusRoot());
    const initialRootActive = document.activeElement === mounted.root;
    await mounted.act(() => mounted.getExposes().addDescendant());
    await frames(3);
    const target = mounted.root.querySelector('button')!;
    let trustedDescendantFocusEvents = 0;
    target.addEventListener('focus', (event) => {
      if (event.isTrusted) trustedDescendantFocusEvents++;
    });
    target.style.display = 'none';
    await mounted.act(() => mounted.getExposes().enter());
    await frames(8);
    target.style.removeProperty('display');
    await frames(3);
    const afterBudget = {
      rootActive: document.activeElement === mounted.root,
      rootFocused: mounted.getExposes().focused.get(),
      descendantActive: document.activeElement === target,
      trustedDescendantFocusEvents,
    };
    await mounted.act(() => mounted.getExposes().enter());
    return {
      initialRootActive,
      afterBudget,
      explicitRecovery: document.activeElement === target,
      trustedDescendantFocusEvents,
    };
  } finally {
    await mounted.unmount();
  }
}
