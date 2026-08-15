import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("embed copy action moves into the code box and reports success as a checkmark", async () => {
  const [entry, copy, css] = await Promise.all([
    readFile(join(root, "src", "web.ts"), "utf8"),
    readFile(join(root, "src", "web", "embed-copy.ts"), "utf8"),
    readFile(join(root, "web", "styles", "embed-copy.css"), "utf8"),
  ]);

  expect(entry.indexOf("startStudio();")).toBeLessThan(entry.indexOf("bindEmbedCopy();"));
  expect(copy).toContain('document.querySelector<HTMLButtonElement>("#copy-embed")');
  expect(copy).toContain('shell.className = "embed-code-shell"');
  expect(copy).toContain("shell.append(host, button)");
  expect(copy).toContain('button.className = "embed-copy-button"');
  expect(copy).toContain('button.dataset.copyState = done ? "done" : "ready"');
  expect(copy).toContain('const label = done ? "Copied" : "Copy selected embed"');
  expect(copy).toContain("new MutationObserver");
  expect(copy).toContain('/^Copied\\b/u.test(text)');
  expect(copy).toContain('path.setAttribute("d", "M4.5 10.4 8.1 14l7.4-8")');
  expect(css).toContain(".embed-code-shell{position:relative");
  expect(css).toContain(".embed-copy-button{position:absolute");
  expect(css).toContain('[data-copy-state="done"]');
  expect(css).toContain("padding-right:52px");
});
