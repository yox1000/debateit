const fs = require("fs");
const path = require("path");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function getPublicDir(rootDir) {
  const distDir = path.join(rootDir, "dist");

  return fs.existsSync(path.join(distDir, "index.html")) ? distDir : rootDir;
}

function serveStatic({ request, response, publicDir }) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (request.method === "GET" && !path.extname(filePath)) {
        filePath = path.join(publicDir, "index.html");
        fs.readFile(filePath, (fallbackError, fallbackData) => {
          if (fallbackError) {
            response.writeHead(404);
            response.end("Not found");
            return;
          }

          response.writeHead(200, { "Content-Type": contentTypes[".html"] });
          response.end(fallbackData);
        });
        return;
      }

      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(data);
  });
}

module.exports = {
  getPublicDir,
  serveStatic,
};
