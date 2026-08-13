import { resolve } from "node:path";

export type Bump = "check" | "patch" | "minor" | "major";

type Json = Record<string, unknown>;

export interface VerCfg {
  readonly root: string;
  readonly packageFile: string;
  readonly versionFile: string;
}

export const version = async (mode: Bump, cfg: VerCfg): Promise<string> => {
  const packagePath = resolve(cfg.root, cfg.packageFile);
  const versionPath = resolve(cfg.root, cfg.versionFile);
  const packageJson = record(await Bun.file(packagePath).json(), cfg.packageFile);
  const versionJson = record(await Bun.file(versionPath).json(), cfg.versionFile);
  const packageVersion = semver(packageJson["version"], cfg.packageFile);
  const fileVersion = semver(versionJson["version"], cfg.versionFile);

  if (packageVersion !== fileVersion) {
    throw new Error(`Version mismatch: ${cfg.packageFile} is ${packageVersion}, ${cfg.versionFile} is ${fileVersion}.`);
  }
  if (mode === "check") return packageVersion;

  const updated = next(packageVersion, mode);
  await Bun.write(packagePath, `${JSON.stringify({ ...packageJson, version: updated }, null, 2)}\n`);
  await Bun.write(versionPath, `${JSON.stringify({ ...versionJson, version: updated }, null, 2)}\n`);
  return updated;
};

const record = (value: unknown, name: string): Json => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${name} must contain a JSON object.`);
  return value as Json;
};

const semver = (value: unknown, name: string): string => {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`${name} has an invalid version.`);
  return value;
};

const next = (current: string, mode: Exclude<Bump, "check">): string => {
  const parts = current.split(".").map(Number);
  let major = parts[0] ?? 0;
  let minor = parts[1] ?? 0;
  let patch = parts[2] ?? 0;

  if (mode === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  }
  if (mode === "minor") {
    minor += 1;
    patch = 0;
  }
  if (mode === "patch") patch += 1;
  return `${major}.${minor}.${patch}`;
};
