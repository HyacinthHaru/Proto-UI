import assert from 'node:assert/strict';
import test from 'node:test';
import { PROJECTION_FAMILY_MANIFESTS } from '../src/components/PrototypePreviewer/projection-families.ts';
import { compileContrastAnatomy, compareContrastAnatomy } from './contrast-anatomy.mjs';

const load = async (family) => {
  const { default: demo } = await import(
    `../src/content/docs/zh-cn/demo-brutalist-${family}.demo.ts`
  );
  return compileContrastAnatomy(demo, PROJECTION_FAMILY_MANIFESTS.brutalist.families[family]);
};
// Deliberately synthetic structure/paint observations. Real recipe identities,
// multiplicities, refs and state props are used; this is not browser evidence.
const model = (plan, family) => ({
  currentLease: true,
  primary: plan.instances.find((node) => node.part === 'trigger')?.path ?? null,
  surfaces: plan.instances.map((node) => ({
    uid: node.path,
    parent: node.parent,
    prototypeId: node.prototypeId,
    ref: node.ref,
    id: node.path,
    role: node.part === 'root' ? family : null,
    controls: [],
    descriptions: [],
    ariaExpanded: 'false',
    ariaSelected: 'false',
    ariaChecked: node.props.defaultIndeterminate
      ? 'mixed'
      : node.props.defaultChecked
        ? 'true'
        : 'false',
    hovered: false,
    focused: false,
    withinContent: true,
    painted: true,
  })),
});
const oldRootIdentityPredicate = (plan, sample) =>
  sample.surfaces.some((surface) => surface.prototypeId === plan.rootPrototypeId) &&
  sample.surfaces.every((surface) =>
    plan.instances.some((node) => node.prototypeId === surface.prototypeId)
  );

for (const [family, rootRef, part] of [
  ['switch', 'releaseAlertsSwitch', 'thumb'],
  ['checkbox', 'checkedCheckbox', 'indicator'],
  ['checkbox', 'mixedCheckbox', 'indicator'],
])
  test(`rejects missing ${family} ${rootRef} ${part} that the old identity guard accepts`, async () => {
    const plan = await load(family);
    const sample = model(plan, family);
    assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
    const root = plan.instances.find((node) => node.ref === rootRef);
    const missing = plan.instances.find((node) => node.parent === root.path && node.part === part);
    sample.surfaces = sample.surfaces.filter((surface) => surface.uid !== missing.path);
    assert.equal(oldRootIdentityPredicate(plan, sample), true);
    const result = compareContrastAnatomy(plan, sample);
    assert.equal(result.achieved, false);
    assert.ok(
      result.failures.some(
        (failure) => failure.path === missing.path && /Missing/.test(failure.reason)
      )
    );
  });

test('global equal counts cannot move an Indicator from one authored Root to another', async () => {
  const plan = await load('checkbox');
  const sample = model(plan, 'checkbox');
  const checked = plan.instances.find((node) => node.ref === 'checkedCheckbox');
  const mixed = plan.instances.find((node) => node.ref === 'mixedCheckbox');
  const part = sample.surfaces.find((surface) => surface.parent === checked.path);
  part.parent = mixed.path;
  assert.equal(sample.surfaces.length, plan.instances.length);
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
});

test('unchecked Indicator may be unpainted but checked/mixed Indicator and Switch Thumb may not', async () => {
  const plan = await load('checkbox');
  const sample = model(plan, 'checkbox');
  const root = (ref) => plan.instances.find((node) => node.ref === ref);
  sample.surfaces.find((surface) => surface.parent === root('uncheckedCheckbox').path).painted =
    false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  for (const ref of ['checkedCheckbox', 'mixedCheckbox']) {
    const part = sample.surfaces.find((surface) => surface.parent === root(ref).path);
    part.painted = false;
    assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
    part.painted = true;
  }
  const switchPlan = await load('switch');
  const switches = model(switchPlan, 'switch');
  switches.surfaces.find((surface) => surface.prototypeId.endsWith('-thumb')).painted = false;
  assert.equal(compareContrastAnatomy(switchPlan, switches).achieved, false);
});

for (const family of ['select', 'dropdown-menu', 'dialog'])
  test(`${family} derives portal subtree counts from the recipe and current trigger relation`, async () => {
    const plan = await load(family);
    const sample = model(plan, family);
    const content = plan.instances.find((node) => node.part === 'content');
    const trigger = sample.surfaces.find(
      (surface) =>
        surface.prototypeId === plan.instances.find((node) => node.part === 'trigger').prototypeId
    );
    trigger.controls = [content.path];
    const closed = {
      ...sample,
      surfaces: sample.surfaces.filter((surface) => {
        const node = plan.instances.find((node) => node.path === surface.uid);
        return !node.policy && !node.boundary;
      }),
    };
    assert.equal(compareContrastAnatomy(plan, closed).achieved, true);
    trigger.ariaExpanded = 'true';
    assert.equal(compareContrastAnatomy(plan, closed).achieved, false);
    const inlineContent = sample.surfaces.find((surface) => surface.uid === content.path);
    assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
    inlineContent.parent = trigger.uid;
    assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
    inlineContent.parent = content.parent;
    for (const surface of sample.surfaces) {
      const node = plan.instances.find((node) => node.path === surface.uid);
      if (node.policy) surface.parent = null;
      if (node.policy || node.boundary) surface.withinContent = false;
    }
    assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
    const child = sample.surfaces.find((surface) => surface.parent === content.path);
    sample.surfaces = sample.surfaces.filter((surface) => surface !== child);
    assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
  });

