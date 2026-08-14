# Web app

The hero starts in colour at 256 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. In light mode background colour starts enabled; in dark mode it starts disabled. Full colour starts disabled in both themes. Turning colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome with 96 cells, 1.12 contrast, 0.34 detail, +0.015 threshold bias and Ordered 4x4. Its Width control supports 24 through 1024 horizontal Unicode cells. Enabling Colour output leaves those slider values alone, switches only the dither control to Atkinson, and starts background colour and full colour unchecked. Disabling Colour switches dithering back to Ordered 4x4.

The canvas control is the first checkbox. In light mode it is **Dark canvas** and forces the preview onto a dark surface when enabled. In dark mode it becomes **Light canvas** and forces the preview onto a light surface when enabled. Its initial automatic choice follows the visibility rules: dark theme uses a dark canvas, and light foreground-only colour also uses a dark canvas. Once the user changes the canvas manually, later theme/colour changes keep the actual selected surface. Changing the canvas also aligns Invert with the selected surface; Invert remains independently adjustable afterwards.

**Reset sliders** restores only Width, Contrast, Detail and Threshold bias to 96, 1.12, 0.34 and +0.015. It does not change colour mode, background/full-colour selections, dithering, canvas or polarity.

When foreground-only colour is shown on an actual light canvas, the question-mark tooltip warns that some colours can be difficult to see. This applies whether the page theme itself is light or the user has explicitly enabled Light canvas in dark mode.

## High-resolution preview memory

The preview is always real Unicode text. It is never replaced with a canvas bitmap, image or other raster surrogate.

The browser renderer uses one Unicode text row per output row instead of one `<span>` per cell. Monochrome rows are plain text nodes. Coloured rows still contain the exact Unicode characters, while foreground/background colours are represented as hard-stop CSS gradients aligned to the cell boundaries. This keeps selection/copy semantics and exact generated characters while avoiding hundreds of thousands of DOM nodes at 1024 columns.

After a result above 256 columns is rendered, its heavy `Art` object is written to IndexedDB and released from the main-page state. The visible Unicode remains in the DOM. Copy, TXT and HTML actions load the backing art on demand. The embed worker also loads the high-resolution art directly from IndexedDB, avoiding a structured-clone copy of the full colour-object graph from the page into the Worker.

Paste-ready embeds use the same safety rule: with `data-surface="auto"`, foreground-only colour on a resolved light theme receives the dark surface. Background/full-colour output follows the normal theme surface. The consuming site may explicitly set `data-surface="light"` if it accepts the readability trade-off.

For outputs through 256 columns, the embed fragment uses the full lossless `u4` optimiser search. Above 256 columns, `u4` uses a bounded-memory exact path: one packed representation is compared as raw, maximum-DEFLATE and Brotli-11. The shortest transport wins. This avoids giant candidate arrays and JavaScript argument-list failures while remaining lossless.

The heavier encoder runs in a dedicated Web Worker and reports progress. New copied embeds contain only readable host attributes, one self-identifying payload script and one loader script; the CDN runtime reconstructs the Shadow DOM scaffold and shared stylesheet. Large generated embed source is displayed as one plain code text node instead of being duplicated through Marked/DOMPurify/Highlight.js; normal-sized fragments keep syntax highlighting.

Browser TXT, HTML and SVG downloads are content-addressed as `kitty-crow-github-io-unicode-art-maker-{sha256}.{ext}`, using the SHA-256 of the exact downloadable bytes.

The top navigation is a sticky floating bar and remains pinned near the top of the viewport while the page scrolls.

Each range control has an accessible SVG info button. Pointer hover follows the cursor with a tooltip; keyboard focus shows the same explanation beside the button.
