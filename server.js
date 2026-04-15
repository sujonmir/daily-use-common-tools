/**
 * server.js — Local dev server for the Parenthood (baby.html) page.
 *
 * Features:
 *   • Serves all static files from this directory (http://localhost:3000)
 *   • POST /upload  — receives a file and saves it to img/ or media/Video/
 *
 * Usage (run once in the project root):
 *   node server.js
 *
 * Then open:  http://localhost:3000/baby.html
 *
 * No npm install needed — uses only Node.js built-in modules.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 3000;
const ROOT    = __dirname;  // g:\5.Projects\daily-use-common-tools\

// ─── MIME TYPES ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.webp': 'image/webp',   '.jpg':  'image/jpeg',  '.jpeg': 'image/jpeg',
  '.png':  'image/png',    '.gif':  'image/gif',   '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',    '.webm': 'video/webm',  '.ogg':  'video/ogg',
  '.css':  'text/css',     '.js':   'application/javascript',
  '.json': 'application/json',
  '.woff': 'font/woff',    '.woff2':'font/woff2',  '.ttf':  'font/ttf',
  '.ico':  'image/x-icon',
  '':      'application/octet-stream',
};
function mime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// ─── PARSE MULTIPART FORM DATA ────────────────────────────────────────────────
/**
 * Very small multipart/form-data parser (no external deps).
 * Returns { fields: {key:value}, files: [{fieldname, filename, data: Buffer}] }
 */
function parseMultipart(body, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while (start < body.length) {
    const boundaryIdx = body.indexOf(boundaryBuf, start);
    if (boundaryIdx === -1) break;
    const partStart = boundaryIdx + boundaryBuf.length + 2; // skip \r\n
    const nextBoundary = body.indexOf(boundaryBuf, partStart);
    if (nextBoundary === -1) break;
    const partEnd = nextBoundary - 2; // trim trailing \r\n
    const part = body.slice(partStart, partEnd);

    // Split headers from body at \r\n\r\n
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = nextBoundary; continue; }
    const headerStr = part.slice(0, headerEnd).toString();
    const data      = part.slice(headerEnd + 4);

    const cd = headerStr.match(/Content-Disposition:[^\r\n]*/i)?.[0] || '';
    const nameMatch     = cd.match(/name="([^"]+)"/);
    const filenameMatch = cd.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      parts.push({ type: 'file', fieldname: nameMatch?.[1], filename: filenameMatch[1], data });
    } else if (nameMatch) {
      parts.push({ type: 'field', name: nameMatch[1], value: data.toString() });
    }
    start = nextBoundary;
  }

  const fields = {}, files = [];
  parts.forEach(p => {
    if (p.type === 'field') fields[p.name] = p.value;
    else files.push(p);
  });
  return { fields, files };
}

// ─── SERVER ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers (needed for fetch from the same origin served locally)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── POST /upload ──────────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/upload') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'No boundary in Content-Type' }));
      return;
    }
    const boundary = boundaryMatch[1];
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      try {
        const { fields, files } = parseMultipart(body, boundary);
        if (!files.length) throw new Error('No file in upload');

        const file     = files[0];
        const savePath = fields.savePath || '';  // relative path like "img/foo.webp"
        if (!savePath) throw new Error('savePath field missing');

        // Security: prevent path traversal
        const absPath = path.resolve(ROOT, savePath);
        if (!absPath.startsWith(ROOT)) throw new Error('Invalid path');

        // Ensure directory exists
        fs.mkdirSync(path.dirname(absPath), { recursive: true });

        // Write the file
        fs.writeFileSync(absPath, file.data);

        console.log(`[upload] Saved: ${savePath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: savePath }));
      } catch (err) {
        console.error('[upload] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // ── Static file serving ────────────────────────────────────────────────────
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const absPath = path.resolve(ROOT, urlPath.slice(1));
  if (!absPath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }

  fs.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime(absPath) });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Parenthood server running at: http://localhost:${PORT}/baby.html\n`);
});