test('selected Tabs panel follows authored value and current controls, inactive detached panel is optional', async () => {
  const plan = await load('tabs');
  const sample = model(plan, 'tabs');
  const panels = plan.instances.filter((node) => node.part === 'content');
  for (const node of plan.instances.filter((node) => node.part === 'trigger')) {
    const target = sample.surfaces.find((surface) => surface.uid === node.path);
    target.controls = [panels.find((panel) => panel.props.value === node.props.value).path];
    target.ariaSelected = String(node.props.value === 'overview');
  }
  const hidden = panels.find((node) => node.props.value === 'details');
  sample.surfaces = sample.surfaces.filter((surface) => surface.uid !== hidden.path);
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  const selected = sample.surfaces.find((surface) => surface.uid === panels[0].path);
  selected.parent = plan.instances.find((node) => node.part === 'list').path;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
  selected.parent = null;
  selected.withinContent = false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
  selected.parent = panels[0].parent;
  selected.withinContent = true;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  sample.surfaces = sample.surfaces.filter((surface) => surface.uid !== panels[0].path);
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
});

test('Tooltip sibling portals remain bound to their own description, not borrowed by another Root', async () => {
  const plan = await load('tooltip');
  const sample = model(plan, 'tooltip');
  const contents = plan.instances.filter((node) => node.part === 'content');
  const first = contents[0];
  const triggerNode = plan.instances.find(
    (node) => node.part === 'trigger' && node.parent === first.parent
  );
  const trigger = sample.surfaces.find((surface) => surface.uid === triggerNode.path);
  trigger.hovered = true;
  trigger.descriptions = [first.path, 'unrelated-accessible-description'];
  sample.surfaces = sample.surfaces.filter((surface) => surface.uid !== contents[1].path);
  const popup = sample.surfaces.find((surface) => surface.uid === first.path);
  popup.parent = null;
  popup.withinContent = false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  popup.id = contents[1].path;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
  popup.id = first.path;
  trigger.descriptions = [];
  assert.equal(compareContrastAnatomy(plan, sample, { requirePrimaryOpen: true }).achieved, false);
});

test('Hover Card intent requires its one authored owned portal, and closed detached content is allowed', async () => {
  const plan = await load('hover-card');
  const sample = model(plan, 'hover-card');
  const content = plan.instances.find((node) => node.part === 'content');
  const trigger = sample.surfaces.find(
    (surface) => surface.uid === plan.instances.find((node) => node.part === 'trigger').path
  );
  const closed = {
    ...sample,
    surfaces: sample.surfaces.filter((surface) => surface.uid !== content.path),
  };
  assert.equal(compareContrastAnatomy(plan, closed).achieved, true);
  trigger.focused = true;
  assert.equal(compareContrastAnatomy(plan, closed).achieved, true);
  assert.equal(compareContrastAnatomy(plan, closed, { requirePrimaryOpen: true }).achieved, false);
  const popup = sample.surfaces.find((surface) => surface.uid === content.path);
  popup.parent = null;
  popup.withinContent = false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  sample.currentLease = false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
});

test('delayed or dismissed Tooltip intent alone does not invent materialization', async () => {
  const plan = await load('tooltip');
  const sample = model(plan, 'tooltip');
  sample.surfaces = sample.surfaces.filter(
    (surface) => !plan.instances.find((node) => node.path === surface.uid).policy
  );
  const trigger = sample.surfaces.find((surface) => surface.uid === sample.primary);
  trigger.hovered = true;
  trigger.focused = true;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  assert.equal(compareContrastAnatomy(plan, sample, { requirePrimaryOpen: true }).achieved, false);
});

test('keepMounted Tabs require an inactive physical subtree without claiming its paint', async () => {
  const plan = await load('tabs');
  const panel = plan.instances.find(
    (node) => node.part === 'content' && node.props.value === 'details'
  );
  panel.props = { ...panel.props, keepMounted: true };
  const sample = model(plan, 'tabs');
  for (const node of plan.instances.filter((node) => node.part === 'trigger')) {
    const target = sample.surfaces.find((surface) => surface.uid === node.path);
    target.controls = [
      plan.instances.find(
        (panel) => panel.part === 'content' && panel.props.value === node.props.value
      ).path,
    ];
    target.ariaSelected = String(node.props.value === 'overview');
  }
  sample.surfaces.find((surface) => surface.uid === panel.path).painted = false;
  assert.equal(compareContrastAnatomy(plan, sample).achieved, true);
  sample.surfaces = sample.surfaces.filter((surface) => surface.uid !== panel.path);
  assert.equal(compareContrastAnatomy(plan, sample).achieved, false);
});

test('extra materialized copies cannot satisfy authored multiplicities', async () => {
  const plan = await load('switch');
  const sample = model(plan, 'switch');
  const thumb = sample.surfaces.find((surface) => surface.prototypeId.endsWith('-thumb'));
  sample.surfaces.push({ ...thumb, uid: 'unrelated-extra-copy' });
  const result = compareContrastAnatomy(plan, sample);
  assert.equal(result.achieved, false);
  assert.equal(result.extras.length, 1);
});
