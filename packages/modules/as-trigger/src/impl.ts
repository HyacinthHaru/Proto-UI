import type { CapsVaultView } from '@proto.ui/core';
import { capUnavailable, illegalPhase } from '@proto.ui/core';
import { ModuleBase } from '@proto.ui/module-base';
import type { EventPort } from '@proto.ui/module-event';

import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_GET_EVENT_TARGET_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
  AS_TRIGGER_SET_ROUTE_OWNER_CAP,
  type AsTriggerParentGetter,
  type AsTriggerPrototypeGetter,
} from './caps';

const TRIGGER_OWNER_MARK = Symbol.for('@proto.ui/as-trigger/confirm-owner');

export class AsTriggerModuleImpl extends ModuleBase {
  private readonly prototypeName: string;
  private readonly eventPort: EventPort;

  constructor(caps: CapsVaultView, prototypeName: string, eventPort: EventPort) {
    super(caps);
    this.prototypeName = prototypeName;
    this.eventPort = eventPort;
  }

  private ensureSetup(op: string) {
    this.sys?.ensureSetup(op);

    if (!this.sys && this.protoPhase !== 'setup') {
      throw illegalPhase(op, this.protoPhase, {
        prototypeName: this.prototypeName,
      });
    }
  }

  private getInstanceToken() {
    if (!this.caps.has(AS_TRIGGER_INSTANCE_CAP)) {
      throw capUnavailable(AS_TRIGGER_INSTANCE_CAP.id, {
        prototypeName: this.prototypeName,
      });
    }
    return this.caps.get(AS_TRIGGER_INSTANCE_CAP);
  }

  private getParentGetter(): AsTriggerParentGetter {
    if (!this.caps.has(AS_TRIGGER_PARENT_CAP)) {
      throw capUnavailable(AS_TRIGGER_PARENT_CAP.id, {
        prototypeName: this.prototypeName,
      });
    }
    return this.caps.get(AS_TRIGGER_PARENT_CAP);
  }

  private getPrototypeGetter(): AsTriggerPrototypeGetter {
    if (!this.caps.has(AS_TRIGGER_GET_PROTO_CAP)) {
      throw capUnavailable(AS_TRIGGER_GET_PROTO_CAP.id, {
        prototypeName: this.prototypeName,
      });
    }
    return this.caps.get(AS_TRIGGER_GET_PROTO_CAP);
  }

  apply(): void {
    this.ensureSetup('asTrigger.apply');

    const self = this.getInstanceToken();
    const getParent = this.getParentGetter();
    const getPrototype = this.getPrototypeGetter();

    let cur = getParent(self);
    let lastTrigger: unknown | null = null;
    const triggerAncestors: unknown[] = [];

    while (cur) {
      const curProto = getPrototype(cur);
      if (!curProto) break;

      const trace = (curProto as any).__asHooks as Array<{ name?: string }>;
      const hasTriggerMark =
        !!cur &&
        (typeof cur === 'object' || typeof cur === 'function') &&
        !!(cur as Record<symbol, unknown>)[TRIGGER_OWNER_MARK];
      const hasTriggerTrace = Array.isArray(trace)
        ? trace.some((e) => e?.name === 'as-trigger' || e?.name === 'asTrigger')
        : false;
      const hasTrigger = hasTriggerMark || hasTriggerTrace;

      if (!hasTrigger) break;

      lastTrigger = cur;
      triggerAncestors.push(cur);
      cur = getParent(cur);
    }

    const routeOwner = lastTrigger ?? self;
    if (this.caps.has(AS_TRIGGER_SET_ROUTE_OWNER_CAP)) {
      const setRouteOwner = this.caps.get(AS_TRIGGER_SET_ROUTE_OWNER_CAP);
      setRouteOwner(self, routeOwner);
      for (const ancestor of triggerAncestors) setRouteOwner(ancestor, routeOwner);
    } else if (self && (typeof self === 'object' || typeof self === 'function')) {
      // Backward-compatible fallback for hosts that still use EventTarget
      // instances as their logical trigger identity.
      (self as any)[TRIGGER_OWNER_MARK] = lastTrigger ?? true;
    }

    const eventTarget = this.caps.has(AS_TRIGGER_GET_EVENT_TARGET_CAP)
      ? (this.caps.get(AS_TRIGGER_GET_EVENT_TARGET_CAP)(self) ??
        (lastTrigger ? this.caps.get(AS_TRIGGER_GET_EVENT_TARGET_CAP)(lastTrigger) : null))
      : (self as EventTarget);
    if (!eventTarget) {
      throw capUnavailable(AS_TRIGGER_GET_EVENT_TARGET_CAP.id, {
        prototypeName: this.prototypeName,
      });
    }
    this.eventPort.redirectSemanticRoot(eventTarget);
  }
}
