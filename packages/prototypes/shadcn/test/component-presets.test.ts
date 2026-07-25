import { describe, expect, it } from 'vitest';
import { shadcnComponentPresets } from '../src/component-presets';

describe('prototypes/shadcn: component preset recipes', () => {
  it('owns composition identity without owning prototype visual tokens', () => {
    expect(shadcnComponentPresets['shadcn-switch']).toEqual({
      kind: 'replaceable-default-part',
      exportName: 'ShadcnSwitch',
      rootPrototype: 'shadcnSwitchRoot',
      defaultPartPrototype: 'shadcnSwitchThumb',
      inputName: 'thumb',
      elementName: 'proto-ui-shadcn-switch',
      omissionAttribute: 'data-pui-no-default-thumb',
    });
    expect(shadcnComponentPresets['shadcn-dialog'].defaultPartPrototype).toBe(
      'shadcnDialogCloseIcon'
    );
    expect(JSON.stringify(shadcnComponentPresets)).not.toMatch(
      /className|style|token|translate|padding/
    );
  });
});
