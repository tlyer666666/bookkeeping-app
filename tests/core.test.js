'use strict';
const assert = require('assert');
const core = require('../core.js');

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

function memBackend() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
}

function tx(over) {
  return Object.assign({
    id: 'tx_1', type: 'expense', amount: 100,
    categoryId: null, subcategoryId: null,
    accountId: 'acc_cash', toAccountId: null,
    date: '2026-10-02', note: '', createdAt: '2026-10-02T08:00:00.000Z',
  }, over);
}

/* ---------- Task 2: 分类与账户数据 ---------- */

test('默认分类：支出 10 大类、收入 5 大类', () => {
  assert.strictEqual(core.getCategories('expense').length, 10);
  assert.strictEqual(core.getCategories('income').length, 5);
});

test('默认分类：支出 67 子类、收入 22 子类、共 89', () => {
  const expSubs = core.getCategories('expense').reduce((s, c) => s + c.subs.length, 0);
  const incSubs = core.getCategories('income').reduce((s, c) => s + c.subs.length, 0);
  assert.strictEqual(expSubs, 67);
  assert.strictEqual(incSubs, 22);
  assert.strictEqual(expSubs + incSubs, 89);
});

test('默认分类与账户 ID 全局唯一', () => {
  const ids = new Set();
  for (const c of core.DEFAULT_CATEGORIES) {
    assert.ok(!ids.has(c.id), 'dup ' + c.id); ids.add(c.id);
    for (const s of c.subs) { assert.ok(!ids.has(s.id), 'dup ' + s.id); ids.add(s.id); }
  }
  for (const a of core.DEFAULT_ACCOUNTS) {
    assert.ok(!ids.has(a.id), 'dup ' + a.id); ids.add(a.id);
  }
});

test('findCategory / findSub 命中与未命中', () => {
  assert.strictEqual(core.findCategory(core.DEFAULT_CATEGORIES, 'e1').name, '餐饮美食');
  assert.strictEqual(core.findCategory(core.DEFAULT_CATEGORIES, 'nope'), null);
  const e1 = core.findCategory(core.DEFAULT_CATEGORIES, 'e1');
  assert.strictEqual(core.findSub(e1, 'e1s1').name, '早餐');
  assert.strictEqual(core.findSub(e1, 'nope'), null);
  assert.strictEqual(core.findSub(null, 'e1s1'), null);
});

test('默认账户：6 个、期初余额 0', () => {
  assert.strictEqual(core.DEFAULT_ACCOUNTS.length, 6);
  for (const a of core.DEFAULT_ACCOUNTS) {
    assert.strictEqual(a.initialBalance, 0);
    assert.ok(a.name && a.icon);
  }
});

/* ---------- Task 3: 工具与校验 ---------- */

test('genId：前缀 + 唯一性', () => {
  const a = core.genId('tx'), b = core.genId('tx');
  assert.ok(/^tx_[0-9a-f]+$/.test(a));
  assert.notStrictEqual(a, b);
});

test('todayStr / monthKeyOf', () => {
  assert.match(core.todayStr(), /^\d{4}-\d{2}-\d{2}$/);
  const d = new Date();
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.strictEqual(core.todayStr(), local);
  assert.strictEqual(core.monthKeyOf('2026-10-02'), '2026-10');
});

test('parseYuanToFen：正常、边界与非法输入', () => {
  assert.strictEqual(core.parseYuanToFen('25.5'), 2550);
  assert.strictEqual(core.parseYuanToFen('25.50'), 2550);
  assert.strictEqual(core.parseYuanToFen('25'), 2500);
  assert.strictEqual(core.parseYuanToFen('0.01'), 1);
  assert.strictEqual(core.parseYuanToFen('12.345'), 1235);
  assert.strictEqual(core.parseYuanToFen(' 12.5 '), 1250);
  assert.strictEqual(core.parseYuanToFen(''), null);
  assert.strictEqual(core.parseYuanToFen('abc'), null);
  assert.strictEqual(core.parseYuanToFen('0'), null);
  assert.strictEqual(core.parseYuanToFen('-5'), null);
  assert.strictEqual(core.parseYuanToFen('1e3'), null);
  assert.strictEqual(core.parseYuanToFen('12.3.4'), null);
  assert.strictEqual(core.parseYuanToFen('.5'), null);
});

test('formatFen：正负与补零', () => {
  assert.strictEqual(core.formatFen(2550), '25.50');
  assert.strictEqual(core.formatFen(5), '0.05');
  assert.strictEqual(core.formatFen(0), '0.00');
  assert.strictEqual(core.formatFen(-2550), '-25.50');
  assert.strictEqual(core.formatFen(123456789), '1234567.89');
});

test('validateTransaction：合法的支出/收入/转账通过', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  assert.deepStrictEqual(core.validateTransaction(tx({ categoryId: 'e1', subcategoryId: 'e1s1' }), cats, accs), { ok: true, errors: [] });
  assert.deepStrictEqual(core.validateTransaction(tx({
    type: 'income', amount: 1000000, categoryId: 'i1', subcategoryId: 'i1s1',
  }), cats, accs), { ok: true, errors: [] });
  assert.deepStrictEqual(core.validateTransaction(tx({
    type: 'income', amount: 500, categoryId: 'i1', subcategoryId: null,
  }), cats, accs), { ok: true, errors: [] });
  assert.deepStrictEqual(core.validateTransaction(tx({
    type: 'transfer', amount: 5000, toAccountId: 'acc_bank',
  }), cats, accs), { ok: true, errors: [] });
});

test('validateTransaction：金额必须为正整数分', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  for (const bad of [0, -100, '25.5', 25.5, null, undefined]) {
    const r = core.validateTransaction(tx({ amount: bad }), cats, accs);
    assert.strictEqual(r.ok, false, 'amount=' + bad);
    assert.ok(r.errors.some(e => e.includes('金额')), 'amount=' + bad);
  }
});

