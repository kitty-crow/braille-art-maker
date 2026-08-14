import type { Pixels } from "../types.ts";

const clamp = (value: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, value));

export const resize = (pixels: Pixels, width: number, height: number): Pixels => {
  if (width === pixels.width && height === pixels.height) return pixels;
  const out = new Uint8ClampedArray(width * height * 4);
  const sx = pixels.width / width;
  const sy = pixels.height / height;

  for (let y = 0; y < height; y += 1) {
    const fy = (y + 0.5) * sy - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(pixels.height - 1, y0 + 1);
    const wy = clamp(fy - y0);
    for (let x = 0; x < width; x += 1) {
      const fx = (x + 0.5) * sx - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(pixels.width - 1, x0 + 1);
      const wx = clamp(fx - x0);
      const dst = (y * width + x) * 4;
      for (let c = 0; c < 4; c += 1) {
        const p00 = pixels.data[(y0 * pixels.width + x0) * 4 + c] ?? 0;
        const p10 = pixels.data[(y0 * pixels.width + x1) * 4 + c] ?? 0;
        const p01 = pixels.data[(y1 * pixels.width + x0) * 4 + c] ?? 0;
        const p11 = pixels.data[(y1 * pixels.width + x1) * 4 + c] ?? 0;
        const top = p00 + (p10 - p00) * wx;
        const bottom = p01 + (p11 - p01) * wx;
        out[dst + c] = Math.round(top + (bottom - top) * wy);
      }
    }
  }
  return { width, height, data: out };
};
