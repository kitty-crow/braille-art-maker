# Unicode Art Studio

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

The studio starts monochrome at the original slider defaults with Ordered 4x4. Its colour UI deliberately has only two controls: **Colour** is foreground-only colour on the normal Unicode mask, while **Full Colour** enables the adaptive two-colour foreground/background representation. There is no separate background-only mode in the browser UI. Enabling Colour keeps the slider values, switches the dither control to Atkinson and starts with Full Colour off.

The canvas control is the first checkbox. It reads **Dark canvas** in light mode and forces a dark preview surface when enabled; in dark mode it reads **Light canvas** and forces a light preview surface when enabled. Once changed manually, the studio keeps the actual selected surface across later theme/colour changes. Changing the canvas also aligns Invert with that surface; Invert remains manually adjustable afterward.

**Reset sliders** restores only Resolution, Contrast, Detail and Threshold bias to 96, 1.12, 0.34 and +0.015. It leaves Colour/Full Colour, dither, canvas and polarity untouched.

The latest completed studio result is persisted locally in IndexedDB so a refresh does not need to regenerate the Unicode art or re-encode its embed. The art is stored as the same compact lossless binary representation used by the high-resolution worker path, and the finished embed is stored as a Blob. The source/configuration are retained so editing can resume after restoration. This cache is version-scoped and does **not** store the live high-resolution `Art` object graph or use IndexedDB as the worker transport path.

Browser TXT, HTML and SVG downloads are named `kitty-crow-github-io-unicode-art-studio-{sha256}.{ext}`, where the SHA-256 is calculated from the exact full downloadable bytes.

The displayed embed fragment is rendered as an HTML code block through Marked, DOMPurify and Highlight.js, using the same pinned CDN versions as the shared Pages README renderer. Embed generation runs in a Worker. While it is running the studio shows **Generating embed** and an **Encoding art…** progress bar; the progress UI is hidden automatically when encoding reaches 100%.

Colour modes exposed by the browser studio:

- **Colour** — foreground colour follows the normal Unicode mask
- **Full Colour** — each 2x4 source cell can use adaptive foreground and background colour groups

The lower-level `colourBackground` configuration and legacy `--colour-background` CLI flag remain accepted for backwards compatibility, but the redundant background-only mode is no longer presented by the browser studio.

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

The studio's **Copy embed** output carries the generated result itself, so the original PNG does not need to be uploaded or hosted. New embeds use the lossless `u4` codec.

The embed code box has **Compact** and **No JavaScript** tabs. Compact is the normal small runtime-backed embed. No JavaScript is generated lazily only when selected and expands the finished payload into literal Unicode plus inline CSS with no `<script>`, external stylesheet, external asset or network fetch; the copy button copies whichever tab is selected. The static form is intentionally much more verbose and, because it cannot measure font metrics at runtime, favours portability over the compact embed's calibrated cell geometry.

### Compact payload modes

Compact has one optional checkbox: **Payload as a story**.

There are two lossless ways to represent the selected compressed bytes:

- **Super compact** is the default. It is designed to minimise visible source/clipboard character count.
- **Payload as a story**, also described as the **light-novel encoding**, stores those same bytes as deterministic reversible Japanese prose.

The two modes do not change the artwork and do not choose different image content. They are text transports for the same packed image data, selected after the normal lossless `u4` optimisation.

#### Super compact encoding

With **Payload as a story** off, Compact uses the super-compact `u4` transport. The optimiser compares safe basE91 with **J8192**, a 13-bit Japanese-oriented alphabet of exactly 8,192 normalisation-stable BMP characters built from Hiragana, Katakana, Japanese punctuation and Japanese JIS-mapped unified ideographs. It chooses the shortest character count. For substantial payloads J8192 is roughly half the basE91 character count.

