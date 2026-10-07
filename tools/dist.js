'use strict';
const path = require('path');
const { packager } = require('@electron/packager');

(async () => {
  const paths = await packager({
    dir: '.',
    out: 'release',
    name: '记账管理系统',
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
  console.log('打包完成: ' + paths.join(', '));
})().catch(e => { console.error('打包失败: ' + String(e && e.message ? e.message : e)); process.exit(1); });
