# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/unicode-art-studio/v1/embed.js
https://kitty-crow.github.io/unicode-art-studio/v1/embed.css
https://kitty-crow.github.io/unicode-art-studio/v1/load.js
```

The embed carries the generated result itself. The source PNG does not need to be hosted or sent anywhere after conversion.

## Payload

New embeds use the lossless `u4` codec. It searches exact alternatives instead of assuming one representation will always compress best.

Mask candidates include direct bytes, left/up/Paeth prediction, modular deltas and bit-plane shuffling. Colour candidates include exact foreground/background pair palettes, bit-packed RGB palettes, spatial RGB residuals and reversible YCoCg residuals. The complete `u3` candidate family remains in the search as a fallback.

Every candidate is tested raw and with maximum DEFLATE. The strongest candidates are also tested with Brotli quality 11, and all `u3` candidates are always tested with Brotli 11. Small and medium art searches more Brotli candidates than very large art so the browser cost stays bounded.

Compact has two lossless ways to write the selected compressed bytes. **Super compact** is optimised for the shortest source/clipboard character count. **Payload as a story**, also described as the light-novel encoding, writes those same bytes as reversible Japanese prose. These are transport representations only: switching between them does not rerender, revectorise or otherwise change the artwork.

### Super compact

The default Compact payload compares two text transports for each binary candidate. The established basE91 transport remains available and is the byte-efficient ASCII form. **J8192** maps each 13 bits to one of exactly 8,192 normalisation-stable BMP characters drawn from Hiragana, Katakana, Japanese punctuation and Japanese JIS-mapped unified ideographs. A small explicit marker records compression mode and the final 0–12 meaningful tail bits so arbitrary binary payloads round-trip exactly.

The optimiser chooses the shortest JavaScript/clipboard character count, not the fewest UTF-8 bytes. J8192 therefore normally wins for non-trivial payloads because it carries 13 bits per character versus roughly 6.5 bits per basE91 character. Encoding and decoding are linear bit packing/unpacking; Brotli remains the expensive part.

J8192 may look Japanese, but it is not prose and it does not describe the image. Its characters are a dense reversible alphabet carrying binary bits, much like a higher-capacity textual base encoding.

### Payload as a story (light-novel encoding)

The Studio's Compact panel includes **Payload as a story**. When checked, the exact same compressed image bytes are encoded as deterministic Japanese prose instead of basE91/J8192.

The prose is the payload. Grammar-template selection and the selected people, places, objects, verbs and other lexical choices are mixed-radix digits. Decoding those choices reconstructs the exact compression mode and exact byte stream before normal `u4` unpacking. The payload remains one physical line inside `data-unicode-art-data`; changing the prose changes or corrupts the image.

"Light-novel encoding" is a description of the resulting style, not an AI interpretation of the PNG. No model looks at the picture and writes a story about it. The encoder deterministically chooses grammatical templates and words because each choice carries part of the binary value. The resulting surreal prose is therefore both readable-looking text and the actual reversible data representation.

The grammar and lexicon are bundled locally as XML. Story mode performs no corpus fetch and calls no corpus API. It is intentionally larger than super-compact mode because grammatical Japanese carries fewer payload bits per visible character.

Large story payloads use bounded chapters. At most 256 framed bytes are converted to any one `BigInt`, then the resulting Japanese chapters are joined by a fixed Japanese transition phrase. This avoids the unbounded whole-payload `BigInt` allocation that previously failed on very large images while keeping the complete payload single-line and reversible. The decoder also accepts the original 0.4.35 whole-payload story format.

### Compatibility

Old `u4` payloads remain valid. Unmarked Brotli basE91 and the existing `&r` / `&d` basE91 forms decode exactly as before. The 0.4.28 CJK-4096 transport with uppercase `&R`, `&D` or `&B` markers remains decodable, and J8192 `&J`, `&K` and `&L` payloads remain decodable.

New fragments keep only the outer host configuration, one self-identifying payload script and one loader script in the copied HTML. The Shadow DOM scaffold and stylesheet link are reconstructed by `embed.js`, and `load.js` derives the API URL from its own URL. Static template markup is therefore not repeated in every embed.

The runtime still accepts the previous explicit `<template>` / `data-codec` form and still decodes `u1`, `u2`, `u3`, previous basE91 `u4`, CJK-4096, J8192 and original story payloads, so previously copied embeds continue to work.

Tests verify that the complete J8192 alphabet is unchanged by NFC, NFD, NFKC and NFKD normalisation; the legacy CJK-4096 normalisation tests remain in place as well.

## Browser

The Studio performs `u4` optimisation in a dedicated Web Worker after the live Unicode preview has updated. A progress bar reports the optimisation search while the worker evaluates candidates, so the heavier encoder stays visible without blocking slider interaction. Changing **Payload as a story** regenerates only the embed; it does not rerender or revectorise the artwork.

The visible fragment is rendered through Marked, sanitised with DOMPurify and syntax-highlighted with Highlight.js using the same pinned CDN versions as the shared Pages README renderer.

The consuming site controls the size and position of the outer div. Rendering is isolated in Shadow DOM.

## Foreground-only colour on light pages

With `data-surface="auto"`, a foreground-only colour embed uses the dark surface when the resolved theme is light. This keeps foreground colours readable without adding background colours to the art itself.

A site can deliberately force a light surface:

```html
<div data-unicode-art data-surface="light" ...>
```

or:

```js
UnicodeArt.mount(host, { surface: "light" })
```

Some foreground colours may then be difficult to see.

## CLI

```bash
bun run cli -- image.png --embed
bun run cli -- image.png --colour --embed -o image-embed.html
```

Use a different published API location:

```bash
bun run cli -- image.png --embed --embed-src "https://example.com/unicode-art/embed.js"
```

Theme and surface options:

```text
--embed-theme auto|light|dark
--embed-surface auto|light|dark
```

The runtime observes `data-theme` and `data-surface`, so either can be changed after mounting.

## Runtime

```js
window.UnicodeArt.mount(host, { theme: "auto", surface: "auto" })
```

The small `load.js` bootstrap derives and loads the API once per page and mounts each host. The runtime decodes the payload, creates the Shadow DOM scaffold, loads the shared embed stylesheet and uses measured Unicode-cell geometry.
