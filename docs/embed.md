# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

The embed carries the generated result itself. The source PNG does not need to be hosted or sent anywhere after conversion.

## Payload

New embeds use the lossless `u3` codec. Before compression, the encoder tries several exact representations of the same art:

- direct, left-predicted and up-predicted 8-bit Unicode masks
- run-packed mask streams
- legacy RGB state streams
- exact RGB palettes with compact indices
- exact left-predicted and up-predicted RGB deltas

Each candidate is compressed with Brotli quality 11. The smallest actual Brotli result wins, then the compressed bytes are transported as a safe ASCII base85 string. Encoding is intentionally more expensive than decoding because embed size is prioritised.

Only the art payload is packed, compressed and encoded. The surrounding `<div>`, Shadow DOM `<template>`, stylesheet link, loader, API script reference, theme and surface settings remain plain readable HTML.

The runtime still decodes `u1` and `u2`, so previously copied embeds continue to work.

Base256/base512 text encodings are not used because non-ASCII code points take multiple bytes in UTF-8 HTML. A safe ASCII transport is smaller in transferred HTML.

## Browser

The maker generates the compact embed after the live Unicode preview has updated, so the heavier encoder does not block slider interaction. The visible fragment is rendered through Marked, sanitised with DOMPurify and syntax-highlighted with Highlight.js using the same pinned CDN versions as the shared Pages README renderer.

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
