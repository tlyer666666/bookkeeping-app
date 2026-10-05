# 贡献指南

感谢关注本项目！当前为个人本地应用，欢迎 Issue 与 PR。

## 提交规范

- Commit 信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：`feat|fix|docs|chore|refactor(范围): 描述`
- 一个提交只做一件事；提交前请跑通门禁

## 开发流程

1. Fork 后创建分支：`git checkout -b feat/your-feature`
2. 完成改动后运行门禁（必须全绿）：
   ```bash
   node --check core.js && node --check app.js
   node tests/core.test.js
   npm run selfcheck        # 需要先 npm install
   ```
3. 遵守项目约定（见 `AGENTS.md`）：金额以「分」存储、不引入第三方依赖、不用 ES Module
4. 提交 PR，描述改动动机与验证方式

## 报告问题

Issue 请附：复现步骤、预期与实际行为、运行形态（Web / PWA / 桌面版）。
