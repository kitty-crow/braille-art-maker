# Browser and hero

The browser app is a static GitHub Pages application. Conversion happens locally in the visitor's browser.

## Main workflow

1. Select or drop a PNG.
2. Decode it to RGBA.
3. Vectorise it using the pinned Vectoriser core.
4. Rasterise the generated SVG at the selected Braille resolution.
5. Run the shared Braille Art Maker analysis and halftone pipeline.
6. Render the resulting Unicode through the dense-cell renderer.
7. Copy the text or export TXT/HTML.

## Hero comparison

The default hero demonstrates the converter with the supplied catgirl-at-laptop PNG.

It is a registered before/after comparison rather than two independent images:

- the original PNG is the source layer
- the generated Unicode Braille is the result layer
- both occupy the same square and coordinate system
- a vertical handle spans the full height
- the initial split is exactly 50/50
- left of the handle shows the original PNG
- right of the handle shows the Braille result
- dragging horizontally changes only the clip boundary

The Braille side is scaled to the same visible dimensions as the PNG, so features line up across the divider.

### Input support

The divider supports pointer/touch dragging. It should also be focusable and expose keyboard movement with the left/right arrow keys.

## Dense Unicode rendering

The preview must be made from real Unicode Braille characters, not a canvas approximation.

The renderer measures a long run of `⣿` using the active font to determine the true glyph advance. That width becomes `--cell-w`; `--cell-h` is twice it. Each character receives its own fixed cell while the glyph ink is allowed to overflow. This is the behaviour borrowed from Braille QR's HTML/CSS approach.

Preferred font stack:

```css
"Apple Braille", "Noto Sans Symbols 2", "DejaVu Sans Mono", "Segoe UI Symbol", monospace
```

Ligatures and font synthesis are disabled. The measurement is repeated after fonts become ready and when layout changes materially.

## Controls

The browser UI should expose the settings that materially affect output rather than every internal constant:

- Braille width in columns
- dither mode
- contrast
- detail recovery
- threshold/bias
- polarity/invert
- optional output ink thickness

Controls update the live preview without changing the underlying source file.

## Exports

### TXT

Contains only Unicode Braille lines. It is portable but appearance depends on the viewer's font and line metrics.

### HTML

A self-contained document containing the same Unicode text plus the dense renderer CSS/measurement script, so the output retains the intended compact image-like appearance.

## Responsive layout

The hero and maker must work on mobile as well as desktop. Heading sizes remain deliberately restrained rather than using viewport-filling display typography. The comparison handle must retain a practical touch target without making the visible divider excessively thick.
