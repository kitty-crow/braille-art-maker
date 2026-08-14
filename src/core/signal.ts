import type { Pixels } from "../types.ts";

const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const linear = (value: number): number => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export interface Signal {
  readonly ink: Float32Array;
  readonly active: Uint8Array;
}

export const signal = (pixels: Pixels, invert = false): Signal => {
  const count = pixels.width * pixels.height;
  const ink = new Float32Array(count);
  const active = new Uint8Array(count);

  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    const alpha = (pixels.data[p + 3] ?? 0) / 255;
    if (alpha <= 0.015) continue;
    const luminance = clamp(
      0.2126 * linear(pixels.data[p] ?? 0) +
      0.7152 * linear(pixels.data[p + 1] ?? 0) +
      0.0722 * linear(pixels.data[p + 2] ?? 0)
    );
    ink[i] = clamp((invert ? luminance : 1 - luminance) * alpha);
    active[i] = 1;
  }

  return { ink, active };
};
