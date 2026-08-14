# API

`vectorStage(pixels, options)` runs the pinned Vectoriser and returns its SVG plus reconstructed RGBA pixels.

`makeArt(pixels, options)` converts RGBA pixels to Unicode Braille.

```ts
const vector = vectorStage({ width, height, data: rgba });
const art = makeArt(vector.pixels, { columns: 96, contrast: 1.12, detail: 0.34, bias: 0.015, dither: "atkinson" });
```

`pixels.data` contains one 8-bit RGBA value per channel.
