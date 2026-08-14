# Design

PNG is vectorised to path-only SVG, rasterised back to RGBA, resized to the Braille dot grid, toned, dithered and packed into 2x4 Unicode Braille cells.

Normal colour samples the source pixels represented by on-dots. Background colour separately samples off-dots. Full colour clusters the eight RGBA samples in each cell into up to two perceptual colour groups; cluster membership becomes the Braille mask and the two means become foreground/background colours. Near-uniform cells use the same colour for both, producing a visually solid text cell.

Transparent source pixels are not painted as background. Colour averaging is alpha-aware and performed in linear light; two-colour separation uses OKLab distance.
