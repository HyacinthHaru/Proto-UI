import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { definePrototype, type OwnedStateHandle } from '@proto.ui/core';
import { createReactAdapter, type ReactAdapterHandle } from '@proto.ui/adapter-react';
import type { RuntimeLifecycleEvent } from '@proto.ui/runtime';

declare const EVIDENCE_SOURCE: { label: string; commit: string; sessionSha256: string };

const trace: RuntimeLifecycleEvent[] = [];
const measurements: Record<string, unknown>[] = [];
const calls = {
  setup: 0,
  created: 0,
  mounted: 0,
  unmounted: 0,
  updated: 0,
  disposed: 0,
  render: 0,
};
const ref = React.createRef<ReactAdapterHandle>();
let count!: OwnedStateHandle<number>;
let setMode!: (mode: 'visible' | 'hidden') => void;
const proto = definePrototype({
  name: 'browser-update-epoch',
  setup(def) {
    calls.setup += 1;
    count = def.state.numberDiscrete('count', 0);
    def.lifecycle.onCreated(() => (calls.created += 1));
    def.lifecycle.onMounted(() => (calls.mounted += 1));
    def.lifecycle.onUnmounted(() => (calls.unmounted += 1));
    def.lifecycle.onUpdated(() => (calls.updated += 1));
    def.lifecycle.onBeforeDispose(() => (calls.disposed += 1));
    return (renderer) => {
      calls.render += 1;
      return renderer.el('p', `Count ${count.get()}`);
    };
  },
});
const Component = createReactAdapter(React)(proto, {
  schedule: (task) => task(),
  autoUpdateOnPropsChange: false,
  diagnostics: { onLifecycleEvent: (event) => trace.push(event) },
});

function App() {
  const [mode, changeMode] = React.useState<'visible' | 'hidden'>('visible');
  setMode = changeMode;
  return React.createElement(React.Activity, { mode }, React.createElement(Component, { ref }));
}

function sample(step: string) {
  const phases = trace.filter((event) => event.type === 'mount.phase');
  const current = phases.at(-1) as { phase: string; epoch: number };
  const value = {
    step,
    phase: current?.phase,
    epoch: current?.epoch,
    state: count?.get(),
    renderedText: document.querySelector('#actual p')?.textContent ?? null,
    calls: { ...calls },
    updateEvents: trace.filter((event) => event.type.startsWith('update.')),
  };
  measurements.push(value);
  document.querySelector('#logical')!.textContent = String(value.state);
  document.querySelector('#phase')!.textContent = `${value.phase} · epoch ${value.epoch}`;
  document.querySelector('#renders')!.textContent = String(calls.render);
  document.querySelector('#updated')!.textContent = String(calls.updated);
  document.querySelector('#steps')!.replaceChildren(
    ...measurements.map((entry: any) => {
      const row = document.createElement('tr');
      for (const text of [
        entry.step,
        `${entry.phase} / ${entry.epoch}`,
        entry.state,
        entry.renderedText,
        entry.calls.render,
        entry.calls.updated,
      ]) {
        const cell = document.createElement('td');
        cell.textContent = String(text);
        row.append(cell);
      }
      return row;
    })
  );
  return value;
}

function setState(value: number) {
  ref.current!.invokeInCallbackScope!(() => count.set(value));
}

function crossing() {
  const originalState = count;
  // Real React receives both writes in one synchronous host transaction.
  // The Activity hide destroys layout effects before the old update can ack.
  flushSync(() => {
    setState(1);
    ref.current!.update();
    setMode('hidden');
  });
  sample('1 · update(1), then Activity hidden');
  flushSync(() => setMode('visible'));
  sample('2 · Activity visible; mount completed');
  flushSync(() => {
    setState(2);
    ref.current!.update();
  });
  const result = sample('3 · replacement view update(2)');
  return {
    result,
    sameState: count === originalState,
    trace,
    measurements,
    source: EVIDENCE_SOURCE,
  };
}

function coalescing() {
  flushSync(() => {
    setState(1);
    ref.current!.update();
    setState(2);
    ref.current!.update();
    sample('1 · two updates before React commit');
  });
  return {
    result: sample('2 · React commits and drains queued update'),
    trace,
    measurements,
    source: EVIDENCE_SOURCE,
  };
}

document.querySelector('#source')!.textContent =
  `${EVIDENCE_SOURCE.label} · ${EVIDENCE_SOURCE.commit.slice(0, 8)} · React ${React.version}`;
document.querySelector('#source-hash')!.textContent =
  `session.ts SHA-256 ${EVIDENCE_SOURCE.sessionSha256}`;
const root = createRoot(document.querySelector('#actual')!);
flushSync(() => root.render(React.createElement(App)));
sample('0 · initial mount');
document.querySelector('#crossing')!.addEventListener('click', crossing);
document.querySelector('#coalescing')!.addEventListener('click', coalescing);
(window as any).evidence = {
  crossing,
  coalescing,
  sample,
  trace,
  measurements,
  calls,
  source: EVIDENCE_SOURCE,
};
