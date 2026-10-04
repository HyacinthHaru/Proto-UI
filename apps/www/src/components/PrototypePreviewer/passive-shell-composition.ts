import { withNativeContentLease } from './native-content-lease';
import { createProjectionScopeController } from './projection-scope';
import { renderDemo } from './demo-renderer';
import { loadPrototypes } from './prototype-modules';
import {
  applyProjectionThemeSurfaceStyle,
  type ProjectionThemeSurfaceStyle,
} from './projection-theme';
import type { DemoRenderResult } from './demo-types';
import type { RuntimeId } from './runtimes/registry';

/** Composition lease, not a host runtime: existing public renderers own each
 * shell; the original renderer exclusively owns the borrowed content subtree.
 * Return that subtree synchronously before its renderer tears down. */
export function createPassiveShellComposition(options: {
  runtime: RuntimeId;
  mount: HTMLElement;
  content: HTMLElement;
  family: string;
  theme: ProjectionThemeSurfaceStyle;
  prototypeId(family: string): string;
  props(family: string): Record<string, unknown>;
  layout: Record<string, string>;
  className: string;
  surfaceRef?: string;
}) {
  const { mount, content } = options;
  const home = content.parentNode!;
  const nextSibling = content.nextSibling;
  const document = mount.ownerDocument;
  let alive = true;
  let theme = options.theme;
  const slots = new Map<number, HTMLElement>();
  const surfaces = new Map<number, HTMLElement>();
  const move = (parent: Node, before: Node | null = null) =>
    withNativeContentLease(content, () => {
      parent.insertBefore(content, before?.parentNode === parent ? before : null);
    });
  const controller = createProjectionScopeController({
    initialSelection: { runtimeId: options.runtime, projectionFamilyId: options.family },
    async materialize(request) {
      const prototypeId = options.prototypeId(request.selection.projectionFamilyId);
      await loadPrototypes([prototypeId]);
      if (!alive) throw new Error('Passive shell composition disposed');
      const host = document.createElement('div');
      host.hidden = true;
      mount.append(host);
      let rendered: DemoRenderResult | undefined;
      try {
        rendered = await renderDemo({
          runtime: options.runtime,
          host,
          isCurrent: () => alive,
          demo: {
            type: 'demo',
            root: {
              kind: 'proto',
              prototypeId,
              ref: options.surfaceRef ?? 'shell',
              className: options.className,
              props: options.props(request.selection.projectionFamilyId),
              surfaceStyle: { ...options.layout, ...theme },
              children: [
                {
                  kind: 'box',
                  ref: 'slot',
                  attrs: { 'data-passive-shell-slot': '' },
                  children: [],
                },
              ],
            },
            setup(context) {
              const slot = context.refs.slot!;
              const surface = context.refs[options.surfaceRef ?? 'shell']!;
              slot.style.display = 'contents';
              content.style.display = 'contents';
              surface.dataset.projectionPrototype = prototypeId;
              surface.dataset.projectionRuntime = options.runtime;
              surface.dataset.projectionFamily = request.selection.projectionFamilyId;
              surface.dataset.projectionGeneration = String(request.generation);
              slots.set(request.generation, slot);
              surfaces.set(request.generation, surface);
              applyProjectionThemeSurfaceStyle(surface, theme);
            },
          },
        });
        return {
          activate() {
            host.hidden = false;
          },
          setLocked() {},
          async dispose() {
            const slot = slots.get(request.generation);
            if (slot?.contains(content)) move(home, nextSibling);
            slots.delete(request.generation);
            surfaces.delete(request.generation);
            await rendered?.destroy();
            host.remove();
          },
        };
      } catch (error) {
        slots.delete(request.generation);
        surfaces.delete(request.generation);
        await rendered?.destroy();
        host.remove();
        throw error;
      }
    },
    prepareCommit(commit) {
      const slot = slots.get(commit.generation);
      if (!slot) throw new Error('Prepared passive shell slot missing');
      const previous = content.parentNode!;
      const before = content.nextSibling;
      return {
        publish() {
          if (!alive) throw new Error('Passive shell composition disposed');
          move(slot);
        },
        rollback() {
          if (slot.contains(content)) move(previous, before);
        },
      };
    },
  });
  const ready = controller.start();
  return {
    ready,
    async update(family: string, nextTheme: ProjectionThemeSurfaceStyle) {
      if (!alive) return;
      theme = nextTheme;
      for (const surface of surfaces.values()) applyProjectionThemeSurfaceStyle(surface, theme);
      await controller.request({ runtimeId: options.runtime, projectionFamilyId: family });
    },
    destroy() {
      if (!alive) return Promise.resolve();
      alive = false;
      move(home, nextSibling);
      return controller.destroy();
    },
  };
}
