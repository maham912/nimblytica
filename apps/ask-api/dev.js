import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { handle } from "./handle.js";
import { fromSqlite, seed } from "./store.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2"
};

const db = fromSqlite(new DatabaseSync(":memory:"));
await seed(db);

function askResponse(req, url) {
  const headers = new Headers();
  for (let index = 0; index < req.rawHeaders.length; index += 2) headers.append(req.rawHeaders[index], req.rawHeaders[index + 1]);
  headers.set("cf-connecting-ip", req.socket.remoteAddress || "");
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);
  return handle(new Request(url, { method: req.method, headers, body, duplex: "half" }), process.env, db);
}

async function fileResponse(url) {
  let path;
  try {
    path = resolve(ROOT, `.${decodeURIComponent(url.pathname)}`);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const inside = relative(ROOT, path);
  if (inside.startsWith("..") || isAbsolute(inside) || inside.split(sep).some((part) => part.startsWith("."))) {
    return new Response("Not found", { status: 404 });
  }
  try {
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith("/")) return Response.redirect(new URL(`${url.pathname}/${url.search}`, url), 301);
      path = join(path, "index.html");
    }
    return new Response(await readFile(path), { headers: { "content-type": TYPES[extname(path)] || "application/octet-stream" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let response;
  if (url.pathname === "/ask") response = await askResponse(req, url);
  else if (req.method === "GET" || req.method === "HEAD") response = await fileResponse(url);
  else response = new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Valley Freight Ask: http://127.0.0.1:${PORT}/apps/ask-demo/?askApi=same`);
});
