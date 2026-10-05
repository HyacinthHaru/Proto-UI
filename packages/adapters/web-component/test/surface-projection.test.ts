import { describe, expect, it, vi } from 'vitest';
import { createHostSurfaceProjection } from '@proto.ui/adapter-base';

import { bindElementSurfaceProjection, setElementProps } from '../src';

describe('adapter-web-component surface projection', () => {
  it('preserves the setter for empty custom-property removal and replay', () => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    target.style.setProperty('--consumer-color', 'red');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const props = { surfaceStyle: { '--consumer-color': '' } };
    const write = vi.spyOn(target.style, 'setProperty');

    setElementProps(boundary, props);
    expect(target.style.getPropertyValue('--consumer-color')).toBe('');
    write.mockClear();
    setElementProps(boundary, props);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('--consumer-color', '', '');
    unbind();
    expect(target.style.getPropertyValue('--consumer-color')).toBe('red');
  });

  it.each([
    ['margin-left', 'margin-inline-start'],
    ['margin-inline-start', 'margin-left'],
  ])('replays the %s setter after an external %s declaration', (owned, external) => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const props = { surfaceStyle: { [owned]: '5px' } };
    setElementProps(boundary, props);
    target.style.setProperty(external, '9px');
    const write = vi.spyOn(target.style, 'setProperty');

    // CSSOM may reorder logical/physical declarations even when value/priority match.
    // Assert adapter delivery; happy-dom does not certify the browser cascade result.
    setElementProps(boundary, props);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(owned, '5px', '');
    unbind();
  });

  it.each([
    ['margin', 'margin-left'],
    ['padding', 'padding-left'],
  ])('still clears %s longhands for an empty shorthand value', (shorthand, longhand) => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    target.style.setProperty(longhand, '5px');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const props = { surfaceStyle: { [shorthand]: '' } };

    // An absent shorthand serialization does not mean its longhands are absent.
    expect(target.style.getPropertyValue(shorthand)).toBe('');
    expect(target.style.getPropertyPriority(shorthand)).toBe('');
    setElementProps(boundary, props);
    expect(target.style.getPropertyValue(longhand)).toBe('');

    target.style.setProperty(longhand, '8px', 'important');
    setElementProps(boundary, props);
    expect(target.style.getPropertyValue(longhand)).toBe('');
    expect(target.style.getPropertyPriority(longhand)).toBe('');

    target.style.setProperty(shorthand, '5px');
    target.style.setProperty(longhand, '8px', 'important');
    setElementProps(boundary, props);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(target.style.getPropertyValue(`${shorthand}-${side}`)).toBe('');
      expect(target.style.getPropertyPriority(`${shorthand}-${side}`)).toBe('');
    }

    setElementProps(boundary, {
      surfaceStyle: [{ [longhand]: '5px' }, { [shorthand]: '' }],
    });
    expect(target.style.getPropertyValue(longhand)).toBe('');
    unbind();
  });

  it('does not rewrite equal nonempty custom properties when surface props are re-provided', () => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const write = vi.spyOn(target.style, 'setProperty');
    const surfaceStyle = { '--consumer-width': '100%', '--consumer-color': 'red !important' };

    setElementProps(boundary, { surfaceStyle });
    expect(write).toHaveBeenCalledTimes(2);
    write.mockClear();

    setElementProps(boundary, { surfaceStyle });
    setElementProps(boundary, { surfaceStyle: { ...surfaceStyle } });
    setElementProps(boundary, {
      surfaceStyle: '--consumer-width: 100%; --consumer-color: red !important;',
    });

    expect(write).not.toHaveBeenCalled();
    expect(target.style.getPropertyValue('--consumer-width')).toBe('100%');
    expect(target.style.getPropertyPriority('--consumer-color')).toBe('important');
    unbind();
    expect(target.style.getPropertyValue('--consumer-width')).toBe('');
    expect(target.style.getPropertyValue('--consumer-color')).toBe('');
  });

  it('reasserts same props after external value or priority changes', () => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    target.style.setProperty('--consumer-color', 'green', 'important');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const props = { surfaceStyle: { '--consumer-color': 'red' } };
    setElementProps(boundary, props);
    const write = vi.spyOn(target.style, 'setProperty');

    target.style.setProperty('--consumer-color', 'blue');
    write.mockClear();
    setElementProps(boundary, props);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('--consumer-color', 'red', '');

    target.style.setProperty('--consumer-color', 'red', 'important');
    write.mockClear();
    setElementProps(boundary, props);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('--consumer-color', 'red', '');
    expect(target.style.getPropertyPriority('--consumer-color')).toBe('');

    unbind();
    expect(target.style.getPropertyValue('--consumer-color')).toBe('green');
    expect(target.style.getPropertyPriority('--consumer-color')).toBe('important');
  });

  it('observes in-place style and priority changes without caching props identity', () => {
    const boundary = document.createElement('x-surface-boundary');
    const target = document.createElement('div');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    const surfaceStyle = { '--consumer-color': 'red' };
    setElementProps(boundary, { surfaceStyle });
    const write = vi.spyOn(target.style, 'setProperty');

    surfaceStyle['--consumer-color'] = 'blue !important';
    setElementProps(boundary, { surfaceStyle });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('--consumer-color', 'blue', 'important');
    write.mockClear();

    surfaceStyle['--consumer-color'] = 'blue';
    setElementProps(boundary, { surfaceStyle });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('--consumer-color', 'blue', '');
    unbind();
    expect(target.style.getPropertyValue('--consumer-color')).toBe('');
  });

  it('retains ownership and cleanup when a replacement already has the requested value', () => {
    const boundary = document.createElement('x-surface-boundary');
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.style.setProperty('--consumer-color', 'green', 'important');
    second.style.setProperty('--consumer-color', 'red');
    const projection = createHostSurfaceProjection<HTMLElement>(boundary, first);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    setElementProps(boundary, { surfaceStyle: { '--consumer-color': 'red' } });
    const write = vi.spyOn(second.style, 'setProperty');

    projection.setSurfaceTarget(second);
    expect(first.style.getPropertyValue('--consumer-color')).toBe('green');
    expect(first.style.getPropertyPriority('--consumer-color')).toBe('important');
    expect(write).not.toHaveBeenCalled();

    setElementProps(boundary, { surfaceStyle: { '--consumer-color': 'blue' } });
    expect(second.style.getPropertyValue('--consumer-color')).toBe('blue');
    unbind();
    expect(second.style.getPropertyValue('--consumer-color')).toBe('red');
    expect(second.style.getPropertyPriority('--consumer-color')).toBe('');
  });

  it('preserves an external overwrite on omission and unbind after an equal re-provide', () => {
    for (const cleanup of ['omit', 'unbind']) {
      const boundary = document.createElement('x-surface-boundary');
      const target = document.createElement('div');
      target.style.setProperty('--consumer-color', 'green');
      const projection = createHostSurfaceProjection<HTMLElement>(boundary, target);
      const unbind = bindElementSurfaceProjection(boundary, projection);
      const props = { surfaceStyle: { '--consumer-color': 'red' } };
      setElementProps(boundary, props);
      setElementProps(boundary, props);
      target.style.setProperty('--consumer-color', 'purple', 'important');

      if (cleanup === 'omit') setElementProps(boundary, {});
      unbind();
      expect(target.style.getPropertyValue('--consumer-color')).toBe('purple');
      expect(target.style.getPropertyPriority('--consumer-color')).toBe('important');
    }
  });

  it('migrates owned surface class and style without clobbering external values', () => {
    const boundary = document.createElement('x-surface-boundary');
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.className = 'external';
    first.style.color = 'green';
    second.className = 'external-next shared';

    const projection = createHostSurfaceProjection<HTMLElement>(boundary, first);
    const unbind = bindElementSurfaceProjection(boundary, projection);
    setElementProps(boundary, {
      surfaceClassName: 'shared surface-a',
      surfaceStyle: { color: 'red', width: '100%' },
    });

    expect(first.classList.contains('external')).toBe(true);
    expect(first.classList.contains('shared')).toBe(true);
    expect(first.classList.contains('surface-a')).toBe(true);
    expect(first.style.color).toBe('red');
    expect(first.style.width).toBe('100%');

    projection.setSurfaceTarget(second);

    expect(first.className).toBe('external');
    expect(first.style.color).toBe('green');
    expect(first.style.width).toBe('');
    expect(second.classList.contains('external-next')).toBe(true);
    expect(second.classList.contains('shared')).toBe(true);
    expect(second.classList.contains('surface-a')).toBe(true);
    expect(second.style.color).toBe('red');
    expect(second.style.width).toBe('100%');

    setElementProps(boundary, {});
    expect(second.className).toBe('external-next shared');
    expect(second.style.color).toBe('');
    expect(second.style.width).toBe('');

    unbind();
  });
});
