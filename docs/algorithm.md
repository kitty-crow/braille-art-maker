# Conversion algorithm

Braille Art Maker treats Unicode Braille as an 8-dot image cell, not as ordinary text decoration.

## 1. Vectorisation

The decoded source image is passed through the pinned Vectoriser dependency. Vectoriser emits a path-only SVG with explicit fill colour and opacity. This gives Braille Art Maker a simplified scene representation before resampling.

For the hero and default browser workflow, the source canvas is preserved instead of silently cropping transparent margins. This keeps the result registered with the original image.

## 2. Dot-grid sizing

One Unicode Braille character represents two dot columns by four dot rows.

For a requested width of `C` Braille characters:

```text
dotWidth = C * 2
```

The destination dot height is derived from the source aspect ratio and then rounded to a multiple of four. The resulting Braille row count is `dotHeight / 4`.

The dense HTML renderer uses a cell aspect ratio of 1:2, which makes those logical dots approximately square on screen.

## 3. SVG rasterisation

The vectorised SVG is rasterised at the exact target dot-grid resolution. This prevents the Braille core from analysing a different image from the one produced by Vectoriser.

Browser builds can rely on the browser's SVG renderer. Bun/CLI builds can use a generic SVG rasteriser such as `@resvg/resvg-js`.

## 4. Transparency-aware luminance

Each RGBA sample is composited against the selected background before luminance is calculated. This matters for images with pale or semi-transparent edges because treating transparent RGB values as opaque introduces false dark pixels.

Relative luminance is derived from the colour channels, then converted into an ink signal. `dark` polarity treats darker image regions as Braille dots. `light` polarity reverses the relationship.

## 5. Contrast stretch

A percentile stretch is preferred to blindly mapping the minimum and maximum values. A few extreme pixels should not flatten the useful tonal range of the entire image.

The stretched signal can then be adjusted with a user-facing contrast multiplier and bias.

## 6. Detail recovery

Fine features such as glasses, eyelashes, hair strands and clothing edges are easy to lose when an image is reduced to a small Braille dot grid.

A local edge/detail pass is therefore applied before halftoning. The default should remain restrained: it exists to recover structure, not to turn smooth shading into noisy outlines.

## 7. Halftoning

Supported modes are intended to cover different kinds of art:

### Atkinson

Distributes a fraction of quantisation error to six nearby samples. It retains crisp local detail and tends to work well for illustrations and line-heavy images.

### Floyd-Steinberg

Distributes the full error to four neighbouring pixels. It generally produces smooth tonal gradients at the cost of a slightly busier texture.

### Ordered 4x4

Uses a fixed Bayer-style threshold matrix. It is deterministic, fast and visually regular.

### Threshold

No error diffusion. Every sample is simply compared with the selected or automatically derived threshold. Useful for already-binary artwork.

## 8. Unicode packing

Each 2 x 4 boolean block maps to one Unicode Braille character beginning at U+2800.

Dot bit positions are:

```text
1 4
2 5
3 6
7 8
```

or, as bit masks:

```text
0x01 0x08
0x02 0x10
0x04 0x20
0x40 0x80
```

The mask is added to `0x2800` and converted to a Unicode code point.

This mapping is the standard 8-dot Unicode Braille layout and is compatible with the packing used by Braille QR and ImageMagick UBRL.

## 9. Dense rendering

The text itself is valid, ordinary Unicode Braille. Rendering density is a separate concern.

For HTML output the app measures the current font's rendered width of `⣿`, then uses that width as the exact horizontal cell size and twice that width as the vertical cell size. Each glyph receives its own cell and is allowed to overflow it visually. This removes much of the apparent whitespace that ordinary `<pre>` rendering leaves between characters.

The same text can still be copied into a terminal or saved as `.txt`; it simply will not look as dense in every font.

## Quality philosophy

The default pipeline should preserve identity and structure before chasing photographic tone. At Braille resolutions, recognisable contour, eyes, mouth, accessories and major object boundaries are more valuable than reproducing every smooth gradient.
