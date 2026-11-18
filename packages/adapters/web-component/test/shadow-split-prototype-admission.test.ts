import { describe, expect, it } from 'vitest';
import dialogMask from '../../../prototypes/shadcn/src/dialog/overlay.proto';
import dialogRoot from '../../../prototypes/shadcn/src/dialog/root.proto';
import { AdaptToWebComponent, setElementProps } from '../src';
import { renderProtoShadowSplitStyleArtifact } from '../../../cli/src/services/proto-style-css';
import { rewriteSplitBaseDeclarations } from './shadow-split-test-utils';

const cases = [
  { mode: 'ordinary', invalid: true, sink: false },
  { mode: 'deferred-invalid', invalid: true, sink: true },
  { mode: 'deferred-valid', invalid: false, sink: true },
];

// D1 pilot boundary + D-FEEDBACK-STYLE-ROLE-RESOLUTION-0001 C/K:
// the actual asDialogMask -> asTransition closure requires an I1 hidden recipe.
describe('composed Shadow prototype admission', () => {
  it.each(cases)('admits the Dialog Mask ($mode)', async ({ mode, invalid, sink }) => {
    const Parent = AdaptToWebComponent(dialogRoot, { registerAs: `x-split-mask-parent-${mode}` });
    const parent = new Parent();
    setElementProps(parent, { open: true });
    document.body.append(parent);
    const artifact = renderProtoShadowSplitStyleArtifact([
      'fixed',
      'inset-0',
      'bg-background',
      'bg-black/50',
      'backdrop-blur-xs',
      'hidden',
      'animate-in',
      'fade-in-0',
      'animate-out',
      'fade-out-0',
    ]);
    const oldArtifact = {
      ...artifact,
      cssText: rewriteSplitBaseDeclarations(artifact.cssText, (declarations) =>
        declarations.replace('--pui-split-participation-coordinate-recipe: i1;', '')
      ),
    };
    const environmentListeners = new Set<() => void>();
    const lifecycleEvents: string[] = [];
    let finishDisposal!: () => void;
    const disposed = new Promise<void>((resolve) => {
      finishDisposal = resolve;
    });
    const Mask = AdaptToWebComponent(dialogMask, {
      registerAs: `x-split-mask-admission-${mode}`,
      createVisualSink: sink ? () => null : undefined,
      shadow: {
        mode: 'open',
        presentation: 'split',
        styleArtifact: invalid ? oldArtifact : artifact,
        colorSchemeSource: {
          get: () => 'light',
          subscribe(listener) {
            environmentListeners.add(listener);
            return () => {
              environmentListeners.delete(listener);
            };
          },
        },
      },
      diagnostics: {
        onLifecycleEvent(event) {
          lifecycleEvents.push(event.type);
          if (event.type === 'mount.phase') lifecycleEvents.push(event.phase);
          if (event.type === 'instance.dispose.done') finishDisposal();
        },
      },
      schedule: (task) => task(),
    });
    const host = new Mask();
    const errors: unknown[] = [];
    const capture = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', capture);
    try {
      expect(parent.getExposes().open.get()).toBe(true);
      // Capture native CE reports and the harness's synchronous transport;
      // neither changes the real connected Dialog provider association.
      try {
        parent.append(host);
      } catch (error) {
        errors.push(error);
      }
      expect(lifecycleEvents).toContain('mount.commit.done');
      if (invalid) {
        expect(errors).toHaveLength(1);
        expect(errors[0]).toBeInstanceOf(Error);
        expect(String(errors[0])).toMatch(/hidden.*I1 recipe/);
        expect(lifecycleEvents).not.toContain('mounted');
        expect(lifecycleEvents).not.toContain('mount.mounted');
      } else {
        expect(errors).toHaveLength(0);
        expect(lifecycleEvents).toContain('mounted');
        expect(lifecycleEvents).toContain('mount.mounted');
        expect(environmentListeners.size).toBe(1);
        host.remove();
      }
      await disposed;
      expect(environmentListeners.size).toBe(0);
      expect(host.getExposes?.() ?? {}).toEqual({});
      expect(host.hasAttribute('data-pui-color-scheme')).toBe(false);
      expect(host.hasAttribute('data-pui-split-root-style')).toBe(false);
      expect(host.shadowRoot?.childNodes.length).toBe(0);
      expect(errors).toHaveLength(invalid ? 1 : 0);
    } finally {
      host.remove();
      parent.remove();
      await Promise.resolve();
      window.removeEventListener('error', capture);
    }
  });
});
