import { afterEach, expect, it, vi } from 'vitest';
import { initSiteShadcnControls, registerSiteShadcnControls } from './site-shadcn-controls';

const probe = vi.hoisted(() => ({
  events: [] as any[],
  commits: 0,
  connections: 0,
  structures: 0,
  stopped: false,
  active: false,
}));
vi.mock(
  '../../../../packages/prototypes/base/src/select/alignment-controller',
  async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
      ...actual,
      createSelectAlignmentController(options: any) {
        let controller: any;
        controller = actual.createSelectAlignmentController({
          ...options,
          changed(run: any) {
            if (probe.active)
              probe.events.push({
                kind: 'phase',
                phase: controller.phase,
                diagnostic: controller.diagnostic,
              });
            options.changed(run);
          },
        });
        const original = controller.structureChanged;
        controller.structureChanged = (run: any) => {
          if (probe.active) {
            probe.structures++;
            probe.events.push({ kind: 'structure', n: probe.structures, phase: controller.phase });
          }
          if (probe.structures > 80) {
            probe.stopped = true;
            return;
          }
          return original(run);
        };
        return controller;
      },
    };
  }
);
vi.mock('../../../../packages/adapters/web-component/src/commit', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    commitChildren(host: any, children: any, opt: any) {
      if (probe.active) {
        probe.commits++;
        probe.events.push({
          kind: 'commit',
          tag: host.localName,
          slots: opt?.slotPool?.map((n: any) => n.localName),
        });
      }
      if (probe.commits > 100) {
        probe.stopped = true;
        return { hasSlot: false };
      }
      return actual.commitChildren(host, children, opt);
    },
  };
});

async function settle() {
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 4; i++) await Promise.resolve();
}
afterEach(async () => {
  probe.active = false;
  document.body.replaceChildren();
  await settle();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function geometry() {
  const box = (l: number, t: number, w: number, h: number) =>
    ({
      left: l,
      top: t,
      right: l + w,
      bottom: t + h,
      width: w,
      height: h,
      x: l,
      y: t,
      toJSON() {},
    }) as DOMRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.localName.endsWith('trigger')) return box(180, 240, 180, 36);
    if (this.localName.endsWith('value')) return box(193, 248, 50, 20);
    if (this.localName.endsWith('surface')) return box(0, 0, 180, 138);
    if (this.localName.endsWith('item-text')) return box(13, 37, 50, 20);
    return box(0, 0, 180, 32);
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.localName.endsWith('viewport')
      ? 136
      : this.localName.endsWith('surface')
        ? 138
        : 32;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(136);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(136);
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.localName.endsWith('item')
      ? 4 + Number(this.getAttribute('data-collection-index')) * 32
      : 0;
  });
}

