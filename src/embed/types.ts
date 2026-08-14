export type EmbedTheme = "auto" | "light" | "dark";
export type EmbedSurface = "auto" | "light" | "dark";

export interface EmbedPayload {
  readonly text: string;
  readonly columns: number;
  readonly rows: number;
  readonly colour: boolean;
  readonly colourBackground: boolean;
  readonly fullColour: boolean;
}

export interface EmbedCfg {
  readonly payload: EmbedPayload;
  readonly theme: EmbedTheme;
  readonly surface: EmbedSurface;
  readonly src: string;
  readonly cssSrc?: string;
  readonly loadSrc?: string;
  readonly style?: string;
  readonly label?: string;
}

export interface EmbedTpl {
  readonly html: string;
}
