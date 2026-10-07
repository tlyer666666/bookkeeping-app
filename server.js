'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8080;
const WHITELIST = new Set(['/index.html', '/style.css', '/core.js', '/app.js', '/manifest.webmanifest', '/sw.js']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  try {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400); res.end('Bad Request'); return;
    }
    if (pathname === '/') pathname = '/index.html';
    if (pathname.includes('\0')) {
      res.writeHead(400); res.end('Bad Request'); return;
    }
    const allowed = WHITELIST.has(pathname) || /^\/icons\/(icon-192|icon-512)\.png$/.test(pathname);
    if (!allowed) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      };
      if (pathname === '/sw.js') headers['Cache-Control'] = 'no-cache';
      res.writeHead(200, headers);
      res.end(data);
    });
  } catch (err) {
    try { res.writeHead(500); res.end('Internal Server Error'); } catch (e) { /* 连接已断 */ }
  }
});

server.on('error', err => {
  console.log('服务器启动失败：' + (err && err.code === 'EADDRINUSE'
    ? '端口 ' + PORT + ' 已被占用（可能已有一个服务器在运行）'
    : String((err && err.message) || err)));
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log('  记账管理系统已启动');
  console.log('  电脑访问:   http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('  手机访问:   http://' + net.address + ':' + PORT + '  （需同一 Wi-Fi）');
      }
    }
  }
  console.log('  手机打开后可在浏览器菜单里「添加到主屏幕」，像 App 一样全屏离线使用');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('==============================================');
});
