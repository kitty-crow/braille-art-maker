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

The browser app supports PNG upload, live Unicode preview, dithering, monochrome or colour output, TXT/HTML/SVG downloads, paste-ready CDN embeds and a draggable PNG/Unicode hero comparison.

The hero starts in colour at 240 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. In light mode background colour starts on; in dark mode it starts off. Full colour starts off in both themes. Turning hero colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome at the original slider defaults with Ordered 4x4. In light mode Invert image polarity starts off; in dark mode it starts on. Enabling colour keeps those slider values, switches the dither control to Atkinson and starts with background/full colour off. Foreground-only colour uses the dark preview surface in light mode so the result remains visible; the adjacent `?` explains that a genuinely light surface can make some colours difficult to see.

The displayed embed fragment is rendered as an HTML code block through Marked, DOMPurify and Highlight.js, using the same pinned CDN versions as the shared Pages README renderer.

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
bun run cli -- image.png --colour --embed -o image-embed.html
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
--embed                paste-ready CDN embed div
--embed-src <url>      alternate embed.js location
--embed-theme <mode>   auto|light|dark
--embed-surface <mode> auto|light|dark
--svg <path>           also write the Vectoriser SVG
-o, --output <path>    write output instead of stdout
```

## Embedding

The maker's **Copy embed div** output carries the generated result itself, so the original PNG does not need to be uploaded or hosted. The art is not embedded as literal Unicode/tagged TXT: each Unicode cell is packed to its 8-bit dot mask, repeated masks are run-length encoded, colour state changes are compacted, and the binary payload is stored as safe base64url using the versioned `u1` codec. The CDN runtime contains the matching decoder.

Literal base256/base512 text encodings are intentionally not used because their non-ASCII code points take multiple bytes in UTF-8 HTML and make the fragment larger rather than smaller.

The small loader fetches the versioned runtime and stylesheet from GitHub Pages, mounts into Shadow DOM and keeps the consuming site's CSS isolated from the art.

Published assets:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

With the default `data-surface="auto"`, a light-themed foreground-only colour embed deliberately uses the dark surface for readability. Background-coloured/full-colour embeds follow the light surface normally. A site author can force `data-surface="light"`, but should be aware that some foreground colours may then become difficult to see.

See [Embedding](docs/embed.md).

## Terminal viewer

```bash
cc -std=c11 -Wall -Wextra -Wpedantic -Werror extras/term/unicode-colour-view.c -o unicode-colour-view
./unicode-colour-view image.txt
```

## API

```ts
import { makeArt, packEmbed, unpackEmbed, taggedText, vectorStage } from "@kitty-crow/unicode-art-maker";
```

## Project layout

```text
src/core/        Unicode signal, tone, dithering and packing
src/colour/      colour sampling, full-colour cells and TXT/ANSI tags
src/vector/      Vectoriser adapter and SVG rasterisation
src/html/        dense HTML output
src/embed/       packed embed codec, generator and browser runtime
src/web/         browser behaviour
src/cli/         CLI parsing and output
templates/embed/ paste-ready embed host, CSS and loader
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
- [Embedding](docs/embed.md)
- [Design](docs/design.md)
- [Web app](docs/web.md)

## Author

Kitty Crow  
https://kittycrow.dev

## Licence

[MIT](LICENSE)
