# Design

1. Vectoriser converts RGBA input to path-only SVG with cropping disabled.
2. Braille Art Maker rasterises that SVG back to RGBA.
3. The image is resized to two dots per Braille column and four dots per row.
4. Alpha-aware luminance becomes ink strength.
5. Contrast stretch, contrast adjustment and local sharpening are applied.
6. Otsu supplies the base threshold.
7. Atkinson, Floyd-Steinberg, ordered 4x4 or threshold mode produces binary dots.
8. Every 2x4 dot block maps to one U+2800 Braille character.

`vendor/braille-qr` is used for its dense HTML rendering helper. QR generation is not used.
