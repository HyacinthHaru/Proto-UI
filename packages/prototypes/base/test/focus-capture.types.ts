import * as Base from '../src';

// C-AS-FOCUSABLE-0001-C / C-STATE-0009-D/E (draft): capture preserves
// observation authority; it must not turn host-owned Focus facts into writes.
// Each concrete public lookup also checks that the named capture exists.
function publicFocusCaptures() {
  return {
    buttonFocused: Base.asButton().getState?.('focused'),
    buttonFocusVisible: Base.asButton().getState?.('focusVisible'),
    inputRootFocused: Base.asInputRoot().getState?.('focused'),
    inputRootFocusVisible: Base.asInputRoot().getState?.('focusVisible'),
    textareaRootFocused: Base.asTextareaRoot().getState?.('focused'),
    textareaRootFocusVisible: Base.asTextareaRoot().getState?.('focusVisible'),
    toolbarButtonFocused: Base.asToolbarButton().getState?.('focused'),
    toolbarButtonFocusVisible: Base.asToolbarButton().getState?.('focusVisible'),
    accordionTriggerFocused: Base.asAccordionTrigger().getState?.('focused'),
    accordionTriggerFocusVisible: Base.asAccordionTrigger().getState?.('focusVisible'),
    calendarDayFocused: Base.asCalendarDay().getState?.('focused'),
    calendarDayFocusVisible: Base.asCalendarDay().getState?.('focusVisible'),
    checkboxRootFocused: Base.asCheckboxRoot().getState?.('focused'),
    checkboxRootFocusVisible: Base.asCheckboxRoot().getState?.('focusVisible'),
    checkboxGroupItemFocused: Base.asCheckboxGroupItem().getState?.('focused'),
    checkboxGroupItemFocusVisible: Base.asCheckboxGroupItem().getState?.('focusVisible'),
    checkboxGroupAllFocused: Base.asCheckboxGroupAll().getState?.('focused'),
    checkboxGroupAllFocusVisible: Base.asCheckboxGroupAll().getState?.('focusVisible'),
    dataTableRowFocused: Base.asDataTableRow().getState?.('focused'),
    dataTableRowFocusVisible: Base.asDataTableRow().getState?.('focusVisible'),
    formSubmitFocused: Base.asFormSubmit().getState?.('focused'),
    formSubmitFocusVisible: Base.asFormSubmit().getState?.('focusVisible'),
    formResetFocused: Base.asFormReset().getState?.('focused'),
    formResetFocusVisible: Base.asFormReset().getState?.('focusVisible'),
    hoverCardTriggerFocused: Base.asHoverCardTrigger().getState?.('focused'),
    hoverCardTriggerFocusVisible: Base.asHoverCardTrigger().getState?.('focusVisible'),
    radioGroupItemFocused: Base.asRadioGroupItem().getState?.('focused'),
    radioGroupItemFocusVisible: Base.asRadioGroupItem().getState?.('focusVisible'),
    scrollAreaViewportFocused: Base.asScrollAreaViewport().getState?.('focused'),
    scrollAreaViewportFocusVisible: Base.asScrollAreaViewport().getState?.('focusVisible'),
    switchRootFocused: Base.asSwitchRoot().getState?.('focused'),
    switchRootFocusVisible: Base.asSwitchRoot().getState?.('focusVisible'),
    tabsTriggerFocused: Base.asTabsTrigger().getState?.('focused'),
    tabsTriggerFocusVisible: Base.asTabsTrigger().getState?.('focusVisible'),
    toastCloseFocused: Base.asToastClose().getState?.('focused'),
    toastCloseFocusVisible: Base.asToastClose().getState?.('focusVisible'),
    toastActionFocused: Base.asToastAction().getState?.('focused'),
    toastActionFocusVisible: Base.asToastAction().getState?.('focusVisible'),
    toggleFocused: Base.asToggle().getState?.('focused'),
    toggleFocusVisible: Base.asToggle().getState?.('focusVisible'),
    toggleGroupItemFocused: Base.asToggleGroupItem().getState?.('focused'),
    toggleGroupItemFocusVisible: Base.asToggleGroupItem().getState?.('focusVisible'),
    tooltipTriggerFocused: Base.asTooltipTrigger().getState?.('focused'),
    tooltipTriggerFocusVisible: Base.asTooltipTrigger().getState?.('focusVisible'),
    treeItemFocused: Base.asTreeItem().getState?.('focused'),
    treeItemFocusVisible: Base.asTreeItem().getState?.('focusVisible'),
    selectTriggerFocused: Base.asSelectTrigger().getState?.('focused'),
    selectTriggerFocusVisible: Base.asSelectTrigger().getState?.('focusVisible'),
    selectItemFocused: Base.asSelectItem().getState?.('focused'),
    selectItemFocusVisible: Base.asSelectItem().getState?.('focusVisible'),
    contextMenuTriggerFocused: Base.asContextMenuTrigger().getState?.('focused'),
    contextMenuTriggerFocusVisible: Base.asContextMenuTrigger().getState?.('focusVisible'),
    contextMenuItemFocused: Base.asContextMenuItem().getState?.('focused'),
    contextMenuItemFocusVisible: Base.asContextMenuItem().getState?.('focusVisible'),
    dropdownTriggerFocused: Base.asDropdownTrigger().getState?.('focused'),
    dropdownTriggerFocusVisible: Base.asDropdownTrigger().getState?.('focusVisible'),
    dropdownItemFocused: Base.asDropdownItem().getState?.('focused'),
    dropdownItemFocusVisible: Base.asDropdownItem().getState?.('focusVisible'),
    dialogTriggerFocused: Base.asDialogTrigger().getState?.('focused'),
    dialogTriggerFocusVisible: Base.asDialogTrigger().getState?.('focusVisible'),
    dialogCloseFocused: Base.asDialogClose().getState?.('focused'),
    dialogCloseFocusVisible: Base.asDialogClose().getState?.('focusVisible'),
    alertDialogTriggerFocused: Base.asAlertDialogTrigger().getState?.('focused'),
    alertDialogTriggerFocusVisible: Base.asAlertDialogTrigger().getState?.('focusVisible'),
    alertDialogCancelFocused: Base.asAlertDialogCancel().getState?.('focused'),
    alertDialogCancelFocusVisible: Base.asAlertDialogCancel().getState?.('focusVisible'),
    alertDialogActionFocused: Base.asAlertDialogAction().getState?.('focused'),
    alertDialogActionFocusVisible: Base.asAlertDialogAction().getState?.('focusVisible'),
    popoverTriggerFocused: Base.asPopoverTrigger().getState?.('focused'),
    popoverTriggerFocusVisible: Base.asPopoverTrigger().getState?.('focusVisible'),
    popoverCloseFocused: Base.asPopoverClose().getState?.('focused'),
    popoverCloseFocusVisible: Base.asPopoverClose().getState?.('focusVisible'),
    drawerTriggerFocused: Base.asDrawerTrigger().getState?.('focused'),
    drawerTriggerFocusVisible: Base.asDrawerTrigger().getState?.('focusVisible'),
    drawerCloseFocused: Base.asDrawerClose().getState?.('focused'),
    drawerCloseFocusVisible: Base.asDrawerClose().getState?.('focusVisible'),
    drawerHandleFocused: Base.asDrawerHandle().getState?.('focused'),
    drawerHandleFocusVisible: Base.asDrawerHandle().getState?.('focusVisible'),
    fieldTextControlFocused: Base.asFieldTextControl().getState?.('focused'),
    fieldTextControlFocusVisible: Base.asFieldTextControl().getState?.('focusVisible'),
    numberFieldInputFocused: Base.asNumberFieldInput().getState?.('focused'),
    numberFieldInputFocusVisible: Base.asNumberFieldInput().getState?.('focusVisible'),
    numberFieldControlFocused: Base.asNumberFieldControl().getState?.('focused'),
    numberFieldControlFocusVisible: Base.asNumberFieldControl().getState?.('focusVisible'),
    menubarTriggerFocused: Base.asMenubarTrigger().getState?.('focused'),
    menubarTriggerFocusVisible: Base.asMenubarTrigger().getState?.('focusVisible'),
    menubarItemFocused: Base.asMenubarItem().getState?.('focused'),
    menubarItemFocusVisible: Base.asMenubarItem().getState?.('focusVisible'),
    navigationMenuTriggerFocused: Base.asNavigationMenuTrigger().getState?.('focused'),
    navigationMenuTriggerFocusVisible: Base.asNavigationMenuTrigger().getState?.('focusVisible'),
    navigationMenuItemFocused: Base.asNavigationMenuItem().getState?.('focused'),
    navigationMenuItemFocusVisible: Base.asNavigationMenuItem().getState?.('focusVisible'),
    navigationMenuLinkFocused: Base.asNavigationMenuLink().getState?.('focused'),
    navigationMenuLinkFocusVisible: Base.asNavigationMenuLink().getState?.('focusVisible'),
    autocompleteInputFocused: Base.asAutocompleteInput().getState?.('focused'),
    autocompleteInputFocusVisible: Base.asAutocompleteInput().getState?.('focusVisible'),
    autocompleteTriggerFocused: Base.asAutocompleteTrigger().getState?.('focused'),
    autocompleteTriggerFocusVisible: Base.asAutocompleteTrigger().getState?.('focusVisible'),
    comboboxInputFocused: Base.asComboboxInput().getState?.('focused'),
    comboboxInputFocusVisible: Base.asComboboxInput().getState?.('focusVisible'),
    comboboxTriggerFocused: Base.asComboboxTrigger().getState?.('focused'),
    comboboxTriggerFocusVisible: Base.asComboboxTrigger().getState?.('focusVisible'),
    commandInputFocused: Base.asCommandInput().getState?.('focused'),
    commandInputFocusVisible: Base.asCommandInput().getState?.('focusVisible'),
    collapsibleTriggerFocused: Base.asCollapsibleTrigger().getState?.('focused'),
    collapsibleTriggerFocusVisible: Base.asCollapsibleTrigger().getState?.('focusVisible'),
    carouselViewportFocusVisible: Base.asCarouselViewport().getState?.('focusVisible'),
    resizableHandleFocusVisible: Base.asResizableHandle().getState?.('focusVisible'),
    inputOtpInputFocusVisible: Base.asInputOtpInput().getState?.('focusVisible'),
    inputOtpControlFocusVisible: Base.asInputOtpControl().getState?.('focusVisible'),
    numberFieldIncrementFocusVisible: Base.asNumberFieldIncrement().getState?.('focusVisible'),
    numberFieldDecrementFocusVisible: Base.asNumberFieldDecrement().getState?.('focusVisible'),
    sliderThumbFocusVisible: Base.asSliderThumb().getState?.('focusVisible'),
    sliderFieldThumbFocusVisible: Base.asSliderFieldThumb().getState?.('focusVisible'),
    sliderValuesThumbFocusVisible: Base.asSliderValuesThumb().getState?.('focusVisible'),
  };
}
type FocusCaptures = ReturnType<typeof publicFocusCaptures>;
type WritableFocusCaptures = {
  [K in keyof FocusCaptures]: Extract<
    keyof NonNullable<FocusCaptures[K]>,
    'set' | 'setDefault'
  > extends never
    ? never
    : K;
}[keyof FocusCaptures];
const noWritableFocusCaptures: WritableFocusCaptures extends never ? true : false = true;
void noWritableFocusCaptures;

