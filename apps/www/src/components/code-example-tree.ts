import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import * as shadcn from '@proto.ui/prototypes-shadcn/tree';
import * as brutalist from '@proto.ui/prototypes-brutalist/tree';
import { lucideChevronDownIcon } from '@proto.ui/prototypes-lucide/icons/chevron-down';
import { lucideChevronRightIcon } from '@proto.ui/prototypes-lucide/icons/chevron-right';
import { lucideFileIcon } from '@proto.ui/prototypes-lucide/icons/file';
import { lucideFolderIcon } from '@proto.ui/prototypes-lucide/icons/folder';

export interface CodeFileNode {
  key: string;
  parentKey: string;
  name: string;
  depth: number;
  fileIndex?: number;
}

/** Canonical authored paths, never generated installation commands. */
export function codeFileNodes(paths: readonly string[]): CodeFileNode[] {
  const nodes = new Map<string, CodeFileNode>();
  paths.forEach((path, fileIndex) => {
    const parts = path.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..'))
      throw new Error('[CodeExample] File paths require non-empty relative segments.');
    parts.forEach((name, depth) => {
      const key = parts.slice(0, depth + 1).join('/');
      const leaf = depth === parts.length - 1;
      const old = nodes.get(key);
      if (old && (leaf || old.fileIndex !== undefined))
        throw new Error('[CodeExample] File paths must not collide with files or folders.');
      if (!old) nodes.set(key, { key, parentKey: parts.slice(0, depth).join('/'), name, depth, ...(leaf ? { fileIndex } : {}) });
    });
  });
  // Keep children contiguous even when authored paths interleave directories.
  const ordered: CodeFileNode[] = [];
  const visit = (parent: string) => {
    for (const node of nodes.values()) if (node.parentKey === parent) {
      ordered.push(node);
      visit(node.key);
    }
  };
  visit('');
  return ordered;
}

/** Pinned BlockViewer uses a distinct indentation multiplier for folders. */
export function codeTreeIndent(depth: number, folder: boolean): string {
  const index = depth + 1;
  return `${index * (folder ? index === 1 ? 1 : 1.2 : index === 2 ? 1.2 : 1.3)}rem`;
}

type TreeProjection = { select(index: number): void; destroy(): void };

/** Actual family Tree owns selection, expansion, roving focus and keyboard.
 * This consumer adapts branch activation to expansion while selecting only files. */
