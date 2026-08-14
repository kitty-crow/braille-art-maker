# Web app

The hero starts in foreground-only colour with background colour and full colour off. In colour mode it uses 240 cells, Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. Turning colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias. Inverted polarity remains enabled in both modes.

The maker starts monochrome with 96 cells, 1.12 contrast, 0.34 detail, +0.015 threshold bias and Ordered 4x4. Enabling Colour output leaves those slider values alone, switches only the dither control to Atkinson, and starts background colour and full colour unchecked. Disabling Colour switches dithering back to Ordered 4x4.

Each range control has an accessible SVG info button. Pointer hover follows the cursor with a tooltip; keyboard focus shows the same explanation beside the button.
