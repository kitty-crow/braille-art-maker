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

The browser app supports PNG upload, live Unicode preview, dithering, monochrome or colour output, TXT/HTML/SVG downloads, paste-ready CDN embeds and a draggable PNG/Unicode hero comparison. The top navigation remains pinned while the page scrolls. Resolutions above 256 cells are explicitly experimental because browser rendering, memory use and embed generation become much heavier.

The Resolution slider runs from 24 through 2048 horizontal Unicode cells. Pointer dragging has deliberate resistance gates at 256, 765 and 1024 cells. The 256 gate marks the experimental range; 765 marks extreme territory; the 1K gate warns **“1K? Are nya crazy?! I’d hate to be your RAM right meow!”**. The slider itself ends at 2048 because that is the highest range confirmed to work reliably in real-device testing.

The numerical Resolution field is intentionally not capped at 2048. A user may type a larger integer such as 8192 or 10240; committing a value above the slider ceiling requires a native Yes/No confirmation that explicitly warns the request is unsupported and may crash the tab. If confirmed, the exact requested value is passed to the engine without a hidden clamp. This is an at-your-own-risk escape hatch, not an endorsed operating range. The CLI/core likewise do not impose an arbitrary upper resolution clamp.

The hero starts in **Colour** at 256 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. **Full Colour** starts off. Turning hero colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome at the original slider defaults with Ordered 4x4. Its colour UI deliberately has only two controls: **Colour** is foreground-only colour on the normal Unicode mask, while **Full Colour** enables the adaptive two-colour foreground/background representation. There is no separate background-only mode in the browser UI. Enabling Colour keeps the slider values, switches the dither control to Atkinson and starts with Full Colour off.

The canvas control is the first checkbox. It reads **Dark canvas** in light mode and forces a dark preview surface when enabled; in dark mode it reads **Light canvas** and forces a light preview surface when enabled. Once changed manually, the maker keeps the actual selected surface across later theme/colour changes. Changing the canvas also aligns Invert with that surface; Invert remains manually adjustable afterward.

**Reset sliders** restores only Resolution, Contrast, Detail and Threshold bias to 96, 1.12, 0.34 and +0.015. It leaves Colour/Full Colour, dither, canvas and polarity untouched.

The latest completed maker result is persisted locally in IndexedDB so a refresh does not need to regenerate the Unicode art or re-encode its embed. The art is stored as the same compact lossless binary representation used by the high-resolution worker path, and the finished embed is stored as a Blob. The source/configuration are retained so editing can resume after restoration. This cache is version-scoped and does **not** store the live high-resolution `Art` object graph or use IndexedDB as the worker transport path.

Browser TXT, HTML and SVG downloads are named `kitty-crow-github-io-unicode-art-maker-{sha256}.{ext}`, where the SHA-256 is calculated from the exact full downloadable bytes.

The displayed embed fragment is rendered as an HTML code block through Marked, DOMPurify and Highlight.js, using the same pinned CDN versions as the shared Pages README renderer. Embed generation runs in a Worker. While it is running the maker shows **Generating embed** and an **Encoding art…** progress bar; the progress UI is hidden automatically when encoding reaches 100%.

Colour modes exposed by the browser maker:

- **Colour** — foreground colour follows the normal Unicode mask
- **Full Colour** — each 2x4 source cell can use adaptive foreground and background colour groups

The lower-level `colourBackground` configuration and legacy `--colour-background` CLI flag remain accepted for backwards compatibility, but the redundant background-only mode is no longer presented by the browser maker.

## CLI

```bash
bun run cli -- image.png
bun run cli -- image.png --colour -o image.txt
bun run cli -- image.png --full-colour --html -o image.html
bun run cli -- image.png --full-colour --ansi
bun run cli -- image.png --colour --embed -o image-embed.html
```

Useful options:

```text
--columns <n>          Unicode columns, 8+, default 96; >256 experimental
--dither <mode>        atkinson|floyd|ordered|threshold, default ordered
--invert               inverted polarity, default
--no-invert            disable inverted polarity
--colour               foreground colour tags
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

The CLI does not impose the browser slider's 2048-cell ceiling. Very large resolutions can require enormous memory and are intentionally left to the caller's judgement. The older `--colour-background` flag remains accepted for compatibility but is no longer a recommended/documented colour mode.

## Embedding

The maker's **Copy embed div** output carries the generated result itself, so the original PNG does not need to be uploaded or hosted. New embeds use the lossless `u4` codec.

`u4` is an optimiser. It tries exact mask representations including direct, left/up/Paeth prediction, modular deltas and bit-plane shuffling. For colour it tries exact pair palettes, bit-packed RGB palettes, RGB spatial residuals and reversible YCoCg residuals. It also keeps the complete `u3` representation family in the search.

Every candidate is considered raw and with maximum DEFLATE. The strongest candidates are also tested with Brotli quality 11; the previous `u3` family is always tested with Brotli 11. The actual shortest final payload wins. Small and medium results search more candidates than very large results so encoding remains computationally sensible.

The final bytes use a safe basE91 transport. Brotli is the implicit/default transport with no extra marker; raw or DEFLATE are selected only when their complete encoded payload is genuinely shorter. Browser encoding runs in a dedicated Worker, so the expensive search does not block the maker UI.

New copied embeds contain only the readable outer host attributes, one self-identifying single-line payload script and one loader script. The repeated Shadow DOM template, stylesheet link and API URL are no longer copied into every fragment: `embed.js` reconstructs the internal scaffold and stylesheet, while `load.js` derives the API URL from its own URL. The decoder remains part of this repository and is bundled into the published runtime.

The CDN runtime remains backwards-compatible with the previous explicit template/data-codec form and with `u1`, `u2` and `u3` payloads.

Literal base256/base512 text encodings are not used because their non-ASCII code points take multiple bytes in UTF-8 HTML and make the transferred fragment larger rather than smaller.

Published assets:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

With the default `data-surface="auto"`, a light-themed foreground-only Colour embed deliberately uses the dark surface for readability. Full Colour embeds follow the light surface normally. A site author can force `data-surface="light"`, but should be aware that some foreground colours may then become difficult to see.

See [Embedding](docs/embed.md).

## Terminal viewer

```bash
cc -std=c11 -Wall -Wextra -Wpedantic -Werror extras/term/unicode-colour-view.c -o unicode-colour-view
./unicode-colour-view image.txt
```

## API

```ts
import {
  embedCodec,
  makeArt,
  packEmbedSmall,
  taggedText,
  unpackEmbedSmall,
  vectorStage,
} from "@kitty-crow/unicode-art-maker";
```

## Project layout

```text
src/core/        Unicode signal, tone, dithering and packing
src/colour/      colour sampling, full-colour cells and TXT/ANSI tags
src/vector/      Vectoriser adapter and SVG rasterisation
src/html/        dense HTML output
src/embed/       packed/compressed embed codec, generator and browser runtime
src/web/         browser behaviour, IndexedDB cache and embed worker
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