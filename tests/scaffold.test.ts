import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../src/scaffold.ts";

test("creates an unbranded Pages scaffold", async () => {
  const root = await mkdtemp(join(tmpdir(), "pages-scaffold-"));

  await init({
    target: root,
    name: "Sample",
    repo: "owner/sample",
    base: "/sample/"
  });

  const config = await Bun.file(join(root, "pages.config.ts")).text();
  const home = await Bun.file(join(root, "web", "index.html")).text();
  const about = await Bun.file(join(root, "web", "about.html")).text();
  const readme = await Bun.file(join(root, "web", "readme.html")).text();

  expect(config).toContain('base: "/sample/"');
  expect(config).toContain('owner: "owner"');
  expect(config).toContain('repo: "sample"');
  expect(config).not.toContain("kittycrow");
  expect(home).toContain("Sample");
  expect(home).not.toContain("Kitty Crow");
  expect(about).toContain("About · Sample");
  expect(readme).toContain("README · Sample");
  expect(await Bun.file(join(root, "web", "styles", "project.css")).exists()).toBe(true);

  await rm(root, { recursive: true, force: true });
});
