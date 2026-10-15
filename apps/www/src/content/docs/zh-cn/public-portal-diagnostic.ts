import type { Page } from 'playwright-core';

/** Read-only failure facts. No source, projection or style admission is changed. */
export async function publicPortalSnapshot(page: Page) {
  const pending = page.evaluate(() => {
    const properties = [
      'display',
      'visibility',
      'position',
      'color',
      'background-color',
      'background-image',
      'opacity',
      'transform',
      'translate',
      'scale',
      'rotate',
      'filter',
      'backdrop-filter',
      'mix-blend-mode',
      'overflow',
      'overflow-x',
      'overflow-y',
      'contain',
      'container-type',
      'clip',
      'clip-path',
      'mask-image',
      'content-visibility',
      'zoom',
      'z-index',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-left-radius',
      'border-bottom-right-radius',
      'padding',
      'border-width',
      'content',
      'left',
      'top',
      'width',
      'height',
      'border-left-width',
      'border-top-width',
    ];
    const readStyle = (css: CSSStyleDeclaration) =>
      Object.fromEntries(
        properties.map((key) => {
          const value = css.getPropertyValue(key);
          return [
            key,
            value.includes('data:') ? { prefix: value.slice(0, 80), length: value.length } : value,
          ];
        })
      );
    const sample = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      const pseudos = ['::before', '::after'].map((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        return { pseudo, style: readStyle(style) };
      });
      return {
        tag: element.tagName,
        id: element.id,
        class: element.getAttribute('class'),
        role: element.getAttribute('role'),
        connected: element.isConnected,
        attributes: Object.fromEntries(
          Array.from(element.attributes)
            .filter(
              ({ name }) =>
                name.startsWith('data-material') ||
                name.startsWith('data-pui') ||
                name.startsWith('aria-')
            )
            .map(({ name, value }) => [name, value])
        ),
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        },
        style: readStyle(css),
        pseudos,
      };
    };
    const menus = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));
    return {
      url: location.href,
      timestamp: performance.now(),
      dpr: devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { x: scrollX, y: scrollY },
      firstFocus: (window as any).publicPortalFirstFocus ?? null,
      activeElement: document.activeElement ? sample(document.activeElement) : null,
      menus: menus.map((menu) => {
        const scope = menu.closest<HTMLElement>('[data-material-scene]');
        const canvas = Array.from(scope?.children ?? []).find(
          (element): element is HTMLCanvasElement =>
            element instanceof HTMLCanvasElement && element.hasAttribute('data-material-backdrop')
        );
        const ancestors: ReturnType<typeof sample>[] = [];
        for (let node: Element | null = menu; node; node = node.parentElement)
          ancestors.push(sample(node));
        return {
          content: sample(menu),
          ancestors,
          source: canvas
            ? { ...sample(canvas), pixelWidth: canvas.width, pixelHeight: canvas.height }
            : null,
          scope: scope ? sample(scope) : null,
          // Include real wrapper bounds as well as painted surfaces; do not infer
          // that a transparent wrapper can safely be omitted from source admission.
          sceneElements: scope
            ? Array.from(scope.querySelectorAll('*')).map((element) => ({
                ...sample(element),
                isContent: element === menu,
                insideContent: menu.contains(element),
                containsContent: element.contains(menu),
                isSource: element === canvas,
              }))
            : [],
        };
      }),
    };
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Public portal snapshot exceeded 5000ms')), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