test('validateTransaction：类型与分类匹配', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  assert.ok(!core.validateTransaction(tx({ type: 'other' }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ type: null }), cats, accs).ok);
  assert.ok(core.validateTransaction(tx({ categoryId: 'i1' }), cats, accs).errors.some(e => e.includes('支出')));
  assert.ok(!core.validateTransaction(tx({ categoryId: 'nope' }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', subcategoryId: 'i1s1' }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', subcategoryId: 'nope' }), cats, accs).ok);
});

test('validateTransaction：转账规则与账户存在性', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  assert.ok(!core.validateTransaction(tx({ type: 'transfer', toAccountId: 'acc_cash' }), cats, accs).ok, '同账户');
  assert.ok(!core.validateTransaction(tx({ type: 'transfer' }), cats, accs).ok, '缺目标账户');
  assert.ok(!core.validateTransaction(tx({ type: 'transfer', toAccountId: 'acc_bank', categoryId: 'e1' }), cats, accs).ok, '转账不应有分类');
  assert.ok(!core.validateTransaction(tx({ accountId: 'nope' }), cats, accs).ok, '未知账户');
  assert.ok(!core.validateTransaction(tx({ type: 'transfer', toAccountId: 'nope' }), cats, accs).ok, '未知目标账户');
});

test('validateTransaction：日期必须为合法 YYYY-MM-DD', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  for (const bad of ['2026-13-01', '2026-02-30', '2026-10', 'abc', '', null]) {
    assert.ok(!core.validateTransaction(tx({ date: bad }), cats, accs).ok, 'date=' + bad);
  }
});

/* ---------- Task 4: 存储层 ---------- */

test('Storage：load 缺失/损坏返回 fallback，save/load 往返，clear 清空', () => {
  const s = new core.Storage(memBackend());
  assert.deepStrictEqual(s.load(core.KEYS.transactions, []), []);
  const fallback = [{ id: 'x' }];
  assert.deepStrictEqual(s.load(core.KEYS.transactions, fallback), fallback, '缺失时返回 fallback');
  s.save(core.KEYS.transactions, [{ id: 't1' }]);
  assert.deepStrictEqual(s.load(core.KEYS.transactions, fallback), [{ id: 't1' }]);
  s.save(core.KEYS.transactions, 'not-an-object');
  assert.deepStrictEqual(s.load(core.KEYS.transactions, fallback), [{ id: 't1' }], 'save 非对象被忽略');
  s.clear();
  assert.deepStrictEqual(s.load(core.KEYS.transactions, fallback), fallback, 'clear 后返回 fallback');
});

test('Storage：损坏的 JSON 返回 fallback', () => {
  const backend = memBackend();
  backend.setItem(core.KEYS.transactions, '{oops');
  const s = new core.Storage(backend);
  assert.deepStrictEqual(s.load(core.KEYS.transactions, [1, 2]), [1, 2]);
});

test('createBrowserStorage：可用与不可用两条路径', () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = {
    _s: {}, getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; },
  };
  const ok = core.createBrowserStorage();
  assert.strictEqual(ok.available, true);
  ok.backend.setItem('k', 'v');
  assert.strictEqual(globalThis.localStorage.getItem('k'), 'v');
  globalThis.localStorage = undefined;
  const bad = core.createBrowserStorage();
  assert.strictEqual(bad.available, false);
  bad.backend.setItem('k', 'v');
  assert.strictEqual(bad.backend.getItem('k'), 'v');
  globalThis.localStorage = saved;
});

/* ---------- Task 5: 统计与预算 ---------- */

const accs2 = [
  { id: 'acc_cash', name: '现金', icon: '💰', initialBalance: 100000 },
  { id: 'acc_bank', name: '银行卡', icon: '🏦', initialBalance: 0 },
];

const txs2 = [
  tx({ id: 't1', amount: 2550, categoryId: 'e1', subcategoryId: 'e1s1', accountId: 'acc_cash', date: '2026-10-02', createdAt: '2026-10-02T08:00:00.000Z' }),
  tx({ id: 't2', amount: 5000, categoryId: 'e2', accountId: 'acc_cash', date: '2026-10-02', createdAt: '2026-10-02T09:00:00.000Z' }),
  tx({ id: 't3', type: 'income', amount: 1000000, categoryId: 'i1', subcategoryId: 'i1s1', accountId: 'acc_bank', date: '2026-10-05' }),
  tx({ id: 't4', type: 'transfer', amount: 5000, accountId: 'acc_cash', toAccountId: 'acc_bank', date: '2026-10-06', createdAt: '2026-10-06T09:00:00.000Z' }),
  tx({ id: 't5', amount: 10000, categoryId: 'e3', subcategoryId: 'e3s1', accountId: 'acc_bank', date: '2026-10-06', createdAt: '2026-10-06T10:00:00.000Z' }),
  tx({ id: 't6', type: 'income', amount: 200000, categoryId: 'i2', accountId: 'acc_bank', date: '2026-09-20' }),
  tx({ id: 't7', amount: 30000, categoryId: 'e4', accountId: 'acc_cash', date: '2026-11-01' }),
  tx({ id: 't8', amount: 1500, categoryId: 'e1', subcategoryId: 'e1s5', accountId: 'acc_bank', date: '2026-10-15', note: '星巴克' }),
];

test('accountBalances：期初 + 收入 − 支出 ± 转账', () => {
  const m = core.accountBalances(accs2, txs2);
  assert.strictEqual(m.get('acc_cash'), 100000 - 2550 - 5000 - 5000 - 30000);
  assert.strictEqual(m.get('acc_bank'), 1000000 + 5000 + 200000 - 10000 - 1500);
});

