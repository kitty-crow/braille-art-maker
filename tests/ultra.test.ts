import { expect, test } from "bun:test";
import { packEmbed, unpackEmbed } from "../src/embed/codec.ts";
import { packUltraCandidates, unpackUltra } from "../src/embed/ultra-raw.ts";
import type { Art, ArtCfg, CellColour } from "../src/types.ts";

const makeArt = (background: boolean): Art => {
  const columns = 17;
  const rows = 11;
  const lines: string[] = [];
  const cells: CellColour[] = [];
  const palette = [
    [{ r: 240, g: 84, b: 134 }, { r: 26, g: 22, b: 31 }],
    [{ r: 108, g: 92, b: 224 }, { r: 234, g: 219, b: 228 }],
    [{ r: 55, g: 174, b: 198 }, { r: 20, g: 39, b: 46 }],
    [{ r: 238, g: 180, b: 67 }, { r: 51, g: 31, b: 26 }],
  ] as const;

  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) {
      const mask = (x * 37 + y * 53 + ((x ^ y) * 11)) & 0xff;
      line += String.fromCodePoint(0x2800 + mask);
      const pair = palette[(Math.floor(x / 3) + Math.floor(y / 2)) % palette.length]!;
      const present = (x + y) % 7 !== 0;
      cells.push(present ? {
        fg: pair[0],
        ...(background && (x * 3 + y) % 5 !== 0 ? { bg: pair[1] } : {}),
      } : {});
    }
    lines.push(line);
  }

  return {
    text: lines.join("\n"),
    columns,
    rows,
    dotsWidth: columns * 2,
    dotsHeight: rows * 4,
    threshold: 0.5,
    density: 0.5,
    cellColours: cells,
  };
};

const verifyEveryCandidate = (art: Art, cfg: ArtCfg): void => {
  const expected = unpackEmbed(packEmbed(art, cfg, "u1"), "u1");
  const candidates = packUltraCandidates(art, cfg);
  expect(candidates.length).toBeGreaterThan(0);
  for (const candidate of candidates) {
    const decoded = unpackUltra(candidate.bytes);
    expect(decoded.columns).toBe(expected.columns);
    expect(decoded.rows).toBe(expected.rows);
    expect(decoded.masks).toEqual(expected.masks);
    expect(decoded.colour).toBe(expected.colour);
    expect(decoded.colourBackground).toBe(expected.colourBackground);
    expect(decoded.fullColour).toBe(expected.fullColour);
    expect(decoded.cellColours).toEqual(expected.cellColours);
  }
};

test("every monochrome ultra representation round-trips exactly", () => {
  const { cellColours: _cellColours, ...art } = makeArt(false);
  verifyEveryCandidate(art, {});
});

test("every foreground-colour ultra representation round-trips exactly", () => {
  verifyEveryCandidate(makeArt(false), { colour: true });
});

test("every full-colour ultra representation round-trips exactly", () => {
  verifyEveryCandidate(makeArt(true), { colour: true, colourBackground: true, fullColour: true });
});

test("ultra embed dimensions preserve 1024 horizontal cells", () => {
  const art: Art = {
    text: "⠀".repeat(1024),
    columns: 1024,
    rows: 1,
    dotsWidth: 2048,
    dotsHeight: 4,
    threshold: 0.5,
    density: 0,
  };
  const candidate = packUltraCandidates(art, {})[0];
  expect(candidate).toBeDefined();
  const decoded = unpackUltra(candidate!.bytes);
  expect(decoded.columns).toBe(1024);
  expect(decoded.rows).toBe(1);
  expect(decoded.masks).toHaveLength(1024);
});
