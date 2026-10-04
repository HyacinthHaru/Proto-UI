import button from './button.proto';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { installExperimentalVisualConsumer } from '@proto.ui/adapter-web-component/internal/visual-consumer';
import {
  createOwnedTextureVisualSink,
  type OwnedTexture,
  type MaterialPreferences,
} from '@proto.ui/adapter-web-component/internal/owned-texture-sink';
import program from 'material-program';

const scene = document.querySelector<HTMLElement>('#scene')!;
const backdrop = document.querySelector<HTMLCanvasElement>('#backdrop')!;
const pixels = new Uint8Array(800 * 480 * 4);
for (let y = 0; y < 480; y++)
  for (let x = 0; x < 800; x++) {
    const i = (y * 800 + x) * 4;
    const band = ((Math.floor(x / 28) + Math.floor(y / 44)) % 2) * 65;
    pixels[i] = 135 + band + Math.round((x / 800) * 45);
    pixels[i + 1] = 140 + Math.round((y / 480) * 95);
    pixels[i + 2] = 230 - band;
    pixels[i + 3] = 255;
  }
backdrop.width = 800;
backdrop.height = 480;
backdrop
  .getContext('2d')!
  .putImageData(new ImageData(new Uint8ClampedArray(pixels), 800, 480), 0, 0);
let generation = 1;
function texture(): OwnedTexture {
  return {
    generation,
    width: 800,
    height: 480,
    pixels,
    bounds(host) {
      const root = scene.getBoundingClientRect(),
        rect = host.getBoundingClientRect();
      return [
        (rect.left - root.left) / 800,
        (rect.top - root.top) / 480,
        rect.width / 800,
        rect.height / 480,
      ];
    },
  };
}
let current: OwnedTexture | null = texture();
const sourceListeners = new Set<() => void>();
const preferenceListeners = new Set<() => void>();
let safe = true;
const preferences: MaterialPreferences = {
  current: () => ({
    reducedMotion: safe ? 'no-preference' : 'reduce',
    reducedTransparency: 'no-preference',
    contrast: 'no-preference',
    forcedColors: 'none',
  }),
  subscribe: (fn) => {
    preferenceListeners.add(fn);
    return () => preferenceListeners.delete(fn);
  },
};
installExperimentalVisualConsumer(button, (host, style) =>
  createOwnedTextureVisualSink(
    host,
    style,
    program,
    {
      current: () => current,
      subscribe: (fn) => {
        sourceListeners.add(fn);
        return () => sourceListeners.delete(fn);
      },
    },
    preferences
  )
);
const Button = AdaptToWebComponent(button, { registerAs: 'owned-material-button' });
let element = new Button();
let clicks = 0;
function mount() {
  element.id = 'glass';
  element.textContent = 'Continue';
  element.addEventListener('click', (event) => {
    if (event instanceof CustomEvent) {
      clicks++;
      document.querySelector('#count')!.textContent = String(clicks);
    }
  });
  scene.append(element);
}
mount();
const probe = {
  state() {
    const exposes = element.getExposes();
    return {
      pressed: exposes.pressed.get(),
      disabled: exposes.disabled.get(),
      focused: exposes.focused.get(),
      focusVisible: exposes.focusVisible.get(),
      clicks,
      quality: element.dataset.materialQuality,
      reason: element.dataset.materialReason,
      phase: element.dataset.materialPhase,
      radius: element.dataset.materialRadius,
      sourceListeners: sourceListeners.size,
      preferenceListeners: preferenceListeners.size,
    };
  },
  disabled(value: boolean) {
    setElementProps(element, { disabled: value });
  },
  safe(value: boolean) {
    safe = value;
    for (const listener of preferenceListeners) listener();
  },
  source(value: boolean) {
    generation++;
    current = value ? texture() : null;
    for (const listener of sourceListeners) listener();
  },
  pixels() {
    return element.querySelector('canvas')?.toDataURL();
  },
  remove() {
    element.remove();
  },
  remount() {
    element = new Button();
    mount();
  },
};
(window as any).probe = probe;
(window as any).ready = true;
