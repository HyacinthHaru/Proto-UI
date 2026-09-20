import './src/styles/proto-ui-style.css';

export const parameters = new URLSearchParams(location.search);
export const runtime = parameters.get('runtime') ?? 'wc';
export const controlled = parameters.get('mode') === 'controlled';
export const mount = document.querySelector<HTMLElement>('#mount')!;
export const values = ['a', 'b', 'c'];
export const labels = ['Alpha', 'Beta', 'Gamma (disabled, no Indicator)'];
export const changes: string[] = [];
let selectedValue = 'b';
let rootHandle: { getExposes(): { value: { get(): string } } } | null = null;
export const bindRoot = (handle: typeof rootHandle) => {
  if (handle) rootHandle = handle;
};
export const recordChange = (event: { value: string }) => changes.push(event.value);
export const rootProps = () => ({
  ...(controlled ? { value: selectedValue } : { defaultValue: 'b' }),
  a11yLabel: 'Packed Radio Group',
});

document.querySelector('h1')!.textContent = `Packed CLI ${runtime}`;
document.querySelector('#scenario')!.textContent =
  `Initial ${controlled ? 'controlled value' : 'defaultValue'} = b`;

export function finish(update: () => void) {
  const fixture = {
    setValue(value: string) {
      selectedValue = value;
      update();
    },
    setTheme(theme: 'light' | 'dark') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.dataset.theme = theme;
    },
    read() {
      const group = mount.querySelector<HTMLElement>('[role="radiogroup"]');
      const items = [...mount.querySelectorAll<HTMLElement>('[role="radio"]')];
      const box = (element: Element) => {
        const bounds = element.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
      };
      return {
        runtime,
        mode: controlled ? 'controlled' : 'uncontrolled',
        value: rootHandle?.getExposes().value.get(),
        changes: [...changes],
        count: items.length,
        groupLabel: group?.getAttribute('aria-label'),
        checked: items.map((item) => item.getAttribute('aria-checked')),
        tabIndex: items.map((item) => item.tabIndex),
        focused: items.map((item) => document.activeElement === item),
        disabled: items.map((item) => item.getAttribute('aria-disabled')),
        svgCounts: items.map((item) => item.querySelectorAll('svg').length),
        dotOpacity: items
          .slice(0, 2)
          .map((item) => getComputedStyle(item.querySelector('svg')!.parentElement!).opacity),
        itemBoxes: items.map(box),
        glyphBoxes: items.slice(0, 2).map((item) => box(item.querySelector('svg')!)),
        backgrounds: items.map((item) => getComputedStyle(item).backgroundColor),
        shadows: items.map((item) => getComputedStyle(item).boxShadow),
        gap: group ? getComputedStyle(group).rowGap : null,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    },
  };
  (window as any).packedRadio = fixture;
}