test('filterTransactions：月/类型/分类/账户/关键词与排序', () => {
  const cats = core.DEFAULT_CATEGORIES;
  assert.deepStrictEqual(core.filterTransactions(txs2, { monthKey: '2026-10' }, cats).map(t => t.id),
    ['t8', 't5', 't4', 't3', 't2', 't1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { type: 'expense' }, cats).map(t => t.id),
    ['t7', 't8', 't5', 't2', 't1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { categoryId: 'e1' }, cats).map(t => t.id), ['t8', 't1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { accountId: 'acc_cash' }, cats).map(t => t.id),
    ['t7', 't4', 't2', 't1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { keyword: '星巴克' }, cats).map(t => t.id), ['t8']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { keyword: '早餐' }, cats).map(t => t.id), ['t1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, { monthKey: '2026-10', type: 'expense', categoryId: 'e1' }, cats).map(t => t.id), ['t8', 't1']);
  assert.deepStrictEqual(core.filterTransactions(txs2, {}, cats).map(t => t.id),
    ['t7', 't8', 't5', 't4', 't3', 't2', 't1', 't6']);
});

test('monthSummary：transfer 不计入收支', () => {
  const s = core.monthSummary(txs2, '2026-10');
  assert.strictEqual(s.expenseFen, 2550 + 5000 + 10000 + 1500);
  assert.strictEqual(s.incomeFen, 1000000);
  assert.strictEqual(s.balanceFen, 1000000 - (2550 + 5000 + 10000 + 1500));
});

test('categoryTotals：按金额降序，子类明细降序', () => {
  const r = core.categoryTotals(txs2, core.DEFAULT_CATEGORIES, '2026-10', 'expense');
  assert.deepStrictEqual(r.map(c => c.categoryId), ['e3', 'e2', 'e1']);
  assert.strictEqual(r[2].amountFen, 4050);
  assert.deepStrictEqual(r[2].subs.map(s => s.subId), ['e1s1', 'e1s5']);
  assert.strictEqual(r[2].subs[0].amountFen, 2550);
});

test('dailyTotals：整月长度，仅支出口径', () => {
  const r = core.dailyTotals(txs2, '2026-10');
  assert.strictEqual(r.length, 31);
  assert.strictEqual(r[1].day, 2);
  assert.strictEqual(r[1].amountFen, 7550);
  assert.strictEqual(r[5].amountFen, 10000);
  assert.strictEqual(r[14].amountFen, 1500);
  assert.strictEqual(r[0].amountFen, 0);
});

test('monthlyTrend：近 6 月旧→新，含零月', () => {
  const r = core.monthlyTrend(txs2, '2026-10', 6);
  assert.strictEqual(r.length, 6);
  assert.strictEqual(r[0].monthKey, '2026-05');
  assert.strictEqual(r[4].monthKey, '2026-09');
  assert.strictEqual(r[4].incomeFen, 200000);
  assert.strictEqual(r[5].incomeFen, 1000000);
  assert.strictEqual(r[5].expenseFen, 19050);
  assert.strictEqual(r[0].incomeFen, 0);
});

test('budgetStatus：总预算与分类预算、三档边界', () => {
  const catTotals = core.categoryTotals(txs2, core.DEFAULT_CATEGORIES, '2026-10', 'expense');
  const r = core.budgetStatus({ total: 30000, byCategory: { e1: 2000, e2: 6000 } }, catTotals);
  assert.strictEqual(r.hasBudget, true);
  assert.strictEqual(r.totalFen, 30000);
  assert.strictEqual(r.spentFen, 19050);
  assert.strictEqual(r.remainingFen, 10950);
  assert.strictEqual(r.level, 'ok');
  const e1r = r.perCategory.find(p => p.categoryId === 'e1');
  assert.strictEqual(e1r.spentFen, 4050);
  assert.strictEqual(e1r.level, 'over');
  const e2r = r.perCategory.find(p => p.categoryId === 'e2');
  assert.strictEqual(e2r.level, 'warn');
  assert.ok(!r.perCategory.some(p => p.categoryId === 'e3'), '未设预算的大类不出现在明细');

  const mk = spent => core.budgetStatus({ total: 10000, byCategory: {} }, [{ categoryId: 'e1', name: 'x', icon: 'x', amountFen: spent, subs: [] }]);
  assert.strictEqual(mk(6990).level, 'ok');
  assert.strictEqual(mk(7000).level, 'warn');
  assert.strictEqual(mk(10000).level, 'warn');
  assert.strictEqual(mk(10010).level, 'over');
});

test('budgetStatus：无预算时 hasBudget=false', () => {
  const r = core.budgetStatus(null, []);
  assert.strictEqual(r.hasBudget, false);
  const r2 = core.budgetStatus({ total: 0, byCategory: {} }, []);
  assert.strictEqual(r2.hasBudget, false);
});

test('validateImport：合法与各类非法数据', () => {
  const good = {
    version: 1, exportedAt: '2026-10-02T00:00:00.000Z',
    data: {
      transactions: txs2, accounts: accs2,
      categories: core.DEFAULT_CATEGORIES, budgets: {}, settings: { currency: '¥' },
    },
  };
  const ok = core.validateImport(good);
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.data.transactions.length, 8);

  const bad = over => {
    const clone = JSON.parse(JSON.stringify(good));
    over(clone);
    const r = core.validateImport(clone);
    assert.strictEqual(r.ok, false, JSON.stringify(over.toString()));
    return r;
  };
  bad(d => { delete d.data.budgets; });
  bad(d => { d.data.transactions[0].amount = -5; });
  bad(d => { d.data.transactions[0].date = 'bad'; });
  bad(d => { d.data.transactions[0].type = 'foo'; });
  bad(d => { d.data.transactions[1].id = d.data.transactions[0].id; });
  bad(d => { d.data.accounts[0].initialBalance = 'x'; });
  bad(d => { d.data.transactions = 'not-array'; });
  assert.strictEqual(core.validateImport(null).ok, false);
  assert.strictEqual(core.validateImport([]).ok, false);
});

test('validateImport：金额非正整数、ID 重复均拒绝', () => {
  const base = {
    version: 1, exportedAt: 'x',
    data: { transactions: [], accounts: [], categories: [], budgets: {}, settings: {} },
  };
  const mk = over => {
    const d = JSON.parse(JSON.stringify(base));
    if (over) over(d);
    return core.validateImport(d);
  };
  assert.strictEqual(mk(d => { d.data.transactions.push(tx({ amount: 25.5 })); }).ok, false);
  assert.strictEqual(mk(d => { d.data.transactions.push(tx({ amount: 0 })); }).ok, false);
  assert.strictEqual(mk(d => { d.data.accounts.push({ id: 'a', name: '', icon: '', initialBalance: 0 }, { id: 'a', name: '', icon: '', initialBalance: 0 }); }).ok, false);
  assert.strictEqual(mk().ok, true);
});

