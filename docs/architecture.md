# Architecture

Braille Art Maker is a static browser application, Bun CLI and reusable TypeScript core for converting raster images into dense Unicode Braille art.

## Design goals

- Keep the conversion deterministic and local. The browser never needs to upload an image to a server.
- Use `kitty-crow/vectoriser` as the real PNG/RGBA to path-only SVG stage rather than duplicating its vectorisation logic.
- Reuse the dense Unicode rendering technique developed in `kitty-crow/braille-qr` without importing QR-specific behaviour into this project.
- Keep GitHub Pages concerns in the pinned `github-pages-template` dependency.
- Keep the actual image analysis, tone mapping, detail recovery, halftoning and Braille packing in this repository.
- Preserve a single conversion model across browser, CLI and library entry points.

## Pipeline

```text
PNG / RGBA
    |
    v
Vectoriser
path-only SVG
    |
    v
SVG rasteriser
Braille dot-grid RGBA
    |
    v
alpha-aware luminance
    |
    +--> contrast stretch
    +--> detail recovery
    +--> bias / polarity
    |
    v
halftone / threshold
boolean dot matrix
    |
    v
2 x 4 Unicode packing
Braille text
    |
    +--> plain text / TXT
    +--> dense browser preview
    +--> self-contained HTML
```

The SVG stage is intentional. It is not generated and ignored. The image that reaches the Braille analysis stage is derived from the vectorised scene.

## Packages and boundaries

### `vendor/vectoriser`

Provides the path-only SVG representation. Braille Art Maker does not copy Vectoriser's browser interface and does not maintain a second vectorisation algorithm.

For comparison-hero work the full source canvas is preserved, so transparent margins remain coordinate-stable between the original PNG and Braille result. Cropping can still be exposed as an explicit conversion option.

### `vendor/braille-qr`

Provides the rendering ideas needed to make normal Unicode Braille appear image-dense in HTML:

- measure the actual rendered width of `⣿`
- make one layout cell exactly that width
- make a row exactly twice that height
- disable ligatures and synthetic font behaviour
- allow glyph ink to overflow the tiny layout box
- optionally thicken ink with a controlled text shadow

QR generation itself is outside this project's architecture.

### `vendor/pages`

Provides the generic Pages build/runtime, theme support, clean routes, README renderer, version display and shared shell behaviour. Project-specific HTML, CSS and application logic remain local.

## Core modules

The intended core is deliberately small:

- `types` defines image, conversion and result shapes.
- `luminance` composites transparency and produces a perceptual intensity signal.
- `tone` performs percentile contrast stretch and local detail recovery.
- `dither` implements deterministic threshold/halftone modes.
- `braille` packs 2 x 4 boolean dots into U+2800..U+28FF.
- `art` coordinates the previous stages and returns text plus dimensions/metadata.
- `html` produces standalone dense Unicode output.

Browser PNG decoding, SVG rendering, file download and UI state are adapters around that core rather than being embedded in it.

## Browser worker

Vectorisation and conversion are suitable for a worker because palette generation, SVG construction and halftoning can be expensive for large source images. The UI should remain responsive while a new preview is generated.

A conversion message contains decoded RGBA and the selected options. The response contains the generated Braille text, cell dimensions and optional SVG/debug metadata.

## Hero comparison

The hero uses a registered before/after composition:

- one square contains both layers
- original PNG occupies the left/source layer
- generated Braille occupies the right/result layer
- a vertical handle runs from top to bottom
- the reveal starts at 50%
- dragging changes only the horizontal clip boundary
- the two layers never independently resize or reposition

The handle is pointer, touch and keyboard accessible.

## CLI

The CLI performs the same conceptual stages as the browser:

1. decode PNG
2. call the pinned Vectoriser core
3. rasterise the SVG at the requested Braille dot resolution
4. pass pixels through the shared art core
5. emit text or self-contained HTML

The CLI may additionally save the intermediate SVG for diagnostics.

## Static deployment

GitHub Pages cannot execute a Bun CLI in a visitor's browser. The browser bundle therefore imports the same vendored TypeScript cores directly. The CLI is a separate entry point for local/server use, but conversion policy is shared rather than reimplemented.
