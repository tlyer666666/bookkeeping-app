# 冒烟测试

`tests/core.test.js` 只覆盖 `core.js` 的纯逻辑，UI 流程用无头 Chrome 跑一遍：

```bash
chrome --headless=new --dump-dom "file://<项目路径>/index.html?selftest=1&tab=detail"
```

`?selftest=1` 使用 `bkself.` 前缀的独立存储，不污染真实数据。自检按真实表单提交流程依次记一笔支出（¥25.50 餐饮-早餐）、一笔收入（¥100 工资）、一笔转账（现金→银行卡 ¥50），再提交非法金额（abc）验证拦截，通过编辑弹窗把支出改成 ¥30，通过确认弹窗删除转账，最后用新的 Storage 实例重新读取存储确认数据已落地；同时验证预算页已用金额、分类 / 账户删除保护、周期记账与标签、CSV 往返。

结果输出在页面底部的 `<pre id="selftest-result">`，格式为 `SELFTEST {...}`，其中 `pass` 为 `true` 表示全部通过。

截图核对用同一入口：

```bash
chrome --headless=new --screenshot=tests/shots/<名字>.png "file://<项目路径>/index.html?selftest=1&tab=<页>"
```

常看的三张：`v4-desktop-light.png`（亮色桌面统计页）、`v5-calendar.png`（日历视图）、`v4-mobile.png`（手机视口）。文件名带版本号前缀的是历次改版的留档。

存储可用性：检查 `<div id="storage-warn">` 的 class 是否含 `hidden` —— `file://` 下 localStorage 可用时页面不提示，不可用时顶部会显示持久警告。
