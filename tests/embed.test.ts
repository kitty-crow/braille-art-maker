import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { taggedText } from "../src/colour/tagged.ts";
import { parseArgs } from "../src/cli/args.ts";
import { bestRaw, embedCodec, encodeU3, packEmbed, unpackEmbed } from "../src/embed/codec.ts";
import { packRawV2Candidates } from "../src/embed/raw.ts";
import { packEmbedSmall, unpackEmbedSmall } from "../src/embed/small-bun.ts";
import { Tpl } from "../src/embed/tpl.ts";
import type { Art, ArtCfg, CellColour } from "../src/types.ts";

const root = join(import.meta.dir, "..");
const template = `<div data-unicode-art data-theme="{{THEME}}" data-surface="{{SURFACE}}" style="{{STYLE}}" aria-label="{{LABEL}}"><script type="application/octet-stream" data-unicode-art-data data-codec="{{CODEC}}">{{DATA}}</script><script src="{{LOAD_SRC}}" data-api="{{API_SRC}}"></script><link href="{{CSS_SRC}}"></div>`;
const colours: CellColour[] = [
  { fg: { r: 240, g: 90, b: 140 } }, { fg: { r: 240, g: 90, b: 140 } },
  { fg: { r: 90, g: 80, b: 210 }, bg: { r: 20, g: 18, b: 25 } }, { fg: { r: 90, g: 80, b: 210 }, bg: { r: 20, g: 18, b: 25 } },
  { fg: { r: 240, g: 90, b: 140 } }, { fg: { r: 240, g: 90, b: 140 } },
  {}, {},
];
const art: Art = {
  text: "⣿⣿⠿⠿\n⣿⣿⠀⠀",
  columns: 4,
  rows: 2,
  dotsWidth: 8,
  dotsHeight: 8,
  threshold: 0.5,
  density: 0.5,
  cellColours: colours,
};
const cfg: ArtCfg = { colour: true, colourBackground: true, fullColour: false };

const repeatedArt = (): Art => {
  const masks = [255, 63, 129, 24, 36, 66, 126, 0];
  const row = Array.from({ length: 64 }, (_, i) => String.fromCodePoint(0x2800 + masks[i % masks.length]!)).join("");
  return {
    text: Array.from({ length: 32 }, () => row).join("\n"),
    columns: 64,
    rows: 32,
    dotsWidth: 128,
    dotsHeight: 128,
    threshold: 0.5,
    density: 0.5,
  };
};

const gradientArt = (): Art => {
  const columns = 64;
  const rows = 32;
  const cells: CellColour[] = [];
  const lines: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) {
      line += String.fromCodePoint(0x2800 + ((x * 29 + y * 17) & 0xff));
      cells.push({ fg: { r: (x * 4) & 0xff, g: (y * 8) & 0xff, b: ((x + y) * 3) & 0xff } });
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

const fullColourArt = (): Art => {
  const columns = 48;
  const rows = 24;
  const lines: string[] = [];
  const cells: CellColour[] = [];
  const palette = [
    [{ r: 236, g: 84, b: 132 }, { r: 32, g: 24, b: 38 }],
    [{ r: 116, g: 90, b: 226 }, { r: 238, g: 218, b: 224 }],
    [{ r: 63, g: 176, b: 196 }, { r: 24, g: 36, b: 44 }],
  ] as const;
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) {
      const at = (Math.floor(x / 6) + Math.floor(y / 4)) % palette.length;
      const pair = palette[at]!;
      line += String.fromCodePoint(0x2800 + ((x * 11 + y * 7) & 0xff));
      cells.push({ fg: pair[0], bg: pair[1] });
    }
    lines.push(line);
  }
  return { text: lines.join("\n"), columns, rows, dotsWidth: columns * 2, dotsHeight: rows * 4, threshold: 0.5, density: 0.5, cellColours: cells };
};

const packU3 = (source: Art, config: ArtCfg): string => {
  let best = "";
  for (const candidate of packRawV2Candidates(source, config)) {
    const compressed = new Uint8Array(brotliCompressSync(candidate.bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: candidate.bytes.length,
      },
    }));
    const encoded = encodeU3(compressed);
    if (!best || encoded.length < best.length) best = encoded;
  }
  return best;
};

test("u2 remains lossless for legacy embeds", () => {
  const packed = packEmbed(art, cfg, "u2");
  const decoded = unpackEmbed(packed, "u2");
  expect(decoded.columns).toBe(4);
  expect(decoded.rows).toBe(2);
  expect([...decoded.masks]).toEqual([255, 255, 63, 63, 255, 255, 0, 0]);
  expect(decoded.cellColours).toEqual(colours);
});

test("u1 embeds remain decodable", () => {
  const legacy = packEmbed(art, cfg, "u1");
  expect(unpackEmbed(legacy, "u1").cellColours).toEqual(colours);
  expect(unpackEmbed(legacy).cellColours).toEqual(colours);
});

