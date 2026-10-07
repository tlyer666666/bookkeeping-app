'use strict';
const path = require('path');
const fs = require('fs');
const { packager } = require('@electron/packager');

(async () => {
  const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
  const paths = await packager({
    dir: '.',
    out: 'release',
    name: '记账管理系统',
    executableName: 'Bookkeeping',
    appVersion: version,
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    asar: true,
    icon: path.resolve('icons', 'icon.ico'),
    ignore: [
      /^\/release/,
      /^\/tests/,
      /^\/tools/,
      /^\/nul$/,
      /^\/启动[^/]*\.bat$/,
      /^\/\.mimosa/,
      /^\/\.zcode/,
      /^\/\.optimize-backup/,
      /^\/\.github/,
      /^\/\.husky/,
      /^\/\.editorconfig$/,
      /^\/docs/,
      /^\/AGENTS\.md$/,
      /^\/CHANGELOG\.md$/,
      /^\/CONTRIBUTING\.md$/,
    ],
  });
  // 产物名不依赖打包环境的推断结果，统一重命名为带版本号的规范文件名
  const target = `记账管理系统-v${version}-win64.exe`;
  for (const dir of paths) {
    for (const f of fs.readdirSync(dir)) {
      if (f.toLowerCase().endsWith('.exe') && f !== target) {
        fs.renameSync(path.join(dir, f), path.join(dir, target));
      }
    }
  }
  console.log('打包完成: ' + paths.join(', ') + ' -> ' + target);
})().catch(e => { console.error('打包失败: ' + String(e && e.message ? e.message : e)); process.exit(1); });
