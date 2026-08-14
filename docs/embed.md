# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

The embed carries the already-generated result, so an uploaded PNG does not need to be hosted or sent anywhere after conversion.

## Packed payload

New embeds use the versioned `u2` codec rather than literal Unicode/tagged TXT.

The encoder:

- maps every Unicode cell back to its single 8-bit dot mask
- run-length packs repeated masks without expanding high-entropy regions
- stores foreground/background colour changes as compact state streams
- stores dimensions and colour-mode flags in the binary header
- losslessly DEFLATE-compresses that packed binary
- serialises only that compressed payload as base64url

Only the art payload is compressed and encoded. The surrounding embed `<div>`, Shadow DOM `<template>`, stylesheet link, loader and API script references remain plain readable HTML. The encoder and decoder remain normal TypeScript source in `src/embed/codec.ts`.

The `u2` decoder is bundled into `/v1/embed.js`. That runtime also retains `u1` decoding, so embeds copied from 0.4.5 continue to render after the CDN runtime updates.

Base256/base512 Unicode encodings are not used because non-ASCII code points take two or more bytes in UTF-8 HTML. They therefore expand the binary payload despite using fewer visible characters.

## Browser

The maker shows a paste-ready embed div and provides **Copy embed div**. The visible code block is rendered through Marked, sanitised with DOMPurify and syntax-highlighted with Highlight.js using the same pinned CDN versions as the shared Pages README renderer.

The fragment contains:

- one compact DEFLATE + base64url `u2` payload
- theme and surface settings
- an internal Shadow DOM template
- links to the versioned stylesheet, loader and bundled API

The consuming site controls the size and position of the outer div. The embed runtime owns the internal geometry and colours.

## Foreground-only colour on light pages

A foreground-only colour image can become difficult to read on a light surface. With `data-surface="auto"`, the embed therefore uses the dark surface whenever all of these are true:

- the resolved theme is light
- colour is enabled
- background colour is not enabled
- full colour is not enabled

This is only a presentation surface; it does not add background colours to the Unicode cells.

A consuming site can deliberately opt back into a light surface:

```html
<div data-unicode-art data-surface="light" ...>
```

or through the API:

```js
UnicodeArt.mount(host, { surface: "light" })
```

The site author should only do this when the chosen foreground colours remain readable on a light background.

## CLI

```bash
bun run cli -- image.png --embed
bun run cli -- image.png --colour --embed -o image-embed.html
```

Use a different published API location:

```bash
bun run cli -- image.png --embed --embed-src "https://example.com/unicode-art/embed.js"
```

The CLI derives sibling `embed.css` and `load.js` URLs from the supplied API URL.

Theme and surface can be controlled independently:

```text
--embed-theme auto|light|dark
--embed-surface auto|light|dark
```

A consuming site may also change `data-theme` or `data-surface` on the host div after mounting; the runtime observes those attributes and rerenders.

## Runtime

The versioned API exposes:

```js
window.UnicodeArt.mount(host, { theme: "auto", surface: "auto" })
```

The tiny `load.js` bootstrap loads the API once per page and mounts each host. Rendering happens in Shadow DOM and uses the same measured Unicode-cell geometry as the main app.