export function enhanceCodeExampleTree(options: {
  list: HTMLElement;
  tabs: HTMLElement[];
  panels: HTMLElement[];
  onSelect(index: number): void;
}): TreeProjection {
  const { list, tabs, panels, onSelect } = options;
  const doc = list.ownerDocument;
  if (list.contains(doc.activeElement) || panels.some((panel) => panel.contains(doc.activeElement)))
    return { select() {}, destroy() {} };
  if (tabs.length !== panels.length || !tabs.length) throw new Error('[CodeExample] File controls and source panels must match.');
  const nodes = codeFileNodes(tabs.map((tab) => tab.dataset.codeFilePath ?? tab.textContent?.trim() ?? ''));
  const familyScope = list.closest<HTMLElement>('[data-projection-family], [data-site-library-family]');
  const family = (familyScope?.dataset.projectionFamily ?? familyScope?.dataset.siteLibraryFamily ?? doc.documentElement.dataset.siteLibraryFamily) === 'brutalist' ? 'brutalist' : 'shadcn';
  const definitions = family === 'brutalist' ? brutalist : shadcn;
  for (const [part, proto] of Object.entries({ root: definitions.treeRoot, item: definitions.treeItem })) {
    const tag = `pui-code-example-${family}-tree-${part}`;
    if (!customElements.get(tag)) customElements.define(tag, AdaptToWebComponent(proto, { register: false }));
  }
  for (const [direction, proto] of Object.entries({ down: lucideChevronDownIcon, right: lucideChevronRightIcon, file: lucideFileIcon, folder: lucideFolderIcon })) {
    const tag = `pui-code-example-chevron-${direction}`;
    if (!customElements.get(tag)) customElements.define(tag, AdaptToWebComponent(proto, { register: false }));
  }
  const root = doc.createElement(`pui-code-example-${family}-tree-root`);
  root.dataset.codeExampleTree = family;
  let value = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  if (value < 0) value = 0;
  let expanded = nodes.filter((node) => node.fileIndex === undefined).map((node) => node.key);
  let destroyed = false;
  let queued = false;
  const path = (index: number) => nodes.find((node) => node.fileIndex === index)!.key;
  const props = () => ({ ...(family === 'shadcn' ? { appearance: 'embedded' } : {}), value: path(value), expandedKeys: expanded, a11yLabel: list.getAttribute('aria-label') ?? 'Files', surfaceStyle: { ...(family === 'brutalist' ? { display: 'block' } : {}), minWidth: '0', width: '100%' } });
  setElementProps(root, props());
  const items = new Map<string, HTMLElement>();
  const groups = new Map<string, HTMLElement>();
  for (const node of nodes) {
    const item = doc.createElement(`pui-code-example-${family}-tree-item`);
    item.dataset.codeTreePath = node.key;
    item.dataset.codeTreeKind = node.fileIndex === undefined ? 'folder' : 'file';
    if (node.fileIndex !== undefined) {
      item.dataset.codeFileIndex = String(node.fileIndex);
      item.id = `${tabs[node.fileIndex].id}-tree`;
      item.setAttribute('aria-controls', panels[node.fileIndex].id);
    }
    // Indentation is consumer layout; the actual Tree owns all state paint.
    setElementProps(item, {
      nodeKey: node.key, parentKey: node.parentKey, textValue: node.name,
      ...(family === 'shadcn' ? { appearance: 'embedded' } : {}),
      surfaceStyle: {
        paddingInlineStart: family === 'shadcn' ? codeTreeIndent(node.depth, node.fileIndex === undefined) : `${0.5 + node.depth * 0.75}rem`,
        paddingInlineEnd: '0.5rem', overflowWrap: 'anywhere',
        ...(family === 'brutalist' ? { minHeight: '2.75rem', fontSize: '0.8125rem' } : {}),
      },
    });
    if (node.fileIndex === undefined) {
      for (const direction of ['down', 'right']) {
        const glyph = doc.createElement(`pui-code-example-chevron-${direction}`);
        glyph.dataset.codeTreeChevron = direction;
        glyph.setAttribute('aria-hidden', 'true');
        glyph.hidden = direction === 'right';
        setElementProps(glyph, { size: family === 'shadcn' ? 16 : 14, surfaceStyle: { flex: 'none', pointerEvents: 'none' } });
        item.append(glyph);
      }
    }
    if (family === 'shadcn') {
      if (node.fileIndex !== undefined) {
        const spacer = doc.createElement('span');
        spacer.setAttribute('aria-hidden', 'true');
        spacer.style.cssText = 'width:1rem;flex:none';
        item.append(spacer);
      }
      const icon = doc.createElement(`pui-code-example-chevron-${node.fileIndex === undefined ? 'folder' : 'file'}`);
      icon.dataset.codeTreeIcon = node.fileIndex === undefined ? 'folder' : 'file';
      icon.setAttribute('aria-hidden', 'true');
      setElementProps(icon, { size: 16, surfaceStyle: { flex: 'none', pointerEvents: 'none' } });
      item.append(icon);
    }
    item.append(doc.createTextNode(family === 'shadcn' ? node.name : node.fileIndex === undefined ? `${node.name}/` : node.name));
    if (family === 'shadcn') {
      // Non-semantic layout wrappers preserve the real Tree's canonical model.
      // Root siblings keep the family 6px gap; nested siblings use 4px.
      const branch = doc.createElement('div');
      branch.dataset.codeTreeLayout = node.key;
      branch.style.cssText = 'display:flex;flex-direction:column;min-width:0';
      branch.append(item);
      (groups.get(node.parentKey) ?? root).append(branch);
      if (node.fileIndex === undefined) {
        const children = doc.createElement('div');
        children.dataset.codeTreeChildren = node.key;
        children.style.cssText = 'display:flex;flex-direction:column;gap:0.25rem;min-width:0';
        branch.append(children);
        groups.set(node.key, children);
      }
    } else root.append(item);
    items.set(node.key, item);
  }
  const originalHidden = list.hidden;
  const originals = panels.map((panel) => ({ panel, role: panel.getAttribute('role'), label: panel.getAttribute('aria-labelledby') }));
  const publish = () => {
    if (queued || destroyed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!destroyed) {
        setElementProps(root, props());
        for (const node of nodes) if (node.fileIndex === undefined) {
          const item = items.get(node.key)!;
          const children = groups.get(node.key);
          if (children) {
            children.hidden = !expanded.includes(node.key);
            children.style.display = children.hidden ? 'none' : 'flex';
          }
          item.querySelectorAll<HTMLElement>('[data-code-tree-chevron]').forEach((glyph) => {
            glyph.hidden = (glyph.dataset.codeTreeChevron === 'down') !== expanded.includes(node.key);
          });
        }
      }
    });
  };
  const change = (event: Event) => {
    if (event.target !== root || destroyed) return;
    const key = (event as CustomEvent<{ value?: unknown }>).detail?.value;
    const node = nodes.find((node) => node.key === key);
    if (!node) return;
    if (node.fileIndex === undefined) {
      expanded = expanded.includes(node.key) ? expanded.filter((key) => key !== node.key) : [...expanded, node.key];
    } else {
      value = node.fileIndex;
      onSelect(value);
    }
    publish();
  };
  const expand = (event: Event) => {
    if (event.target !== root || destroyed) return;
    const next = (event as CustomEvent<{ expandedKeys?: unknown }>).detail?.expandedKeys;
    if (!Array.isArray(next) || next.some((key) => !nodes.some((node) => node.key === key && node.fileIndex === undefined))) return;
    expanded = [...new Set(next)] as string[];
    publish();
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    root.removeEventListener('valueChange', change);
    root.removeEventListener('expandedChange', expand);
    root.remove();
    list.hidden = originalHidden;
    for (const { panel, role, label } of originals) {
      if (role === null) panel.removeAttribute('role'); else panel.setAttribute('role', role);
      if (label === null) panel.removeAttribute('aria-labelledby'); else panel.setAttribute('aria-labelledby', label);
    }
  };
  try {
    root.addEventListener('valueChange', change);
    root.addEventListener('expandedChange', expand);
    list.after(root);
    if (root.getAttribute('role') !== 'tree' || [...items.values()].some((item) => item.getAttribute('role') !== 'treeitem'))
      throw new Error('[CodeExample] Tree did not initialize; native file controls retained.');
    if (list.contains(doc.activeElement)) { destroy(); return { select() {}, destroy() {} }; }
    panels.forEach((panel, index) => {
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', items.get(path(index))!.id);
    });
    list.hidden = true;
  } catch (error) { destroy(); throw error; }
  return {
    select(index) {
      if (destroyed || index < 0 || index >= tabs.length) return;
      value = index;
      publish();
    },
    destroy,
  };
}