J8192 can look Japanese because its alphabet is made of Japanese-script and Japanese-mapped characters, but it is **not Japanese prose and it does not describe the image**. Each symbol is simply a dense reversible carrier for 13 payload bits, conceptually similar to a high-capacity base encoding.

#### Payload as a story / light-novel encoding

With **Payload as a story** checked, the same compressed image bytes are encoded as deterministic Japanese prose instead. The prose is not a preview or decoration: the sentence templates, people, places, objects, verbs and other lexical choices are mixed-radix digits carrying the payload itself. Decoding those choices reconstructs the exact compressed bytes and therefore the exact image. Editing the story changes or corrupts the encoded image.

The phrase **light-novel encoding** describes the style of the resulting Japanese text. It does **not** mean an AI looks at the PNG and writes a story about it. The encoder deterministically selects grammatical templates and words because every choice represents part of the binary value. The surreal prose is therefore simultaneously readable-looking text and the actual reversible data representation.

Story mode is intentionally larger than super-compact mode because natural Japanese needs grammatical material that carries less information per visible character. The payoff is that the payload reads like surreal light-novel prose instead of looking like an encoded blob. The complete story remains a **single physical line** inside `data-unicode-art-data`; normal browser wrapping does not add payload newlines.

The story grammar and lexicon are bundled locally as XML. Story encoding and decoding do not fetch a corpus, call an API or depend on a CDN corpus at runtime. Large story payloads are encoded in bounded 256-byte chapters joined by a fixed Japanese chapter transition. Each chapter uses only a bounded `BigInt`, avoiding the unbounded single-`BigInt` memory failure that very large payloads would otherwise hit while preserving one-line reversible output.

Both Compact payload modes decode through the same `u4` runtime and produce the same artwork. The checkbox changes only how the compact payload is represented.

`u4` is an optimiser. It tries exact mask representations including direct, left/up/Paeth prediction, modular deltas and bit-plane shuffling. For colour it tries exact pair palettes, bit-packed RGB palettes, RGB spatial residuals and reversible YCoCg residuals. It also keeps the complete `u3` representation family in the search.

Every candidate is considered raw and with maximum DEFLATE. The strongest candidates are also tested with Brotli quality 11; the previous `u3` family is always tested with Brotli 11. Small and medium results search more candidates than very large results so encoding remains computationally sensible.

The J8192 encoder/decoder is simple linear bit packing. Brotli remains the expensive part of super-compact embed generation. Existing CJK-4096 `u4` payloads from 0.4.28, J8192 payloads from 0.4.29 and older basE91 `u4` payloads remain fully decodable. Browser encoding runs in a dedicated Worker, so the expensive search does not block the studio UI.

New copied embeds contain only the readable outer host attributes, one self-identifying single-line payload script and one loader script. The repeated Shadow DOM template, stylesheet link and API URL are no longer copied into every fragment: `embed.js` reconstructs the internal scaffold and stylesheet, while `load.js` derives the API URL from its own URL. The decoder remains part of this repository and is bundled into the published runtime.

The CDN runtime remains backwards-compatible with the previous explicit template/data-codec form and with `u1`, `u2`, `u3`, previous basE91 `u4` payloads, the 0.4.28 CJK-4096 transport, the 0.4.29 J8192 transport and the original 0.4.35 story payload format.

Published assets:

```text
https://kitty-crow.github.io/unicode-art-studio/v1/embed.js
https://kitty-crow.github.io/unicode-art-studio/v1/embed.css
https://kitty-crow.github.io/unicode-art-studio/v1/load.js
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
} from "@kitty-crow/unicode-art-studio";
```

## Project layout

```text
src/core/        Unicode signal, tone, dithering and packing
src/colour/      colour sampling, full-colour cells and TXT/ANSI tags
src/vector/      Vectoriser adapter and SVG rasterisation
src/html/        dense HTML output
src/embed/       packed/compressed embed codec, generator and browser runtime
src/web/         browser studio behaviour, IndexedDB cache and embed worker
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
