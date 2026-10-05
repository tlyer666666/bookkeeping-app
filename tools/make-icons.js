'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
}

function drawIcon(size) {
  const s = size / 512;
  const BG = [238, 108, 77];
  const CARD = [255, 255, 255];
  const BAR = [238, 108, 77];
  const GOOD = [47, 158, 99];
  const card = { x0: 112 * s, y0: 128 * s, x1: 400 * s, y1: 384 * s, r: 24 * s };
  const bars = [
    { y0: 176 * s, y1: 192 * s, x0: 152 * s, x1: 360 * s, color: BAR },
    { y0: 240 * s, y1: 256 * s, x0: 152 * s, x1: 360 * s, color: BAR },
    { y0: 304 * s, y1: 320 * s, x0: 152 * s, x1: 264 * s, color: GOOD },
  ];
  return encodePng(size, (px, py) => {
    const x = px + 0.5, y = py + 0.5;
    if (inRoundRect(x, y, card.x0, card.y0, card.x1, card.y1, card.r)) {
      for (const b of bars) {
        if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b.color.concat([255]);
      }
      return CARD.concat([255]);
    }
    return BG.concat([255]);
  });
}

const ROOT = path.resolve('.');
const ICONS_DIR = path.join(ROOT, 'icons');
const ALLOWED = new Set(['icon-192.png', 'icon-256.png', 'icon-512.png']);
if (path.basename(ICONS_DIR) !== 'icons') { console.error('请在项目根目录运行'); process.exit(1); }
fs.mkdirSync(ICONS_DIR, { recursive: true });
for (const size of [192, 256, 512]) {
  const name = 'icon-' + size + '.png';
  if (!ALLOWED.has(name)) { console.error('文件名不在白名单：' + name); process.exit(1); }
  const file = path.join(ICONS_DIR, name);
  if (!file.startsWith(ROOT + path.sep)) { console.error('输出越出项目根目录'); process.exit(1); }
  fs.writeFileSync(file, drawIcon(size));
  console.log('wrote', file, fs.statSync(file).size, 'bytes');
}
