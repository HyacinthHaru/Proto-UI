// Packed installed WC consumer. HappyDOM events are synthetic, not native or AT evidence.
import { strict as assert } from 'node:assert';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { loadConsumerStyles } from './consumer-smoke-css.mjs';

GlobalRegistrator.register();
loadConsumerStyles(document, { evidenceName: 'cli-wc-checkbox-label' });
const facade = await import('./proto-ui/components/wc/index.ts');
const { createShadcnCheckboxLabelComposition } =
  await import('@proto.ui/prototypes-shadcn/checkbox');
const { setElementAssociations, setElementProps } = await import('@proto.ui/adapter-web-component');

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
function press(element) {
  element.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
  );
  element.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1, button: 0 })
  );
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true, button: 0, detail: 1 })
  );
}
function mount({ props = {}, indicator = 'default', raw = false } = {}) {
  const pair = createShadcnCheckboxLabelComposition();
  const control = raw ? new facade.ShadcnCheckboxRootElement() : new facade.ShadcnCheckboxElement();
  const label = new facade.ShadcnLabelRootElement();
  if (indicator === 'explicit') control.append(new facade.ShadcnCheckboxIndicatorElement());
  if (indicator === 'none') control.setAttribute('data-pui-no-default-indicator', '');
  label.textContent = 'Receive updates';
  setElementProps(control, props);
  setElementProps(label, pair.label.props);
  setElementAssociations(control, pair.control.instanceAssociations);
  setElementAssociations(label, pair.label.instanceAssociations);
  const container = document.createElement('div');
  container.append(control, label);
  document.body.append(container);
  return { pair, control, label, container };
}
function indicators(control) {
  return [...control.children].filter(
    (child) => child.localName === 'proto-ui-shadcn-checkbox-indicator'
  );
}
function hasTokens(element, tokens) {
  const actual = new Set((element.getAttribute('data-pui-style') ?? '').split(/\s+/));
  for (const token of tokens) assert(actual.has(token), `missing delivered style token ${token}`);
}

try {
  const first = mount(),
    neighbor = mount();
  const strong = document.createElement('strong');
  strong.textContent = 'Receive updates';
  const decoration = document.createElement('span');
  decoration.textContent = '✓';
  decoration.setAttribute('aria-hidden', 'true');
  first.label.replaceChildren(decoration, strong);
  let changes = 0;
  first.control.addEventListener('checkedChange', () => changes++);
  await settle();
  assert.notEqual(
    first.pair.control.instanceAssociations.controlLabel,
    neighbor.pair.control.instanceAssociations.controlLabel
  );
  assert.equal(indicators(first.control).length, 1, 'default facade must supply Indicator only');
  assert.equal(
    first.control.querySelector('proto-ui-shadcn-label'),
    null,
    'Label remains independent'
  );
  assert.equal(first.control.getAttribute('aria-labelledby'), first.label.id);
  assert(first.label.id);
  assert.equal(first.control.getAttribute('aria-label'), null, 'no duplicate hidden naming');
  hasTokens(first.control, ['size-4', 'shrink-0', 'border']);
  hasTokens(first.label, ['flex', 'text-sm', 'font-medium', 'leading-none']);
  assert.equal(
    getComputedStyle(first.label).display,
    'flex',
    'delivered generated Label CSS applies'
  );
  assert.equal(
    getComputedStyle(first.control).flexShrink,
    '0',
    'delivered generated control CSS applies'
  );
  press(strong);
  await settle();
  assert.equal(changes, 1);
  assert.equal(first.control.getAttribute('aria-checked'), 'true');
  assert.equal(neighbor.control.getAttribute('aria-checked'), 'false');
  assert.equal(document.activeElement, first.control);
  press(first.control);
  await settle();
  assert.equal(changes, 2);
  assert.equal(first.control.getAttribute('aria-checked'), 'false');
  const action = document.createElement('button');
  action.textContent = 'Separate action';
  first.label.append(action);
  press(action);
  await settle();
  assert.equal(changes, 2, 'interactive descendant must not also activate control');

  const explicit = mount({ indicator: 'explicit' });
  const omitted = mount({ indicator: 'none' });
  const raw = mount({ raw: true });
  const disabled = mount({ props: { disabled: true, defaultChecked: true } });
  const controlled = mount({ props: { checked: false } });
  const mixed = mount({ props: { defaultIndeterminate: true } });
  let disabledRequests = 0,
    controlledRequests = 0;
  disabled.control.addEventListener('checkedChange', () => disabledRequests++);
  controlled.control.addEventListener('checkedChange', () => controlledRequests++);
  await settle();
  assert.equal(indicators(explicit.control).length, 1, 'explicit Indicator must not duplicate');
  assert.equal(indicators(omitted.control).length, 0, 'default Indicator omission stays supported');
  assert.equal(indicators(raw.control).length, 0, 'raw Root stays raw');
  assert.equal(mixed.control.getAttribute('aria-checked'), 'mixed');
  press(disabled.label);
  press(controlled.label);
  press(mixed.label);
  await settle();
  assert.equal(disabledRequests, 0);
  assert.equal(disabled.control.getAttribute('aria-checked'), 'true');
  assert.equal(controlledRequests, 1);
  assert.equal(
    controlled.control.getAttribute('aria-checked'),
    'false',
    'controlled rejection remains owned by Checkbox'
  );
  assert.equal(mixed.control.getAttribute('aria-checked'), 'true');
  setElementProps(controlled.label, { naming: true, activation: false });
  await settle();
  press(controlled.label);
  await settle();
  assert.equal(controlledRequests, 1, 'raw naming-only Label must not activate');
  assert.equal(controlled.control.getAttribute('aria-labelledby'), controlled.label.id);
  first.label.remove();
  await settle();
  press(first.label);
  await settle();
  assert.equal(changes, 2, 'detached Label must not activate its former control');
  console.log(
    'packed WC Checkbox+Label ok: actual public helper + generated facade + CSS; synthetic host only'
  );
} finally {
  document.body.replaceChildren();
  await settle();
  GlobalRegistrator.unregister();
}
