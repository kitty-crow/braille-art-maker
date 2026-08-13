import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { version } from "../src/ver.ts";

test("updates package and page versions together", async () => {
  const root = await mkdtemp(join(tmpdir(), "pages-version-"));
  await Bun.write(join(root, "package.json"), '{"version":"1.2.3"}\n');
  await Bun.write(join(root, "version.json"), '{"version":"1.2.3"}\n');

  const value = await version("minor", {
    root,
    packageFile: "package.json",
    versionFile: "version.json"
  });

  expect(value).toBe("1.3.0");
  expect((await Bun.file(join(root, "package.json")).json()).version).toBe("1.3.0");
  expect((await Bun.file(join(root, "version.json")).json()).version).toBe("1.3.0");
  await rm(root, { recursive: true, force: true });
});
