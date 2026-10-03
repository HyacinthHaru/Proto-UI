import type { DemoNode, DemoSetupContext, DemoSpec } from '../PrototypePreviewer/demo-types';
import type { ProjectionContentRecipe } from '../PrototypePreviewer/projection-composition';
import {
  resolveProjectionPart,
  type ProjectionFamilyId,
} from '../PrototypePreviewer/projection-families';
import type { RuntimeId } from '../PrototypePreviewer/runtimes/registry';

export const HOMEPAGE_SHOWCASE_ID = 'website-workspace-settings';

type Settings = { view: 'list' | 'board' | 'calendar'; summary: boolean; note: string };
const defaults = (): Settings => ({ view: 'list', summary: false, note: '' });
const equal = (left: Settings, right: Settings) =>
  left.view === right.view && left.summary === right.summary && left.note === right.note;

const COPY = {
  en: {
    title: 'Workspace settings',
    view: 'Default project view',
    views: { list: 'List', board: 'Board', calendar: 'Calendar' },
    summary: 'Show weekly summary',
    note: 'Workspace note',
    placeholder: 'What should your team keep in mind?',
    save: 'Save to this page',
    reset: 'Restore defaults',
    unchanged: 'No unsaved changes',
    changed: 'Unsaved changes',
    saved: 'Saved to this page',
    restored: 'Defaults restored',
    summaryOn: 'Weekly summary on',
    summaryOff: 'Weekly summary off',
    characters: (count: number) => `${count} / 240 characters`,
    noteLength: (count: number) => `Note: ${count} characters`,
  },
  'zh-cn': {
    title: '工作区设置',
    view: '默认项目视图',
    views: { list: '列表', board: '看板', calendar: '日历' },
    summary: '显示每周摘要',
    note: '工作区备注',
    placeholder: '有哪些需要团队记住的事情？',
    save: '保存到本页',
    reset: '恢复默认值',
    unchanged: '没有未保存的更改',
    changed: '有未保存的更改',
    saved: '已保存到本页',
    restored: '已恢复默认值',
    summaryOn: '显示每周摘要',
    summaryOff: '隐藏每周摘要',
    characters: (count: number) => `${count} / 240 字`,
    noteLength: (count: number) => `备注 ${count} 字`,
  },
};

