# 同类项目对标分析报告（2026-10-07）

对比方式：与对标项目逐维度对照，并以全新上下文的独立审查通读全部关键文件、node 实测取证。

对标对象（GitHub API 实测）：**mayswind/ezbookkeeping**（5710★，Go+Vue/Vite/vitest）、**TNT-Likely/BeeCount**（2482★，Flutter，Conventional Commits + scope）、**glink25/Cent**（1215★，TS monorepo，biome + commitlint + PR 流）。
对比方式：与对标项目逐维度对照，并以全新上下文的独立审查通读全部关键文件 + node 实测取证。

## 一、代码结构与提交规范对比

| 维度 | 主流做法 | 本项目 | 判定 |
|---|---|---|---|
| 编辑器规范 | .editorconfig | ✅ 有（含 .bat CRLF 特例） | 达标 |
| CI | push/PR 自动测试 | ✅ Actions（ESLint + 55 项测试，双 Node 矩阵） | 达标 |
| Linter | eslint / biome / phpcs | ✅ ESLint flat config + recommended 预设 | 达标 |
| 提交规范 | Conventional Commits ± commitlint | ✅ commitlint 强制（husky commit-msg） | 达标（超出 BeeCount） |
| 提交粒度 | 一件事一提交 + PR 流 | 单人直推主干，粒度清晰 | 达标（单人项目惯例） |
| 文档集 | README（±EN）、CONTRIBUTING、LICENSE、docs/ | ✅ README/CONTRIBUTING/LICENSE/CHANGELOG + 对标报告 | 达标 |
| 隐私与第三方声明 | BeeCount 有 PRIVACY.md、THIRD-PARTY-NOTICES | ❌ 无 | **差距（短期）**：数据本地化声明可并入 README「数据与隐私」节（已有雏形） |
| 双语 README | BeeCount/Cent 有 README_EN | ❌ | 不适用（目标用户为中文用户，P2 可选） |

## 二、实现方式差异

| 维度 | 主流做法 | 本项目 | 结论 |
|---|---|---|---|
| 构建 | vite/webpack + TS | 零构建、file:// 直开 | **有意保留**（产品定位；README 有说明） |
| 模块化 | ESM + src/ 分层 | IIFE 单文件 + core.js 逻辑分离 | 部分对齐（core 纯逻辑已独立可测），P2 可拆 UI |
| 测试 | vitest/jest + 覆盖率 | 55 项 Node 断言 + 双端到端自检 | 核心层覆盖充分；UI 层依赖端到端自检 |
| 发布 | tag → Release 挂产物 | ✅ tag + Release + exe 资产 | 已对齐 |

## 三、功能与界面差异

已对齐主流：日历记账、分类排行、预算（总/分类）、周期记账、标签、CSV/JSON 导入导出、暗色模式、金额算式、回收站、关键词高亮、总资产概览。
仍缺（主流有而本项无）：**附件/图片凭证**、**账单金额区间筛选已有**、**多币种**、**AI/OCR**（需云服务）。

## 四、独立审查发现与处置

总体结论：工程化程度明显高于典型个人项目，文档/CI/门禁/测试/规范五件套齐备且真实生效，无 critical 级问题。发现 12 项，**本轮修复 10 项**：

| # | 级别 | 发现 | 处置 |
|---|---|---|---|
| 1 | medium | validateImport 不校验周期模板 subcategoryId 归属（跨大类子类可导入） | ✅ 已修 + 测试（子类须属所选大类或为空） |
| 2 | medium | tools/dist.js ignore 缺 .mimosa/.zcode/.optimize-backup/.github/.husky/docs 等（发布产物卫生） | ✅ 已修（全部排除） |
| 3 | medium | 可访问性：明细项/日历格/图例无键盘可达；模态无 role=dialog/aria | ✅ 已修（role/tabindex/aria + Enter 激活 + 打开自动聚焦） |
| 4 | low | CONTRIBUTING 引用未入库的 AGENTS.md | ✅ 已修（约定内联） |
| 5 | low | ci.yml 用 npm install 而非按锁安装 | ✅ 已修（--no-save --ignore-scripts eslint + setup-node cache） |
| 6 | low | package.json 缺 repository/bugs/engines | ✅ 已补 |
| 7 | low | CHANGELOG 1.0.0/1.1.0 条目重复 | ✅ 已修（1.0.0 瘦身为当时事实） |
| 8 | low | hi() 关键词命中 HTML 实体片段时劈开显示 | ✅ 已修（原文分段转义） |
| 9 | low | 标签超 5 个静默截断 | ✅ 已修（toast 提示） |
| 10 | low | statsYear 翻页后切月不回正 | ✅ 已修（切月重置） |
| 11 | low | 全角空格触发 no-irregular-whitespace | ✅ 已修 |
| 12 | low | closeAllModals 后冗余 closeModal、两套 keyOf 口径不一 | ✅ 已修（统一 txDupKey；删冗余） |

**保留不改**（审查确认合理）：server.js 监听 0.0.0.0（设计使然，README 已注明）；发布版保留 DevTools 菜单；无 SECURITY.md（同类多数没有）。

## 五、遗留路线图

- **P1**：账单附件凭证（需存储层升级 IndexedDB）；ESLint 增补 type-aware 规则
- **P2**：i18n 抽取；多币种；app.js 拆分为 src/ 模块；发布流程全自动化（Actions 构建 exe + 校验和）
- **明确不采纳**：AI/OCR 记账（需云服务，与本地隐私定位冲突）；多用户/云同步（产品定位为本地优先）
