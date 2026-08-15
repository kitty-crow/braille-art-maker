import { extname, join, normalize } from "node:path";

const root = join(import.meta.dir, "..", "site");
const port = Number(process.env.PORT ?? 4173);
const mime: Record<string, string> = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

const server = Bun.serve({
  port,
  async fetch(request: Request) {
    const url = new URL(request.url);
    const rel = url.pathname.replace(/^\/unicode-art-studio\/?/, "/");
    const clean = normalize(rel).replace(/^\.\.(?:\/|\\)/, "");
    const candidate = join(root, clean === "/" ? "index.html" : clean);
    for (const path of [candidate, join(candidate, "index.html")]) {
      const file = Bun.file(path);
      if (await file.exists()) return new Response(file, { headers: { "content-type": mime[extname(path)] ?? "application/octet-stream" } });
    }
    return new Response(Bun.file(join(root, "404.html")), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
});

console.log(`Unicode Art Studio: http://localhost:${server.port}`);
