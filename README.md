# Braille Art Maker

PNG to dense Unicode Braille art for Bun and the browser, with optional true-colour foreground/background cells.

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

The browser app supports PNG upload, live Braille preview, ordered/Atkinson/Floyd-Steinberg/threshold dithering, monochrome or colour output, TXT/HTML/SVG downloads and a draggable PNG/Braille hero comparison. The hero uses full colour by default; maker output starts monochrome.

Colour modes:

- foreground colour follows the normal Braille mask
- background colour also preserves pixels that fall on the off side of the mask
- full colour clusters each 2x4 source cell into up to two colours and uses the Braille mask to encode the split

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
--columns <n>          Braille columns, default 96
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

Colour TXT uses the same tag family as `extras/term/colour.h`:

```text
<#ff6688>foreground
<@#221122>background
<#default><@#default>
```

The header also accepts `#define name = #rrggbb;`, `<name>` and `<@name>` aliases.

## Terminal viewer

```bash
cc -std=c11 -Wall -Wextra -Wpedantic -Werror \
  extras/term/braille-colour-view.c -o braille-colour-view
./braille-colour-view image.txt
```

The viewer converts foreground tags to ANSI `38;2`, background tags to `48;2`, and keeps the tags zero-width for code using the header's `mbrtowc`/`wcwidth` wrappers.

## API

```ts
import { makeArt, taggedText, vectorStage } from "@kitty-crow/braille-art-maker";

const vector = vectorStage({ width, height, data: rgba });
const art = makeArt(vector.pixels, {
  columns: 96,
  colour: true,
  colourBackground: true,
  fullColour: true
});
console.log(taggedText(art));
```

## Project layout

```text
src/core/        Braille signal, tone, dithering and packing
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
vendor/pages       kitty-crow/github-pages-template
vendor/vectoriser  kitty-crow/vectoriser
vendor/braille-qr  kitty-crow/braille-qr
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
