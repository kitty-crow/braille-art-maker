# Web app

The hero starts in colour at 240 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. In light mode background colour starts enabled; in dark mode it starts disabled. Full colour starts disabled in both themes. Turning colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome with 96 cells, 1.12 contrast, 0.34 detail, +0.015 threshold bias and Ordered 4x4. Enabling Colour output leaves those slider values alone, switches only the dither control to Atkinson, and starts background colour and full colour unchecked. Disabling Colour switches dithering back to Ordered 4x4.

**Dark canvas** controls the preview surface without changing the generated art. Its initial automatic choice follows the visibility rules: dark theme uses a dark canvas, and light foreground-only colour also uses a dark canvas. Once the user changes Dark canvas manually, later theme/colour changes keep that choice. Changing the canvas aligns Invert with the selected surface; Invert remains independently adjustable afterwards.

**Reset sliders** restores only Width, Contrast, Detail and Threshold bias to 96, 1.12, 0.34 and +0.015. It does not change colour mode, background/full-colour selections, dithering, canvas or polarity.

When a light page is showing foreground-only colour, the question-mark tooltip warns that a light canvas can make some colours difficult to see. The warning remains useful even if the user deliberately turns Dark canvas off.

Paste-ready embeds use the same safety rule: with `data-surface="auto"`, foreground-only colour on a resolved light theme receives the dark surface. Background/full-colour output follows the normal theme surface. The consuming site may explicitly set `data-surface="light"` if it accepts the readability trade-off.

The embed fragment uses the lossless `u4` optimiser. It searches multiple exact mask/colour representations and compares raw, maximum-DEFLATE and Brotli-11 results, then uses the shortest complete payload with safe ASCII basE91 transport. The heavier encoder runs in a dedicated Web Worker so it does not block the live preview. Only the art payload is encoded; the surrounding embed HTML stays readable. The fragment itself is displayed through Marked, DOMPurify and Highlight.js.

Browser TXT, HTML and SVG downloads are content-addressed as `kitty-crow-github-io-unicode-art-maker-{sha256}.{ext}`, using the SHA-256 of the exact downloadable bytes.

The top navigation is a sticky floating bar and remains pinned near the top of the viewport while the page scrolls.

Each range control has an accessible SVG info button. Pointer hover follows the cursor with a tooltip; keyboard focus shows the same explanation beside the button.
