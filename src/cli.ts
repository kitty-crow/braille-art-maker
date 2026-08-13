#!/usr/bin/env bun
import { resolve } from "node:path";
import { build } from "./build.ts";
import { check } from "./check.ts";
import { load } from "./config.ts";
import { init } from "./scaffold.ts";
import { version, type Bump } from "./ver.ts";

const help = `GitHub Pages template

Usage:
  pages-template build [config]
  pages-template check [config]
  pages-template init <dir> --name <name> --repo <owner/repo> [--base </repo/>] [--kofi <user>] [--force]
  pages-template version <check|patch|minor|major> [--root <dir>] [--package <file>] [--file <file>]

The build and runtime apply only to GitHub Pages assets.`;

const args = Bun.argv.slice(2);
const command = args.shift();

if (!command || command === "--help" || command === "help") {
  console.log(help);
  process.exit(0);
}

if (command === "build") {
  const loaded = await load(args[0] ?? "pages.config.ts");
  const result = await build(loaded);
  console.log(`${result.pages.length} pages built in ${result.out}`);
  process.exit(0);
}

if (command === "check") {
  const loaded = await load(args[0] ?? "pages.config.ts");
  await check(loaded);
  console.log("Pages configuration is valid.");
  process.exit(0);
}

if (command === "init") {
  const target = args.shift();
  if (!target) throw new Error("init requires a target directory.");

  const flags = parse(args);
  const name = required(flags, "name");
  const repo = required(flags, "repo");
  const base = value(flags, "base") ?? `/${repo.split("/").pop() ?? ""}/`;
  const kofi = value(flags, "kofi");

  await init({
    target,
    name,
    repo,
    base,
    ...(kofi ? { kofi } : {}),
    force: flags.has("force")
  });
  console.log(`Pages scaffold created in ${resolve(target)}`);
  process.exit(0);
}

if (command === "version") {
  const mode = args.shift();
  if (!isBump(mode)) throw new Error("version requires check, patch, minor or major.");
  const flags = parse(args);
  const result = await version(mode, {
    root: resolve(value(flags, "root") ?? "."),
    packageFile: value(flags, "package") ?? "package.json",
    versionFile: value(flags, "file") ?? "version.json"
  });
  console.log(result);
  process.exit(0);
}

throw new Error(`Unknown command: ${command}`);

type Flags = ReadonlyMap<string, string | true>;

function parse(values: readonly string[]): Flags {
  const out = new Map<string, string | true>();

  for (let i = 0; i < values.length; i += 1) {
    const item = values[i];
    if (!item?.startsWith("--")) throw new Error(`Unexpected argument: ${item ?? ""}`);
    const key = item.slice(2);
    const next = values[i + 1];

    if (!next || next.startsWith("--")) {
      out.set(key, true);
      continue;
    }

    out.set(key, next);
    i += 1;
  }

  return out;
}

function value(flags: Flags, key: string): string | undefined {
  const result = flags.get(key);
  return typeof result === "string" ? result : undefined;
}

function required(flags: Flags, key: string): string {
  const result = value(flags, key);
  if (!result) throw new Error(`--${key} is required.`);
  return result;
}

function isBump(value: string | undefined): value is Bump {
  return value === "check" || value === "patch" || value === "minor" || value === "major";
}