// The platform can drain a previously queued connected reaction after a parent
// connected reaction detaches the descendant. happy-dom delivers immediately,
// so this harness replays just that allowed edge, once per moved text node.
// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-conformance
// Counters stop a regression synchronously instead of hanging the runner.
it.each(['native-happy-dom', 'pending-descendant-reaction', 'malformed-item-text'] as const)(
  'bounded public full Select click: %s',
  async (mode) => {
    vi.useFakeTimers();
    geometry();
    registerSiteShadcnControls();
    Object.assign(probe, {
      events: [],
      commits: 0,
      connections: 0,
      structures: 0,
      stopped: false,
      active: false,
    });
    for (const part of [
      'root',
      'trigger',
      'value',
      'content',
      'surface',
      'viewport',
      'item',
      'item-text',
    ]) {
      const proto = customElements.get(`wc-shadcn-select-${part}`)!.prototype;
      const callback = proto.connectedCallback;
      vi.spyOn(proto, 'connectedCallback').mockImplementation(function (this: HTMLElement) {
        if (probe.active) {
          probe.connections++;
          probe.events.push({ kind: 'connect', tag: this.localName });
        }
        if (probe.connections > 100) {
          probe.stopped = true;
          return;
        }
        return callback.call(this);
      });
    }
    const root = document.createElement('wc-shadcn-select-root') as any;
    root.dataset.siteSelectRoot = '1';
    root.dataset.siteInitialValue = 'wc';
    root.dataset.adapterSelectRoot = '';
    root.innerHTML = `<wc-shadcn-select-trigger data-size="sm"><wc-shadcn-select-value>Runtime</wc-shadcn-select-value></wc-shadcn-select-trigger><wc-shadcn-select-content><wc-shadcn-select-surface><wc-shadcn-select-viewport>${['wc', 'react', 'vue', 'vue2'].map((v) => `<wc-shadcn-select-item data-value="${v}" data-text-value="${v}"><wc-shadcn-select-item-text>${v}</wc-shadcn-select-item-text></wc-shadcn-select-item>`).join('')}</wc-shadcn-select-viewport></wc-shadcn-select-surface></wc-shadcn-select-content>`;
    root.querySelector('wc-shadcn-select-surface').style.cssText =
      'border:1px solid black;padding:0px;';
    root.querySelector('wc-shadcn-select-viewport').style.cssText = 'padding:4px;';
    if (mode === 'malformed-item-text') root.querySelector('wc-shadcn-select-item-text').remove();
    document.body.append(root);
    initSiteShadcnControls(document);
    await settle();
    const content = root.querySelector('wc-shadcn-select-content') as any;
    if (mode === 'pending-descendant-reaction') {
      const pending = new Set<HTMLElement>();
      const append = document.body.appendChild;
      vi.spyOn(document.body, 'appendChild').mockImplementation(function (
        this: HTMLElement,
        node: any
      ) {
        if (node === content && node.isConnected)
          for (const text of node.querySelectorAll('wc-shadcn-select-item-text'))
            pending.add(text as HTMLElement);
        const result = append.call(this, node);
        pending.clear();
        return result;
      });
      const remove = Node.prototype.removeChild;
      vi.spyOn(Node.prototype, 'removeChild').mockImplementation(function (this: Node, node: any) {
        const result = remove.call(this, node);
        if (pending.delete(node)) {
          probe.events.push({
            kind: 'injected-pending-connected-at-detach',
            tag: node.localName,
            connected: node.isConnected,
            parent: node.parentElement?.localName ?? null,
          });
          node.connectedCallback();
        }
        return result;
      });
    }
    const textOwners = [...root.querySelectorAll('wc-shadcn-select-item-text')].map(
      (element: any) => ({ element, token: element._instanceToken })
    );
    probe.active = true;
    root.querySelector('wc-shadcn-select-trigger').click();
    await settle();
    const report = {
      mode,
      stopped: probe.stopped,
      counts: {
        connections: probe.connections,
        commits: probe.commits,
        structures: probe.structures,
      },
      open: root.getExposes().open.get(),
      phase: content.getExposes().transitionState.get(),
      diagnostic: content.getExposes().alignmentDiagnostic.get(),
      events: probe.events,
    };
    expect(probe.stopped).toBe(false);
    if (mode === 'malformed-item-text') {
      expect(report.phase).toBe('closed');
      expect(report.open).toBe(true);
      expect(report.diagnostic).toBe('select.structure.missing-or-ambiguous-item-text');
      return;
    }
    expect(report.phase).toBe('entering');
    expect(report.diagnostic).toBe('');
    expect(probe.structures).toBe(0);
    expect(probe.commits).toBe(4);
    if (mode === 'pending-descendant-reaction')
      expect(
        probe.events.filter((e) => e.kind === 'injected-pending-connected-at-detach')
      ).toHaveLength(4);
    for (const { element, token } of textOwners) {
      expect(element.isConnected).toBe(true);
      expect(element._instanceToken).toBe(token);
    }
    const trigger = root.querySelector('wc-shadcn-select-trigger');
    trigger.click();
    await settle();
    expect(root.getExposes().open.get()).toBe(false);
    trigger.click();
    await settle();
    expect(root.getExposes().open.get()).toBe(true);
    expect(probe.stopped).toBe(false);
    expect(content.getExposes().transitionState.get()).toBe('entering');
    expect(content.getExposes().alignmentDiagnostic.get()).toBe('');
    for (const { element, token } of textOwners) expect(element._instanceToken).toBe(token);
  }
);
