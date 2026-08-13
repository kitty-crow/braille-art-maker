const headMark = "<!-- pages:head -->";
const bodyMark = "<!-- pages:body -->";

export interface Tags {
  readonly head: readonly string[];
  readonly body: readonly string[];
}

export const inject = (html: string, tags: Tags): string => {
  let out = html;
  const head = tags.head.join("\n  ");
  const body = tags.body.join("\n  ");

  if (out.includes(headMark)) out = out.replace(headMark, head);
  else if (head) out = before(out, "</head>", `  ${head}\n`);

  if (out.includes(bodyMark)) out = out.replace(bodyMark, body);
  else if (body) out = before(out, "</body>", `  ${body}\n`);

  return out;
};

export const setBase = (html: string, href: string): string => {
  const tag = `<base href="${escapeAttr(href)}">`;
  const existing = /<base\b[^>]*>/i;
  if (existing.test(html)) return html.replace(existing, tag);

  const head = /<head(?:\s[^>]*)?>/i;
  if (!head.test(html)) throw new Error("HTML is missing <head>.");
  return html.replace(head, match => `${match}\n  ${tag}`);
};

export const redirect = (target: string): string => `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta http-equiv="refresh" content="0; url=${escapeAttr(target)}">
  <link rel="canonical" href="${escapeAttr(target)}">
  <title>Redirecting…</title>
  <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head>
<body>
  <a href="${escapeAttr(target)}">Continue</a>
</body>
</html>
`;

const before = (source: string, marker: string, value: string): string => {
  const at = source.lastIndexOf(marker);
  if (at < 0) throw new Error(`HTML is missing ${marker}.`);
  return `${source.slice(0, at)}${value}${source.slice(at)}`;
};

const escapeAttr = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
