'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('.');
const png = fs.readFileSync(path.join(ROOT, 'icons', 'icon-256.png'));
if (png.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') { console.error('icon-256.png 不是 PNG'); process.exit(1); }

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = 0;   // 宽 256 => 0
entry[1] = 0;   // 高 256 => 0
entry[2] = 0;   // 调色板数
entry[3] = 0;   // 保留
entry.writeUInt16LE(1, 4);   // 颜色平面
entry.writeUInt16LE(32, 6);  // 位深
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12); // 数据偏移 = 6 + 16

const out = path.join(ROOT, 'icons', 'icon.ico');
if (!out.startsWith(ROOT + path.sep)) { console.error('输出越出项目根目录'); process.exit(1); }
fs.writeFileSync(out, Buffer.concat([dir, entry, png]));
console.log('wrote', out, png.length + 22, 'bytes');
