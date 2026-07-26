import type {
  CapsVaultView,
  MountPhase,
  NativeControlEvent,
  NativeControlEventType,
  NativeControlHandle,
  NativeControlPatch,
  NativeControlSnapshot,
  PrototypeModuleDeclaration,
  RunHandle,
} from '@proto.ui/core';
import { getModuleDeclaration } from '@proto.ui/core';
import { ModuleBase } from '@proto.ui/module-base';
import type { PropsBaseType } from '@proto.ui/types';
import {
  NATIVE_CONTROL_HOST_CAP,
  NATIVE_CONTROL_RUN_IN_CALLBACK_CAP,
  type NativeControlHost,
  type NativeControlHostLease,
} from './caps';
import { NATIVE_CONTROL_DECLARATION } from './declaration';

const EMPTY_PATCH: NativeControlPatch = Object.freeze({});

type Listener = {
  type: NativeControlEventType;
  callback: (run: RunHandle<PropsBaseType>, event: NativeControlEvent) => void;
};

export class NativeControlModuleImpl extends ModuleBase {
  private readonly prototypeName: string;
  private readonly supported: boolean;
  private declared = false;
  private patch: NativeControlPatch = EMPTY_PATCH;
  private value = '';
  private dirty = false;
  private composing = false;
  private listeners: Listener[] = [];
  private host: NativeControlHost | null = null;
  private lease: NativeControlHostLease | null = null;

  constructor(
    caps: CapsVaultView,
    prototypeName: string,
    declarations: readonly PrototypeModuleDeclaration[]
  ) {
    super(caps);
    this.prototypeName = prototypeName;
    this.supported = Boolean(
      getModuleDeclaration({ modules: declarations }, NATIVE_CONTROL_DECLARATION)
    );
    if (this.supported) this.refreshHost();
  }

  declare<P extends PropsBaseType>(): NativeControlHandle<P> {
    this.sys.ensureSetup('nativeControl.declare');
    if (!this.supported) {
      throw new Error(
        `[NativeControl] ${this.prototypeName} requires a static native-control declaration.`
      );
    }
    if (this.declared) {
      throw new Error(`[NativeControl] ${this.prototypeName} may declare one native control.`);
    }
    this.declared = true;
    return {
      on: (type, callback) => this.on(type, callback),
      sync: (patch) => this.sync(patch),
      snapshot: () => this.snapshot(),
    };
  }

  private on<P extends PropsBaseType>(
    type: NativeControlEventType,
    callback: (run: RunHandle<P>, event: NativeControlEvent) => void
  ): () => void {
    this.sys.ensureSetup('nativeControl.on');
    const listener: Listener = {
      type,
      callback: callback as (run: RunHandle<PropsBaseType>, event: NativeControlEvent) => void,
    };
    this.listeners = this.listeners.concat(listener);
    return () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }

  private sync(next: NativeControlPatch): void {
    this.sys.ensureCallback('nativeControl.sync');
    this.patch = Object.freeze({ ...this.patch, ...next });
    if (this.patch.valueMode === 'controlled') {
      this.value = this.patch.value ?? '';
    } else if (!this.dirty && typeof next.defaultValue === 'string') {
      this.value = next.defaultValue;
    }
    this.syncLease();
  }

  snapshot(): NativeControlSnapshot | null {
    return this.declared ? Object.freeze({ value: this.value, composing: this.composing }) : null;
  }

  protected override onCapsEpoch(): void {
    this.refreshHost();
    this.attachLease();
  }

  override onMountPhase(phase: MountPhase, epoch: number): void {
    super.onMountPhase(phase, epoch);
    if (phase === 'mounted') {
      this.refreshHost();
      this.attachLease();
      return;
    }
    if (phase === 'unmounting' || phase === 'detached') this.disposeLease();
  }

  dispose(): void {
    this.disposeLease();
    this.listeners = [];
    this.declared = false;
  }

  private refreshHost(): void {
    this.host = this.caps.has(NATIVE_CONTROL_HOST_CAP)
      ? this.caps.get(NATIVE_CONTROL_HOST_CAP)
      : null;
  }

  private attachLease(): void {
    if (!this.declared || !this.host || this.mountPhase !== 'mounted') return;
    this.disposeLease();
    this.lease = this.host.attach({
      patch: this.effectivePatch(),
      onEvent: (event) => this.receive(event),
    });
  }

  private disposeLease(): void {
    this.lease?.dispose();
    this.lease = null;
  }

  private effectivePatch(): NativeControlPatch {
    return Object.freeze({ ...this.patch, value: this.value });
  }

  private syncLease(): void {
    this.lease?.update(this.effectivePatch());
  }

  private receive(event: NativeControlEvent): void {
    this.composing = event.composing;
    if (this.patch.valueMode !== 'controlled') {
      this.value = event.value;
      if (event.type === 'input') this.dirty = true;
    }
    const runInCallback = this.caps.has(NATIVE_CONTROL_RUN_IN_CALLBACK_CAP)
      ? this.caps.get(NATIVE_CONTROL_RUN_IN_CALLBACK_CAP)
      : (callback: () => void) => callback();
    runInCallback(() => {
      const run = this.sys.getCallbackCtx() as RunHandle<PropsBaseType> | undefined;
      if (!run) return;
      for (const listener of this.listeners) {
        if (listener.type === event.type) listener.callback(run, event);
      }
    });
    if (this.patch.valueMode !== 'controlled' || event.composing) return;
    const restore = () => this.syncLease();
    if (this.sys.deferAfterCallback) this.sys.deferAfterCallback(restore);
    else queueMicrotask(restore);
  }
}
