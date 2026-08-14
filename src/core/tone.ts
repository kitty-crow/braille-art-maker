const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const percentile = (values: Float32Array, active: Uint8Array, q: number): number => {
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (!active[i]) continue;
    const bin = Math.round(clamp(values[i] ?? 0) * 255);
    hist[bin] = (hist[bin] ?? 0) + 1;
    count += 1;
  }
  if (!count) return 0;
  const target = count * q;
  let seen = 0;
  for (let i = 0; i < hist.length; i += 1) {
    seen += hist[i] ?? 0;
    if (seen >= target) return i / 255;
  }
  return 1;
};

export const stretch = (values: Float32Array, active: Uint8Array): void => {
  const lo = percentile(values, active, 0.015);
  const hi = percentile(values, active, 0.985);
  if (hi - lo < 0.04) return;
  for (let i = 0; i < values.length; i += 1) {
    if (active[i]) values[i] = clamp(((values[i] ?? 0) - lo) / (hi - lo));
  }
};

export const contrast = (values: Float32Array, active: Uint8Array, amount: number): void => {
  for (let i = 0; i < values.length; i += 1) {
    if (active[i]) values[i] = clamp(((values[i] ?? 0) - 0.5) * amount + 0.5);
  }
};

export const sharpen = (values: Float32Array, active: Uint8Array, width: number, height: number, amount: number): void => {
  if (amount <= 0) return;
  const src = values.slice();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!active[i]) continue;
      let sum = 0;
      let count = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
          const j = yy * width + xx;
          if (!active[j]) continue;
          sum += src[j] ?? 0;
          count += 1;
        }
      }
      const current = src[i] ?? 0;
      const blur = count ? sum / count : current;
      values[i] = clamp(current + amount * (current - blur));
    }
  }
};

export const otsu = (values: Float32Array, active: Uint8Array): number => {
  const hist = new Uint32Array(256);
  let total = 0;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (!active[i]) continue;
    const bin = Math.round(clamp(values[i] ?? 0) * 255);
    hist[bin] = (hist[bin] ?? 0) + 1;
    total += 1;
    sum += bin;
  }
  if (!total) return 0.5;
  let bgWeight = 0;
  let bgSum = 0;
  let best = 127;
  let maxVariance = -1;
  for (let t = 0; t < 256; t += 1) {
    const count = hist[t] ?? 0;
    bgWeight += count;
    if (!bgWeight) continue;
    const fgWeight = total - bgWeight;
    if (!fgWeight) break;
    bgSum += t * count;
    const bgMean = bgSum / bgWeight;
    const fgMean = (sum - bgSum) / fgWeight;
    const variance = bgWeight * fgWeight * (bgMean - fgMean) ** 2;
    if (variance > maxVariance) { maxVariance = variance; best = t; }
  }
  return best / 255;
};
