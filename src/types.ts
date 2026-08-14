export type Dither = "atkinson" | "floyd" | "ordered" | "threshold";

export interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface CellColour {
  readonly fg?: Rgb;
  readonly bg?: Rgb;
}

export interface ArtCfg {
  readonly columns?: number;
  readonly contrast?: number;
  readonly detail?: number;
  readonly bias?: number;
  readonly dither?: Dither;
  readonly invert?: boolean;
  readonly colour?: boolean;
  readonly colourBackground?: boolean;
  readonly fullColour?: boolean;
}

export interface Art {
  readonly text: string;
  readonly columns: number;
  readonly rows: number;
  readonly dotsWidth: number;
  readonly dotsHeight: number;
  readonly threshold: number;
  readonly density: number;
  readonly cellColours?: readonly CellColour[];
}

export interface VecCfg {
  readonly colours?: number;
  readonly alphaLevels?: number;
}

export interface VecStage {
  readonly svg: string;
  readonly pixels: Pixels;
  readonly paths: number;
  readonly rectangles: number;
}
