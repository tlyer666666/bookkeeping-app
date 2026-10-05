'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isSelfcheck = process.argv.includes('--selfcheck');
let mainWindow = null;
let windowState = { width: 1280, height: 800, maximized: false };

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function isOnAnyDisplay(x, y) {
  return screen.getAllDisplays().some(d =>
    x >= d.bounds.x && x < d.bounds.x + d.bounds.width
    && y >= d.bounds.y && y < d.bounds.y + d.bounds.height);
}

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (Number.isInteger(s.width) && Number.isInteger(s.height) && s.width > 0 && s.height > 0) {
      windowState.width = s.width;
      windowState.height = s.height;
      if (Number.isInteger(s.x) && Number.isInteger(s.y) && isOnAnyDisplay(s.x, s.y)) {
        windowState.x = s.x;
        windowState.y = s.y;
      }
      windowState.maximized = !!s.maximized;
    }
  } catch (e) { /* 首次运行或文件损坏：使用默认值 */ }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const b = mainWindow.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({
      width: b.width, height: b.height, x: b.x, y: b.y, maximized: mainWindow.isMaximized(),
    }));
  } catch (e) { /* 写不进 userData 时忽略，不影响退出 */ }
}

function sendMenu(action) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('desktop:menu', action);
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '导出备份（JSON）', click: () => sendMenu('export-json') },
        { label: '导出明细（CSV）', click: () => sendMenu('export-csv') },
        { type: 'separator' },
        { label: '导入备份…', click: () => sendMenu('import-json') },
        { label: '导入 CSV…', click: () => sendMenu('import-csv') },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '开发者工具', role: 'toggleDevTools' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '记账管理系统 桌面版 v' + app.getVersion(),
              detail: '数据保存在本机浏览器存储中（' + app.getPath('userData') + '），离线可用。换机迁移请使用「文件 → 导出备份」。',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 360,
    minHeight: 480,
    title: '记账管理系统',
    backgroundColor: '#f4f5f7',
    show: !isSelfcheck,
    icon: path.join(__dirname, '..', 'icons', 'icon-192.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  if (windowState.maximized) mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'),
    isSelfcheck ? { search: 'selftest=1&tab=detail' } : undefined);
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('will-navigate', e => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let reloadCount = 0;
  let reloadWindowStart = 0;
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    const now = Date.now();
    if (now - reloadWindowStart > 60000) { reloadWindowStart = now; reloadCount = 0; }
    reloadCount++;
    try {
      if (reloadCount > 3) {
        dialog.showErrorBox('界面进程反复异常', '界面进程在短时间内多次退出（' + details.reason + '）。请通过菜单「文件 → 导出备份（JSON）」备份数据后重启应用。');
        return;
      }
      dialog.showErrorBox('界面进程异常', '界面进程已退出（' + details.reason + '），即将重新加载。数据不受影响。');
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
    } catch (e) { /* 窗口已销毁时忽略 */ }
  });
}

function friendlyFsError(err) {
  const code = err && err.code;
  if (code === 'EBUSY' || code === 'EACCES' || code === 'EPERM') return '文件被其他程序占用或无权限';
  if (code === 'ENOSPC') return '磁盘空间不足';
  if (code === 'ENOENT') return '文件不存在';
  return String((err && err.message) || err);
}