test("u4 searches exact representations and remains lossless", async () => {
  const packed = await packEmbedSmall(art, cfg);
  const decoded = await unpackEmbedSmall(packed, "u4");
  expect(embedCodec).toBe("u4");
  expect(decoded.columns).toBe(art.columns);
  expect(decoded.rows).toBe(art.rows);
  expect([...decoded.masks]).toEqual([255, 255, 63, 63, 255, 255, 0, 0]);
  expect(decoded.cellColours).toEqual(colours);
  expect(packed).not.toContain("⣿");
  expect(packed).not.toContain("<#");
  expect(packed).not.toContain("<");
  expect(packed).not.toContain(">");
});

test("u4 beats or matches u3 on representative art", async () => {
  const cases: readonly [Art, ArtCfg][] = [
    [repeatedArt(), {}],
    [gradientArt(), { colour: true }],
    [fullColourArt(), { colour: true, colourBackground: true, fullColour: true }],
  ];
  for (const [source, config] of cases) {
    const u3 = packU3(source, config);
    const u4 = await packEmbedSmall(source, config);
    expect(u4.length).toBeLessThanOrEqual(u3.length);
    const decoded = await unpackEmbedSmall(u4, "u4");
    expect(decoded.masks).toEqual((await unpackEmbedSmall(u3, "u3")).masks);
    expect(decoded.cellColours).toEqual(source.cellColours);
  }
});

test("u3 embeds remain decodable after u4", async () => {
  const legacy = packU3(gradientArt(), { colour: true });
  const decoded = await unpackEmbedSmall(legacy, "u3");
  expect(decoded.columns).toBe(64);
  expect(decoded.rows).toBe(32);
  expect(decoded.cellColours).toEqual(gradientArt().cellColours);
});

test("u2 deflates the packed binary before base64url encoding", () => {
  const source = repeatedArt();
  const u1 = packEmbed(source, {}, "u1");
  const u2 = packEmbed(source, {}, "u2");
  expect(u2.length).toBeLessThan(u1.length);
  expect(u2.length).toBeLessThan(Math.floor(u1.length / 2));
  expect(unpackEmbed(u2, "u2").masks).toEqual(unpackEmbed(u1, "u1").masks);
});

test("compact embed payload stays smaller than literal tagged JSON", async () => {
  const packed = await packEmbedSmall(art, cfg);
  const literal = JSON.stringify({ text: taggedText(art), columns: art.columns, rows: art.rows, colour: true, colourBackground: true, fullColour: false });
  expect(packed.length).toBeLessThan(literal.length);
});

test("embed template leaves scaffolding plain and only encodes the art payload", async () => {
  const packed = await packEmbedSmall(art, cfg);
  const html = new Tpl().make({
    data: packed,
    codec: embedCodec,
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: template });
  expect(html).toContain("<div data-unicode-art");
  expect(html).toContain('data-codec="u4"');
  expect(html).toContain('type="application/octet-stream"');
  expect(html).toContain("https://example.test/v1/embed.css");
  expect(html).toContain("https://example.test/v1/load.js");
  expect(html).toContain(packed);
  expect(html).not.toContain("⣿");
  expect(html).not.toContain("<#");
});

test("CLI embed input parsing does not mistake option values for the PNG", () => {
  const args = parseArgs(["--columns", "120", "image.png", "--embed", "--embed-theme", "light"]);
  expect(args.input).toBe("image.png");
  expect(args.embed).toBe(true);
  expect(args.embedTheme).toBe("light");
  expect(args.art.columns).toBe(120);
});

test("build publishes the CDN runtime, worker and Brotli assets", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  const loader = await readFile(join(root, "templates", "embed", "load.js"), "utf8");
  const css = await readFile(join(root, "templates", "embed", "embed.css"), "utf8");
  expect(build).toContain('join(site, "v1")');
  expect(build).toContain('naming: "embed.js"');
  expect(build).toContain('naming: "embed-worker.js"');
  expect(build).toContain('join(api, "load.js")');
  expect(build).toContain('join(assets, "brotli_wasm_bg.wasm")');
  expect(loader).toContain("win.UnicodeArt");
  expect(loader).toContain("api.mount(host)");
  expect(css).toContain(":host");
  expect(css).toContain("font-synthesis: none");
});

test("embed runtime accepts u1 through u4 in shadow DOM", async () => {
  const runtime = await readFile(join(root, "src", "embed", "runtime.ts"), "utf8");
  expect(runtime).toContain('codec !== "u1" && codec !== "u2" && codec !== "u3" && codec !== "u4"');
  expect(runtime).toContain('unpackEmbedSmall(data.textContent ?? "", codec as EmbedCodec)');
  expect(runtime).toContain('String.fromCodePoint(0x2800 +');
  expect(runtime).toContain('attachShadow({ mode: "open" })');
  expect(runtime).toContain('"⣿".repeat(200)');
  expect(runtime).toContain("new ResizeObserver");
  expect(runtime).toContain("new MutationObserver");
});

test("auto embed surface protects foreground-only colour on light themes", async () => {
  const runtime = await readFile(join(root, "src", "embed", "runtime.ts"), "utf8");
  expect(runtime).toContain('if (surface === "dark") return true;');
  expect(runtime).toContain('if (surface === "light") return false;');
  expect(runtime).toContain('if (this.themeDark()) return true;');
  expect(runtime).toContain('payload?.colour === true && !payload.colourBackground && !payload.fullColour');
});
