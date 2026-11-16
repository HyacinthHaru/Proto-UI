import '/src/styles/global.css';
import { loadDemo } from '/src/components/PrototypePreviewer/demo-modules.ts';
import { renderDemo } from '/src/components/PrototypePreviewer/demo-renderer.ts';
import { loadPrototypes } from '/src/components/PrototypePreviewer/prototype-modules.ts';

const host = document.getElementById('drawer-grid-host');
let rendered;
let api;

globalThis.drawerGrid = {
  async mount({ family, runtime, displayContents }) {
    const source = await loadDemo('demo-' + family + '-drawer');
    const styleScope = source.root.prototypeId === 'shadcn-style-scope' ? source.root : null;
    const layout = styleScope ? styleScope.children[0] : source.root;
    const [drawer, status] = layout.children;
    if (
      drawer.prototypeId !== family + '-drawer-root' ||
      drawer.ref !== 'root' ||
      status.ref !== 'status'
    ) {
      throw new Error('Drawer recipe changed');
    }

    const gridCell = (text) => ({
      kind: 'box',
      attrs: { 'data-grid-cell': '' },
      children: [text],
    });
    const root = {
      ...drawer,
      surfaceStyle: displayContents ? { display: 'contents' } : { display: 'block' },
      children: drawer.children.map((node) =>
        node.prototypeId === family + '-drawer-trigger'
          ? {
              ...node,
              ref: 'grid-trigger',
              surfaceStyle: { position: 'absolute', insetInlineStart: '0px', top: '-52px' },
            }
          : node
      ),
    };
    const grid = {
      ...layout,
      className: 'drawer-test-grid',
      attrs: { ...layout.attrs, id: 'actual-grid' },
      children: [
        gridCell('First'),
        gridCell('Second'),
        root,
        gridCell('Third'),
        {
          ...status,
          attrs: { ...status.attrs, 'data-grid-cell': '' },
        },
      ],
    };
    const demo = {
      ...source,
      root: styleScope ? { ...styleScope, children: [grid] } : grid,
      setup(ctx) {
        api = ctx.api;
        return source.setup?.(ctx);
      },
    };
    document.documentElement.dataset.siteLibraryFamily = family === 'base' ? 'shadcn' : family;
    const ids = new Set();
    function gather(node) {
      if (!node || typeof node === 'string') return;
      if (node.kind === 'proto') ids.add(node.prototypeId);
      for (const child of node.children ?? []) gather(child);
    }
    gather(demo.root);
    await loadPrototypes([...ids]);
    rendered = await renderDemo({ host, runtime, demo });
  },
  geometry() {
    const grid = document.getElementById('actual-grid');
    const root = host.querySelector('[data-demo-ref="root"]');
    const trigger = host.querySelector('[data-demo-ref="grid-trigger"]');
    const cells = [...grid.querySelectorAll(':scope > [data-grid-cell]')];
    return {
      templateRows: getComputedStyle(grid).gridTemplateRows,
      gridHeight: grid.offsetHeight,
      rootIsDirectChild: root.parentElement === grid,
      rootBoxCount: root.getClientRects().length,
      rootDisplay: getComputedStyle(root).display,
      triggerPosition: getComputedStyle(trigger).position,
      cells: cells.map((node) => ({
        text: node.textContent,
        top: node.getBoundingClientRect().top - grid.getBoundingClientRect().top,
        left: node.getBoundingClientRect().left - grid.getBoundingClientRect().left,
      })),
    };
  },
  rootOpen() {
    return api.getExposes('root')?.open?.get();
  },
  async destroy() {
    if (!rendered) throw new Error('Missing Drawer render');
    await rendered.destroy();
    rendered = undefined;
    api = undefined;
    if (host.childElementCount) throw new Error('Fixture host still owns DOM after destruction');
  },
};