type InvalidObservationCaptures = {
  [K in keyof FocusCaptures]: NonNullable<FocusCaptures[K]> extends {
    get(): boolean;
    watch: (...args: never[]) => unknown;
  }
    ? never
    : K;
}[keyof FocusCaptures];
const allFocusCapturesAreObservable: InvalidObservationCaptures extends never ? true : false = true;
void allFocusCapturesAreObservable;

function consumerOperations(
  input: ReturnType<typeof Base.asInputRoot>,
  toolbar: ReturnType<typeof Base.asToolbarButton>,
  carousel: ReturnType<typeof Base.asCarouselViewport>,
  button: ReturnType<typeof Base.asButton>,
  field: ReturnType<typeof Base.asFieldRoot>,
  validity: ReturnType<typeof Base.asFieldValidity>,
  otp: ReturnType<typeof Base.asInputOtpRoot>
) {
  const focused = input.getState?.('focused');
  const visible = input.stateHandles?.focusVisible;
  const current: boolean | undefined = focused?.get();
  const off = focused?.watch((run, event) => {
    const disabled: boolean | undefined = run.props.get().disabled;
    if (event.type === 'next') {
      const next: boolean = event.next;
      void next;
    }
    void disabled;
  });
  off?.();
  visible?.get();
  // @ts-expect-error Observed Focus facts have no runtime write authority.
  focused?.set(true);
  // @ts-expect-error Observed Focus facts cannot be assigned setup defaults.
  focused?.setDefault(true);
  // @ts-expect-error stateHandles must preserve the same read-only capability.
  visible?.set(true);
  // @ts-expect-error Toolbar capture cannot promise a missing setter.
  toolbar.getState?.('focused')?.set(true);
  // @ts-expect-error Toolbar capture cannot promise a missing setup default.
  toolbar.getState?.('focusVisible')?.setDefault(true);
  // @ts-expect-error Carousel capture cannot promise a missing setter.
  carousel.getState?.('focusVisible')?.set(true);
  // @ts-expect-error Carousel capture cannot promise a missing setup default.
  carousel.getState?.('focusVisible')?.setDefault(true);

  // Authored states remain borrowed/writable after capture, including states
  // named focused whose producer is def.state.bool rather than asFocusable.
  input.getState?.('value')?.setDefault('initial');
  input.getState?.('disabled')?.set(false);
  toolbar.getState?.('disabled')?.setDefault(false);
  button.getState?.('pressed')?.setDefault(false);
  field.getState?.('focused')?.setDefault(false);
  field.getState?.('focused')?.set(true);
  validity.getState?.('focused')?.setDefault(false);
  otp.getState?.('focused')?.setDefault(false);
  otp.getState?.('focused')?.set(true);
  return current;
}
void consumerOperations;
