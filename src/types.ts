export type Theme = "light" | "dark";

export interface ThemeCfg {
  readonly key: string;
  readonly colours: Readonly<Record<Theme, string>>;
  readonly toggle?: string;
  readonly label?: string;
  readonly event?: string;
  readonly lightIcon?: string;
  readonly darkIcon?: string;
}

export interface KofiCfg {
  readonly user: string;
  readonly header: string;
  readonly footer?: string;
  readonly page?: string;
  readonly icon?: string;
  readonly footerText?: string;
  readonly separator?: string;
  readonly desktopText?: string;
  readonly background?: string;
  readonly text?: string;
  readonly wideAt?: number;
}

export interface VersionCfg {
  readonly file: string;
  readonly selector?: string;
  readonly prefix?: string;
  readonly fallback?: string;
}

export interface LibCfg {
  readonly marked?: string;
  readonly purify?: string;
  readonly highlight?: string;
}

export interface ReadmeCfg {
  readonly owner: string;
  readonly repo: string;
  readonly branch?: string;
  readonly path?: string;
  readonly content?: string;
  readonly status?: string;
  readonly libs?: LibCfg;
}

export interface RuntimeCfg {
  readonly base: string;
  readonly theme?: ThemeCfg;
  readonly kofi?: KofiCfg;
  readonly version?: VersionCfg;
  readonly readme?: ReadmeCfg;
}

export interface PageCfg {
  readonly from: string;
  readonly route: string;
  readonly inject?: boolean;
  readonly keepSource?: boolean;
  readonly legacy?: readonly string[];
  readonly baseHref?: string;
}

export interface CopyCfg {
  readonly from: string;
  readonly to: string;
}

export interface CssCfg {
  readonly files: readonly string[];
  readonly vars?: Readonly<Record<string, string>>;
  readonly dark?: Readonly<Record<string, string>>;
}

export interface BuildCfg {
  readonly root?: string;
  readonly source: string;
  readonly out: string;
  readonly assets?: string;
  readonly clean?: boolean;
  readonly copySource?: boolean;
  readonly copy?: readonly CopyCfg[];
  readonly pages: readonly PageCfg[];
  readonly css?: CssCfg;
  readonly runtime?: RuntimeCfg;
  readonly noJekyll?: boolean;
  readonly minify?: boolean;
}

export interface LoadedCfg {
  readonly file: string;
  readonly root: string;
  readonly cfg: BuildCfg;
}

export interface BuildResult {
  readonly out: string;
  readonly pages: readonly string[];
  readonly assets: readonly string[];
}
