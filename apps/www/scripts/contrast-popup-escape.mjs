// Audit-only transition attribution. These browser readers retain physical
// nodes in a JSHandle; IDs describe them but never replace their identity.
// They do not add a Prototype guarantee or a new planned contrast state.
export function readContrastPopupEscapeBefore({ family, trigger, popup, owner, generation }) {
  const contentPrototype = {
    tooltip: 'brutalist-tooltip-content',
    'dropdown-menu': 'brutalist-dropdown-content',
    select: 'brutalist-select-content',
  }[family];
  const visibility = globalThis.puiContrastProbe.readContrastPaintedVisibility(popup);
  const related =
    family === 'tooltip'
      ? (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(popup.id)
      : trigger.getAttribute('aria-controls') === popup.id;
  const owned =
    !!owner &&
    !!generation &&
    [trigger, popup].every(
      (element) =>
        element.getAttribute('data-projection-owner') === owner &&
        element.getAttribute('data-projection-generation') === generation
    );
  const options =
    family === 'select'
      ? [...popup.querySelectorAll('[role="option"]')].map((element) => ({
          element,
          id: element.id,
          text: element.textContent?.trim() ?? '',
          selected: element.getAttribute('aria-selected'),
        }))
      : [];
  const observation = {
    achieved:
      !!contentPrototype &&
      trigger.isConnected &&
      popup.isConnected &&
      !!popup.id &&
      related &&
      owned &&
      popup.getAttribute('data-projection-prototype') === contentPrototype &&
      visibility.visible &&
      visibility.classification === 'source-model-visible' &&
      (family !== 'select' ||
        (options.length > 0 &&
          options.every((option) => option.text && ['true', 'false'].includes(option.selected)) &&
          options.filter((option) => option.selected === 'true').length === 1 &&
          new Set(options.map((option) => option.text)).size === options.length &&
          options.find((option) => option.selected === 'true')?.text ===
            (trigger.textContent?.trim() ?? ''))),
    family,
    owner,
    generation,
    popupId: popup.id,
    contentPrototype,
    related,
    owned,
    visibility,
    triggerText: trigger.textContent?.trim() ?? '',
    selection: options.map(({ id, text, selected }) => ({ id, text, selected })),
    focusWasTrigger: document.activeElement === trigger,
    focusBefore: document.activeElement
      ? {
          id: document.activeElement.id,
          tag: document.activeElement.tagName,
          role: document.activeElement.getAttribute('role'),
          prototype: document.activeElement.getAttribute('data-projection-prototype'),
        }
      : null,
  };
  return { trigger, popup, activeElement: document.activeElement, options, observation };
}

export function readContrastPopupEscapeAfter(baseline) {
  const { trigger, popup, activeElement, options, observation: before } = baseline;
  const visibility = globalThis.puiContrastProbe.readContrastPaintedVisibility(popup);
  const matching = [...document.querySelectorAll('[data-pui-root]')].filter(
    (element) =>
      element.getAttribute('data-projection-prototype') === before.contentPrototype &&
      element.getAttribute('data-projection-owner') === before.owner &&
      element.getAttribute('data-projection-generation') === before.generation
  );
  const sameOwnedPopup =
    trigger.isConnected &&
    trigger.getAttribute('data-projection-owner') === before.owner &&
    trigger.getAttribute('data-projection-generation') === before.generation &&
    (!popup.isConnected ||
      (popup.id === before.popupId &&
        [popup].every(
          (element) =>
            element.getAttribute('data-projection-owner') === before.owner &&
            element.getAttribute('data-projection-generation') === before.generation
        ) &&
        popup.getAttribute('data-projection-prototype') === before.contentPrototype)) &&
    matching.every(
      (element) => !globalThis.puiContrastProbe.readContrastPaintedVisibility(element).visible
    );
  const selection = options.map(({ element }) => ({
    id: element.id,
    text: element.textContent?.trim() ?? '',
    selected: element.getAttribute('aria-selected'),
  }));
  const triggerText = trigger.textContent?.trim() ?? '';
  const retainedOptions = options.every(
    ({ element }) =>
      element.isConnected &&
      element.getAttribute('data-projection-owner') === before.owner &&
      element.getAttribute('data-projection-generation') === before.generation &&
      ['true', 'false'].includes(element.getAttribute('aria-selected'))
  );
  const selectionAttributesUnchanged =
    selection.length === before.selection.length &&
    selection.every(
      (option, index) =>
        option.id === before.selection[index].id &&
        option.text === before.selection[index].text &&
        option.selected === before.selection[index].selected
    );
  return {
    sameOwnedPopup,
    closed: !popup.isConnected || !visibility.visible,
    visibility,
    focusPreserved: document.activeElement === activeElement,
    triggerFocused: document.activeElement === trigger,
    ariaExpanded: trigger.getAttribute('aria-expanded'),
    descriptionRemoved: !(trigger.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .includes(before.popupId),
    selectionUnchanged:
      before.family !== 'select' ||
      (triggerText === before.triggerText && (!retainedOptions || selectionAttributesUnchanged)),
    retainedOptions,
    selectionBasis:
      'The current authored Select has unique option labels; preserve its live committed Trigger display and, while projected, exact option selection attributes. Retired option attributes are not live selection evidence.',
    triggerText,
    selection,
  };
}

export async function establishContrastPopupEscapeBaseline({
  family,
  readBefore,
  pressEscape,
  waitForClosed,
  waitForFocus,
  readAfter,
  record,
}) {
  record.before = await readBefore();
  record.stage = 'before-escape';
  record.achieved = false;
  if (!record.before.achieved || record.before.family !== family)
    throw new Error(`${family}: Escape baseline lacks the exact visible owned popup.`);
  await pressEscape();
  record.stage = 'waiting-escape-close';
  await waitForClosed();
  if (family !== 'tooltip') {
    record.stage = 'waiting-escape-focus';
    await waitForFocus();
  }
  record.after = await readAfter();
  record.stage = 'after-escape';
  const after = record.after;
  record.achieved =
    after.sameOwnedPopup === true &&
    after.closed === true &&
    (family === 'tooltip'
      ? after.focusPreserved === true && after.descriptionRemoved === true
      : after.triggerFocused === true && after.ariaExpanded === 'false') &&
    (family !== 'select' || after.selectionUnchanged === true);
  if (!record.achieved)
    throw new Error(
      `${family}: Escape did not establish the required closed focus/selection baseline.`
    );
  return record;
}
