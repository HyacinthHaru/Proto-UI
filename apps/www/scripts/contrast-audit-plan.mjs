// Runtime discovery is read from the exact served preview, never inferred from
// the global list of official adapters or from a different family's route.
export function parseContrastRuntimeOptions(serialized, supported) {
  let values;
  try {
    values = JSON.parse(serialized);
  } catch {
    throw new Error('Audited preview has no valid serialized runtime availability.');
  }
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    new Set(values).size !== values.length ||
    values.some((value) => typeof value !== 'string' || !supported.includes(value))
  )
    throw new Error('Audited preview must declare distinct supported runtime identities.');
  return values;
}

// These are the current authored reference controls, not a new state model.
// Mixed and checked+indeterminate are separate authored Checkbox cases.
export function contrastHeldBinaryTargets(family) {
  if (family === 'switch')
    return [{ ref: 'releaseAlertsSwitch', state: 'checked', ariaChecked: 'true' }];
  if (family === 'checkbox')
    return [
      { ref: 'checkedCheckbox', state: 'checked', ariaChecked: 'true' },
      { ref: 'mixedCheckbox', state: 'mixed', ariaChecked: 'mixed' },
      { ref: 'checkedIndeterminateCheckbox', state: 'checked-indeterminate', ariaChecked: 'mixed' },
    ];
  return [];
}
