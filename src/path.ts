import { dirname, posix, relative, sep } from "node:path";

export const slash = (value: string): string => value.split(sep).join("/");

export const routeFile = (route: string): string => {
  const clean = route.trim();
  if (!clean || clean === "/") return "index.html";

  const path = clean.replace(/^\/+/, "");
  if (path.endsWith(".html")) return path;
  return `${path.replace(/\/+$/, "")}/index.html`;
};

export const href = (page: string, asset: string): string => {
  const from = posix.dirname(slash(page));
  const target = slash(asset);
  const value = posix.relative(from, target);
  if (!value) return "./";
  return value.startsWith(".") ? value : `./${value}`;
};

export const relImport = (from: string, to: string): string => {
  const value = slash(relative(dirname(from), to));
  return value.startsWith(".") ? value : `./${value}`;
};
