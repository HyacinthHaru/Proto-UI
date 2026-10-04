import { describe, expect, it } from 'vitest';
import { definePrototype } from '@proto.ui/core';
import type { HostToPeerMessage, PeerToHostMessage } from '@proto.ui/host-protocol';
import { switchRoot, switchThumb } from '@proto.ui/prototypes-base/switch';
import { createPeerSession, type PeerSession } from '../src/session';
import { createPeerProcess } from '../src/stdio';
import { createFrameDecoder, encodeFrame } from '../src/transport';
import { ScriptedHost } from './scripted-host';

const neutral = definePrototype({ name: 'lifetime-neutral', setup: () => (r) => r.slot() });
function open(id: string, prototype = neutral, parent?: PeerSession) {
  const host = new ScriptedHost(id);
  const peer = createPeerSession({
    sessionId: id,
    instanceId: id + ':instance',
    prototype,
    props: {},
    parent,
    send: (message) => host.receive(message),
    schedule: (task) => task(),
  });
  host.bind((message) => peer.handle(message));
  return { host, peer };
}
function latch() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

// C-LIFECYCLE-0008-F: terminal owner authority; PeerSession.dispose: all children end first.
describe('gpui peer: composed terminal lifetime', () => {
  it('closes child admission synchronously when disposal starts', async () => {
    const root = open('immediate-owner', switchRoot);
    await root.peer.mount();
    const ending = root.peer.dispose();
    let late: ReturnType<typeof open> | undefined;
    let rejected = false;
    try {
      late = open('immediate-late', switchThumb, root.peer);
    } catch {
      rejected = true;
    }
    await ending;
    if (late) await late.peer.dispose();
    expect(rejected).toBe(true);
    expect(root.host.of('session.disposed')).toHaveLength(1);
  });

  it('rejects late direct children while an existing child teardown awaits', async () => {
    const entered = latch(),
      finish = latch();
    const waiting = definePrototype({
      name: 'lifetime-waiting',
      setup(def) {
        def.lifecycle.onBeforeDispose(async () => {
          entered.release();
          await finish.promise;
        });
        return (r) => r.slot();
      },
    });
    const root = open('waiting-owner', switchRoot);
    await root.peer.mount();
    const child = open('waiting-child', waiting, root.peer);
    await child.peer.mount();
    const ending = root.peer.dispose();
    await entered.promise;
    let late: ReturnType<typeof open> | undefined;
    let rejected = false;
    try {
      late = open('waiting-late', switchThumb, root.peer);
      await late.peer.mount();
    } catch {
      rejected = true;
    }
    finish.release();
    await ending;
    if (late) await late.peer.dispose();
    expect(rejected).toBe(true);
    expect(child.host.of('session.disposed')).toHaveLength(1);
    expect(root.host.of('session.disposed')).toHaveLength(1);
  });

  it('rejects grandchildren beneath an open child of a closing ancestor', async () => {
    const entered = latch(),
      finish = latch();
    const waiting = definePrototype({
      name: 'ancestor-waiting',
      setup(def) {
        def.lifecycle.onBeforeDispose(async () => {
          entered.release();
          await finish.promise;
        });
        return (r) => r.slot();
      },
    });
    const root = open('ancestor-owner');
    await root.peer.mount();
    const older = open('ancestor-older-child', neutral, root.peer);
    await older.peer.mount();
    const newest = open('ancestor-newest-child', waiting, root.peer);
    await newest.peer.mount();
    const ending = root.peer.dispose();
    await entered.promise;
    let late: ReturnType<typeof open> | undefined;
    let rejected = false;
    try {
      late = open('ancestor-late-grandchild', neutral, older.peer);
      await late.peer.mount();
    } catch {
      rejected = true;
    }
    finish.release();
    await ending;
    if (late) await late.peer.dispose();
    expect(rejected).toBe(true);
    expect(older.host.of('session.disposed')).toHaveLength(1);
  });

  it('keeps failed owners closed to children without affecting unrelated roots', async () => {
    const failing = definePrototype({
      name: 'lifetime-failing',
      setup(def) {
        def.lifecycle.onBeforeDispose(() => {
          throw new Error('intentional teardown failure');
        });
        return (r) => r.slot();
      },
    });
    const root = open('failed-owner', failing);
    await root.peer.mount();
    await expect(root.peer.dispose()).rejects.toThrow('did not end');
    let late: ReturnType<typeof open> | undefined;
    let rejected = false;
    try {
      late = open('failed-late', neutral, root.peer);
    } catch {
      rejected = true;
    }
    if (late) await late.peer.dispose();
    expect(rejected).toBe(true);
    expect(root.host.of('session.disposed')).toHaveLength(0);
    const other = open('unrelated-owner');
    await other.peer.mount();
    await other.peer.dispose();
    expect(other.host.of('session.disposed')).toHaveLength(1);
  });

  it('retains failed parent and child IDs in the serialized stdio registry', async () => {
    const failing = definePrototype({
      name: 'stdio-failing-child',
      setup(def) {
        def.lifecycle.onBeforeDispose(() => {
          throw new Error('intentional child failure');
        });
        return (r) => r.slot();
      },
    });
    const decoder = createFrameDecoder<PeerToHostMessage>();
    const received: PeerToHostMessage[] = [];
    const peer = createPeerProcess({
      bundle: {
        bundleId: 'lifetime',
        digest: 'test',
        entries: {
          root: async () => neutral,
          failing: async () => failing,
        },
      },
      write: (bytes) => received.push(...decoder.push(bytes)),
    });
    const send = async (message: HostToPeerMessage) => {
      peer.push(encodeFrame(message));
      await peer.idle();
    };
    await send({
      kind: 'session.open',
      sessionId: 'stdio-owner',
      instanceId: 'owner',
      prototypeKey: 'root',
      props: {},
    });
    await send({
      kind: 'session.open',
      sessionId: 'stdio-child',
      instanceId: 'child',
      prototypeKey: 'failing',
      props: {},
      parentSessionId: 'stdio-owner',
    });
    await send({ kind: 'session.dispose', sessionId: 'stdio-owner' });
    expect(
      received.some((m) => m.kind === 'diagnostic' && m.diagnostic.code === 'handler-failed')
    ).toBe(true);
    expect(received.filter((m) => m.kind === 'session.disposed')).toHaveLength(0);
    await send({
      kind: 'session.open',
      sessionId: 'stdio-owner',
      instanceId: 'replacement',
      prototypeKey: 'root',
      props: {},
    });
    await send({
      kind: 'session.open',
      sessionId: 'stdio-child',
      instanceId: 'replacement-child',
      prototypeKey: 'root',
      props: {},
    });
    expect(received.filter((m) => m.kind === 'session.opened')).toHaveLength(2);
    expect(
      received.filter((m) => m.kind === 'diagnostic' && m.diagnostic.code === 'session-exists')
    ).toHaveLength(2);
    await send({
      kind: 'session.open',
      sessionId: 'stdio-late',
      instanceId: 'late',
      prototypeKey: 'root',
      props: {},
      parentSessionId: 'stdio-owner',
    });
    expect(
      received.find((m) => m.kind === 'session.opened' && m.sessionId === 'stdio-late')
    ).toMatchObject({ status: 'failed' });
  });

  it('releases successful IDs on the terminal receipt and permits reopening', async () => {
    const decoder = createFrameDecoder<PeerToHostMessage>();
    const received: PeerToHostMessage[] = [];
    const peer = createPeerProcess({
      bundle: { bundleId: 'normal', digest: 'test', entries: { root: async () => neutral } },
      write: (bytes) => received.push(...decoder.push(bytes)),
    });
    const send = async (message: HostToPeerMessage) => {
      peer.push(encodeFrame(message));
      await peer.idle();
    };
    const message: HostToPeerMessage = {
      kind: 'session.open',
      sessionId: 'normal-owner',
      instanceId: 'first',
      prototypeKey: 'root',
      props: {},
    };
    await send(message);
    await send({ kind: 'session.dispose', sessionId: 'normal-owner' });
    await send({ ...message, instanceId: 'second' });
    expect(received.filter((m) => m.kind === 'session.disposed')).toHaveLength(1);
    expect(received.filter((m) => m.kind === 'session.opened')).toHaveLength(2);
    expect(
      received.some((m) => m.kind === 'diagnostic' && m.diagnostic.code === 'session-exists')
    ).toBe(false);
    await send({ kind: 'session.dispose', sessionId: 'normal-owner' });
  });
});
