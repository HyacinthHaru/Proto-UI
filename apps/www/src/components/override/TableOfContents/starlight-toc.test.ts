import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StarlightTOC, currentHeadingIndex } from './starlight-toc';

let idle: IdleRequestCallback[];
let intersections: IntersectionObserverCallback[];
let disconnects: Array<ReturnType<typeof vi.fn>>;
beforeEach(() => {
  idle = [];
  intersections = [];
  disconnects = [];
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
    idle.push(callback);
    return 1;
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        intersections.push(callback);
        disconnects.push(this.disconnect);
      }
      observe() {}
    }
  );
});
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('current heading is distinct from the visible section set', () => {
  it('selects the last started heading, including upward movement and Overview', () => {
    const tops = [100, 400, 900];
    expect(currentHeadingIndex([], 0)).toBe(-1);
    expect(currentHeadingIndex(tops, 50)).toBe(0);
    expect(currentHeadingIndex(tops, 400)).toBe(1);
    expect(currentHeadingIndex(tops, 950)).toBe(2);
    expect(currentHeadingIndex(tops, 500)).toBe(1);
    expect(currentHeadingIndex(tops, 100)).toBe(0);
  });

  it('ignores whole-document wrappers and nested public Text as current owners', () => {
    document.body.innerHTML = `<header></header><main><h1 id="_top">Title</h1>
      <div id="whole-document"><div data-doc-flow>
      <h2 id="section"><span data-typography-prototype="shadcn-text-root">Section</span></h2>
      <p id="paragraph">Content</p><h2 id="later">Later</h2></div></div></main>`;
    vi.spyOn(document.querySelector('header')!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 1440, 64)
    );
    const positions = { _top: -300, section: 80, later: 600 };
    for (const id of Object.keys(positions) as Array<keyof typeof positions>)
      vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockImplementation(
        () => new DOMRect(0, positions[id], 300, 38)
      );
    const toc = document.createElement('sl-toc') as StarlightTOC;
    toc.innerHTML =
      '<a href="#_top" aria-current="true">Overview</a><a href="#section">Section</a><a href="#later">Later</a>';
    document.body.append(toc);
    for (const callback of idle) callback({ didTimeout: false, timeRemaining: () => 50 });
    const current = () =>
      [...toc.querySelectorAll('[aria-current="true"]')].map((e) => e.getAttribute('href'));
    expect(current()).toEqual(['#section']);
    expect(toc.querySelector('[href="#section"]')!.hasAttribute('in-view')).toBe(true);
    expect(toc.querySelector('[href="#later"]')!.hasAttribute('in-view')).toBe(true);
    for (const callback of intersections)
      callback(
        [
          {
            target: document.getElementById('whole-document')!,
            isIntersecting: true,
            time: 0,
            boundingClientRect: new DOMRect(0, 0, 1440, 2000),
            intersectionRect: new DOMRect(0, 96, 1440, 53),
            rootBounds: null,
            intersectionRatio: 1,
          },
        ] as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    expect(current()).toEqual(['#section']);
    positions._top = 100;
    positions.section = 450;
    positions.later = 900;
    window.dispatchEvent(new Event('scroll'));
    expect(current()).toEqual(['#_top']);
    expect(toc.visibleSections.map((section) => section.id)).toContain('section');
  });

  it('ignores headings outside the generated TOC, including a hidden gallery modal', () => {
    document.body.innerHTML = `<header></header><main><h1 id="_top">Title</h1>
      <h2 id="section">Section</h2><h3 id="not-in-toc">Embedded component</h3>
      <h2 id="下一节">Later</h2><div hidden><h3 id="lucide-modal-title-en">Icon</h3></div></main>`;
    vi.spyOn(document.querySelector('header')!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 1440, 64)
    );
    const positions = { _top: -300, section: 80, 'not-in-toc': 90, 下一节: 600 };
    for (const id of Object.keys(positions) as Array<keyof typeof positions>)
      vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockImplementation(
        () => new DOMRect(0, positions[id], 300, 38)
      );
    vi.spyOn(
      document.getElementById('lucide-modal-title-en')!,
      'getBoundingClientRect'
    ).mockReturnValue(new DOMRect(0, 0, 0, 0));
    const toc = document.createElement('sl-toc') as StarlightTOC;
    toc.innerHTML = `<a href="#_top" aria-current="true">Overview</a>
      <a href="#section">Section</a><a href="#${encodeURIComponent('下一节')}">Later</a>`;
    document.body.append(toc);
    for (const callback of idle) callback({ didTimeout: false, timeRemaining: () => 50 });
    const current = () => toc.querySelector('[aria-current="true"]')?.textContent;
    expect(current()).toBe('Section');
    expect(toc.visibleSections.map(({ id }) => id)).toEqual(['section', '下一节']);
    expect(toc.visibleSections.every(({ link }) => link instanceof HTMLAnchorElement)).toBe(true);

    positions.section = -450;
    positions.下一节 = 80;
    window.dispatchEvent(new Event('scroll'));
    expect(current()).toBe('Later');
    positions._top = 100;
    positions.section = 450;
    positions.下一节 = 900;
    window.dispatchEvent(new Event('scroll'));
    expect(current()).toBe('Overview');
  });
});

it('cancels detached idle setup and reconnects with one live observer/listener owner', () => {
  document.body.innerHTML = '<header></header><main><h1 id="_top">Title</h1></main>';
  const toc = document.createElement('sl-toc') as StarlightTOC;
  toc.innerHTML = '<a href="#_top" aria-current="true">Overview</a>';
  const add = vi.spyOn(window, 'addEventListener');
  const remove = vi.spyOn(window, 'removeEventListener');
  document.body.append(toc);
  const abandoned = idle[0];
  toc.remove();
  expect(window.cancelIdleCallback).toHaveBeenCalled();
  abandoned({ didTimeout: false, timeRemaining: () => 50 });
  expect(intersections).toHaveLength(0);
  expect(add.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize')).toHaveLength(
    0
  );
  document.body.append(toc);
  idle[1]({ didTimeout: false, timeRemaining: () => 50 });
  expect(intersections).toHaveLength(1);
  expect(add.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize')).toHaveLength(
    2
  );
  window.dispatchEvent(new Event('resize'));
  expect(disconnects[0]).toHaveBeenCalledOnce();
  toc.remove();
  expect(
    remove.mock.calls.filter(([event]) => event === 'scroll' || event === 'resize')
  ).toHaveLength(4);
  document.body.append(toc);
  idle[2]({ didTimeout: false, timeRemaining: () => 50 });
  expect(intersections).toHaveLength(2);
  toc.remove();
  expect(disconnects[1]).toHaveBeenCalledOnce();
});
