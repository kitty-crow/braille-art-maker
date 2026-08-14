# Dependencies and vendor boundaries

Braille Art Maker deliberately separates project code from reusable upstream components.

## Git submodules

### `vendor/pages`

Repository: `kitty-crow/github-pages-template`

Purpose:

- static Pages build
- clean routes
- theme/runtime helpers
- README page support
- version display
- shared neutral shell behaviour

Braille Art Maker keeps all project-specific UI, CSS, conversion code and content outside this submodule.

### `vendor/vectoriser`

Repository: `kitty-crow/vectoriser`

Purpose:

- convert decoded PNG/RGBA input into deterministic path-only SVG
- expose the same vectorisation implementation to browser and Bun callers

Braille Art Maker does not copy Vectoriser's web GUI. The dependency is consumed as code.

The SVG is a real intermediate representation in the conversion pipeline. It must not be generated only for display while the Braille algorithm quietly analyses the original pixels instead.

### `vendor/braille-qr`

Repository: `kitty-crow/braille-qr`

Purpose in this project:

- measured Unicode Braille cell geometry
- dense per-character HTML layout technique
- optional ink thickening helper

Out of scope:

- QR encoding
- QR-specific padding or finder-pattern behaviour
- QR-specific CLI/application flow

The important reuse is how Braille QR makes Unicode glyphs visually dense enough to resemble a continuous image.

## npm dependencies

Runtime packages should be kept small and justified by a runtime boundary that is awkward to implement correctly from scratch.

### `pngjs`

Used by the Bun CLI to decode PNG data. The browser uses native browser image decoding instead.

### `@resvg/resvg-js`

Used where a Bun/native runtime needs a robust SVG rasteriser. It is an upstream rendering primitive, not a source of Braille conversion policy.

## What belongs in Braille Art Maker

The following behaviour is project-owned and should not be delegated to Vertopal or a remote conversion service:

- target Braille sizing
- alpha/background handling
- luminance/ink signal generation
- contrast stretch
- detail recovery
- threshold policy
- Atkinson/Floyd-Steinberg/ordered halftoning
- 2 x 4 Unicode packing
- browser controls and preview state
- hero before/after interaction
- export composition

## Pinning

All git submodules should be pinned to explicit commit SHAs. Updating a dependency is a normal reviewed repository change, not an implicit pull from whatever happens to be on the dependency's `main` branch at build time.

CI must check out submodules recursively.

## Licensing

Braille Art Maker is MIT licensed. Dependencies retain their own licences. The repository should keep attribution and avoid copying code across license boundaries when a direct dependency can be used instead.
