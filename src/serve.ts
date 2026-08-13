import { join, normalize, resolve } from "node:path";

const root = resolve(Bun.argv[2] ?? "site");
const port = Number(Bun.env["PORT"] ?? 4173);

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";

    const target = normalize(join(root, path));
    if (!target.startsWith(root)) return new Response("Not found", { status: 404 });

    const file = Bun.file(target);
    if (await file.exists()) return new Response(file);

    const nested = Bun.file(join(root, path, "index.html"));
    if (await nested.exists()) return new Response(nested);

    const notFound = Bun.file(join(root, "404.html"));
    if (await notFound.exists()) return new Response(notFound, { status: 404 });
    return new Response("Not found", { status: 404 });
  }
});

console.log(`Pages: http://localhost:${port}`);
