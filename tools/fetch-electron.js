'use strict';
const fs = require('fs');
const path = require('path');
const { downloadArtifact } = require('@electron/get');
const extract = require('@electron-internal/extract-zip');

(async () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('node_modules', 'electron', 'package.json'), 'utf8'));
  const version = pkg.version;
  console.log('下载 Electron', version, 'win32-x64 ...');
  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch: 'x64',
    mirrorOptions: { mirror: 'https://npmmirror.com/mirrors/electron/' },
  });
  console.log('已下载:', zipPath);
  const dist = path.resolve('node_modules', 'electron', 'dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  await extract(zipPath, { dir: dist });
  fs.writeFileSync(path.resolve('node_modules', 'electron', 'path.txt'), 'electron.exe');
  console.log('electron.exe 存在:', fs.existsSync(path.join(dist, 'electron.exe')));
})().catch(e => {
  console.error('下载失败:', String(e && e.message ? e.message : e));
  process.exit(1);
});
