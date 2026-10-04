import { afterEach, describe, expect, it } from 'vitest';
import { createA11ySemanticObjectRef, definePrototype } from '@proto.ui/core';
import { FOCUS_ROOT_TARGET_CAP } from '@proto.ui/module-focus';
import { A11Y_PROJECT_CAP, type A11yProjector } from '@proto.ui/module-a11y';
import { createReactModules } from '../src/runtime/modules';
import {
  createLogicalInstance,
  markProtoInstance,
  unbindProtoInstance,
} from '../src/platform/instance-tree';

afterEach(() => document.body.replaceChildren());

describe('React Focus target readiness', () => {
  it('withholds a connected target until both view effects and event ingress are ready', () => {
    const prototype = definePrototype({ name: 'react-focus-readiness-control', setup() {} });
    const instanceToken = createLogicalInstance(prototype);
    const target = document.createElement('div');
    document.body.append(target);
    markProtoInstance(target, prototype, instanceToken);
    let effectsReady = true;
    let focusReady = false;
    const args = {
      el: target,
      instanceToken,
      router: { rootTarget: new EventTarget(), globalTarget: window },
      emit() {},
      rawPropsSource: { debugName: 'readiness-test', get: () => ({}), subscribe: () => () => {} },
      effectsPort: { queueStyle() {}, requestFlush() {}, flushNow() {} },
      getMeta: () => undefined,
      setExposes() {},
      runInCallbackScope: (fn: () => void) => fn(),
      isViewReady: () => effectsReady,
      isFocusTargetReady: () => focusReady,
      getCurrentElement: () => target,
      subscribeTargetReady: () => () => {},
      retryTargetReady() {},
    };
    const modules = createReactModules(args);
    const getTarget = new Map(modules.focus({ prototypeName: prototype.name })).get(
      FOCUS_ROOT_TARGET_CAP
    ) as () => HTMLElement | null;
    try {
      // This controlled temporal split is the reported native boundary: the
      // physical target exists, but a host:focus event would still be dropped.
      expect(getTarget()).toBeNull();
      const project = new Map(modules.a11y({ prototypeName: prototype.name })).get(
        A11Y_PROJECT_CAP
      ) as A11yProjector;
      project({
        role: 'button',
        objectRef: createA11ySemanticObjectRef(),
        name: { kind: 'text', value: 'Readiness control' },
        states: {},
        relations: {},
        actions: {},
      });
      expect(target.getAttribute('role')).toBe('button');
      expect(target.getAttribute('aria-label')).toBe('Readiness control');
      project.dispose?.();
      focusReady = true;
      expect(getTarget()).toBe(target);
      effectsReady = false;
      expect(getTarget()).toBeNull();
      effectsReady = true;
      target.remove();
      expect(getTarget()).toBeNull();
    } finally {
      unbindProtoInstance(target);
    }
  });
});
