const masks = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]] as const;

export const packBraille = (dots: Uint8Array, width: number, height: number): string => {
  if (width % 2 || height % 4) throw new Error("Braille dot dimensions must be divisible by 2x4 cells.");
  const lines: string[] = [];
  for (let y = 0; y < height; y += 4) {
    let line = "";
    for (let x = 0; x < width; x += 2) {
      let mask = 0;
      for (let dy = 0; dy < 4; dy += 1) for (let dx = 0; dx < 2; dx += 1) if (dots[(y + dy) * width + x + dx]) mask |= masks[dy]?.[dx] ?? 0;
      line += String.fromCodePoint(0x2800 + mask);
    }
    lines.push(line);
  }
  return lines.join("\n");
};
