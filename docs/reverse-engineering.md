# Reverse engineering notes

Braille Art Maker was designed after studying the observable behaviour of existing image-to-Braille converters, especially Vertopal's PNG-to-Braille/TXT output class, and comparing that behaviour with public upstream implementations such as ImageMagick's Braille/UBRL coder.

The goal was behavioural understanding, not source reproduction.

## What was observable

Vertopal exposes an image conversion workflow that can emit Unicode Braille-like text. Its format descriptions associate UBRL/Braille output with ImageMagick-style image conversion.

ImageMagick's public `coders/braille.c` shows the standard core packing model:

- convert the image to bilevel form
- walk pixels in cells two columns wide
- use four rows for 8-dot Unicode Braille (`UBRL`)
- map those eight binary samples to the standard Braille bit positions
- emit U+2800 plus the resulting 8-bit mask

That public implementation is useful for confirming the UBRL format and Unicode bit layout. It does not define Braille Art Maker's preprocessing, detail recovery, dithering defaults, UI, rendering density or export behaviour.

## What we intentionally do differently

A bare bilevel conversion is not sufficient for high-quality illustrative art. It tends to lose pale linework, facial detail and shaded surfaces after aggressive downsampling.

Braille Art Maker therefore owns a richer preprocessing stage before Unicode packing:

1. run the input through the project's Vectoriser dependency
2. rasterise the vector scene at the actual Braille dot-grid resolution
3. composite transparency correctly
4. stretch the useful tonal range
5. recover local detail
6. apply a selected halftone method
7. pack the resulting binary dots into Unicode Braille

The tool also treats HTML rendering as part of output quality. Dense Unicode rendering is based on the technique already developed in `kitty-crow/braille-qr`: measure the active Braille glyph width, constrain the logical layout grid to that geometry and let glyph ink visually overflow the tiny cells.

## Upstream versus proprietary behaviour

Generic primitives are acceptable dependencies where implementing them from scratch would add complexity without making the Braille algorithm more original. PNG decoders and SVG rasterisers are examples.

The following are not acceptable shortcuts:

- calling Vertopal remotely
- scraping Vertopal output and presenting it as local conversion
- copying proprietary page code
- depending on an undocumented Vertopal endpoint
- implementing only a wrapper around another image-to-Braille service

The conversion policy, quality heuristics and UI must remain our implementation.

## UBRL bit mapping

Unicode 8-dot Braille uses this logical arrangement:

```text
1 4
2 5
3 6
7 8
```

Corresponding bit masks:

```text
0x01 0x08
0x02 0x10
0x04 0x20
0x40 0x80
```

The output character is:

```text
String.fromCodePoint(0x2800 + mask)
```

This is a Unicode standard mapping, not a Vertopal-specific algorithm.

## Quality benchmark

The supplied transparent catgirl-at-laptop PNG is deliberately used as the canonical visual benchmark because it combines:

- near-white hair against transparency
- dark clothing
- thin glasses and facial linework
- small eye and mouth features
- saturated bow accents
- soft laptop shading
- hard silhouette edges

A converter that only preserves the outer silhouette is not considered good enough. The default settings should retain recognisable internal structure at practical Braille widths.

## Legal/engineering boundary

Reverse engineering here means reproducing externally observable functionality with independently written code and public upstream primitives. It does not mean reproducing Vertopal's private implementation.
