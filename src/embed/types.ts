export type EmbedTheme = "auto" | "light" | "dark";
export type EmbedSurface = "auto" | "light" | "dark";

export interface EmbedCfg {
  readonly data: string;
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
