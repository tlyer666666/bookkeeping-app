# AGENTS.md — 记账管理系统

## 项目信息

- **这是什么**：本地记账应用。Web/PWA 形态零依赖（双击 `index.html` 或 `node server.js`）；Windows 桌面形态基于 Electron（`npm install` 后 `npm start`，可 `npm run dist` 打包独立 exe）。
- **技术栈**：Web 层原生 HTML/CSS/JavaScript 零依赖；桌面壳 Electron 44（唯一 devDependency，二进制下载失败用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 或 `node tools/fetch-electron.js`）。
- **常用命令**：
  - 跑单元测试：`node tests/core.test.js`（45 项，必须全绿）
  - 打开应用：双击 `index.html`（或浏览器访问该文件）
  - 跨平台模式：`node server.js [端口]`（默认 8080），手机同 Wi-Fi 访问打印出的局域网地址
  - 桌面版：`npm install` → `npm start`；验收 `npm run selfcheck`（输出 `DESKTOPSELFCHECK {...}`，退出码 0=通过）；打包 `npm run dist`
  - 图标重生成：`node tools/make-icons.js` + `node tools/make-ico.js`；bat 行尾修复：`node tools/fix-bat-crlf.js`
- **目录**：
  - `core.js` 纯逻辑（分类数据、校验、统计、存储层），页面和 Node 测试共用
  - `app.js` UI 层（DOM 渲染 + canvas 图表）
  - `desktop/` Electron 主进程与 preload（安全基线：contextIsolation + sandbox，IPC 白名单）
  - `tests/core.test.js` 单元测试；`docs/superpowers/` 设计文档（本地保留，不入库）
  - 跨平台 PWA：`manifest.webmanifest`、`sw.js`（离线缓存，版本号 `bk-cache-v1`，改了静态资源要升版本）、`server.js`（零依赖白名单静态服务器）、`启动服务器.bat`
  - 桌面：`启动桌面版.bat`、`tools/`（图标/下载/打包脚本）、`icons/`
- **只有我知道的规矩**：
  - 金额一律以「分」为整数单位存储（`parseYuanToFen` 入、`formatFen` 出），禁止用浮点元参与运算。
  - 不能用 ES Module：`file://` 协议下模块脚本被 CORS 拦截。`core.js` 靠 `module.exports` 探测双环境导出（Node 测试 `require`，浏览器挂 `window.Core`），页面用普通 `<script>` 顺序加载 `core.js` → `app.js`。
  - 改了 `core.js` 必须跑 `node tests/core.test.js`；改了 UI 必须跑冒烟测试（见 `tests/smoke.md` 的方式）。
  - localStorage 键带前缀 `bk.`（含 `bk.recurrings` 周期模板、`<key>.corrupt-backup` 损坏备份）；自检模式（`?selftest=1`）用 `bkself.` 前缀避免污染真实数据。
  - 分类/账户被交易引用时禁止删除，这是故意的保护逻辑，不是 bug。
  - 启动时会经 `sanitizeLoadedData` 清洗旧数据并自动生成到期周期记账——别在 init 里重复这两步。
  - `rankSubs` 返回的字段名是 `subId`（不是 `id`），`categoryTotals` 返回的才是 `categoryId`，写 UI 时别混。
  - 备份 JSON 的 `recurrings` 键是可选的，导入校验必须兼容没有该键的旧备份。
  - 手机端底部标签栏靠 `@media (max-width: 600px)` 里的 `top: auto` 覆盖桌面 `sticky top:0`——删掉 `top: auto` 会全屏白幕盖住内容（真踩过的坑）。
  - SW 只在 http(s) 注册；`file://` 双击打开必须始终可用，别把功能绑死在 SW 上。