/* ---------- 补强：清洗 / 损坏恢复 / CSV / 周期记账 / 标签 / 环比 / 高频置顶 ---------- */

test('sanitizeLoadedData：剔除脏交易、修复缺 subs 的分类与坏期初余额', () => {
  const cats = [
    { id: 'c1', type: 'expense', name: '餐饮', icon: '🍜', subs: [{ id: 'c1s1', name: '早餐' }] },
    { id: 'c2', type: 'expense', name: '坏分类', icon: 'x' },
    { id: '__proto__', type: 'expense', name: '原型', icon: 'x', subs: [] },
  ];
  const accs = [
    { id: 'a1', name: '现金', icon: '💰', initialBalance: 0 },
    { id: 'a2', name: '坏', icon: 'x', initialBalance: 'x' },
  ];
  const txs = [
    { id: 't1', type: 'expense', amount: 100, categoryId: 'c1', subcategoryId: 'c1s1', accountId: 'a1', toAccountId: null, date: '2026-10-01', note: '', createdAt: 'x' },
    { id: 't2', type: 'expense', amount: '100', categoryId: 'c1', accountId: 'a1', date: '2026-10-01', note: '' },
    { id: 't3', type: 'expense', amount: 100, categoryId: 'nope', accountId: 'a1', date: '2026-10-01', note: '' },
  ];
  const r = core.sanitizeLoadedData(txs, accs, cats);
  assert.deepStrictEqual(r.transactions.map(t => t.id), ['t1']);
  const c2 = core.findCategory(r.categories, 'c2');
  assert.deepStrictEqual(c2.subs, [], '缺 subs 的分类被修复为空数组');
  assert.strictEqual(core.findCategory(r.categories, '__proto__'), null);
  const a2 = r.accounts.find(a => a.id === 'a2');
  assert.strictEqual(a2.initialBalance, 0, '非法期初余额被修复为 0');
  assert.deepStrictEqual(r.dropped, { transactions: 2, categories: 1, accounts: 0 });
});

test('Storage.loadWithRecovery：损坏原文可取回用于备份', () => {
  const backend = memBackend();
  backend.setItem(core.KEYS.transactions, '{oops');
  backend.setItem(core.KEYS.accounts, '[{"id":"a"}]');
  const s = new core.Storage(backend);
  const r = s.loadWithRecovery(core.KEYS.transactions, []);
  assert.deepStrictEqual(r.value, []);
  assert.strictEqual(r.corruptRaw, '{oops');
  const r2 = s.loadWithRecovery(core.KEYS.accounts, []);
  assert.strictEqual(r2.corruptRaw, null);
  assert.deepStrictEqual(r2.value, [{ id: 'a' }]);
  const r3 = s.loadWithRecovery(core.KEYS.budgets, {});
  assert.strictEqual(r3.corruptRaw, null);
  assert.deepStrictEqual(r3.value, {});
});

test('validateImport：拒绝 __proto__ 作为分类 ID', () => {
  const base = {
    version: 1, exportedAt: 'x',
    data: { transactions: [], accounts: [], categories: [], budgets: {}, settings: {} },
  };
  base.data.categories.push({ id: '__proto__', type: 'expense', name: '原型', icon: 'x', subs: [] });
  assert.strictEqual(core.validateImport(base).ok, false);
});

test('toCSV / parseCSV 往返：引号、逗号、换行、标签与转账', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const txs = [
    { id: 't1', type: 'expense', amount: 2550, categoryId: 'e1', subcategoryId: 'e1s1', accountId: 'acc_cash', toAccountId: null, date: '2026-10-02', note: '早餐,豆浆\n油条', tags: ['日常', '早'], createdAt: 'x' },
    { id: 't2', type: 'income', amount: 10000, categoryId: 'i1', subcategoryId: null, accountId: 'acc_bank', toAccountId: null, date: '2026-10-03', note: '', tags: [], createdAt: 'x' },
    { id: 't3', type: 'transfer', amount: 5000, categoryId: null, subcategoryId: null, accountId: 'acc_cash', toAccountId: 'acc_bank', date: '2026-10-03', note: '', tags: [], createdAt: 'x' },
  ];
  const csv = core.toCSV(txs, cats, accs);
  assert.ok(csv.startsWith('\uFEFF'), '带 BOM');
  assert.ok(csv.includes('\r\n'), 'CRLF 行尾');
  const parsed = core.parseCSV(csv, cats, accs);
  assert.deepStrictEqual(parsed.errors, []);
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.transactions.length, 3);
  const back = parsed.transactions[0];
  assert.strictEqual(back.type, 'expense');
  assert.strictEqual(back.amount, 2550);
  assert.strictEqual(back.categoryId, 'e1');
  assert.strictEqual(back.subcategoryId, 'e1s1');
  assert.strictEqual(back.accountId, 'acc_cash');
  assert.strictEqual(back.note, '早餐,豆浆\n油条');
  assert.deepStrictEqual(back.tags, ['日常', '早']);
  assert.strictEqual(parsed.transactions[2].toAccountId, 'acc_bank');
  assert.strictEqual(parsed.transactions[2].categoryId, null);
  assert.strictEqual(parsed.transactions[1].subcategoryId, null);
});

test('parseCSV：未知分类/账户与坏行逐行报错', () => {
  const csv = '\uFEFF类型,日期,金额,大类,子分类,账户,转入账户,标签,备注\r\n'
    + '支出,2026-10-02,10,不存在的分类,,现金,,,x\r\n'
    + '支出,2026-13-01,10,餐饮美食,早餐,现金,,,\r\n'
    + '支出,2026-10-03,abc,餐饮美食,早餐,现金,,,\r\n';
  const r = core.parseCSV(csv, core.DEFAULT_CATEGORIES, core.DEFAULT_ACCOUNTS);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errors.length, 3);
  assert.ok(r.errors.every(e => e.row >= 1 && e.row <= 3));
  assert.deepStrictEqual(r.transactions, []);
});

