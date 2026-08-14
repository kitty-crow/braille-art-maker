# Braille Art Maker

Turn PNG images into dense Unicode Braille art through a real path-only SVG stage.

The browser app runs locally at [kitty-crow.github.io/braille-art-maker](https://kitty-crow.github.io/braille-art-maker/). The same repository also provides a Bun CLI and a small library for the image-to-Braille stages.

## What it does

The conversion is intentionally split into distinct stages:

1. Decode the PNG.
2. Convert it to a path-only SVG with the pinned [Vectoriser](https://github.com/kitty-crow/vectoriser) dependency.
3. Rasterise that SVG at the exact Braille dot-grid size.
4. Build a transparency-aware luminance signal.
5. Stretch useful contrast and recover fine edges with a Sobel pass.
6. Halftone the signal with Atkinson, Floyd-Steinberg, ordered 4×4 or a hard threshold.
7. Pack each 2×4 dot block into one Unicode Braille character.
8. Render the characters with the dense-cell technique from [Braille QR](https://github.com/kitty-crow/braille-qr).

The PNG-to-Braille analysis, dithering and Unicode packing are implemented in this repository. Vertopal was used as a behavioural reference while investigating the UBRL output class, not as code or a runtime dependency. See [Reverse engineering notes](docs/reverse-engineering.md).

## Browser

```bash
git clone --recurse-submodules https://github.com/kitty-crow/braille-art-maker
cd braille-art-maker
bun install
bun run check
bun run build
bun src/serve.ts
```

Open `http://localhost:4173`.

The default hero fixture is a web-optimised PNG derived from the supplied example. The hero overlays its generated Braille result on the same square behind a draggable top-to-bottom divider, so source features and Braille features remain spatially registered. The fixture is deliberately demanding, with transparency, pale hair, dark clothing, thin linework and shaded surfaces.

## CLI

Build first:

```bash
bun install
bun run build
```

Then:

```bash
braille-art image.png
braille-art image.png --columns 120 --dither atkinson
braille-art image.png --html -o image.html
braille-art image.png --svg intermediate.svg -o image.txt
```

From a checkout without installing the binary:

```bash
bun src/cli.ts image.png --columns 96
```

The CLI invokes the pinned Vectoriser core for the first stage. It preserves the full source canvas by default (`--crop` is available when desired), then uses `@resvg/resvg-js` as a generic SVG renderer before entering this repository's own signal, halftone and Unicode packing code.

## Library

```ts
import { makeArt } from "@kitty-crow/braille-art-maker";

const art = makeArt({ width, height, data: rgba }, {
  contrast: 1.08,
  detail: 0.22,
  bias: 0.03,
  dither: "atkinson",
  polarity: "dark"
});

console.log(art.text);
```

The library starts from RGBA pixels at the final Braille dot-grid resolution. PNG decoding, vectorisation and SVG rendering remain adapters around that core.

## Pinned vendor dependencies

Three repositories are git submodules rather than copied source:

```text
vendor/pages       kitty-crow/github-pages-template
vendor/vectoriser  kitty-crow/vectoriser
vendor/braille-qr  kitty-crow/braille-qr
```

`github-pages-template` provides the Pages builder/runtime. `vectoriser` provides the PNG-to-path-SVG implementation and CLI. `braille-qr` provides the dense HTML ink-spread helper and is the reference implementation for measured Braille cell geometry.

## Output density

Ordinary `<pre>` output leaves glyph metrics to the font and often looks loose. Dense HTML instead measures the rendered width of `⣿`, fixes every character to that width, fixes every row to twice that width, disables ligatures, uses geometric text rendering and allows glyph ink to overflow the microscopic cell box. Optional text shadow expands the ink by a controlled fraction of a pixel.

The underlying text remains normal Unicode Braille and can be copied without the HTML.

## Documentation

- [Architecture](docs/architecture.md)
- [Conversion algorithm](docs/algorithm.md)
- [Browser and hero](docs/web.md)
- [CLI and library](docs/cli.md)
- [Dependencies and vendor boundaries](docs/dependencies.md)
- [Reverse engineering notes](docs/reverse-engineering.md)

## Project layout

```text
src/                 Braille Art Maker core, CLI, browser app and build
web/                 authored GitHub Pages HTML, CSS and hero fixture
tests/               deterministic Bun tests
docs/                architecture and reverse-engineering notes
vendor/               pinned git submodules
pages.config.ts       shared Pages-template configuration
version.json          site/package version source
```

## Development

```bash
bun run check
bun run build
bun test
```

CI checks TypeScript, tests, the Pages configuration and version consistency before deploying `site/` to GitHub Pages.

## Licence

Braille Art Maker is MIT licensed. Vendored submodules and npm dependencies retain their own licences. In particular, `@resvg/resvg-js` is MPL-2.0 and `pngjs` is MIT.
