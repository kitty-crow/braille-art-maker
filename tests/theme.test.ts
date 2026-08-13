import { expect, test } from "bun:test";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("synchronises persisted themes across same-origin documents", async () => {
  const source = await Bun.file(join(root, "src", "run", "theme.ts")).text();
  expect(source).toContain('addEventListener("storage"');
  expect(source).toContain("event.key !== cfg.key");
  expect(source).toContain("apply(cfg, active(cfg))");
});
