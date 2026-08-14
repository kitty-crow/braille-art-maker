import { expect, test } from "bun:test";
import { makeArt } from "../src/core/art.ts";
import { packBraille } from "../src/core/braille.ts";
import { artSize } from "../src/core/size.ts";

test("packs a full 2x4 cell", () => { expect(packBraille(Uint8Array.from([1,1,1,1,1,1,1,1]), 2, 4)).toBe("⣿"); });
test("preserves blank cells", () => { expect(packBraille(new Uint8Array(16), 4, 4)).toBe("⠀⠀"); });
test("preserves square aspect ratio at the dot grid", () => { expect(artSize(512, 512, 96)).toEqual({ dotsWidth: 192, dotsHeight: 192, rows: 48 }); });
test("transparent pixels never become ink", () => { const data = new Uint8ClampedArray(8 * 8 * 4); const art = makeArt({ width: 8, height: 8, data }, { columns: 8, dither: "threshold" }); expect(art.text.replaceAll("⠀", "").replaceAll("\n", "")).toBe(""); });
