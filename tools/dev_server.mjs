// dist 静态服务: 供酒馆页面以 ES module 方式 import 构建产物.
// 酒馆 (8001) 与本服务 (5500) 跨源, 因此必须带 CORS 头, 否则模块导入会被浏览器拦截.
// 用法: node tools/dev_server.mjs [端口]  (默认 5500, 只绑 127.0.0.1)
// 根目录 = 仓库根, 因此 URL /dist/导演台/index.js 对应磁盘 <仓库>/dist/导演台/index.js.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const PORT = Number(process.argv[2] ?? 5500);

const MIME = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
};

http
  .createServer(async (req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.normalize(path.join(ROOT, pathname));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403, cors);
        res.end('forbidden');
        return;
      }
      let target = file;
      const stat = await fs.stat(target).catch(() => null);
      if (stat?.isDirectory()) target = path.join(target, 'index.html');
      const data = await fs.readFile(target).catch(() => null);
      if (data == null) {
        res.writeHead(404, cors);
        res.end('not found');
        return;
      }
      res.writeHead(200, { ...cors, 'Content-Type': MIME[path.extname(target)] ?? 'application/octet-stream' });
      res.end(data);
    } catch (error) {
      res.writeHead(500, cors);
      res.end(String(error));
    }
  })
  .listen(PORT, '127.0.0.1', () => console.info(`dist 静态服务已启动: http://127.0.0.1:${PORT}/`));
