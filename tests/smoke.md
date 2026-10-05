# 测试记录

## 1. 单元测试（core.js 纯逻辑）

最新结果：**48 passed, 0 failed**（`node tests/core.test.js`），覆盖：分类数据完整性、金额解析/格式化/上限、交易校验（含标签/备注长度）、存储层与损坏恢复、余额、筛选（含日/标签）、月汇总、分类占比与环比、每日/趋势统计、预算三档边界、周期记账生成/钳制/上限、CSV 往返与坏行、导入校验（含 `__proto__` 拒绝）。

## 2. 浏览器自检（真实 UI 流程）

命令：

```
chrome --headless=new --dump-dom "file://<项目>/index.html?selftest=1&tab=detail"
```

方式：`?selftest=1` 模式下，通过真实表单提交（dispatch submit 事件）依次记一笔支出（¥25.50 餐饮-早餐）、一笔收入（¥100 工资）、一笔转账（现金→银行卡 ¥50），随后提交非法金额（abc）验证拦截，再通过编辑弹窗把支出改为 ¥30、通过确认弹窗删除转账，最后用新的 Storage 实例重新读取存储验证持久化；另验证预算页已用金额、分类/账户删除保护。

结果（页面 DOM 输出，`pass: true` 为全部通过）：

```json
{"recordCount":3,"invalidRejected":true,"expenseFen":2550,"incomeFen":10000,"balanceFen":7450,"cashBalanceFen":92450,"bankBalanceFen":15000,"persistedCount":3,"budgetSpentText":"已用 25.50","editDeleteOk":true,"subDeleteBlocked":true,"unusedCatDeleted":true,"accDeleteBlocked":true,"protectionOk":true,"recurringOk":true,"tagsOk":true,"exprOk":true,"csvOk":true,"pass":true}
```

自检使用独立存储前缀 `bkself.`，不污染真实数据。

## 3. 截图核对

命令：`chrome --headless=new --screenshot=tests/shots/<名>.png "file://<项目>/index.html?selftest=1&tab=<页>"`

| 截图 | 核对点 |
|------|--------|
| v4-desktop-light.png | 亮色桌面统计页（环形图/每日柱状/6 月趋势） |
| v5-calendar.png | 日历视图（每日收支标注、今日描边、点选态） |
| v4-mobile.png | 手机视口（底部标签栏、汇总卡 4 格） |

## 4. 存储可用性

dump-dom 检查 `<div id="storage-warn">` 的 class 含 `hidden` —— file:// 协议下 localStorage 可用，数据持久化正常；不可用时页面顶部会显示持久警告。

## 5. 已修复问题的取证记录（按发现时间）

1. 记账弹窗切换「支出/收入」时分类下拉未按类型重新填充（已修：`onFormTypeChanged` 重新填充分类选项）。
2. 预算页「已用」恒为 0：`renderBudget` 误用 `c.categoryId`（应为 `c.id`）（已修）。
3. 转账记录图标显示 ❓（已修：转账固定用 🔁）。
4. 移动端标签栏全屏白幕：桌面 `.tabs{position:sticky;top:0}` 的 `top:0` 与移动端 `position:fixed;bottom:0` 叠加（已修：移动端补 `top:auto`）。
5. 删除确认期间点撤销的竞态会误删另一条记录（已修：确认回调按 id 重新定位）。
6. 编辑周期模板覆盖 anchorDay 导致月末账单日漂移（已修：未改日期时保留原锚）。
