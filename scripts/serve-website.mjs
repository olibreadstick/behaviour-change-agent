import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fallbackDocument } from './website-config.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.pdf': 'application/pdf' };
export function createWebsiteServer(directory = fileURLToPath(new URL('../dist/', import.meta.url))) {
// fileURLToPath preserves a directory's trailing slash, whereas path.resolve
// removes it. Normalize the root before comparing paths or every request fails.
const root = path.resolve(directory);
return http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  if (pathname === '/admin') { response.writeHead(302, { Location: '/admin/' }); response.end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) {
    if (path.extname(pathname)) { response.writeHead(404); response.end('Not found'); return; }
    file = path.join(root, fallbackDocument(pathname));
  }
  if (!existsSync(file)) { response.writeHead(503); response.end('Run npm run build first.'); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
});
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
const server = createWebsiteServer();
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Website preview: http://localhost:${port} — researchers: http://localhost:${port}/admin/`));
}
