(function (global) {
  'use strict';

  /* ================= 默认分类与账户 ================= */

  const DEFAULT_CATEGORIES = [
    {
      id: 'e1', type: 'expense', name: '餐饮美食', icon: '🍜', subs: [
        { id: 'e1s1', name: '早餐' }, { id: 'e1s2', name: '午餐' }, { id: 'e1s3', name: '晚餐' },
        { id: 'e1s4', name: '夜宵零食' }, { id: 'e1s5', name: '饮品咖啡' }, { id: 'e1s6', name: '外卖' },
        { id: 'e1s7', name: '聚餐请客' }, { id: 'e1s8', name: '食材买菜' },
      ],
    },
    {
      id: 'e2', type: 'expense', name: '交通出行', icon: '🚌', subs: [
        { id: 'e2s1', name: '公交地铁' }, { id: 'e2s2', name: '打车网约车' }, { id: 'e2s3', name: '加油' },
        { id: 'e2s4', name: '停车费' }, { id: 'e2s5', name: '过路费' }, { id: 'e2s6', name: '火车高铁' },
        { id: 'e2s7', name: '飞机' }, { id: 'e2s8', name: '共享单车' }, { id: 'e2s9', name: '养车维修' },
      ],
    },
    {
      id: 'e3', type: 'expense', name: '购物消费', icon: '🛒', subs: [
        { id: 'e3s1', name: '日用百货' }, { id: 'e3s2', name: '服饰鞋包' }, { id: 'e3s3', name: '数码家电' },
        { id: 'e3s4', name: '美妆护肤' }, { id: 'e3s5', name: '家具家居' }, { id: 'e3s6', name: '母婴用品' },
        { id: 'e3s7', name: '宠物用品' }, { id: 'e3s8', name: '书籍文具' },
      ],
    },
    {
      id: 'e4', type: 'expense', name: '居住生活', icon: '🏠', subs: [
        { id: 'e4s1', name: '房租房贷' }, { id: 'e4s2', name: '物业费' }, { id: 'e4s3', name: '水电燃气' },
        { id: 'e4s4', name: '网费宽带' }, { id: 'e4s5', name: '话费充值' }, { id: 'e4s6', name: '家电维修' },
        { id: 'e4s7', name: '清洁家政' },
      ],
    },
    {
      id: 'e5', type: 'expense', name: '娱乐休闲', icon: '🎮', subs: [
        { id: 'e5s1', name: '电影演出' }, { id: 'e5s2', name: '游戏充值' }, { id: 'e5s3', name: '旅游度假' },
        { id: 'e5s4', name: '运动健身' }, { id: 'e5s5', name: '会员订阅' }, { id: 'e5s6', name: '酒吧夜店' },
        { id: 'e5s7', name: '兴趣爱好' },
      ],
    },
    {
      id: 'e6', type: 'expense', name: '医疗健康', icon: '🏥', subs: [
        { id: 'e6s1', name: '门诊看病' }, { id: 'e6s2', name: '药品购买' }, { id: 'e6s3', name: '体检' },
        { id: 'e6s4', name: '保健养生' }, { id: 'e6s5', name: '牙科口腔' }, { id: 'e6s6', name: '眼镜视力' },
        { id: 'e6s7', name: '住院手术' },
      ],
    },
    {
      id: 'e7', type: 'expense', name: '教育学习', icon: '📖', subs: [
        { id: 'e7s1', name: '培训课程' }, { id: 'e7s2', name: '学费书本' }, { id: 'e7s3', name: '考试报名' },
        { id: 'e7s4', name: '网课知识付费' }, { id: 'e7s5', name: '考证教材' },
      ],
    },
    {
      id: 'e8', type: 'expense', name: '人情往来', icon: '🎁', subs: [
        { id: 'e8s1', name: '红包送礼' }, { id: 'e8s2', name: '礼物赠送' }, { id: 'e8s3', name: '请客吃饭' },
        { id: 'e8s4', name: '份子钱' }, { id: 'e8s5', name: '孝敬父母' }, { id: 'e8s6', name: '捐赠慈善' },
      ],
    },
    {
      id: 'e9', type: 'expense', name: '金融保险', icon: '💳', subs: [
        { id: 'e9s1', name: '保险费用' }, { id: 'e9s2', name: '利息手续费' }, { id: 'e9s3', name: '罚款滞纳金' },
        { id: 'e9s4', name: '税费缴纳' }, { id: 'e9s5', name: '投资亏损' },
      ],
    },
    {
      id: 'e10', type: 'expense', name: '其他支出', icon: '📦', subs: [
        { id: 'e10s1', name: '快递物流' }, { id: 'e10s2', name: '维修安装' }, { id: 'e10s3', name: '丢失损坏' },
        { id: 'e10s4', name: '临时应急' }, { id: 'e10s5', name: '其他杂项' },
      ],
    },
    {
      id: 'i1', type: 'income', name: '工资薪酬', icon: '💼', subs: [
        { id: 'i1s1', name: '工资' }, { id: 'i1s2', name: '奖金' }, { id: 'i1s3', name: '加班费' },
        { id: 'i1s4', name: '年终奖' }, { id: 'i1s5', name: '补贴津贴' },
      ],
    },
    {
      id: 'i2', type: 'income', name: '兼职副业', icon: '💡', subs: [
        { id: 'i2s1', name: '兼职外快' }, { id: 'i2s2', name: '自媒体收益' }, { id: 'i2s3', name: '稿费收入' },
        { id: 'i2s4', name: '咨询服务' }, { id: 'i2s5', name: '摆摊创业' },
      ],
    },
    {
      id: 'i3', type: 'income', name: '理财收益', icon: '📈', subs: [
        { id: 'i3s1', name: '银行利息' }, { id: 'i3s2', name: '基金收益' }, { id: 'i3s3', name: '股票收益' },
        { id: 'i3s4', name: '分红返利' }, { id: 'i3s5', name: '零钱理财' },
      ],
    },
    {
      id: 'i4', type: 'income', name: '红包礼金', icon: '🧧', subs: [
        { id: 'i4s1', name: '收到红包' }, { id: 'i4s2', name: '退款到账' },
        { id: 'i4s3', name: '报销入账' }, { id: 'i4s4', name: '中奖彩票' },
      ],
    },
    {
      id: 'i5', type: 'income', name: '其他收入', icon: '🧺', subs: [
        { id: 'i5s1', name: '二手转卖' }, { id: 'i5s2', name: '押金退还' }, { id: 'i5s3', name: '其他收入' },
      ],
    },
  ];

  const DEFAULT_ACCOUNTS = [
    { id: 'acc_cash', name: '现金', icon: '💰', initialBalance: 0 },
    { id: 'acc_wechat', name: '微信零钱', icon: '🟢', initialBalance: 0 },
    { id: 'acc_alipay', name: '支付宝', icon: '🔵', initialBalance: 0 },
    { id: 'acc_bank', name: '银行卡', icon: '🏦', initialBalance: 0 },
    { id: 'acc_credit', name: '信用卡', icon: '💳', initialBalance: 0 },
    { id: 'acc_other', name: '其他账户', icon: '📦', initialBalance: 0 },
  ];

  function getCategories(type) {
    return DEFAULT_CATEGORIES.filter(c => c.type === type);
  }
  function findCategory(categories, id) {
    if (!Array.isArray(categories)) return null;
    return categories.find(c => c && c.id === id) || null;
  }
  function findSub(category, subId) {
    if (!category || !Array.isArray(category.subs)) return null;
    return category.subs.find(s => s && s.id === subId) || null;
  }

  /* ================= 基础工具 ================= */

  function pad2(n) { return String(n).padStart(2, '0'); }

  function genId(prefix) {
    let s = '';
    for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
    return prefix + '_' + s;
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function monthKeyOf(dateStr) {
    return (typeof dateStr === 'string' && /^\d{4}-\d{2}/.test(dateStr)) ? dateStr.slice(0, 7) : '';
  }

  function shiftMonth(monthKey, delta) {
    const parts = String(monthKey).split('-').map(Number);
    const total = parts[0] * 12 + (parts[1] - 1) + delta;
    return Math.floor(total / 12) + '-' + pad2((total % 12 + 12) % 12 + 1);
  }

  function daysInMonth(monthKey) {
    const parts = String(monthKey).split('-').map(Number);
    return new Date(parts[0], parts[1], 0).getDate();
  }

  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
    if (m < 1 || m > 12 || d < 1) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function dateAt(y, m, d) {
    return y + '-' + pad2(m) + '-' + pad2(d);
  }

  function addDays(dateStr, n) {
    const y = Number(dateStr.slice(0, 4)), m = Number(dateStr.slice(5, 7)), d = Number(dateStr.slice(8, 10));
    const dt = new Date(y, m - 1, d + n);
    return dateAt(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  function addMonthsClamped(dateStr, n, anchorDay) {
    const y = Number(dateStr.slice(0, 4)), m = Number(dateStr.slice(5, 7));
    const total = y * 12 + (m - 1) + n;
    const ny = Math.floor(total / 12), nm = (total % 12 + 12) % 12 + 1;
    const day = Math.min(anchorDay, daysInMonth(ny + '-' + pad2(nm)));
    return dateAt(ny, nm, day);
  }

  function parseYuanToFen(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return null;
    const s = String(str).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    let intPart = s, frac = '';
    const dot = s.indexOf('.');
    if (dot >= 0) { intPart = s.slice(0, dot); frac = s.slice(dot + 1); }
    let fen = Number(intPart) * 100;
    if (frac.length <= 2) {
      fen += Number(frac.padEnd(2, '0') || '0');
    } else {
      fen += Number(frac.slice(0, 2));
      if (Number(frac[2]) >= 5) fen += 1;
    }
    return fen > 0 && fen <= Number.MAX_SAFE_INTEGER ? fen : null;
  }

  function formatFen(fen) {
    const n = Math.round(Number(fen) || 0);
    if (!Number.isFinite(n)) return '0.00';
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    return sign + Math.floor(abs / 100) + '.' + pad2(abs % 100);
  }

  /* ================= 校验 ================= */

  const TX_TYPES = ['expense', 'income', 'transfer'];
  const VALID_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const MAX_TAGS = 5;
  const MAX_TAG_LEN = 16;

  function validTags(tags) {
    if (tags == null) return true;
    if (!Array.isArray(tags) || tags.length > MAX_TAGS) return false;
    return tags.every(t => typeof t === 'string' && t.length > 0 && t.length <= MAX_TAG_LEN);
  }

  function validateTransaction(t, categories, accounts) {
    if (!t || typeof t !== 'object') return { ok: false, errors: ['数据不完整'] };
    const errors = [];
    const type = t.type;
    if (!TX_TYPES.includes(type)) errors.push('类型必须是支出、收入或转账');
    if (!Number.isInteger(t.amount) || t.amount <= 0 || t.amount > Number.MAX_SAFE_INTEGER) errors.push('金额必须是大于 0 且不超过上限的数字');
    if (!isValidDate(t.date)) errors.push('日期格式不正确');
    if (t.note != null && (typeof t.note !== 'string' || t.note.length > 200)) errors.push('备注必须是 200 字以内的文本');
    if (!validTags(t.tags)) errors.push('标签最多 5 个，单个不超过 16 个字符');
    const accIds = new Set((accounts || []).map(a => a.id));
    if (!accIds.has(t.accountId)) errors.push('账户不存在');
    if (type === 'transfer') {
      if (!accIds.has(t.toAccountId)) errors.push('转账目标账户不存在');
      else if (t.toAccountId === t.accountId) errors.push('转账双方不能是同一账户');
      if (t.categoryId) errors.push('转账不需要选择分类');
    } else if (type === 'expense' || type === 'income') {
      const cat = findCategory(categories, t.categoryId);
      if (!cat) errors.push('分类不存在');
      else if (cat.type !== type) errors.push(type === 'expense' ? '支出必须选择支出分类' : '收入必须选择收入分类');
      else if (t.subcategoryId != null && t.subcategoryId !== '' && !findSub(cat, t.subcategoryId)) errors.push('子分类不属于所选大类');
    }
    return { ok: errors.length === 0, errors };
  }

  /* ================= 存储层 ================= */

  function makeKeys(prefix) {
    return {
      transactions: prefix + 'transactions',
      accounts: prefix + 'accounts',
      categories: prefix + 'categories',
      budgets: prefix + 'budgets',
      settings: prefix + 'settings',
      recurrings: prefix + 'recurrings',
      trash: prefix + 'trash',
    };
  }
  const KEYS = makeKeys('bk.');

  function memBackend() {
    const store = {};
    return {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    };
  }

  class Storage {
    constructor(backend, prefix) {
      this.backend = backend;
      this.keys = makeKeys(prefix || 'bk.');
    }
    load(key, fallback) {
      try {
        const raw = this.backend.getItem(key);
        if (raw == null) return fallback;
        const val = JSON.parse(raw);
        if (val === null || typeof val !== 'object') return fallback;
        return val;
      } catch (e) {
        return fallback;
      }
    }
    loadWithRecovery(key, fallback) {
      let raw;
      try { raw = this.backend.getItem(key); } catch (e) { return { value: fallback, corruptRaw: null }; }
      if (raw == null) return { value: fallback, corruptRaw: null };
      try {
        const val = JSON.parse(raw);
        if (val === null || typeof val !== 'object') return { value: fallback, corruptRaw: raw };
        return { value: val, corruptRaw: null };
      } catch (e) {
        return { value: fallback, corruptRaw: raw };
      }
    }
    saveRaw(key, rawStr) {
      try { this.backend.setItem(key, String(rawStr)); return true; } catch (e) { return false; }
    }
    save(key, val) {
      if (val === null || typeof val !== 'object') return false;
      try { this.backend.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    }
    clear() {
      for (const k of Object.values(this.keys)) {
        try { this.backend.removeItem(k); } catch (e) { /* 同上 */ }
        try { this.backend.removeItem(k + '.corrupt-backup'); } catch (e) { /* 同上 */ }
      }
    }
  }

  function createBrowserStorage() {
    try {
      const ls = global.localStorage;
      if (!ls) throw new Error('unavailable');
      ls.setItem('__bk_probe__', '1');
      ls.removeItem('__bk_probe__');
      return { backend: ls, available: true };
    } catch (e) {
      return { backend: memBackend(), available: false };
    }
  }

  /* ================= 统计与预算 ================= */

  function accountBalances(accounts, transactions) {
    const m = new Map();
    for (const a of accounts) m.set(a.id, Number(a.initialBalance) || 0);
    for (const t of transactions) {
      if (t.type === 'income') m.set(t.accountId, (m.get(t.accountId) || 0) + t.amount);
      else if (t.type === 'expense') m.set(t.accountId, (m.get(t.accountId) || 0) - t.amount);
      else if (t.type === 'transfer') {
        m.set(t.accountId, (m.get(t.accountId) || 0) - t.amount);
        m.set(t.toAccountId, (m.get(t.toAccountId) || 0) + t.amount);
      }
    }
    return m;
  }

  function filterTransactions(list, f, categories) {
    f = f || {};
    const cats = Array.isArray(categories) ? categories : [];
    const subNameToCat = new Map();
    for (const c of cats) for (const s of (c.subs || [])) subNameToCat.set(s.id, c.name);
    return list.filter(t => {
      if (f.monthKey && monthKeyOf(t.date) !== f.monthKey) return false;
      if (f.type && t.type !== f.type) return false;
      if (f.accountId && t.accountId !== f.accountId && t.toAccountId !== f.accountId) return false;
      if (f.day && Number(t.date.slice(8, 10)) !== f.day) return false;
      if (f.minAmountFen != null && !(typeof t.amount === 'number' && t.amount >= f.minAmountFen)) return false;
      if (f.maxAmountFen != null && !(typeof t.amount === 'number' && t.amount <= f.maxAmountFen)) return false;
      if (f.tag && !(Array.isArray(t.tags) && t.tags.includes(f.tag))) return false;
      if (f.categoryId) {
        if (t.type === 'transfer' || t.categoryId !== f.categoryId) return false;
      }
      if (f.keyword) {
        const kw = String(f.keyword).toLowerCase();
        const cat = findCategory(cats, t.categoryId);
        const sub = cat ? findSub(cat, t.subcategoryId) : null;
        const names = [cat ? cat.name : '', sub ? sub.name : '', subNameToCat.get(t.subcategoryId) || ''];
        const hay = [t.note || ''].concat(names).join(' ').toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const ca = a.createdAt || '', cb = b.createdAt || '';
      if (ca !== cb) return ca < cb ? 1 : -1;
      return 0;
    });
  }

  function monthSummary(list, monthKey) {
    let income = 0, expense = 0;
    for (const t of list) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { incomeFen: income, expenseFen: expense, balanceFen: income - expense };
  }

  function categoryTotals(list, categories, monthKey, type) {
    const byId = new Map();
    for (const c of categories) {
      if (c.type !== type) continue;
      byId.set(c.id, {
        categoryId: c.id, name: c.name, icon: c.icon, amountFen: 0,
        subs: (c.subs || []).map(s => ({ subId: s.id, name: s.name, amountFen: 0 })),
      });
    }
    for (const t of list) {
      if (t.type !== type) continue;
      if (monthKey && monthKeyOf(t.date) !== monthKey) continue;
      const bucket = byId.get(t.categoryId);
      if (!bucket) continue;
      bucket.amountFen += t.amount;
      if (t.subcategoryId) {
        const sub = bucket.subs.find(s => s.subId === t.subcategoryId);
        if (sub) sub.amountFen += t.amount;
      }
    }
    const arr = Array.from(byId.values()).filter(c => c.amountFen > 0);
    arr.sort((a, b) => b.amountFen - a.amountFen);
    for (const c of arr) {
      c.subs = c.subs.filter(s => s.amountFen > 0).sort((a, b) => b.amountFen - a.amountFen);
    }
    return arr;
  }

  function dailyInOut(list, monthKey) {
    const n = daysInMonth(monthKey);
    const arr = Array.from({ length: n }, (_, i) => ({ day: i + 1, incomeFen: 0, expenseFen: 0 }));
    for (const t of list) {
      if (t.type !== 'income' && t.type !== 'expense') continue;
      if (monthKeyOf(t.date) !== monthKey) continue;
      const d = Number(t.date.slice(8, 10));
      if (d < 1 || d > n) continue;
      if (t.type === 'income') arr[d - 1].incomeFen += t.amount;
      else arr[d - 1].expenseFen += t.amount;
    }
    return arr;
  }

  function dailyTotals(list, monthKey) {
    const n = daysInMonth(monthKey);
    const arr = Array.from({ length: n }, (_, i) => ({ day: i + 1, amountFen: 0 }));
    for (const t of list) {
      if (t.type !== 'expense') continue;
      if (monthKeyOf(t.date) !== monthKey) continue;
      const d = Number(t.date.slice(8, 10));
      if (d >= 1 && d <= n) arr[d - 1].amountFen += t.amount;
    }
    return arr;
  }

  function monthlyTrend(list, endMonthKey, months) {
    const startKey = shiftMonth(endMonthKey, -(months - 1));
    const acc = new Map();
    for (const t of list) {
      const mk = monthKeyOf(t.date);
      if (mk < startKey || mk > endMonthKey) continue;
      if (!acc.has(mk)) acc.set(mk, { incomeFen: 0, expenseFen: 0 });
      const a = acc.get(mk);
      if (t.type === 'income') a.incomeFen += t.amount;
      else if (t.type === 'expense') a.expenseFen += t.amount;
    }
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const mk = shiftMonth(endMonthKey, -i);
      const a = acc.get(mk) || { incomeFen: 0, expenseFen: 0 };
      out.push({ monthKey: mk, incomeFen: a.incomeFen, expenseFen: a.expenseFen });
    }
    return out;
  }

  function yearStats(list, year) {
    const y = String(year);
    let incomeFen = 0, expenseFen = 0;
    const monthly = Array.from({ length: 12 }, (_, i) => ({ monthKey: y + '-' + pad2(i + 1), incomeFen: 0, expenseFen: 0 }));
    const catAcc = new Map();
    for (const t of list) {
      if (monthKeyOf(t.date).slice(0, 4) !== y) continue;
      const mi = Number(t.date.slice(5, 7)) - 1;
      if (t.type === 'income') {
        incomeFen += t.amount;
        monthly[mi].incomeFen += t.amount;
      } else if (t.type === 'expense') {
        expenseFen += t.amount;
        monthly[mi].expenseFen += t.amount;
        if (t.categoryId) catAcc.set(t.categoryId, (catAcc.get(t.categoryId) || 0) + t.amount);
      }
    }
    const topExpense = Array.from(catAcc, ([categoryId, amountFen]) => ({ categoryId, amountFen }))
      .sort((a, b) => b.amountFen - a.amountFen);
    return { year: y, incomeFen, expenseFen, balanceFen: incomeFen - expenseFen, monthly, topExpense };
  }

  function levelOf(ratio) {
    return ratio > 1 ? 'over' : (ratio >= 0.7 ? 'warn' : 'ok');
  }

  function budgetStatus(budgetEntry, catTotals) {
    const total = budgetEntry && Number(budgetEntry.total) > 0 ? Number(budgetEntry.total) : 0;
    const byCategory = (budgetEntry && budgetEntry.byCategory) || {};
    const spent = catTotals.reduce((s, c) => s + c.amountFen, 0);
    const hasCatBudget = Object.keys(byCategory).some(k => Number(byCategory[k]) > 0);
    if (!total && !hasCatBudget) {
      return { hasBudget: false, totalFen: 0, spentFen: spent, remainingFen: -spent, percent: 0, level: null, perCategory: [] };
    }
    const ratio = total > 0 ? spent / total : 0;
    const perCategory = [];
    for (const c of catTotals) {
      const b = Number(byCategory[c.categoryId]) || 0;
      if (b <= 0) continue;
      const r = c.amountFen / b;
      perCategory.push({
        categoryId: c.categoryId, name: c.name, icon: c.icon,
        budgetFen: b, spentFen: c.amountFen,
        percent: Math.floor(c.amountFen * 100 / b), level: levelOf(r),
      });
    }
    return {
      hasBudget: true, totalFen: total, spentFen: spent,
      remainingFen: total - spent, percent: Math.floor(spent * 100 / total),
      level: levelOf(ratio), perCategory,
    };
  }

  /* ================= 第三方账单导入（支付宝/微信） ================= */

  function detectBillKind(text) {
    const s = String(text || '');
    if (s.indexOf('微信支付账单明细') >= 0) return 'wechat';
    if (s.indexOf('支付宝交易记录明细') >= 0 || s.indexOf('交易创建时间') >= 0) return 'alipay';
    return null;
  }

  const BILL_KINDS = {
    alipay: {
      name: '支付宝',
      requiredCols: ['交易创建时间', '收/支', '金额（元）'],
      timeCol: '交易创建时间',
      amountCol: '金额（元）',
      payCol: null,
      noteCols: ['类型', '交易对方', '商品名称'],
      statusCol: '交易状态',
      statusOk: st => st === '交易成功',
    },
    wechat: {
      name: '微信',
      requiredCols: ['交易时间', '收/支', '金额(元)'],
      timeCol: '交易时间',
      amountCol: '金额(元)',
      payCol: '支付方式',
      noteCols: ['交易类型', '交易对方', '商品', '备注'],
      statusCol: '当前状态',
      statusOk: st => st.indexOf('退款') < 0 && st.indexOf('撤销') < 0 && st.indexOf('冲正') < 0
        && (st.indexOf('成功') >= 0 || st.indexOf('已转账') >= 0 || st.indexOf('已存入') >= 0 || st.indexOf('已收钱') >= 0),
    },
  };

  function mapBillAccount(payName, kind, accounts, fallbackAccountId) {
    const name = String(payName || '');
    const named = accounts.find(a => a.name && a.name.length >= 2 && name.indexOf(a.name) >= 0);
    if (named) return named;
    const kindKw = kind === 'alipay' ? '支付宝' : '微信';
    const keywords = [kindKw, '零钱', '银行卡', '银行', '现金'];
    for (const kw of keywords) {
      if (name.indexOf(kw) >= 0) {
        const acc = accounts.find(a => (a.name || '').indexOf(kw) >= 0);
        if (acc) return acc;
      }
    }
    const kindAcc = accounts.find(a => (a.name || '').indexOf(kindKw) >= 0);
    if (kindAcc) return kindAcc;
    return accounts.find(a => a.id === fallbackAccountId) || accounts[0] || null;
  }

  function parseBillCsv(text, kind, accounts, options) {
    options = options || {};
    const fallbackAccountId = options.fallbackAccountId || null;
    const categories = Array.isArray(options.categories) && options.categories.length ? options.categories : DEFAULT_CATEGORIES;
    const bill = BILL_KINDS[kind];
    const errors = [];
    if (!bill) return { ok: false, headerFound: false, errors: [{ row: 0, message: '不支持的账单类型：' + kind }], transactions: [] };
    const rows = parseCsvRows(String(text || '').replace(/^\uFEFF/, ''));
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const h = rows[i].map(x => x.trim());
      if (bill.requiredCols.every(w => h.indexOf(w) >= 0)) { headerIdx = i; break; }
    }
    if (headerIdx === -1) {
      return { ok: false, headerFound: false, errors: [{ row: 0, message: '未找到' + bill.name + '账单列头，请确认导出的原始账单文件' }], transactions: [] };
    }
    const cols = rows[headerIdx].map(x => x.trim());
    const colIdx = name => cols.indexOf(name);
    const out = [];
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const f = rows[r];
      const rowNo = r + 1;
      if (f.length === 1 && !f[0].trim()) continue;
      const get = name => { const i2 = colIdx(name); return i2 >= 0 ? (f[i2] || '').trim() : ''; };
      const inOut = get('收/支');
      if (inOut === '/' || inOut === '不计收支' || inOut === '' || inOut === '收/支') continue;
      const type = inOut === '收入' ? 'income' : inOut === '支出' ? 'expense' : null;
      if (!type) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行收/支无法识别：' + inOut }); continue; }
      const timeRaw = get(bill.timeCol);
      const dm = timeRaw.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dm) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行日期无法识别：' + timeRaw }); continue; }
      const date = dm[1];
      if (!isValidDate(date)) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行日期不合法：' + timeRaw }); continue; }
      const amount = parseYuanToFen(String(get(bill.amountCol)).replace(/[¥￥\s,]/g, ''));
      if (amount == null) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行金额无法识别：' + get(bill.amountCol) }); continue; }
      const status = get(bill.statusCol);
      if (status && !bill.statusOk(status)) continue;
      const payName = bill.payCol ? get(bill.payCol) : '';
      const acc = mapBillAccount(payName, kind, accounts, fallbackAccountId);
      if (!acc) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行无法确定账户：' + payName }); continue; }
      const note = bill.noteCols.map(nc => get(nc)).filter(Boolean).join(' - ').slice(0, 200);
      const defaultCat = type === 'income'
        ? (categories.find(c => c.type === 'income' && c.id === 'i5') ? 'i5' : ((categories.find(c => c.type === 'income') || {}).id || null))
        : (categories.find(c => c.type === 'expense' && c.id === 'e10') ? 'e10' : ((categories.find(c => c.type === 'expense') || {}).id || null));
      if (!defaultCat) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行：当前没有可用的' + (type === 'income' ? '收入' : '支出') + '分类' }); continue; }
      const t = {
        id: genId('tx'),
        type, amount, date,
        categoryId: defaultCat,
        subcategoryId: null,
        accountId: acc.id,
        toAccountId: null,
        note,
        tags: [bill.name],
        createdAt: new Date().toISOString(),
      };
      const v = validateTransaction(t, categories, accounts);
      if (!v.ok) { errors.push({ row: rowNo, message: '第 ' + rowNo + ' 行：' + v.errors.join('；') }); continue; }
      out.push(t);
    }
    return { ok: errors.length === 0, headerFound: true, errors, transactions: out };
  }

  /* ================= 导入校验 ================= */

  function validateImport(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, errors: ['数据格式不正确'] };
    }
    const errors = [];
    const d = parsed.data;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, errors: ['缺少 data 数据块'] };
    for (const k of ['transactions', 'accounts', 'categories', 'budgets', 'settings']) {
      if (!(k in d)) errors.push('缺少 ' + k);
    }
    if (errors.length) return { ok: false, errors };
    if (!Array.isArray(d.transactions) || !Array.isArray(d.accounts) || !Array.isArray(d.categories)
      || typeof d.budgets !== 'object' || d.budgets === null || Array.isArray(d.budgets)
      || typeof d.settings !== 'object' || d.settings === null || Array.isArray(d.settings)) {
      return { ok: false, errors: ['数据结构不正确'] };
    }
    const cur = d.settings.currency;
    if (cur != null && (typeof cur !== 'string' || cur.length > 8 || /[<>&"']/.test(cur))) {
      errors.push('settings.currency 不合法');
    }
    const th = d.settings.theme;
    if (th != null && th !== 'auto' && th !== 'light' && th !== 'dark') {
      errors.push('settings.theme 不合法');
    }
    const ids = new Set();
    for (const t of d.transactions) {
      if (!t || typeof t !== 'object' || !t.id || ids.has(t.id) || !safeId(t.id)) {
        errors.push('交易记录 ID 缺失、重复或不合法'); break;
      }
      ids.add(t.id);
      const v = validateTransaction(t, d.categories, d.accounts);
      if (!v.ok) { errors.push('交易 ' + t.id + ' 校验失败：' + v.errors.join('；')); break; }
    }
    const accIds = new Set();
    const catIds = new Set();
    const catTypeMap = new Map();
    if (!errors.length) {
      for (const a of d.accounts) {
        if (!a || typeof a !== 'object' || !a.id || accIds.has(a.id) || !safeId(a.id)) { errors.push('账户 ID 缺失、重复或不合法'); break; }
        accIds.add(a.id);
        if (!a.name || typeof a.icon !== 'string' || a.name.length > 30 || !Number.isInteger(a.initialBalance)) { errors.push('账户数据不合法：' + a.id); break; }
      }
    }
    if (!errors.length) {
      for (const c of d.categories) {
        if (!c || typeof c !== 'object' || !c.id || catIds.has(c.id) || !safeId(c.id)) { errors.push('分类 ID 缺失、重复或不合法'); break; }
        catIds.add(c.id);
        catTypeMap.set(c.id, c.type);
        if ((c.type !== 'expense' && c.type !== 'income') || !c.name || c.name.length > 30 || typeof c.icon !== 'string' || !Array.isArray(c.subs)) {
          errors.push('分类数据不合法：' + c.id); break;
        }
        let badSub = false;
        for (const s of c.subs) {
          if (!s || typeof s !== 'object' || !s.id || !s.name || s.name.length > 30 || catIds.has(s.id) || !safeId(s.id)) { badSub = true; break; }
          catIds.add(s.id);
        }
        if (badSub) { errors.push('子分类数据不合法：' + c.id); break; }
      }
    }
    if (!errors.length) {
      for (const mk of Object.keys(d.budgets)) {
        if (!/^\d{4}-\d{2}$/.test(mk)) { errors.push('预算月份键不合法：' + mk); break; }
        const e = d.budgets[mk];
        const okShape = e && typeof e === 'object' && !Array.isArray(e)
          && Number.isInteger(e.total) && e.total >= 0
          && e.byCategory && typeof e.byCategory === 'object' && !Array.isArray(e.byCategory)
          && Object.keys(e.byCategory).every(k => Number.isInteger(e.byCategory[k]) && e.byCategory[k] >= 0);
        if (!okShape) { errors.push('预算数据不合法：' + mk); break; }
      }
    }
    if (!errors.length && 'recurrings' in d) {
      if (!Array.isArray(d.recurrings)) {
        errors.push('周期模板数据不合法');
      } else {
        for (const rec of d.recurrings) {
          const base = rec && typeof rec === 'object' && safeId(rec.id)
            && safeId(rec.accountId) && accIds.has(rec.accountId)
            && TX_TYPES.includes(rec.type)
            && Number.isInteger(rec.amount) && rec.amount > 0
            && RECURRING_FREQUENCIES.includes(rec.frequency)
            && isValidDate(rec.nextDate)
            && (rec.tags == null || validTags(rec.tags))
            && (rec.subcategoryId == null || typeof rec.subcategoryId === 'string')
            && (rec.note == null || (typeof rec.note === 'string' && rec.note.length <= 200))
            && (rec.anchorDay == null || (Number.isInteger(rec.anchorDay) && rec.anchorDay >= 1 && rec.anchorDay <= 31));
          const shape = !base ? false
            : (rec.type === 'transfer'
              ? rec.categoryId == null && !!safeId(rec.toAccountId) && accIds.has(rec.toAccountId)
              : !!safeId(rec.categoryId) && catTypeMap.get(rec.categoryId) === rec.type && rec.toAccountId == null);
          if (!base || !shape) { errors.push('周期模板数据不合法：' + (rec && rec.id)); break; }
        }
      }
    }
    if (!errors.length && 'trash' in d) {
      if (!Array.isArray(d.trash)) {
        errors.push('回收站数据不合法');
      } else {
        for (const t of d.trash) {
          if (!t || typeof t !== 'object' || !t.id || ids.has(t.id) || !safeId(t.id)) { errors.push('回收站数据不合法：' + (t && t.id)); break; }
          ids.add(t.id);
          const v = validateTransaction(t, d.categories, d.accounts);
          if (!v.ok) { errors.push('回收站 ' + t.id + ' 校验失败：' + v.errors.join('；')); break; }
        }
      }
    }
    if (errors.length) return { ok: false, errors };
    return { ok: true, errors: [], data: d };
  }

  /* ================= 数据清洗（载入防护） ================= */

  function safeId(id) {
    return typeof id === 'string' && id.length > 0 && id !== '__proto__' && VALID_ID.test(id);
  }

  function sanitizeLoadedData(transactions, accounts, categories) {
    const dropped = { transactions: 0, accounts: 0, categories: 0 };
    const cleanAccounts = [];
    for (const a of (Array.isArray(accounts) ? accounts : [])) {
      if (!a || typeof a !== 'object' || !safeId(a.id) || !a.name) { dropped.accounts++; continue; }
      cleanAccounts.push({
        id: a.id,
        name: String(a.name).slice(0, 30),
        icon: typeof a.icon === 'string' ? a.icon : '💰',
        initialBalance: Number.isInteger(a.initialBalance) ? a.initialBalance : 0,
      });
    }
    const cleanCategories = [];
    for (const c of (Array.isArray(categories) ? categories : [])) {
      if (!c || typeof c !== 'object' || !safeId(c.id) || !c.name || (c.type !== 'expense' && c.type !== 'income')) {
        dropped.categories++; continue;
      }
      const subs = [];
      if (Array.isArray(c.subs)) {
        for (const s of c.subs) {
          if (s && typeof s === 'object' && safeId(s.id) && s.name) subs.push({ id: s.id, name: String(s.name).slice(0, 30) });
        }
      }
      cleanCategories.push({
        id: c.id, type: c.type, name: String(c.name).slice(0, 30),
        icon: typeof c.icon === 'string' ? c.icon : (c.type === 'expense' ? '🏷️' : '💰'),
        subs,
      });
    }
    const cleanTransactions = [];
    for (const t of (Array.isArray(transactions) ? transactions : [])) {
      if (!t || typeof t !== 'object' || !validateTransaction(t, cleanCategories, cleanAccounts).ok) {
        dropped.transactions++; continue;
      }
      cleanTransactions.push(t);
    }
    return { transactions: cleanTransactions, accounts: cleanAccounts, categories: cleanCategories, dropped };
  }

  /* ================= CSV 导入导出 ================= */

  const CSV_HEADER = ['类型', '日期', '金额', '大类', '子分类', '账户', '转入账户', '标签', '备注'];
  const TYPE_NAMES = { expense: '支出', income: '收入', transfer: '转账' };
  const NAME_TO_TYPE = { '支出': 'expense', '收入': 'income', '转账': 'transfer' };

function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

  function toCSV(transactions, categories, accounts) {
    const rows = [CSV_HEADER.join(',')];
    const catMap = new Map(categories.map(c => [c.id, c]));
    const accMap = new Map(accounts.map(a => [a.id, a]));
    const sorted = transactions.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ca = a.createdAt || '', cb = b.createdAt || '';
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    });
    for (const t of sorted) {
      const cat = catMap.get(t.categoryId);
      const sub = cat ? findSub(cat, t.subcategoryId) : null;
      const acc = accMap.get(t.accountId);
      const toAcc = t.toAccountId ? accMap.get(t.toAccountId) : null;
      rows.push([
        TYPE_NAMES[t.type] || t.type,
        t.date,
        formatFen(t.amount),
        t.type === 'transfer' ? '' : (cat ? cat.name : ''),
        t.type === 'transfer' ? '' : (sub ? sub.name : ''),
        acc ? acc.name : '',
        toAcc ? toAcc.name : '',
        (t.tags || []).join('、'),
        t.note || '',
      ].map(csvCell).join(','));
    }
    return '\uFEFF' + rows.join('\r\n') + '\r\n';
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false, i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        row.push(cell); cell = ''; rows.push(row); row = []; i++; continue;
      }
      if (ch === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; i++; continue; }
      cell += ch; i++;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
  }

  function parseCSV(text, categories, accounts) {
    const errors = [];
    const rows = parseCsvRows(String(text == null ? '' : text).replace(/^\uFEFF/, ''));
    const header = rows.shift() || [];
    if (header.join(',') !== CSV_HEADER.join(',')) {
      return { ok: false, errors: [{ row: 0, message: '表头不符合标准格式，应为：' + CSV_HEADER.join(',') }], transactions: [] };
    }
    const out = [];
    rows.forEach((fields, i) => {
      const row = i + 1;
      const fail = msg => errors.push({ row, message: '第 ' + row + ' 行：' + msg });
      if (fields.length !== CSV_HEADER.length) { fail('应为 ' + CSV_HEADER.length + ' 列'); return; }
      const typeCell = fields[0].trim(), dateCell = fields[1].trim(), amountCell = fields[2].trim();
      const catName = fields[3].trim().replace(/^'/, ''), subName = fields[4].trim().replace(/^'/, '');
      const accName = fields[5].trim().replace(/^'/, ''), toAccName = fields[6].trim().replace(/^'/, '');
      const tagCell = fields[7].replace(/^'/, ''), noteCell = fields[8].replace(/^'/, '');
      const type = NAME_TO_TYPE[typeCell];
      if (!type) { fail('类型必须是 支出/收入/转账'); return; }
      if (!isValidDate(dateCell)) { fail('日期不合法：' + dateCell); return; }
      const amount = parseYuanToFen(amountCell);
      if (amount == null) { fail('金额不合法：' + amountCell); return; }
      const acc = accounts.find(a => a.name === accName);
      if (!acc) { fail('账户不存在：' + accName); return; }
      const t = { type, amount, date: dateCell, accountId: acc.id, toAccountId: null, categoryId: null, subcategoryId: null, note: noteCell, tags: [] };
      if (type === 'transfer') {
        if (catName) { fail('转账行不应填写分类'); return; }
        const toAcc = accounts.find(a => a.name === toAccName);
        if (!toAcc) { fail('转入账户不存在：' + toAccName); return; }
        t.toAccountId = toAcc.id;
      } else {
        const cat = categories.find(c => c.name === catName && c.type === type);
        if (!cat) { fail('分类不存在：' + catName); return; }
        t.categoryId = cat.id;
        if (subName) {
          const sub = (cat.subs || []).find(s => s.name === subName);
          if (!sub) { fail('子分类不存在：' + subName); return; }
          t.subcategoryId = sub.id;
        }
      }
      const tags = tagCell.split('、').map(s => s.trim()).filter(Boolean);
      if (tags.length) t.tags = tags;
      const v = validateTransaction(t, categories, accounts);
      if (!v.ok) { fail(v.errors.join('；')); return; }
      out.push(t);
    });
    return { ok: errors.length === 0, errors, transactions: out };
  }

  /* ================= 周期记账 ================= */

  const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly'];
  const RECURRING_CAP = 60;

  function generateDueRecurrings(recurrings, todayArg, categories, accounts) {
    const today = isValidDate(todayArg) ? todayArg : todayStr();
    const out = [];
    const updated = [];
    const errors = [];
    let generated = 0;
    for (const rec of (Array.isArray(recurrings) ? recurrings : [])) {
      if (!rec || typeof rec !== 'object' || !safeId(rec.id)) {
        errors.push({ recurringId: null, message: '模板数据不完整' });
        continue;
      }
      const probe = {
        type: rec.type, amount: rec.amount, categoryId: rec.categoryId, subcategoryId: rec.subcategoryId,
        accountId: rec.accountId, toAccountId: rec.toAccountId, date: rec.nextDate, note: rec.note, tags: rec.tags,
      };
      const v = validateTransaction(probe, categories, accounts);
      if (!v.ok || !RECURRING_FREQUENCIES.includes(rec.frequency) || !isValidDate(rec.nextDate)) {
        errors.push({ recurringId: rec.id, message: '模板无效：' + (v.ok ? '频率或日期不合法' : v.errors.join('；')) });
        updated.push(Object.assign({}, rec));
        continue;
      }
      let cursor = rec.nextDate;
      const anchorDay = (Number.isInteger(rec.anchorDay) && rec.anchorDay >= 1 && rec.anchorDay <= 31)
        ? rec.anchorDay
        : Number(cursor.slice(8, 10));
      const made = [];
      while (cursor <= today && made.length < RECURRING_CAP) {
        made.push({
          id: genId('tx'),
          type: rec.type, amount: rec.amount,
          categoryId: rec.type === 'transfer' ? null : rec.categoryId,
          subcategoryId: rec.type === 'transfer' ? null : (rec.subcategoryId || null),
          accountId: rec.accountId,
          toAccountId: rec.type === 'transfer' ? rec.toAccountId : null,
          date: cursor, note: rec.note || '',
          tags: Array.isArray(rec.tags) ? rec.tags.slice() : [],
          recurringId: rec.id, createdAt: new Date().toISOString(),
        });
        generated++;
        cursor = rec.frequency === 'daily' ? addDays(cursor, 1)
          : rec.frequency === 'weekly' ? addDays(cursor, 7)
          : addMonthsClamped(cursor, 1, anchorDay);
      }
      updated.push(Object.assign({}, rec, { nextDate: cursor, anchorDay }));
      out.push.apply(out, made);
    }
    return { transactions: out, recurrings: updated, errors, generated };
  }

  /* ================= 统计增强 ================= */

  function rankSubs(transactions, category) {
    const counts = new Map();
    for (const t of transactions) {
      if (t.categoryId !== category.id || !t.subcategoryId) continue;
      counts.set(t.subcategoryId, (counts.get(t.subcategoryId) || 0) + 1);
    }
    const ranked = (category.subs || []).map(s => ({ subId: s.id, name: s.name, count: counts.get(s.id) || 0 }));
    ranked.sort((a, b) => b.count - a.count);
    return ranked;
  }

  function withCategoryDelta(totals, prevTotals) {
    const prevMap = new Map((prevTotals || []).map(c => [c.categoryId, c.amountFen]));
    return totals.map(c => {
      const prevAmountFen = prevMap.get(c.categoryId) || 0;
      const deltaPct = prevAmountFen > 0 ? Math.round((c.amountFen - prevAmountFen) / prevAmountFen * 100) : null;
      return Object.assign({}, c, { prevAmountFen, deltaPct });
    });
  }

  /* ================= 导出 ================= */

  const api = {
    DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, KEYS,
    Storage, createBrowserStorage, memBackend,
    genId, todayStr, monthKeyOf, shiftMonth, daysInMonth, isValidDate, addDays, addMonthsClamped,
    parseYuanToFen, formatFen,
    validateTransaction, validateImport, sanitizeLoadedData,
    accountBalances, filterTransactions, monthSummary,
    categoryTotals, dailyTotals, monthlyTrend, budgetStatus, levelOf,
    withCategoryDelta, rankSubs, dailyInOut, yearStats,
    toCSV, parseCSV, CSV_HEADER,
    detectBillKind, parseBillCsv, BILL_KINDS,
    generateDueRecurrings, RECURRING_FREQUENCIES,
    getCategories, findCategory, findSub, TX_TYPES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Core = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
