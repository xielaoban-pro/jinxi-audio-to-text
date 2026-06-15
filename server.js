const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 8000);
const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
};

function safePathFromUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded === "/" ? "/index.html" : decoded);
  const resolved = path.join(root, normalized);

  if (!resolved.startsWith(root)) {
    return null;
  }

  return resolved;
}

http
  .createServer((req, res) => {
    const requestPath = req.url || "/";

    if (requestPath === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    const filePath = safePathFromUrl(requestPath);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Content-Length": String(stats.size),
      });

      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Serving directory: ${root}`);
  });
