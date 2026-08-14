import { expect, test } from "bun:test";
import { Tpl } from "../src/embed/tpl.ts";

const template = `<div data-unicode-art data-theme="{{THEME}}" data-surface="{{SURFACE}}" style="{{STYLE}}" aria-label="{{LABEL}}"><script type="application/octet-stream" data-unicode-art-data>{{DATA}}</script><script src="{{LOAD_SRC}}"></script></div>`;

const make = (data: string): string => new Tpl().make({
  data,
  codec: "u4",
  theme: "auto",
  surface: "auto",
  src: "https://example.test/v1/embed.js",
}, { html: template });

test("u4 payload replacement metacharacters are inserted literally", () => {
  const data = "A$`B$'C$$D";
  const html = make(data);
  expect(html).toContain(`data-unicode-art-data>4${data}</script>`);
  expect((html.match(/<div/gu) ?? []).length).toBe(1);
  expect((html.match(/<script/gu) ?? []).length).toBe(2);
});

test("regression: optimiser payload containing dollar-backtick cannot splice the embed template", () => {
  const data = "&d4_U*lg,#s#Ogn+a\\h^S3**q!j}M~Ww[8sU?-@$`Vi$B;OTa]N5uwH\"!";
  const html = make(data);
  expect(html).toContain(`data-unicode-art-data>4${data}</script>`);
  expect((html.match(/<div/gu) ?? []).length).toBe(1);
  expect(html).not.toContain(`${data.slice(0, data.indexOf("$`"))}<div`);
});
