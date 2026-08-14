# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

The embed carries the generated result itself. The source PNG does not need to be hosted or sent anywhere after conversion.

## Payload

New embeds use the lossless `u4` codec.

Through 256 columns, `u4` searches exact alternatives instead of assuming one representation will always compress best. Mask candidates include direct bytes, left/up/Paeth prediction, modular deltas and bit-plane shuffling. Colour candidates include exact foreground/background pair palettes, bit-packed RGB palettes, spatial RGB residuals and reversible YCoCg residuals. The complete `u3` candidate family remains in the search as a fallback.

Above 256 columns, `u4` switches to a bounded-memory exact path. One lossless packed representation is evaluated as raw, maximum-DEFLATE and Brotli quality 11, and the shortest complete transport wins. The high-resolution path deliberately avoids materialising dozens of full-size candidates and therefore also avoids large JavaScript spread/argument-list operations. The representation remains lossless: every Unicode mask and colour value is preserved.

The final bytes use safe ASCII basE91. Brotli is the implicit transport and therefore costs no marker byte; raw or DEFLATE carry a tiny marker only when they are genuinely shorter.

New fragments keep only the outer host configuration, one self-identifying payload script and one loader script in the copied HTML. The Shadow DOM scaffold and stylesheet link are reconstructed by `embed.js`, and `load.js` derives the API URL from its own URL. Static template markup is therefore not repeated in every embed.

The runtime still accepts the previous explicit `<template>` / `data-codec` form and still decodes `u1`, `u2` and `u3`, so previously copied embeds continue to work.

Base256/base512 text encodings are not used because non-ASCII code points take multiple bytes in UTF-8 HTML. A safe single-byte ASCII transport is smaller in transferred HTML.

## Browser

The maker performs `u4` optimisation in a dedicated Web Worker after the live Unicode preview has updated. For outputs above 256 columns, the heavy `Art` object is first persisted to IndexedDB and released from the main-page state. The Worker reads that art directly from IndexedDB instead of receiving a structured-clone copy of the entire high-resolution colour-object graph.

A progress bar reports optimisation while the worker runs, so encoding remains visible without blocking slider interaction.

Normal-sized visible fragments are rendered through Marked, sanitised with DOMPurify and syntax-highlighted with Highlight.js using the same pinned CDN versions as the shared Pages README renderer. Very large fragments are kept as one plain `<pre><code>` text node to avoid multiplying memory through Markdown parsing, sanitisation and tokenised highlighting.

The consuming site controls the size and position of the outer div. Rendering is isolated in Shadow DOM.

## Runtime rendering

Embeds remain real Unicode text. The runtime does not rasterise the payload, draw it into a canvas or replace it with an image.

The decoded result is rendered one Unicode text row at a time instead of one DOM element per cell. Monochrome rows are plain Unicode text. For colour art, each row still contains the exact Unicode characters; exact per-cell foreground/background paint is represented by sharp CSS gradients aligned to Unicode-cell boundaries. This reduces the DOM from potentially hundreds of thousands of cell spans to roughly one row and one text child per output row.

After those rows have been constructed, the runtime keeps only dimensions and surface state rather than retaining the decoded high-resolution colour-object payload. Theme/surface changes update CSS variables directly and do not require a full payload re-decode.

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
