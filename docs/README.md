# Braille Art Maker documentation

This directory documents the Braille Art Maker design and public contract while the implementation is being restored from the repository bootstrap mistake noted in the root README.

- [Repository repair status](status.md): what is actually present on `main` right now.
- [Architecture](architecture.md): module boundaries, data flow and runtime split.
- [Conversion algorithm](algorithm.md): vectorisation, tone mapping, dithering and Unicode packing.
- [Browser and hero](web.md): dense rendering, controls and the vertical 50/50 comparison slider.
- [CLI and library](cli.md): command surface, reusable core and testing expectations.
- [Dependencies](dependencies.md): what belongs to Vectoriser, Braille QR, the Pages template and Braille Art Maker itself.
- [Reverse engineering notes](reverse-engineering.md): what was learned from Vertopal/UBRL and what is independently implemented here.
- [Implementation documentation rules](CONTRIBUTING-NOTES.md): what must stay in sync when code lands.
