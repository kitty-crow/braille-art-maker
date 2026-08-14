# Embedding

GitHub Pages publishes the browser embed assets at:

```text
https://kitty-crow.github.io/braille-art-maker/v1/embed.js
https://kitty-crow.github.io/braille-art-maker/v1/embed.css
https://kitty-crow.github.io/braille-art-maker/v1/load.js
```

The embed carries the already-generated Unicode result, including colour tags, so an uploaded PNG does not need to be hosted or sent anywhere after conversion.

## Browser

The maker shows a paste-ready embed div and provides **Copy embed div**. The fragment contains:

- generated Unicode text and dimensions as JSON data
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
