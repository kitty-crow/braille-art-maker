# Unicode Art Maker

PNG to dense Unicode text art for Bun and the browser, with optional true-colour foreground/background cells.

## Install

```bash
git submodule update --init --recursive
bun install
bun run check
bun run build
```

## Browser

```bash
bun run site:build
bun run site:dev
```

Open `http://localhost:4173`.

The browser app supports PNG upload, live Unicode preview, dithering, monochrome or colour output, TXT/HTML/SVG downloads and a draggable PNG/Unicode hero comparison.

The hero starts in foreground-only colour at 240 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. Turning hero colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome at the original slider defaults with Ordered 4x4. Enabling colour keeps those slider values, switches the dither control to Atkinson and starts with background/full colour off.

Colour modes:

- foreground colour follows the normal Unicode mask
- background colour can preserve pixels on the off side of the mask
- full colour can split each 2x4 source cell into two perceptual colour groups

## CLI

```bash
bun run cli -- image.png
bun run cli -- image.png --colour -o image.txt
bun run cli -- image.png --colour-background -o image.txt
bun run cli -- image.png --full-colour --html -o image.html
bun run cli -- image.png --full-colour --ansi
```

Useful options:

```text
--columns <n>          Unicode columns, default 96
--dither <mode>        atkinson|floyd|ordered|threshold, default ordered
--invert               inverted polarity, default
--no-invert            disable inverted polarity
--colour               foreground colour tags
--colour-background    foreground + background colour tags
--full-colour          adaptive two-colour cells
--ansi                 emit terminal truecolour escapes
--html                 self-contained HTML
--svg <path>           also write the Vectoriser SVG
-o, --output <path>    write output instead of stdout
```

## Terminal viewer

```bash
cc -std=c11 -Wall -Wextra -Wpedantic -Werror extras/term/unicode-colour-view.c -o unicode-colour-view
./unicode-colour-view image.txt
```

## API

```ts
import { makeArt, taggedText, vectorStage } from "@kitty-crow/unicode-art-maker";
```

## Project layout

```text
src/core/        Unicode signal, tone, dithering and packing
src/colour/      colour sampling, full-colour cells and TXT/ANSI tags
src/vector/      Vectoriser adapter and SVG rasterisation
src/html/        dense HTML output
src/web/         browser behaviour
src/cli/         CLI parsing and output
extras/term/     generic C colour header and terminal viewer
web/             authored Pages markup and assets
web/styles/      project CSS split by concern
vendor/          pinned git submodules
tests/           Bun tests
docs/            project documentation
```

## Vendor dependencies

```text
vendor/pages         kitty-crow/github-pages-template
vendor/vectoriser    kitty-crow/vectoriser
vendor/unicode-grid  kitty-crow/braille-qr
```

## Documentation

- [API](docs/api.md)
- [CLI](docs/cli.md)
- [Design](docs/design.md)
- [Web app](docs/web.md)

## Author

Kitty Crow  
https://kittycrow.dev

## Licence

[MIT](LICENSE)
