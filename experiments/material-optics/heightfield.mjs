// Independent experimental model. These are not Apple's private optical parameters.
export function roundedBoxDistance(x, y, cx, cy, width, height, radius) {
  const qx = Math.abs(x - cx) - width / 2 + radius;
  const qy = Math.abs(y - cy) - height / 2 + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}
function smoothUnion(a, b, radius) {
  const h = Math.max(radius - Math.abs(a - b), 0) / radius;
  return Math.min(a, b) - h * h * radius * 0.25;
}
export function distanceAt(x, y, { merge = 0, press = 0, morph = 0, mode = 'pair' } = {}) {
  if (mode === 'menu')
    return roundedBoxDistance(x, y, 300, 132, 136 + 170 * morph, 62 + 124 * morph, 31 - 5 * morph);
  const offset = 105 - merge * 58;
  const width = 122 * (1 + press * 0.1);
  const height = 104 * (1 - press * 0.14);
  const radius = height / 2;
  return smoothUnion(
    roundedBoxDistance(x, y, 300 - offset, 132, width, height, radius),
    roundedBoxDistance(x, y, 300 + offset, 132, width, height, radius),
    34
  );
}
export function sampleOptics(x, y, state = {}) {
  const d = distanceAt(x, y, state);
  if (d >= 1) return { dx: 0, dy: 0, alpha: 0, highlight: 0, d };
  const alpha = Math.max(0, Math.min(1, 0.5 - d));
  const gx = distanceAt(x + 0.5, y, state) - distanceAt(x - 0.5, y, state);
  const gy = distanceAt(x, y + 0.5, state) - distanceAt(x, y - 0.5, state);
  const length = Math.hypot(gx, gy) || 1;
  const nx = gx / length,
    ny = gy / length;
  const rimWidth = 22 + 8 * (state.morph ?? 0);
  const t = Math.max(0, Math.min(1, -d / rimWidth));
  // Smooth height-profile derivative: zero beyond the rim, peak inside it.
  const slope = 4 * t * (1 - t);
  const strength = (12 + 4 * (state.morph ?? 0)) * slope;
  const light = state.light ?? [-0.65, -0.75];
  const facing = Math.max(0, -nx * light[0] - ny * light[1]);
  const highlight =
    Math.pow(facing, 5) * slope * 0.85 + Math.exp(-Math.pow((d + 1) / 1.3, 2)) * 0.16;
  return { dx: nx * strength, dy: ny * strength, alpha, highlight, d };
}
export function makeField(state = {}, width = 300, height = 132) {
  const normal = new Uint8ClampedArray(width * height * 4);
  const shine = new Uint8ClampedArray(normal.length);
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const value = sampleOptics(((px + 0.5) * 600) / width, ((py + 0.5) * 264) / height, state);
      const i = (py * width + px) * 4;
      normal[i] = 255 * (0.5 + value.dx / 40);
      normal[i + 1] = 255 * (0.5 + value.dy / 40);
      normal[i + 2] = 128;
      normal[i + 3] = 255 * value.alpha;
      shine[i] = shine[i + 1] = shine[i + 2] = 255;
      shine[i + 3] = 255 * value.alpha * (0.025 + value.highlight);
    }
  return { normal, shine, width, height };
}
