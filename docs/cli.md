# CLI and library

Braille Art Maker exposes the same conversion model outside the browser for local scripting, tests and batch workflows.

## CLI

From a checkout:

```bash
bun src/cli.ts image.png
```

After building/installing the package:

```bash
braille-art image.png
```

Typical options:

```bash
braille-art image.png --columns 96
braille-art image.png --columns 120 --dither atkinson
braille-art image.png --dither floyd-steinberg
braille-art image.png --html -o image.html
braille-art image.png --svg intermediate.svg -o image.txt
braille-art image.png --crop
```

## Processing stages

The CLI does not use a separate image-to-Braille implementation. It should:

1. decode the PNG to RGBA
2. invoke the pinned Vectoriser core
3. optionally save the generated SVG
4. rasterise that SVG to the requested Braille dot grid
5. invoke the shared Braille Art Maker core
6. emit Unicode text or dense HTML

`--crop` changes the Vectoriser stage. Without it, the full source canvas is preserved so coordinates remain stable.

## Exit behaviour

A successful conversion exits with status 0. Invalid arguments, unreadable input, unsupported PNG data, vectorisation failure or output-write failure should produce a concise error on stderr and a non-zero exit status.

The CLI should not silently fall back to a different algorithm if Vectoriser fails.

## Library

The reusable core starts from RGBA pixels that have already reached the intended Braille dot-grid resolution:

```ts
import { makeArt } from "@kitty-crow/braille-art-maker";

const result = makeArt(
  { width, height, data: rgba },
  {
    contrast: 1.08,
    detail: 0.22,
    bias: 0.03,
    dither: "atkinson",
    polarity: "dark"
  }
);

console.log(result.text);
```

The result should include at least:

- `text`
- Braille column count
- Braille row count
- dot-grid width/height
- effective threshold/settings metadata where useful for diagnostics

## Why decoding/vectorisation are adapters

PNG decoding, SVG generation and SVG rasterisation have different runtime requirements in Bun and browsers. Keeping them outside `makeArt()` allows the actual tone, dither and packing logic to remain deterministic and testable without DOM, canvas or native image dependencies.

## Testing

Unit tests should cover:

- Unicode dot mapping
- edge padding for dimensions not divisible by 2 x 4
- deterministic dithering
- polarity/inversion
- alpha compositing
- contrast/detail option bounds
- expected output dimensions

Integration tests should exercise PNG -> Vectoriser -> SVG rasterisation -> Braille using a small fixture.
