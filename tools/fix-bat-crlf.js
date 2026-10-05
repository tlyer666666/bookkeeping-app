'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('.');
const ALLOWED = new Set(['启动桌面版.bat', '启动服务器.bat']);
if (path.basename(ROOT) !== '记账管理系统') { console.error('请在项目根目录运行'); process.exit(1); }
for (const name of ALLOWED) {
  const file = path.join(ROOT, name);
  if (!file.startsWith(ROOT + path.sep)) { console.error('输出越出项目根目录'); process.exit(1); }
  if (!fs.existsSync(file)) { console.error('缺少 ' + name); process.exit(1); }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(file, text.replace(/\n/g, '\r\n'), 'utf8');
  const crlf = (fs.readFileSync(file, 'binary').match(/\r\n/g) || []).length;
  console.log(name, '-> CRLF x' + crlf);
}