test('parseCSV：表头不符直接拒绝', () => {
  const r = core.parseCSV('\uFEFFa,b,c\r\n1,2,3\r\n', core.DEFAULT_CATEGORIES, core.DEFAULT_ACCOUNTS);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errors[0].row, 0);
});

test('generateDueRecurrings：月度生成、2 月钳制到 28、推进 nextDate', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const rec = {
    id: 'rc1', type: 'expense', amount: 300000, categoryId: 'e4', subcategoryId: 'e4s1',
    accountId: 'acc_bank', toAccountId: null, note: '房租', tags: ['固定支出'],
    frequency: 'monthly', nextDate: '2026-01-31',
  };
  const r = core.generateDueRecurrings([rec], '2026-03-31', cats, accs);
  assert.strictEqual(r.generated, 3);
  assert.deepStrictEqual(r.transactions.map(t => t.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.strictEqual(r.recurrings[0].nextDate, '2026-04-30');
  assert.ok(r.transactions.every(t => t.recurringId === 'rc1'));
  assert.ok(r.transactions.every(t => core.validateTransaction(t, cats, accs).ok));
  assert.strictEqual(r.transactions[0].note, '房租');
  assert.deepStrictEqual(r.transactions[0].tags, ['固定支出']);
});

test('generateDueRecurrings：每周/每日频率与 60 笔上限', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const weekly = { id: 'w1', type: 'expense', amount: 1000, categoryId: 'e2', subcategoryId: 'e2s1', accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'weekly', nextDate: '2026-09-28' };
  const rw = core.generateDueRecurrings([weekly], '2026-10-05', cats, accs);
  assert.strictEqual(rw.generated, 2);
  assert.deepStrictEqual(rw.transactions.map(t => t.date), ['2026-09-28', '2026-10-05']);
  assert.strictEqual(rw.recurrings[0].nextDate, '2026-10-12');

  const runaway = { id: 'r1', type: 'expense', amount: 100, categoryId: 'e1', subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'daily', nextDate: '2020-01-01' };
  const rr = core.generateDueRecurrings([runaway], '2026-10-02', cats, accs);
  assert.strictEqual(rr.generated, 60, '单模板上限 60 笔');
  assert.deepStrictEqual(rr.errors, []);
});

test('generateDueRecurrings：模板失效报错且不生成', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const bad = { id: 'b1', type: 'expense', amount: 100, categoryId: 'nope', subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-09-01' };
  const r = core.generateDueRecurrings([bad], '2026-10-02', cats, accs);
  assert.strictEqual(r.generated, 0);
  assert.deepStrictEqual(r.transactions, []);
  assert.strictEqual(r.errors.length, 1);
  assert.strictEqual(r.errors[0].recurringId, 'b1');
  assert.strictEqual(r.recurrings[0].nextDate, '2026-09-01', '失效模板 nextDate 不推进');
});

test('rankSubs：按使用频次排序，平局保持原顺序', () => {
  const e1 = core.findCategory(core.DEFAULT_CATEGORIES, 'e1');
  const txs = [
    tx({ id: 'a', categoryId: 'e1', subcategoryId: 'e1s3' }),
    tx({ id: 'b', categoryId: 'e1', subcategoryId: 'e1s1' }),
    tx({ id: 'c', categoryId: 'e1', subcategoryId: 'e1s3' }),
  ];
  const r = core.rankSubs(txs, e1);
  assert.deepStrictEqual(r.map(s => s.subId), ['e1s3', 'e1s1', 'e1s2', 'e1s4', 'e1s5', 'e1s6', 'e1s7', 'e1s8']);
  assert.strictEqual(r[0].count, 2);
  assert.strictEqual(r[1].count, 1);
  assert.strictEqual(r[2].count, 0);
});

test('withCategoryDelta：环比百分比与上月缺失', () => {
  const cur = [
    { categoryId: 'e1', name: '餐饮', icon: '🍜', amountFen: 4000, subs: [] },
    { categoryId: 'e2', name: '交通', icon: '🚌', amountFen: 5000, subs: [] },
  ];
  const prev = [{ categoryId: 'e1', name: '餐饮', icon: '🍜', amountFen: 5000, subs: [] }];
  const r = core.withCategoryDelta(cur, prev);
  const e1 = r.find(c => c.categoryId === 'e1');
  assert.strictEqual(e1.prevAmountFen, 5000);
  assert.strictEqual(e1.deltaPct, -20);
  assert.strictEqual(r.find(c => c.categoryId === 'e2').deltaPct, null);
  assert.strictEqual(r.find(c => c.categoryId === 'e2').prevAmountFen, 0);
});

test('filterTransactions：按标签筛选', () => {
  const tagged = [tx({ id: 't1', tags: ['日常'] }), tx({ id: 't2' }), tx({ id: 't3', tags: ['工作', '日常'] })];
  assert.deepStrictEqual(core.filterTransactions(tagged, { tag: '日常' }, []).map(t => t.id), ['t1', 't3']);
  assert.deepStrictEqual(core.filterTransactions(tagged, { tag: '不存在' }, []), []);
});

test('validateTransaction：标签必须为不超过 5 个、单个不超过 16 字的字符串数组', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  assert.ok(core.validateTransaction(tx({ categoryId: 'e1', tags: ['日常', '工作'] }), cats, accs).ok);
  assert.ok(core.validateTransaction(tx({ categoryId: 'e1' }), cats, accs).ok, '无标签合法');
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', tags: 'x' }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', tags: ['a'.repeat(17)] }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', tags: ['1', '2', '3', '4', '5', '6'] }), cats, accs).ok);
});

