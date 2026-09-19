import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { radioGroupRoot, radioGroupItem } from '@proto.ui/prototypes-base/radio-group';
const params = new URLSearchParams(location.search);
const initial = params.get('value') ?? 'b';
const controlled = params.get('controlled') === '1';
const Root = AdaptToWebComponent(radioGroupRoot);
const Item = AdaptToWebComponent(radioGroupItem);
const root = new Root();
setElementProps(root, {
  [controlled ? 'value' : 'defaultValue']: initial,
  a11yLabel: 'Delivery option',
});
for (const [value, label] of [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
]) {
  const item = new Item();
  setElementProps(item, { value });
  item.dataset.value = value;
  item.className = 'choice';
  item.textContent = label;
  root.append(item);
}
document.querySelector('#mount')!.append(root);
(window as any).radioRoot = root;
(window as any).readRadio = () => ({
  value: root.getExposes().value.get(),
  count: root.getExposes().count.get(),
  items: [...root.querySelectorAll('[role="radio"]')].map((item: any) => ({
    value: item.dataset.value,
    checked: item.getAttribute('aria-checked'),
    tabIndex: item.tabIndex,
    focused: document.activeElement === item,
  })),
});
