# Web app

The hero starts in colour at 256 cells with Atkinson dithering, 0.55 contrast, 1.20 detail and +0.25 threshold bias. In light mode background colour starts enabled; in dark mode it starts disabled. Full colour starts disabled in both themes. Turning colour off restores the original monochrome profile: 96 cells, Ordered 4x4, 1.12 contrast, 0.34 detail and +0.015 bias.

The maker starts monochrome with 96 cells, 1.12 contrast, 0.34 detail, +0.015 threshold bias and Ordered 4x4. Its Resolution control supports 24 through 1024 horizontal Unicode cells. Resolutions above 256 cells are experimental because performance drops significantly as browser rendering, memory use and embed generation become much heavier.

The Resolution slider has a resistance notch at 256 cells. During a normal pointer drag the slider stops at 256 and shows a warning beside the pointer. Pushing farther through the notch releases the drag into the 257-1024 experimental range. The numeric value beside the Resolution label can also be edited directly from 24 through 1024 and stays synchronised with the slider. Keyboard changes are not trapped by the pointer resistance. The underlying core and CLI continue to accept up to 1024 cells.

Resolution changes use a settle-before-render model. Dragging the slider or typing a number updates the controls immediately but does not repeatedly regenerate art for every intermediate value. The target resolution is committed when the range interaction finishes or when numeric entry is committed by change, blur or Enter.

Above 256 cells the final target-resolution preview is painted progressively and asynchronously. The art itself is computed once at the selected resolution; the renderer then creates the final row slots and fills even rows first, followed by odd rows, yielding to `requestAnimationFrame()` between small batches so the browser can paint visible progress. It does not compute and discard a sequence of lower-resolution images. The embed runtime uses the same interlaced progressive final-DOM strategy.

Enabling Colour output leaves the slider values alone, switches only the dither control to Atkinson, and starts background colour and full colour unchecked. Disabling Colour switches dithering back to Ordered 4x4.

The canvas control is the first checkbox. In light mode it is **Dark canvas** and forces the preview onto a dark surface when enabled. In dark mode it becomes **Light canvas** and forces the preview onto a light surface when enabled. Its initial automatic choice follows the visibility rules: dark theme uses a dark canvas, and light foreground-only colour also uses a dark canvas. Once the user changes the canvas manually, later theme/colour changes keep the actual selected surface. Changing the canvas also aligns Invert with the selected surface; Invert remains independently adjustable afterwards.

**Reset sliders** restores only Resolution, Contrast, Detail and Threshold bias to 96, 1.12, 0.34 and +0.015. It does not change colour mode, background/full-colour selections, dithering, canvas or polarity.

When foreground-only colour is shown on an actual light canvas, the question-mark tooltip warns that some colours can be difficult to see. This applies whether the page theme itself is light or the user has explicitly enabled Light canvas in dark mode.

Paste-ready embeds use the same safety rule: with `data-surface="auto"`, foreground-only colour on a resolved light theme receives the dark surface. Background/full-colour output follows the normal theme surface. The consuming site may explicitly set `data-surface="light"` if it accepts the readability trade-off.

The embed fragment uses lossless `u4` transport. Through 256 cells it can run the full optimiser. Above 256, the browser uses a bounded-memory exact path: the page serialises one chunked lossless raw payload and transfers its `ArrayBuffer` to the Worker rather than structured-cloning the potentially huge `Art`/colour object graph. The Worker compares raw, maximum-DEFLATE and Brotli-11 transport for that exact payload and is disposed after the high-resolution one-shot job so Brotli/WASM high-water memory can be released. High-resolution preview rendering completes before embed compression begins, reducing simultaneous peak memory. No IndexedDB backing store is used by the current high-resolution path.

While embed encoding runs, the maker shows **Generating embed** and an **Encoding art…** progress bar; once encoding reaches 100%, that progress UI is hidden. New copied embeds contain only readable host attributes, one self-identifying payload script and one loader script; the CDN runtime reconstructs the Shadow DOM scaffold and shared stylesheet. The fragment itself is displayed through Marked, DOMPurify and Highlight.js.

Browser TXT, HTML and SVG downloads are content-addressed as `kitty-crow-github-io-unicode-art-maker-{sha256}.{ext}`, using the SHA-256 of the exact downloadable bytes.

The browser app and embed Worker URLs are release-versioned in the generated site so mobile browsers do not keep executing a stale high-resolution implementation after deployment.

All source HTML pages use the shared mobile viewport contract: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`.

The top navigation is a sticky floating bar and remains pinned near the top of the viewport while the page scrolls.

Each range control has an accessible SVG info button. Pointer hover follows the cursor with a tooltip; keyboard focus shows the same explanation beside the button.
