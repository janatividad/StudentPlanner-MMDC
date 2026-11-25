import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

// Resolve FRONTEND_ROOT and ensure it exists and follow symlinks
const FRONTEND_ROOT = fs.realpathSync(path.resolve(__dirname, 'frontend'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function isPathContained(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

const server = http.createServer((req, res) => {
  // Only allow GET and HEAD methods for static file server
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  let decodedPath;
  try {
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0];
    decodedPath = decodeURIComponent(pathname);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request: Malformed URI');
    return;
  }

  // Reject null bytes
  if (decodedPath.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request: Invalid Path');
    return;
  }

  // Normalize path and strip leading /frontend or /frontend/ prefix if present
  let cleanPath = decodedPath.replace(/\\/g, '/');
  if (cleanPath.startsWith('/frontend')) {
    cleanPath = cleanPath.slice('/frontend'.length);
  }

  if (cleanPath === '' || cleanPath === '/') {
    cleanPath = '/index.html';
  }

  // Construct target path inside FRONTEND_ROOT
  const targetPath = path.resolve(FRONTEND_ROOT, '.' + cleanPath);

  // Initial lexical containment check
  if (!isPathContained(targetPath, FRONTEND_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  // Asynchronously inspect and resolve symlinks
  fs.lstat(targetPath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${decodedPath}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    let filePathToResolve = targetPath;
    if (stats.isDirectory()) {
      filePathToResolve = path.join(targetPath, 'index.html');
    }

    fs.realpath(filePathToResolve, (realErr, realResolvedPath) => {
      if (realErr) {
        if (realErr.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`404 Not Found: ${decodedPath}`);
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
        }
        return;
      }

      // Enforce containment on final resolved real path (guards against symlink traversal)
      if (!isPathContained(realResolvedPath, FRONTEND_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }

      fs.stat(realResolvedPath, (statErr, finalStats) => {
        if (statErr || !finalStats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`404 Not Found: ${decodedPath}`);
          return;
        }

        serveFile(realResolvedPath, req, res);
      });
    });
  });
});

function serveFile(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const headers = {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    'Service-Worker-Allowed': '/'
  };

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }

    res.writeHead(200, headers);
    res.end(data);
  });
}

function startListening(portToUse) {
  server.listen(portToUse, HOST, () => {
    console.log(`\n✨ Student Planner MMDC is running!`);
    console.log(`👉 Bound to: http://${HOST}:${portToUse}/\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(server.address()?.port || PORT) + 1;
    console.log(`Port in use, trying http://${HOST}:${nextPort}...`);
    startListening(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

startListening(PORT);

export { server, isPathContained, FRONTEND_ROOT };