test('trash 键：makeKeys 含回收站键，validateImport 容忍可选 trash', () => {
  assert.strictEqual(core.KEYS.trash, 'bk.trash');
  const base = () => ({
    version: 1, exportedAt: 'x',
    data: {
      transactions: [],
      accounts: [{ id: 'acc_cash', name: '现金', icon: '💰', initialBalance: 0 }],
      categories: [{ id: 'e1', type: 'expense', name: '餐饮', icon: '🍜', subs: [] }],
      budgets: {}, settings: {},
    },
  });
  assert.strictEqual(core.validateImport(base()).ok, true, '无 trash 键兼容');
  const withTrash = base();
  withTrash.data.trash = [tx({ id: 't9', categoryId: 'e1' })];
  const r = core.validateImport(withTrash);
  assert.strictEqual(r.ok, true, '合法 trash');
  assert.strictEqual(r.data.trash.length, 1);
  const badTrash = base();
  badTrash.data.trash = [{ id: 'x', amount: -1 }];
  assert.strictEqual(core.validateImport(badTrash).ok, false, '非法 trash 条目拒绝');
});

test('Storage.clear：连同 corrupt-backup 键一起清理', () => {
  const backend = memBackend();
  const s = new core.Storage(backend);
  s.save(core.KEYS.transactions, [{ id: 't' }]);
  backend.setItem(core.KEYS.transactions + '.corrupt-backup', '{oops');
  s.clear();
  assert.strictEqual(backend.getItem(core.KEYS.transactions + '.corrupt-backup'), null);
  assert.strictEqual(backend.getItem(core.KEYS.transactions), null);
});

