# Braille Art Maker

Turn PNG images into dense Unicode Braille art through a real path-only SVG stage.

> **Repository status, 14 August 2026:** the initial project repository was accidentally left on the copied GitHub Pages template commit. The documentation below records the Braille Art Maker architecture and intended public interface while the implementation is restored. Commands and file paths described here are the project contract, not a claim that the current `main` template tree already implements them.

The target browser app is `kitty-crow.github.io/braille-art-maker`. The repository is designed to provide a static browser application, Bun CLI and small reusable TypeScript core.

## What it does

The conversion is intentionally split into distinct stages:

1. Decode the PNG.
2. Convert it to a path-only SVG with the pinned [Vectoriser](https://github.com/kitty-crow/vectoriser) dependency.
3. Rasterise that SVG at the exact Braille dot-grid size.
4. Build a transparency-aware luminance signal.
5. Stretch useful contrast and recover fine edges.
6. Halftone the signal with Atkinson, Floyd-Steinberg, ordered 4x4 or a hard threshold.
7. Pack each 2x4 dot block into one Unicode Braille character.
8. Render the characters with the dense-cell technique from [Braille QR](https://github.com/kitty-crow/braille-qr).

The PNG-to-Braille analysis, dithering and Unicode packing belong to this repository. Vertopal was used as a behavioural reference while investigating the UBRL output class, not as code or a runtime dependency. See [Reverse engineering notes](docs/reverse-engineering.md).

## Browser

The intended local workflow is:

```bash
git clone --recurse-submodules https://github.com/kitty-crow/braille-art-maker
cd braille-art-maker
bun install
bun run check
bun run build
bun src/serve.ts
```

The canonical hero fixture is the supplied transparent catgirl-at-laptop PNG. The hero places its generated Braille result over the same square behind a draggable top-to-bottom divider. The initial split is 50/50, original PNG on the left and registered Braille art on the right.

## CLI

The planned CLI surface is:

```bash
braille-art image.png
braille-art image.png --columns 120 --dither atkinson
braille-art image.png --html -o image.html
braille-art image.png --svg intermediate.svg -o image.txt
```

From a source checkout:

```bash
bun src/cli.ts image.png --columns 96
```

The CLI uses the pinned Vectoriser core for the first stage. It preserves the full source canvas by default (`--crop` is explicit), then rasterises the SVG before entering Braille Art Maker's own signal, halftone and Unicode packing code.

## Library

The intended core API starts from RGBA pixels at the final Braille dot-grid resolution:

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

PNG decoding, vectorisation and SVG rendering are adapters around that core so browser and Bun runtimes can use the appropriate image primitives without duplicating the Braille algorithm.

## Pinned vendor dependencies

Three repositories are to be pinned as git submodules rather than copied source:

```text
vendor/pages       kitty-crow/github-pages-template
vendor/vectoriser  kitty-crow/vectoriser
vendor/braille-qr  kitty-crow/braille-qr
```

`github-pages-template` provides the Pages builder/runtime. `vectoriser` provides PNG/RGBA to path-only SVG. `braille-qr` supplies the dense Unicode HTML/CSS rendering technique, not QR-generation behaviour.

## Output density

Ordinary `<pre>` output leaves glyph metrics to the font and often looks loose. Dense HTML instead measures the rendered width of `⣿`, fixes every character to that width, fixes every row to twice that width, disables ligatures, uses geometric text rendering and lets glyph ink overflow the microscopic cell box. Optional text shadow can expand the ink by a controlled fraction of a pixel.

The underlying output remains normal Unicode Braille and can be copied without the HTML.

## Documentation

- [Architecture](docs/architecture.md)
- [Conversion algorithm](docs/algorithm.md)
- [Browser and hero](docs/web.md)
- [CLI and library](docs/cli.md)
- [Dependencies and vendor boundaries](docs/dependencies.md)
- [Reverse engineering notes](docs/reverse-engineering.md)

## Target project layout

```text
src/                 Braille Art Maker core, CLI, browser app and build
web/                 authored GitHub Pages HTML, CSS and hero fixture
tests/               deterministic Bun tests
docs/                project documentation
vendor/               pinned git submodules
pages.config.ts       shared Pages-template configuration
version.json          site/package version source
```

## Development contract

The finished project is expected to pass:

```bash
bun run check
bun run build
bun test
```

CI must check TypeScript, deterministic tests, Pages configuration and a clean static build before deployment.

## Licence

Braille Art Maker is MIT licensed. Vendored submodules and npm dependencies retain their own licences.
