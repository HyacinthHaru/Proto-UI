/** Test evidence only. Expectations are scoped to the actual Copy Button recipes. */
export type CopyPaint = {
  width: number;
  height: number;
  center: number[];
  glyph: number[];
  background: string;
  shadow: string;
  /** Independent browser probe from the current theme ring color and this source recipe. */
  expectedRingShadow: string;
  expectedRingOffsetShadow: string;
  transform: string;
  translate: string;
  tokens: string | null;
  focused: boolean;
  focusVisible: boolean;
  hovered: boolean;
  pressed: boolean;
};

type ShadowLayer = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
};
function splitShadow(value: string, separator: 'comma' | 'space'): string[] {
  const parts: string[] = [];
  let depth = 0,
    start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && (separator === 'comma' ? char === ',' : /\s/.test(char))) {
      const part = value.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }
  const last = value.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}
/** Parse computed box-shadow, preserving commas/spaces inside CSS color functions. */
export function copyShadowLayers(value: string): ShadowLayer[] {
  if (!value || value === 'none') return [];
  return splitShadow(value, 'comma').flatMap((layer) => {
    const parts = splitShadow(layer, 'space');
    const lengths = parts.filter((part) => /^-?(?:\d*\.)?\d+(?:px)?$/.test(part));
    const colors = parts.filter((part) => part !== 'inset' && !lengths.includes(part));
    if (lengths.length < 2 || lengths.length > 4 || colors.length !== 1) return [];
    const [x, y, blur = 0, spread = 0] = lengths.map(Number.parseFloat);
    return [
      {
        x,
        y,
        blur,
        spread,
        color: colors[0].replace(/\s+/g, '').toLowerCase(),
        inset: parts.includes('inset'),
      },
    ];
  });
}
function sameShadow(left: ShadowLayer, right: ShadowLayer): boolean {
  return (
    left.color === right.color &&
    left.inset === right.inset &&
    (['x', 'y', 'blur', 'spread'] as const).every((key) => Math.abs(left[key] - right[key]) < 0.01)
  );
}

export function copyPaintIssues(
  family: 'shadcn' | 'brutalist',
  baseline: CopyPaint,
  changed: CopyPaint,
  state: 'hover' | 'focus' | 'pressed'
): string[] {
  const issues: string[] = [];
  const tokens = changed.tokens?.split(/\s+/) ?? [];
  const hasStateToken = (token: string, attribute: string) =>
    tokens.includes(token) || tokens.includes(`data-[${attribute}]:${token}`);
  const moved =
    changed.transform !== baseline.transform || changed.translate !== baseline.translate;
  if (state === 'hover') {
    if (!changed.hovered) issues.push('hover state absent');
    // P-SHADCN-BUTTON-INTERACTION-STYLES: Copy uses outline, hence a fill delta.
    if (family === 'shadcn' && changed.background === baseline.background)
      issues.push('outline hover fill did not change');
    // P-BRUTALIST-BUTTON-INTERACTION: surface lifts and hard shadow grows.
    if (family === 'brutalist') {
      if (!moved) issues.push('Brutalist hover did not lift');
      if (changed.shadow === baseline.shadow || changed.shadow === 'none')
        issues.push('Brutalist hover shadow did not grow');
    }
  } else if (state === 'focus') {
    if (!changed.focused || !changed.focusVisible) issues.push('keyboard focus is not visible');
    const required =
      family === 'shadcn' ? ['ring-3', 'ring-ring/50'] : ['ring-2', 'ring-ring', 'ring-offset-2'];
    if (!required.every((token) => hasStateToken(token, 'focus-visible')))
      issues.push('family focus ring recipe absent');
    if (
      baseline.focused ||
      baseline.focusVisible ||
      baseline.hovered ||
      baseline.pressed ||
      changed.hovered ||
      changed.pressed
    )
      issues.push('focus comparison is not isolated from other states');
    // eb735/514f source recipes: Shadcn 3px ring; Brutalist 2px ring + 2px offset.
    // Compare a real zero-offset, zero-blur layer in the computed shadow with an
    // independent CSS probe, rather than accepting any hard-shadow difference.
    const expected = copyShadowLayers(changed.expectedRingShadow);
    const expectedSpread = family === 'shadcn' ? 3 : 4;
    const ring = expected[0];
    if (
      expected.length !== 1 ||
      !ring ||
      ring.inset ||
      ring.x !== 0 ||
      ring.y !== 0 ||
      ring.blur !== 0 ||
      Math.abs(ring.spread - expectedSpread) > 0.01 ||
      ring.color === 'transparent' ||
      /^(?:rgba|hsla)\([^)]*,0(?:\.0+)?\)$/.test(ring.color) ||
      /\/0(?:\.0+)?\)$/.test(ring.color)
    ) {
      issues.push('independent family ring reference is invalid');
    } else {
      if (!copyShadowLayers(changed.shadow).some((layer) => sameShadow(layer, ring)))
        issues.push('computed family ring color/width layer is absent');
      if (copyShadowLayers(baseline.shadow).some((layer) => sameShadow(layer, ring)))
        issues.push('ring was already present before focus');
      if (family === 'brutalist') {
        const offset = copyShadowLayers(changed.expectedRingOffsetShadow)[0];
        const layers = copyShadowLayers(changed.shadow);
        const ringIndex = layers.findIndex((layer) => sameShadow(layer, ring));
        const offsetIndex = offset ? layers.findIndex((layer) => sameShadow(layer, offset)) : -1;
        if (
          !offset ||
          offset.inset ||
          offset.x !== 0 ||
          offset.y !== 0 ||
          offset.blur !== 0 ||
          offset.spread !== 2 ||
          offsetIndex < 0 ||
          ringIndex < 0 ||
          offsetIndex >= ringIndex
        )
          issues.push('Brutalist 2px offset and 2px ring band are absent');
      }
    }
  } else {
    if (!changed.pressed) issues.push('pressed state absent');
    if (!moved) issues.push('pressed paint did not move');
    if (!hasStateToken('translate-y-px', 'pressed')) issues.push('press offset recipe absent');
    if (family === 'brutalist' && changed.shadow === baseline.shadow)
      issues.push('Brutalist press shadow did not change');
  }
  return issues;
}

export type CopySourceBinding = {
  exactSHA: string;
  dirty: boolean;
  expectedSHA: string | null;
  eventSHA: string | null;
};
export function copySourceBindingIssues(
  binding: CopySourceBinding,
  requireClean: boolean
): string[] {
  const issues: string[] = [];
  if (!/^[a-f\d]{40}$/.test(binding.exactSHA)) issues.push('checkout SHA unavailable');
  if (binding.expectedSHA && binding.exactSHA !== binding.expectedSHA)
    issues.push('checkout does not match requested candidate');
  if (requireClean && binding.dirty) issues.push('checkout has uncommitted changes');
  return issues;
}