/** Website-owned task composition. All interactive behavior stays in existing public Prototypes. */
export function createHomepageShowcase(
  family: ProjectionFamilyId,
  runtime: RuntimeId,
  locale: string,
  isActive: () => boolean,
  isCurrentGeneration: () => boolean = isActive
): { demo: DemoSpec; recipe: ProjectionContentRecipe } {
  const copy = COPY[locale === 'en' ? 'en' : 'zh-cn'];
  const parts = {
    select: resolveProjectionPart(family, 'select', 'root').prototypeId,
    trigger: resolveProjectionPart(family, 'select', 'trigger').prototypeId,
    value: resolveProjectionPart(family, 'select', 'value').prototypeId,
    content: resolveProjectionPart(family, 'select', 'content').prototypeId,
    item: resolveProjectionPart(family, 'select', 'item').prototypeId,
    switch: resolveProjectionPart(family, 'switch', 'root').prototypeId,
    thumb: resolveProjectionPart(family, 'switch', 'thumb').prototypeId,
    textarea: resolveProjectionPart(family, 'textarea', 'root').prototypeId,
    button: resolveProjectionPart(family, 'button', 'root').prototypeId,
  };
  const label = (text: string): DemoNode => ({
    kind: 'box',
    className: 'home-settings__label',
    children: [text],
  });
  const initial = defaults();
  return {
    recipe: {
      id: HOMEPAGE_SHOWCASE_ID,
      prototypeIds: Object.values(parts),
      rootPrototypeId: parts.select,
    },
    demo: {
      type: 'demo',
      root: {
        kind: 'box',
        ref: 'settings',
        className: 'home-settings',
        attrs: { 'data-home-settings': '', role: 'group', 'aria-label': copy.title },
        children: [
          {
            kind: 'box',
            className: 'home-settings__title',
            attrs: { role: 'heading', 'aria-level': '2' },
            children: [copy.title],
          },
          {
            kind: 'box',
            className: 'home-settings__fields',
            children: [
              {
                kind: 'box',
                className: 'home-settings__preferences',
                children: [
                  {
                    kind: 'box',
                    className: 'home-settings__field',
                    children: [
                      label(copy.view),
                      {
                        kind: 'proto',
                        prototypeId: parts.select,
                        ref: 'settings-view',
                        props: { value: initial.view, closeOnSelect: true },
                        surfaceStyle: { width: '100%' },
                        children: [
                          {
                            kind: 'proto',
                            prototypeId: parts.trigger,
                            ref: 'settings-view-trigger',
                            surfaceStyle: { width: '100%' },
                            children: [
                              {
                                kind: 'proto',
                                prototypeId: parts.value,
                                props: { placeholder: copy.view },
                              },
                            ],
                          },
                          {
                            kind: 'proto',
                            prototypeId: parts.content,
                            props: { position: 'popper', align: 'start' },
                            children: Object.entries(copy.views).map(([value, text]) => ({
                              kind: 'proto',
                              prototypeId: parts.item,
                              props: { value, textValue: text },
                              children: [text],
                            })),
                          },
                        ],
                      },
                    ],
                  },
                  {
                    kind: 'box',
                    className: 'home-settings__switch-row',
                    children: [
                      label(copy.summary),
                      {
                        kind: 'proto',
                        prototypeId: parts.switch,
                        ref: 'settings-summary',
                        props: { checked: initial.summary },
                        children: [
                          { kind: 'proto', prototypeId: parts.thumb },
                          { kind: 'box', className: 'sr-only', children: [copy.summary] },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                kind: 'box',
                className: 'home-settings__field',
                children: [
                  label(copy.note),
                  {
                    kind: 'proto',
                    prototypeId: parts.textarea,
                    ref: 'settings-note',
                    props: {
                      value: initial.note,
                      ariaLabel: copy.note,
                      placeholder: copy.placeholder,
                      rows: 5,
                      maxLength: 240,
                    },
                    surfaceStyle: { width: '100%', minWidth: '0' },
                  },
                  {
                    kind: 'box',
                    ref: 'settings-count',
                    className: 'home-settings__muted',
                    children: [copy.characters(0)],
                  },
                ],
              },
            ],
          },
          {
            kind: 'box',
            className: 'home-settings__footer',
            children: [
              {
                kind: 'box',
                className: 'home-settings__actions',
                children: [
                  {
                    kind: 'proto',
                    prototypeId: parts.button,
                    ref: 'settings-save',
                    props: { disabled: true },
                    children: [copy.save],
                  },
                  {
                    kind: 'proto',
                    prototypeId: parts.button,
                    ref: 'settings-reset',
                    props: { disabled: true, variant: family === 'shadcn' ? 'outline' : 'surface' },
                    children: [copy.reset],
                  },
                ],
              },
              {
                kind: 'box',
                ref: 'settings-feedback',
                className: 'home-settings__feedback',
                attrs: { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
                children: [copy.unchanged],
              },
            ],
          },
        ],
      },
      setup(context: DemoSetupContext) {
        let draft = defaults();
        let saved = defaults();
        let alive = true;
        let composing = false;
        const cleanups: Array<() => void> = [];
        const refs = context.refs;
        const canAct = () => alive && isActive();
        const pendingProps = new Map<string, Record<string, unknown>>();
        let propsScheduled = false;
        // A protocol event may continue doing owner work after its outward signal.
        // WC and this demo renderer's React flushSync path update synchronously;
        // re-entering either can invalidate that callback's phase.
        // Vue's existing nextTick staging must remain ahead of TextControl's owner
        // restoration microtask, or accepted text can lose its caret position.
        const publishProps = (ref: string, next: Record<string, unknown>) => {
          if (runtime === 'vue' || runtime === 'vue2') {
            context.api.setProps(ref, next);
            return;
          }
          pendingProps.set(ref, { ...pendingProps.get(ref), ...next });
          if (propsScheduled) return;
          propsScheduled = true;
          queueMicrotask(() => {
            propsScheduled = false;
            const writes = [...pendingProps];
            pendingProps.clear();
            for (const [ref, props] of writes) {
              // A preparing old generation still owns already-accepted input.
              // Only replacement/disposal revokes queued owner feedback.
              if (!alive || !isCurrentGeneration()) return;
              context.api.setProps(ref, props);
            }
          });
        };
        const refresh = (message?: string) => {
          const dirty = !equal(draft, saved);
          refs.settings!.dataset.dirty = String(dirty);
          refs['settings-count']!.textContent = copy.characters(draft.note.length);
          refs['settings-feedback']!.textContent =
            message ?? (dirty ? copy.changed : copy.unchanged);
          publishProps('settings-save', { disabled: !dirty || composing });
          publishProps('settings-reset', {
            disabled: equal(draft, defaults()) || composing,
          });
        };
        const replay = () => {
          publishProps('settings-view', { value: draft.view });
          publishProps('settings-summary', { checked: draft.summary });
          publishProps('settings-note', { value: draft.note });
        };
        const bind = (
          ref: string,
          event: string,
          callback: (detail: Record<string, unknown>) => void
        ) => {
          const deliver = (detail: unknown) => {
            if (!canAct()) return;
            callback(
              detail && typeof detail === 'object' ? (detail as Record<string, unknown>) : {}
            );
          };
          if (runtime === 'wc') {
            const element = refs[ref]!;
            const CustomEventType = element.ownerDocument.defaultView!.CustomEvent;
            const listener = (event: Event) => {
              if (event instanceof CustomEventType) deliver(event.detail);
            };
            element.addEventListener(event, listener);
            cleanups.push(() => element.removeEventListener(event, listener));
          } else {
            const prop = `on${event[0]!.toUpperCase()}${event.slice(1)}`;
            context.api.setProps(ref, { [prop]: deliver });
            cleanups.push(() => context.api.setProps(ref, { [prop]: () => {} }));
          }
        };
        // Select owns its content-derived name. This consumer adds the field context
        // on the actual trigger, matching the existing website Select label policy.
        const trigger = refs['settings-view-trigger']!;
        const restoreLabel = () => {
          if (trigger.getAttribute('aria-label') !== copy.view)
            trigger.setAttribute('aria-label', copy.view);
        };
        restoreLabel();
        const observer = new MutationObserver(restoreLabel);
        observer.observe(trigger, { attributes: true, attributeFilter: ['aria-label'] });
        cleanups.push(() => observer.disconnect());
        bind('settings-view', 'valueChange', ({ value }) => {
          if (value !== 'list' && value !== 'board' && value !== 'calendar') return;
          draft.view = value;
          publishProps('settings-view', { value });
          refresh();
        });
        bind('settings-summary', 'checkedChange', ({ checked }) => {
          if (typeof checked !== 'boolean') return;
          draft.summary = checked;
          publishProps('settings-summary', { checked });
          refresh();
        });
        bind('settings-note', 'valueChange', ({ value, composing: nextComposing }) => {
          if (typeof value !== 'string') return;
          draft.note = value;
          composing = nextComposing === true;
          publishProps('settings-note', { value });
          refresh();
        });
        bind('settings-note', 'compositionStart', () => {
          composing = true;
          refresh();
        });
        bind('settings-note', 'compositionEnd', ({ value }) => {
          composing = false;
          if (typeof value === 'string') {
            draft.note = value;
            publishProps('settings-note', { value });
          }
          refresh();
        });
        bind('settings-save', 'click', () => {
          if (composing || equal(draft, saved)) return;
          saved = { ...draft };
          refresh(
            `${copy.saved} · ${copy.views[saved.view]} · ${saved.summary ? copy.summaryOn : copy.summaryOff} · ${copy.noteLength(saved.note.length)}`
          );
        });
        bind('settings-reset', 'click', () => {
          if (composing || equal(draft, defaults())) return;
          draft = defaults();
          replay();
          refresh(`${copy.restored} · ${equal(draft, saved) ? copy.unchanged : copy.changed}`);
        });
        refresh();
        return () => {
          if (!alive) return;
          alive = false;
          pendingProps.clear();
          context.api.call('settings-view', 'close', 'workspace settings disposed');
          for (const cleanup of cleanups) cleanup();
        };
      },
    },
  };
}
