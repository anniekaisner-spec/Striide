// Local preview server. The app itself is static and keeps its data on the device,
// so this only serves files from public/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    const path = normalize(join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
    if (!path.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Striide preview at http://localhost:${PORT}`));
