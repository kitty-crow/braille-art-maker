# Web app

The hero starts in colour at 240 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. In light mode background colour starts enabled; in dark mode it starts disabled. Full colour starts disabled in both themes. Turning colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome with 96 cells, 1.12 contrast, 0.34 detail, +0.015 threshold bias and Ordered 4x4. In light mode Invert image polarity starts unchecked; in dark mode it starts checked. Enabling Colour output leaves those slider values alone, switches only the dither control to Atkinson, and starts background colour and full colour unchecked. Disabling Colour switches dithering back to Ordered 4x4.

When the page is light and the maker is showing foreground-only colour, the preview surface uses the dark-mode preview background so the colours remain legible. A question-mark tooltip explains that a genuinely light surface can make those colours hard to see.

Paste-ready embeds use the same safety rule: with `data-surface="auto"`, foreground-only colour on a resolved light theme receives the dark surface. Background/full-colour output follows the normal theme surface. The consuming site may explicitly set `data-surface="light"` if it accepts the readability trade-off.

Theme changes re-apply the light/dark defaults for hero background colour and maker polarity. The controls remain manually adjustable afterward.

Each range control has an accessible SVG info button. Pointer hover follows the cursor with a tooltip; keyboard focus shows the same explanation beside the button.
