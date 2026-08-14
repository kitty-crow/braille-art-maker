import { expect, test } from "bun:test";
import { makeArt } from "../src/core/art.ts";
import { packUnicode } from "../src/core/unicode.ts";
import { artSize } from "../src/core/size.ts";

test("packs a full 2x4 Unicode cell", () => { expect(packUnicode(Uint8Array.from([1,1,1,1,1,1,1,1]), 2, 4)).toBe("⣿"); });
test("preserves blank Unicode cells", () => { expect(packUnicode(new Uint8Array(16), 4, 4)).toBe("⠀⠀"); });
test("preserves square aspect ratio at the dot grid", () => { expect(artSize(512, 512, 96)).toEqual({ dotsWidth: 192, dotsHeight: 192, rows: 48 }); });
test("does not clamp manually requested resolutions above the browser slider ceiling", () => { expect(artSize(512, 512, 10240)).toEqual({ dotsWidth: 20480, dotsHeight: 20480, rows: 5120 }); });
test("transparent pixels never become ink", () => { const data = new Uint8ClampedArray(8 * 8 * 4); const art = makeArt({ width: 8, height: 8, data }, { columns: 8, dither: "threshold" }); expect(art.text.replaceAll("⠀", "").replaceAll("\n", "")).toBe(""); });