function registerIpc() {
  ipcMain.handle('desktop:export-file', async (event, payload) => {
    let tmpPath = null;
    try {
      const p = payload || {};
      if (typeof p.content !== 'string' || typeof p.defaultName !== 'string') {
        return { ok: false, error: '参数不完整' };
      }
      const name = path.basename(p.defaultName);
      const ext = path.extname(name).toLowerCase();
      if (ext !== '.json' && ext !== '.csv') return { ok: false, error: '仅支持导出 .json 或 .csv 文件' };
      const filters = [ext === '.json'
        ? { name: 'JSON 备份', extensions: ['json'] }
        : { name: 'CSV 明细', extensions: ['csv'] }];
      const r = await dialog.showSaveDialog(mainWindow, { defaultPath: name, filters });
      if (r.canceled || !r.filePath) return { ok: false, canceled: true };
      if (!/\.(json|csv)$/i.test(r.filePath)) return { ok: false, error: '文件扩展名必须是 .json 或 .csv' };
      tmpPath = r.filePath + '.tmp';
      fs.writeFileSync(tmpPath, p.content, 'utf8');
      fs.renameSync(tmpPath, r.filePath);
      tmpPath = null;
      return { ok: true, path: r.filePath };
    } catch (err) {
      try { if (tmpPath) fs.unlinkSync(tmpPath); } catch (e) { /* 清理失败忽略 */ }
      return { ok: false, error: friendlyFsError(err) };
    }
  });
  ipcMain.handle('desktop:import-file', async (event, payload) => {
    try {
      const p = payload || {};
      const kind = p.kind === 'csv' ? 'csv' : 'json';
      const filters = [kind === 'csv'
        ? { name: 'CSV 明细', extensions: ['csv'] }
        : { name: 'JSON 备份', extensions: ['json'] }];
      const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters });
      if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
      const filePath = r.filePaths[0];
      const stat = await fs.promises.stat(filePath);
      if (stat.size > 10 * 1024 * 1024) return { ok: false, error: '文件超过 10MB，请确认选择的是本应用的备份或明细文件' };
      const content = await fs.promises.readFile(filePath, 'utf8');
      return { ok: true, path: filePath, content };
    } catch (err) {
      return { ok: false, error: friendlyFsError(err) };
    }
  });
}

async function runSelfcheck() {
  const win = mainWindow;
  let result;
  try {
    result = await Promise.race([
      win.webContents.executeJavaScript(`(async () => {
    for (let i = 0; i < 100; i++) {
      const el = document.getElementById('selftest-result');
      if (el && el.textContent.indexOf('SELFTEST') >= 0) break;
      await new Promise(r => setTimeout(r, 100));
    }
    const el = document.getElementById('selftest-result');
    const m = /SELFTEST (\\{.*\\})/.exec(el ? el.textContent : '');
    const selftest = m ? JSON.parse(m[1]) : { pass: false, error: '自检无结果' };

    const perf = { n: 3000, listMs: null, fullMs: null };
    try {
      const bk = window.__bkTest;
      const mkTx = (i) => ({
        id: 'perf_' + i,
        type: i % 3 === 0 ? 'income' : 'expense',
        amount: (i % 5000) * 10 + 100,
        categoryId: i % 3 === 0 ? 'i1' : 'e' + (1 + (i % 10)),
        subcategoryId: null,
        accountId: i % 2 ? 'acc_bank' : 'acc_cash',
        toAccountId: null,
        date: new Date().toISOString().slice(0, 10),
        note: '性能测试 ' + i,
        tags: [],
        createdAt: new Date(2026, 0, i + 1).toISOString(),
      });
      const bulk = [];
      for (let i = 0; i < perf.n; i++) bulk.push(mkTx(i));
      bk.state.transactions.push(...bulk);
      let t0 = performance.now();
      bk.renderTxList();
      perf.listMs = Math.round(performance.now() - t0);
      t0 = performance.now();
      bk.render();
      perf.fullMs = Math.round(performance.now() - t0);
      bk.state.transactions = bk.state.transactions.filter(t => t.id.indexOf('perf_') !== 0);
      bk.render();
    } catch (e) {
      perf.error = String(e && e.message ? e.message : e);
    }
    return { selftest, perf };
  })()`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('自检超时（30 秒）')), 30000)),
    ]);
  } catch (e) {
    result = { selftest: { pass: false, error: String((e && e.message) || e) }, perf: {} };
  }
  console.log('DESKTOPSELFCHECK ' + JSON.stringify(result));
  app.exit(result.selftest && result.selftest.pass === true ? 0 : 1);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  process.on('uncaughtException', err => {
    try { dialog.showErrorBox('发生未处理的错误', String((err && err.stack) || err)); } catch (e) { /* 已无法弹窗 */ }
  });
  app.whenReady().then(() => {
    loadWindowState();
    registerIpc();
    if (!isSelfcheck) buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    if (isSelfcheck) {
      mainWindow.webContents.on('did-finish-load', () => { setTimeout(runSelfcheck, 300); });
    }
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', saveWindowState);
}
