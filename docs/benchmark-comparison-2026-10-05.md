# 对标分析：GitHub 同类开源项目 vs 本项目（2026-10-05）

数据来源：GitHub API 实测（2026-10-05），对比对象均为同类高星记账项目。

## 1. 对标项目概览

| 项目 | Stars | 技术栈 | License | CI | 提交规范 |
|---|---|---|---|---|---|
| mayswind/ezbookkeeping | 5710★ | Go + Vue/Vite/vitest | MIT | ✓ (.github + .gitea) | 自由风格（纯描述） |
| TNT-Likely/BeeCount | 2482★ | Dart/Flutter | 商业源码 | ✓ (.github) | **Conventional Commits + scope**（中文描述） |
| range-of-motion/budget | 1068★ | PHP/Laravel + Vite | MIT | ✓ (Actions + codecov) | PR 合并流 + Dependabot |
| glink25/Cent | 1215★ | TypeScript monorepo | 自定义 | ✓ (.github) | **Conventional Commits** + commitlint |
| **本项目** | — | 原生 JS + Electron | MIT（已补） | ✅ 本轮补齐 | Conventional Commits（feat:/docs:/chore:） |

## 2. 代码结构差异

| 维度 | 主流做法 | 本项目现状 | 结论 |
|---|---|---|---|
| 仓库根 | `src/` 模块化 + 构建配置 | 根目录平铺 index/core/app + desktop/ | **保留**（零构建、file:// 直开是产品定位；主流的 vite/tsconfig 依赖工具链） |
| Lint/格式化 | eslint/biome/phpcs 全覆盖 | 无 | ⚠️ 建议项（P1）：引入 ESLint 需评估与 IIFE/双环境写法兼容性 |
| 编辑器规范 | .editorconfig | 无 | ✅ 本轮补齐 |
| CI | push/PR 自动测试 + 覆盖率 | 无 | ✅ 本轮补齐（GitHub Actions） |
| CONTRIBUTING | budget/BeeCount 有 | 无 | ✅ 本轮补齐 |
| CHANGELOG/Release | tag + Releases 页挂产物 | 无 tag、无 Release | ✅ 本轮补齐（v1.0.0 + exe 资产） |
| 测试组织 | 分层目录 + 覆盖率 | 单文件 48 项断言 | 可接受（规模匹配），P2 可拆分 |
| i18n | ezbookkeeping/BeeCount 多语言 | 中文硬编码 | P2（抽取字符串表即可） |

## 3. 提交规范差异

- 主流（BeeCount/Cent）：`feat(scope): 描述` + PR 合并 + Dependabot。
- 本项目：`feat:` / `docs:` / `chore:` 已符合 Conventional Commits 核心格式；scope 与 PR 流程随协作规模再引入（单人直推主干在同类单人项目中常见，非缺陷）。

## 4. 功能 / 界面 / 架构差异

| 主流标配功能 | 本项目 | 状态 |
|---|---|---|
| 日历记账 | ✅ 日历视图 + 点日期筛选 | 已对齐 |
| 分类排行/趋势图 | ✅ 环形+排行条+渐变+环比 | 已对齐 |
| 预算（总/分类） | ✅ 三色进度 | 已对齐 |
| 周期记账 | ✅ 三频率 + 锚定日防漂移 | 已对齐 |
| CSV/JSON 导入导出 | ✅ | 已对齐 |
| 暗色模式 | ✅ | 已对齐 |
| **附件/图片凭证** | ❌ | P2 |
| **账单金额区间筛选** | ❌ | P1 |
| **年终报告** | ❌（6 月趋势已有） | P2 |
| **支付宝/微信账单 CSV 解析** | ❌ | P1（BeeCount 同款功能） |
| **回收站/多级撤销** | ❌（单条撤销已有） | P2 |
| **i18n** | ❌ | P2 |
| **AI/OCR 记账** | ❌（需云服务，与本地定位冲突） | 不采纳 |

## 5. 改进路线图

- **P0（本轮已落地）**：CI 工作流、CHANGELOG、.editorconfig、CONTRIBUTING、v1.0.0 tag + Release（含 exe 资产）、README 徽章与下载链接
- **P1（下个迭代）**：ESLint + husky 提交钩子；账单金额区间筛选；支付宝/微信 CSV 解析器
- **P2（按需）**：app.js 拆分为 src/ 模块 + i18n 抽取；附件凭证；年终报告；回收站
