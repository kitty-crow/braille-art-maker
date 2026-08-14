import type { Dither } from "../types.ts";

const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const ordered4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

export const dither = (values: Float32Array, active: Uint8Array, width: number, height: number, mode: Dither, threshold: number): Uint8Array => {
  const out = new Uint8Array(values.length);
  if (mode === "ordered") {
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!active[i]) continue;
      const matrix = ordered4[(y % 4) * 4 + (x % 4)] ?? 0;
      out[i] = (values[i] ?? 0) >= clamp(threshold + (matrix / 15 - 0.5) * 0.34) ? 1 : 0;
    }
    return out;
  }
  if (mode === "threshold") {
    for (let i = 0; i < values.length; i += 1) out[i] = active[i] && (values[i] ?? 0) >= threshold ? 1 : 0;
    return out;
  }
  const work = values.slice();
  const add = (x: number, y: number, error: number, weight: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (!active[i]) return;
    work[i] = clamp((work[i] ?? 0) + error * weight);
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    if (!active[i]) continue;
    const old = work[i] ?? 0;
    const next = old >= threshold ? 1 : 0;
    out[i] = next;
    const error = old - next;
    if (mode === "floyd") {
      add(x + 1, y, error, 7 / 16); add(x - 1, y + 1, error, 3 / 16); add(x, y + 1, error, 5 / 16); add(x + 1, y + 1, error, 1 / 16);
    } else {
      const e = error / 8;
      add(x + 1, y, e, 1); add(x + 2, y, e, 1); add(x - 1, y + 1, e, 1); add(x, y + 1, e, 1); add(x + 1, y + 1, e, 1); add(x, y + 2, e, 1);
    }
  }
  return out;
};
