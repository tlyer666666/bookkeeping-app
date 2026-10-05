# 记账管理系统

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web%20%7C%20PWA-blue)](#快速开始)
[![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Tests](https://img.shields.io/badge/tests-48%20passing-brightgreen)](#测试与质量)

一款**零依赖、本地优先**的个人记账应用。同一套代码覆盖三种形态：浏览器直接打开、PWA 安装到手机/电脑、Windows 独立桌面程序。数据全部保存在本机，不上传任何服务器。

![统计页](tests/shots/v4-desktop-light.png)

## 功能特性

- **记账**：支出 / 收入 / 转账，两级分类（89 个默认分类，可自定义），金额支持 `+ - * /` 算式
- **多账户**：现金、微信、支付宝、银行卡等独立核算，余额自动计算，支持负期初（信用卡欠款）
- **周期记账**：房租、订阅等固定收支按日/周/月自动生成，月末自动钳制（每月 31 号永远是 31 号）
- **标签与筛选**：多标签、按类型/分类/账户/标签/关键词组合筛选，搜索结果高亮
- **预算**：月度总预算 + 分类预算，进度条三色预警（正常/警示/超支）
- **统计**：分类占比环形图（支持下钻子类）、每日支出、近 6 个月趋势、环比变化
- **日历视图**：当月每日收支一览，点日期直接查看当日明细
- **数据安全**：启动自动清洗修复损坏数据、损坏原文自动备份、导出/导入 JSON 与 CSV、多标签页修改提醒
- **三形态**：Web（双击即用）/ PWA（添加到主屏幕，离线可用）/ Windows 桌面（独立 exe）

## 快速开始

### 方式一：浏览器直接使用（零安装）

双击 `index.html` 即可。数据保存在浏览器 localStorage 中。

### 方式二：PWA 安装到手机 / 电脑

```bash
node server.js        # 启动本地服务器（默认 8080 端口）
```

电脑访问 `http://localhost:8080`；手机连同一 Wi-Fi 访问控制台打印的局域网地址，在浏览器菜单中选择「添加到主屏幕」。之后可离线使用。

### 方式三：Windows 桌面程序

```bash
npm install           # 安装 Electron（约 150MB，国内可设置镜像：
                      # ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/）
npm start             # 启动桌面应用
npm run dist          # 打包独立 exe 到 release/ 目录
```

## 项目结构

```
├── index.html            # 页面入口
├── core.js               # 纯逻辑层：分类数据、校验、统计、存储（Node/浏览器双环境）
├── app.js                # UI 层：渲染、事件、canvas 图表
├── style.css             # 样式（亮/暗主题，设计 token 体系）
├── desktop/              # Electron 主进程与 preload（contextIsolation + IPC 白名单）
├── server.js             # 零依赖静态服务器（白名单伺服，局域网手机访问）
├── sw.js                 # Service Worker（离线缓存）
├── manifest.webmanifest  # PWA 清单
├── icons/                # 应用图标（tools/make-icons.js 纯 Node 生成）
├── tools/                # 图标生成 / Electron 下载兜底 / 打包脚本
└── tests/                # 48 项单元测试 + 冒烟测试记录
```

## 架构要点

- **分层**：`core.js` 纯逻辑（不碰 DOM，Node 与浏览器双环境运行，单元测试直接覆盖）与 `app.js` UI 层严格分离
- **金额精度**：全程以「分」为整数单位存储运算，杜绝浮点误差
- **安全基线**：Electron `contextIsolation` + `sandbox`，IPC 白名单；Web 端所有用户输入经转义后渲染；导入数据逐项校验
- **健壮性**：启动自动清洗损坏数据（原文先行备份）、配额不足导入自动回滚、渲染进程崩溃自动恢复、导出原子写

## 测试与质量

```bash
node tests/core.test.js    # 48 项单元测试
npm run selfcheck          # 桌面版端到端自检（9 项断言 + 性能探针）
npm audit                  # 0 漏洞
```

## 数据与隐私

- 所有数据仅存于本机浏览器（桌面版在 `%APPDATA%\记账管理系统`）
- **不会**自动同步到任何云端；换电脑 / 重装系统前请使用「管理 → 导出备份（JSON）」
- 手机与电脑的数据互相独立，迁移同样通过备份文件

## License

[MIT](LICENSE)
