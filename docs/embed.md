# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

The embed carries the generated result itself. The source PNG does not need to be hosted or sent anywhere after conversion.

## Payload

New embeds use the lossless `u4` codec. It searches exact alternatives instead of assuming one representation will always compress best.

Mask candidates include direct bytes, left/up/Paeth prediction, modular deltas and bit-plane shuffling. Colour candidates include exact foreground/background pair palettes, bit-packed RGB palettes, spatial RGB residuals and reversible YCoCg residuals. The complete `u3` candidate family remains in the search as a fallback.

Every candidate is tested raw and with maximum DEFLATE. The strongest candidates are also tested with Brotli quality 11, and all `u3` candidates are always tested with Brotli 11. The shortest actual encoded payload wins. Small and medium art searches more Brotli candidates than very large art so the browser cost stays bounded.

The final bytes use safe ASCII basE91. Brotli is the implicit transport and therefore costs no marker byte; raw or DEFLATE carry a tiny marker only when they are genuinely shorter.

Only the art payload is packed, compressed and encoded. The surrounding `<div>`, Shadow DOM `<template>`, stylesheet link, loader, API script reference, theme and surface settings remain plain readable HTML.

The runtime still decodes `u1`, `u2` and `u3`, so previously copied embeds continue to work.

Base256/base512 text encodings are not used because non-ASCII code points take multiple bytes in UTF-8 HTML. A safe single-byte ASCII transport is smaller in transferred HTML.

## Browser

The maker performs `u4` optimisation in a dedicated Web Worker after the live Unicode preview has updated. The expensive encoder therefore does not block slider interaction. Decoding remains fast in the normal CDN runtime.

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

The small `load.js` bootstrap loads the API once per page and mounts each host. The runtime decodes the payload, renders in Shadow DOM and uses measured Unicode-cell geometry.
