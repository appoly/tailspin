import { PNG } from "pngjs";
import gifenc from "gifenc";

const { GIFEncoder, quantize, applyPalette } = gifenc;

/** Nearest-neighbour downscale of a decoded PNG to at most `maxWidth` CSS px. */
function scaleTo(png, maxWidth) {
  const factor = Math.min(1, maxWidth / png.width);
  if (factor === 1) return { data: png.data, width: png.width, height: png.height };

  const width = Math.round(png.width * factor);
  const height = Math.round(png.height * factor);
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(png.height - 1, Math.round(y / factor));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(png.width - 1, Math.round(x / factor));
      png.data.copy(data, (y * width + x) * 4, (sourceY * png.width + sourceX) * 4, (sourceY * png.width + sourceX) * 4 + 4);
    }
  }

  return { data, width, height };
}

/**
 * Encodes PNG frame buffers into an animated GIF. Frames are requantized every
 * `paletteEvery` frames — a single global palette banded badly on the app's
 * dark UI, and per-frame palettes roughly double the file size.
 */
export function encodeGif(frames, { fps = 10, maxWidth = 1000, paletteEvery = 8 } = {}) {
  const encoder = GIFEncoder();
  const delay = Math.round(1000 / fps);
  let palette = null;
  let size = null;

  frames.forEach((buffer, index) => {
    const { data, width, height } = scaleTo(PNG.sync.read(buffer), maxWidth);
    size ??= { width, height };
    if (width !== size.width || height !== size.height) {
      throw new Error(`Frame ${index} is ${width}x${height}, expected ${size.width}x${size.height}`);
    }
    if (!palette || index % paletteEvery === 0) palette = quantize(data, 256, { format: "rgb565" });
    encoder.writeFrame(applyPalette(data, palette, "rgb565"), width, height, { palette, delay });
  });

  encoder.finish();
  return Buffer.from(encoder.bytes());
}