test('generateDueRecurrings：anchorDay 跨短月不漂移（31 号永远 31 号）', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const rec = { id: 'm31', type: 'expense', amount: 1000, categoryId: 'e1', subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-01-31' };
  let r = core.generateDueRecurrings([rec], '2026-02-15', cats, accs);
  assert.strictEqual(r.generated, 1);
  assert.strictEqual(r.recurrings[0].nextDate, '2026-02-28');
  assert.strictEqual(r.recurrings[0].anchorDay, 31, '首次运行后写入 anchorDay');
  r = core.generateDueRecurrings(r.recurrings, '2026-05-31', cats, accs);
  assert.deepStrictEqual(r.transactions.map(t => t.date), ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  assert.strictEqual(r.recurrings[0].nextDate, '2026-06-30');
  assert.strictEqual(r.recurrings[0].anchorDay, 31);
  r = core.generateDueRecurrings(r.recurrings, '2026-07-31', cats, accs);
  assert.deepStrictEqual(r.transactions.map(t => t.date), ['2026-06-30', '2026-07-31']);
  assert.strictEqual(r.recurrings[0].anchorDay, 31);
});

test('validateImport：recurrings 可选，畸形模板拒绝，旧备份兼容', () => {
  const base = () => ({
    version: 1, exportedAt: 'x',
    data: {
      transactions: [],
      accounts: [
        { id: 'acc_cash', name: '现金', icon: '💰', initialBalance: 0 },
        { id: 'acc_bank', name: '银行卡', icon: '🏦', initialBalance: 0 },
      ],
      categories: [{ id: 'e1', type: 'expense', name: '餐饮', icon: '🍜', subs: [] }],
      budgets: {}, settings: {},
    },
  });
  assert.strictEqual(core.validateImport(base()).ok, true, '无 recurrings 的旧备份');
  const withRec = base();
  withRec.data.recurrings = [{ id: 'rc1', type: 'expense', amount: 2000, categoryId: 'e1', subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-11-01' }];
  assert.strictEqual(core.validateImport(withRec).ok, true, '合法支出模板');
  const withAnchor = base();
  withAnchor.data.recurrings = [{ id: 'rc4', type: 'expense', amount: 2000, categoryId: 'e1', subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-11-01', anchorDay: 31 }];
  assert.strictEqual(core.validateImport(withAnchor).ok, true, '合法 anchorDay');
  const withTransfer = base();
  withTransfer.data.recurrings = [{ id: 'rc2', type: 'transfer', amount: 500000, categoryId: null, subcategoryId: null, accountId: 'acc_cash', toAccountId: 'acc_bank', note: '', tags: [], frequency: 'monthly', nextDate: '2026-11-01' }];
  assert.strictEqual(core.validateImport(withTransfer).ok, true, '转账类周期模板');
  const ghostAccount = base();
  ghostAccount.data.recurrings = [{ id: 'rc5', type: 'expense', amount: 2000, categoryId: 'e1', subcategoryId: null, accountId: 'acc_ghost', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-11-01' }];
  assert.strictEqual(core.validateImport(ghostAccount).ok, false, '引用不存在的账户应拒绝');
  const badTransfer = base();
  badTransfer.data.recurrings = [{ id: 'rc3', type: 'transfer', amount: 500000, categoryId: null, subcategoryId: null, accountId: 'acc_cash', toAccountId: null, note: '', tags: [], frequency: 'monthly', nextDate: '2026-11-01' }];
  assert.strictEqual(core.validateImport(badTransfer).ok, false, '转账缺目标账户应拒绝');
  for (const bad of [null, 'x', { id: 'rc1', type: 'foo', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', frequency: 'monthly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: -5, categoryId: 'e1', accountId: 'acc_cash', frequency: 'monthly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', frequency: 'yearly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', frequency: 'monthly', nextDate: 'bad' }, { id: '__proto__', type: 'expense', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', frequency: 'monthly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', toAccountId: 'acc_bank', frequency: 'monthly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: 2000, categoryId: 'i1', accountId: 'acc_cash', frequency: 'monthly', nextDate: '2026-11-01' }, { id: 'rc1', type: 'expense', amount: 2000, categoryId: 'e1', accountId: 'acc_cash', frequency: 'monthly', nextDate: '2026-11-01', anchorDay: 0 }]) {
    const d = base();
    d.data.recurrings = [bad];
    assert.strictEqual(core.validateImport(d).ok, false, '畸形模板应拒绝：' + JSON.stringify(bad));
  }
});

test('budgetStatus：percent 用整数运算不丢 1%', () => {
  const r = core.budgetStatus({ total: 10000, byCategory: {} }, [{ categoryId: 'e1', name: 'x', icon: 'x', amountFen: 2900, subs: [] }]);
  assert.strictEqual(r.percent, 29);
  const r2 = core.budgetStatus({ total: 300000, byCategory: {} }, [{ categoryId: 'e1', name: 'x', icon: 'x', amountFen: 87000, subs: [] }]);
  assert.strictEqual(r2.percent, 29);
});

test('toCSV/parseCSV：分号标签用「、」分隔后往返保真，公式前缀被剥离', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  const txs = [
    tx({ id: 't9', amount: 100, categoryId: 'e1', subcategoryId: 'e1s1', accountId: 'acc_cash', note: '-2+3', tags: ['a;b', 'c'] }),
  ];
  const csv = core.toCSV(txs, cats, accs);
  assert.ok(csv.includes('#a;b、#c') === false);
  assert.ok(csv.includes('a;b、c'), '标签用「、」连接');
  const parsed = core.parseCSV(csv, cats, accs);
  assert.strictEqual(parsed.ok, true, parsed.errors.join('；'));
  assert.deepStrictEqual(parsed.transactions[0].tags, ['a;b', 'c']);
  assert.strictEqual(parsed.transactions[0].note, '-2+3', '公式前缀剥离后往返一致');
});

test('toCSV/parseCSV：=+-@ 开头的分类与账户名往返', () => {
  const cats = [{ id: 'c1', type: 'expense', name: '-测试分类', icon: '🧪', subs: [] }];
  const accs = [{ id: 'a1', name: '=特殊账户', icon: '💰', initialBalance: 0 }];
  const txs = [tx({ id: 't1', amount: 500, categoryId: 'c1', subcategoryId: null, accountId: 'a1', note: '' })];
  const csv = core.toCSV(txs, cats, accs);
  const parsed = core.parseCSV(csv, cats, accs);
  assert.strictEqual(parsed.ok, true, parsed.errors.join('；'));
  assert.strictEqual(parsed.transactions[0].categoryId, 'c1');
  assert.strictEqual(parsed.transactions[0].accountId, 'a1');
});

test('长度上限：note ≤200，导入名称 ≤30，sanitize 截断超长旧名', () => {
  const cats = core.DEFAULT_CATEGORIES, accs = core.DEFAULT_ACCOUNTS;
  assert.ok(core.validateTransaction(tx({ categoryId: 'e1', note: 'x'.repeat(200) }), cats, accs).ok);
  assert.ok(!core.validateTransaction(tx({ categoryId: 'e1', note: 'x'.repeat(201) }), cats, accs).ok);
  const base = () => ({
    version: 1, exportedAt: 'x',
    data: { transactions: [], accounts: [{ id: 'acc_cash', name: '现金', icon: '💰', initialBalance: 0 }], categories: [{ id: 'e1', type: 'expense', name: '餐饮', icon: '🍜', subs: [] }], budgets: {}, settings: {} },
  });
  const longName = base();
  longName.data.accounts[0].name = 'x'.repeat(31);
  assert.strictEqual(core.validateImport(longName).ok, false, '账户名超长应拒绝');
  const longCat = base();
  longCat.data.categories[0].name = 'x'.repeat(31);
  assert.strictEqual(core.validateImport(longCat).ok, false, '分类名超长应拒绝');
  const dirty = {
    transactions: [], accounts: [{ id: 'a1', name: 'x'.repeat(40), icon: '💰', initialBalance: 0 }],
    categories: [{ id: 'c1', type: 'expense', name: 'y'.repeat(40), icon: '🍜', subs: [{ id: 'c1s1', name: 'z'.repeat(40) }] }],
  };
  const r = core.sanitizeLoadedData(dirty.transactions, dirty.accounts, dirty.categories);
  assert.strictEqual(r.accounts[0].name.length, 30, '旧数据名称截断为 30');
  assert.strictEqual(r.categories[0].name.length, 30);
  assert.strictEqual(r.categories[0].subs[0].name.length, 30);
});

test('dailyInOut：每日收入/支出聚合，转账不计，跨月过滤', () => {
  const list = [
    tx({ id: 'a', type: 'expense', amount: 1000, date: '2026-10-02', accountId: 'acc_cash' }),
    tx({ id: 'b', type: 'income', amount: 5000, date: '2026-10-02', accountId: 'acc_bank' }),
    tx({ id: 'c', type: 'expense', amount: 200, date: '2026-10-15', accountId: 'acc_cash' }),
    tx({ id: 'd', type: 'transfer', amount: 800, date: '2026-10-02', accountId: 'acc_cash', toAccountId: 'acc_bank' }),
    tx({ id: 'e', type: 'expense', amount: 999, date: '2026-09-01', accountId: 'acc_cash' }),
  ];
  const r = core.dailyInOut(list, '2026-10');
  assert.strictEqual(r.length, 31);
  assert.deepStrictEqual(r[1], { day: 2, incomeFen: 5000, expenseFen: 1000 });
  assert.deepStrictEqual(r[14], { day: 15, incomeFen: 0, expenseFen: 200 });
  assert.strictEqual(r[0].expenseFen, 0);
  const feb = core.dailyInOut(list, '2026-02');
  assert.strictEqual(feb.length, 28);
  assert.ok(feb.every(d => d.incomeFen === 0 && d.expenseFen === 0));
});

test('yearStats：年度聚合、月度数组与跨年过滤', () => {
  const list = [
    tx({ id: 'a', type: 'expense', amount: 1000, date: '2026-01-15', categoryId: 'e1' }),
    tx({ id: 'b', type: 'expense', amount: 2000, date: '2026-03-20', categoryId: 'e2' }),
    tx({ id: 'c', type: 'income', amount: 100000, date: '2026-03-25', categoryId: 'i1' }),
    tx({ id: 'd', type: 'expense', amount: 500, date: '2025-12-31', categoryId: 'e1' }),
    tx({ id: 'e', type: 'transfer', amount: 800, date: '2026-03-26', accountId: 'acc_cash', toAccountId: 'acc_bank' }),
  ];
  const r = core.yearStats(list, 2026);
  assert.strictEqual(r.incomeFen, 100000);
  assert.strictEqual(r.expenseFen, 3000);
  assert.strictEqual(r.monthly.length, 12);
  assert.deepStrictEqual(r.monthly[0], { monthKey: '2026-01', incomeFen: 0, expenseFen: 1000 });
  assert.deepStrictEqual(r.monthly[2], { monthKey: '2026-03', incomeFen: 100000, expenseFen: 2000 });
  assert.strictEqual(r.monthly[11].expenseFen, 0);
  assert.strictEqual(r.topExpense[0].categoryId, 'e2');
  assert.strictEqual(r.topExpense[0].amountFen, 2000);
  assert.strictEqual(core.yearStats(list, 2025).expenseFen, 500);
});

test('filterTransactions：金额区间与日期筛选', () => {
  const cats1 = core.DEFAULT_CATEGORIES;
  const list = [
    tx({ id: 'a', amount: 100, date: '2026-10-02' }),
    tx({ id: 'b', amount: 5000, date: '2026-10-02' }),
    tx({ id: 'c', amount: 100000, date: '2026-10-02' }),
    tx({ id: 'd', amount: 100, date: '2026-10-15' }),
  ];
  const r = core.filterTransactions(list, { minAmountFen: 100, maxAmountFen: 5000 }, cats1);
  assert.deepStrictEqual(r.map(t => t.id), ['d', 'a', 'b'], '闭区间，日期倒序（同日按创建顺序）');
  assert.deepStrictEqual(core.filterTransactions(list, { maxAmountFen: 4999 }, cats1).map(t => t.id), ['d', 'a'], '超上限排除');
  assert.deepStrictEqual(core.filterTransactions(list, { day: 15 }, cats1).map(t => t.id), ['d']);
});

test('parseBillCsv：支付宝账单解析（元数据头、不计收支、退款跳过）', () => {
  const accs = core.DEFAULT_ACCOUNTS;
  const text = [
    '支付宝交易记录明细查询,,,',
    '账号:[xxx@xxx],,,',
    '----------------------------------------,,,',
    '交易创建时间,交易对方,商品名称,金额（元）,收/支,交易状态',
    '2026-10-01 12:00:00,某某超市,日用品,25.50,支出,交易成功',
    '2026-10-02 09:00:00,某某公司,工资,10000.00,收入,交易成功',
    '2026-10-03 10:00:00,某某店,咖啡,15.00,不计收支,交易成功',
    '2026-10-04 11:00:00,某某店,退款单,20.00,支出,退款成功',
  ].join('\r\n');
  const r = core.parseBillCsv(text, 'alipay', accs, { fallbackAccountId: 'acc_cash' });
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.transactions.length, 2);
  assert.strictEqual(r.transactions[0].amount, 2550);
  assert.strictEqual(r.transactions[0].categoryId, 'e10');
  assert.strictEqual(r.transactions[0].accountId, 'acc_alipay', '支付宝账单优先落到同名账户');
  assert.strictEqual(r.transactions[1].type, 'income');
  assert.strictEqual(r.transactions[1].categoryId, 'i5');
});

test('parseBillCsv：微信账单解析（¥ 前缀、零钱映射、/ 跳过）', () => {
  const accs = core.DEFAULT_ACCOUNTS;
  const text = [
    '微信支付账单明细,,,,,',
    '导出时间:[2026-11-01 10:00:00],,,,,',
    '---------------,,,,,',
    '交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注',
    '2026-10-01 20:00:00,商户消费,某某便利店,日用,支出,¥12.50,零钱,支付成功,10001,20001,/',
    '2026-10-02 10:00:00,微信红包,发给某某,红包,支出,¥66.00,零钱,已转账,10002,20002,/',
    '2026-10-03 12:00:00,收到的红包,某某,红包,收入,¥88.00,零钱,已存入零钱,10003,20003,/',
    '2026-10-04 13:00:00,转账-退款,某某,转账退款,/,¥50.00,零钱,退款到账,10004,20004,/',
  ].join('\r\n');
  const r = core.parseBillCsv(text, 'wechat', accs, { fallbackAccountId: 'acc_cash' });
  assert.strictEqual(r.transactions.length, 3);
  const first = r.transactions[0];
  assert.strictEqual(first.amount, 1250);
  assert.strictEqual(first.accountId, 'acc_wechat', '支付方式零钱映射到微信零钱账户');
  assert.strictEqual(first.categoryId, 'e10');
  assert.strictEqual(r.transactions[2].type, 'income');
  assert.strictEqual(r.transactions[2].categoryId, 'i5');
  assert.strictEqual(r.errors.length, 0);
});

test('parseBillCsv：未知支付方式落 fallback，非法行报错', () => {
  const accs = [{ id: 'acc_bank', name: '招行储蓄卡', icon: '🏦', initialBalance: 0 }];
  const text = [
    '微信支付账单明细,,,,,',
    '交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注',
    '2026-10-01 20:00:00,商户消费,便利店,日用,支出,¥12.00,招商银行(1234),支付成功,1,2,/',
    '2026-10-02 20:00:00,商户消费,便利店,日用,支出,abc,零钱,支付成功,3,4,/',
  ].join('\r\n');
  const r = core.parseBillCsv(text, 'wechat', accs, { fallbackAccountId: 'acc_bank' });
  assert.strictEqual(r.transactions.length, 1);
  assert.strictEqual(r.transactions[0].accountId, 'acc_bank', '含「银行」的支付方式映射到银行卡');
  assert.strictEqual(r.errors.length, 1);
  assert.strictEqual(r.errors[0].row, 4);
});

test('detectBillKind：识别支付宝/微信/标准格式', () => {
  assert.strictEqual(core.detectBillKind('微信支付账单明细\n交易时间,交易类型'), 'wechat');
  assert.strictEqual(core.detectBillKind('支付宝交易记录明细查询\n交易创建时间'), 'alipay');
  assert.strictEqual(core.detectBillKind('类型,日期,金额（元）'), null);
});

/* ---------- run ---------- */

(async () => {
  let passed = 0, failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); passed++; console.log('PASS  ' + name); }
    catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.message ? e.message : e)); }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
