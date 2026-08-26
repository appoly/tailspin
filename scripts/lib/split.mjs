import { PNG } from "pngjs";

/**
 * Stitches two screenshots of the same screen into one image split along the
 * anti-diagonal: `topLeft` fills the top-left triangle, `bottomRight` the rest,
 * with a hairline between them. Used for the light/dark theme shot.
 */
export function diagonalSplit(topLeftPng, bottomRightPng, { lineWidth = 2, lineColor = [125, 125, 130] } = {}) {
  const a = PNG.sync.read(topLeftPng);
  const b = PNG.sync.read(bottomRightPng);

  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Frames differ: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }

  const out = new PNG({ width: a.width, height: a.height });
  // Distance from the line through (width, 0) and (0, height), in pixels.
  const norm = Math.hypot(a.height, a.width);
  const half = lineWidth / 2;

  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      const distance = (a.height * x + a.width * y - a.width * a.height) / norm;
      const source = distance < 0 ? a : b;

      for (let channel = 0; channel < 4; channel++) out.data[i + channel] = source.data[i + channel];

      // Feather the hairline so the diagonal doesn't look like stair-steps.
      const coverage = Math.max(0, Math.min(1, half + 0.5 - Math.abs(distance)));
      if (coverage > 0) {
        for (let channel = 0; channel < 3; channel++) {
          out.data[i + channel] = Math.round(out.data[i + channel] * (1 - coverage) + lineColor[channel] * coverage);
        }
        out.data[i + 3] = 255;
      }
    }
  }

  return PNG.sync.write(out);
}
