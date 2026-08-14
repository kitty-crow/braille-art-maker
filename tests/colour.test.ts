import { expect, test } from "bun:test";
import { colourCells } from "../src/colour/cells.ts";
import { taggedText, taggedToAnsi } from "../src/colour/tagged.ts";

const px = (colours: readonly [number, number, number][]): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(colours.length * 4);
  colours.forEach(([r,g,b], i) => { data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=255; });
  return data;
};

test("full colour uses both foreground and background", () => {
  const data = px([[255,0,0],[0,0,255],[255,0,0],[0,0,255],[255,0,0],[0,0,255],[255,0,0],[0,0,255]]);
  const result = colourCells({ width: 2, height: 4, data }, new Uint8Array([1,0,1,0,1,0,1,0]), true, true);
  const c = result.cells[0];
  expect(c?.fg).toBeDefined();
  expect(c?.bg).toBeDefined();
  expect(c?.fg).not.toEqual(c?.bg);
});

test("uniform full colour fills foreground and background with one colour", () => {
  const data = px(Array.from({ length: 8 }, () => [220, 80, 120] as [number,number,number]));
  const result = colourCells({ width: 2, height: 4, data }, new Uint8Array([1,0,1,0,1,0,1,0]), true, true);
  expect(result.cells[0]?.fg).toEqual(result.cells[0]?.bg);
});

test("background colour survives an entirely off Unicode mask", () => {
  const data = px(Array.from({ length: 8 }, () => [190, 35, 70] as [number,number,number]));
  const result = colourCells({ width: 2, height: 4, data }, new Uint8Array(8), true, false);
  expect(result.cells[0]?.fg).toBeUndefined();
  expect(result.cells[0]?.bg).toEqual({ r: 190, g: 35, b: 70 });
});

test("tagged text emits foreground and background tags", () => {
  const art = { text: "⣿", columns: 1, rows: 1, dotsWidth: 2, dotsHeight: 4, threshold: 0.5, density: 1, cellColours: [{ fg: { r: 255, g: 0, b: 0 }, bg: { r: 0, g: 0, b: 255 } }] } as const;
  const text = taggedText(art);
  expect(text).toContain("<#ff0000>");
  expect(text).toContain("<@#0000ff>");
  expect(taggedToAnsi(text)).toContain("\x1b[38;2;255;0;0m");
  expect(taggedToAnsi(text)).toContain("\x1b[48;2;0;0;255m");
});

test("tagged text can colour a blank Unicode cell through its background", () => {
  const art = { text: "⠀", columns: 1, rows: 1, dotsWidth: 2, dotsHeight: 4, threshold: 0.5, density: 0, cellColours: [{ bg: { r: 12, g: 34, b: 56 } }] } as const;
  expect(taggedText(art)).toContain("<@#0c2238>⠀");
});
