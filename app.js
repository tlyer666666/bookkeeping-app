(function () {
  'use strict';
  const Core = window.Core;
  const desktopBridge = window.desktopBridge || null;

  const $ = sel => document.querySelector(sel);
  const show = sel => $(sel).classList.remove('hidden');
  const hide = sel => $(sel).classList.add('hidden');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }
  function curSym() { return esc((state.settings && state.settings.currency) || '¥'); }
  function yuan(fen) { return curSym() + Core.formatFen(fen); }
  function weekdayOf(dateStr) {
    const p = dateStr.split('-').map(Number);
    return '周' + '日一二三四五六'[new Date(p[0], p[1] - 1, p[2]).getDay()];
  }
  const pad2 = n => String(n).padStart(2, '0');

  function evalAmountExpr(s) {
    let i = 0;
    const skip = () => { while (i < s.length && s[i] === ' ') i++; };
    function factor() {
      skip();
      if (s[i] === '(') {
        i++;
        const v = expr();
        skip();
        if (s[i] !== ')') throw new Error('括号不匹配');
        i++;
        return v;
      }
      if (s[i] === '-') { i++; return -factor(); }
      const start = i;
      while (i < s.length && /[0-9.]/.test(s[i])) i++;
      if (start === i) throw new Error('缺少数字');
      const v = Number(s.slice(start, i));
      if (!isFinite(v)) throw new Error('数字不合法');
      return v;
    }
    function term() {
      let v = factor();
      for (;;) {
        skip();
        if (s[i] === '*') { i++; v *= factor(); }
        else if (s[i] === '/') { i++; const d = factor(); if (d === 0) throw new Error('除数为 0'); v /= d; }
        else return v;
      }
    }
    function expr() {
      let v = term();
      for (;;) {
        skip();
        if (s[i] === '+') { i++; v += term(); }
        else if (s[i] === '-') { i++; v -= term(); }
        else return v;
      }
    }
    const v = expr();
    skip();
    if (i !== s.length) throw new Error('存在无法解析的字符');
    return v;
  }

  function parseAmountInput(str) {
    const s = String(str == null ? '' : str).trim();
    if (!/[+\-*/]/.test(s)) return Core.parseYuanToFen(s);
    if (!/^[0-9+\-*/().\s]+$/.test(s)) return null;
    try {
      const val = evalAmountExpr(s);
      const fen = Math.round(val * 100);
      return fen > 0 && fen <= Number.MAX_SAFE_INTEGER ? fen : null;
    } catch (e) {
      return null;
    }
  }
  function parseFenAllowZero(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (s === '') return 0;
    const fen = Core.parseYuanToFen(s);
    if (fen != null) return fen;
    return /^0+(\.0+)?$/.test(s) ? 0 : null;
  }

  const PALETTE = ['#e05656', '#f0a500', '#4a90d9', '#2f9e63', '#9b6fd6', '#f06292',
    '#26a69a', '#ff8a65', '#7986cb', '#a1887f', '#78909c', '#c0ca33'];

  const state = {
    storage: null,
    available: true,
    transactions: [],
    accounts: [],
    categories: [],
    budgets: {},
    recurrings: [],
    settings: { currency: '¥' },
    monthKey: Core.monthKeyOf(Core.todayStr()),
    tab: 'detail',
    detailView: 'list',
    filter: { type: '', categoryId: '', accountId: '', tag: '', day: '', keyword: '' },
    editingId: null,
    formType: 'expense',
    statsType: 'expense',
    drillCatId: null,
    catEditorId: null,
    catDraft: null,
    accEditorId: null,
    recEditorId: null,
    recFormType: 'expense',
    trash: [],
    statsYear: null,
  };

  let pendingConfirm = null;
  let lastConfirmOkAt = 0;

  /* ================= 初始化与持久化 ================= */

  function saveKey(name) {
    const ok = state.storage.save(state.storage.keys[name], state[name]);
    if (!ok) {
      state.available = false;
      $('#storage-warn').classList.remove('hidden');
      toast('数据保存失败，请先导出备份', true);
    } else if (!state.available) {
      state.available = true;
      $('#storage-warn').classList.add('hidden');
      toast('存储已恢复');
    }
    return ok;
  }
  function saveAll() {
    let ok = true;
    ['transactions', 'accounts', 'categories', 'budgets', 'settings', 'recurrings', 'trash'].forEach(name => {
      if (!saveKey(name)) ok = false;
    });
    return ok;
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
    navigator.serviceWorker.register('sw.js').then(() => {
      document.documentElement.dataset.sw = 'active';
    }).catch(() => { /* file:// 或受限环境自动跳过，不影响使用 */ });
  }

  function init() {
    const bs = Core.createBrowserStorage();
    state.available = bs.available;
    state.storage = new Core.Storage(bs.backend);
    const k = state.storage.keys;
    let foundCorrupt = false;
    const recover = (key, fallback) => {
      const r = state.storage.loadWithRecovery(key, fallback);
      if (r.corruptRaw != null) {
        state.storage.saveRaw(key + '.corrupt-backup', r.corruptRaw);
        foundCorrupt = true;
      }
      return r.value;
    };
    state.transactions = recover(k.transactions, []);
    state.accounts = recover(k.accounts, null);
    state.categories = recover(k.categories, null);
    state.budgets = recover(k.budgets, {});
    state.settings = recover(k.settings, { currency: '¥' });
    state.recurrings = recover(k.recurrings, []);
    if (!Array.isArray(state.transactions)) state.transactions = [];
    if (!Array.isArray(state.accounts)) { state.accounts = deepCopy(Core.DEFAULT_ACCOUNTS); }
    if (!Array.isArray(state.categories)) { state.categories = deepCopy(Core.DEFAULT_CATEGORIES); }
    if (!Array.isArray(state.recurrings)) state.recurrings = [];
    if (!Array.isArray(state.trash)) state.trash = [];
    if (!state.budgets || typeof state.budgets !== 'object' || Array.isArray(state.budgets)) state.budgets = {};
    if (!state.settings || typeof state.settings !== 'object' || Array.isArray(state.settings)) state.settings = { currency: '¥' };

    const clean = Core.sanitizeLoadedData(state.transactions, state.accounts, state.categories);
    const droppedTotal = clean.dropped.transactions + clean.dropped.categories + clean.dropped.accounts;
    state.transactions = clean.transactions;
    state.accounts = clean.accounts;
    state.categories = clean.categories;
    state.trash = state.trash.filter(t => t && typeof t === 'object' && Core.validateTransaction(t, state.categories, state.accounts).ok);

    const gen = Core.generateDueRecurrings(state.recurrings, Core.todayStr(), state.categories, state.accounts);
    state.recurrings = gen.recurrings;
    if (gen.transactions.length) state.transactions.push(...gen.transactions);

    saveAll();
    bindEvents();
    applyTheme();
    registerServiceWorker();
    if (desktopBridge && desktopBridge.onMenu) {
      desktopBridge.onMenu(action => {
        if (action === 'export-json') onExport();
        else if (action === 'export-csv') onExportCsv();
        else if (action === 'import-json') onImportClick('json');
        else if (action === 'import-csv') onImportClick('csv');
      });
    }
    if (location.search.indexOf('selftest=1') >= 0) {
      window.__bkTest = { state, render, renderTxList };
    }
    const tabMatch = location.search.match(/[?&]tab=(\w+)/);
    if (tabMatch && ['detail', 'stats', 'budget', 'manage'].includes(tabMatch[1])) state.tab = tabMatch[1];
    const viewMatch = location.search.match(/[?&]view=(\w+)/);
    if (viewMatch && ['list', 'calendar'].includes(viewMatch[1])) state.detailView = viewMatch[1];
    render();
    if (droppedTotal > 0) toast('已自动忽略 ' + droppedTotal + ' 条损坏数据');
    if (foundCorrupt) toast('检测到数据损坏，原始内容已备份到存储中');
    if (gen.generated > 0) toast('周期记账已自动生成 ' + gen.generated + ' 笔');
    if (gen.errors.length) toast('有 ' + gen.errors.length + ' 个周期模板失效，请到管理页检查', true);
    if (location.search.indexOf('selftest=1') >= 0) runSelftest();
  }

  /* ================= 通用 UI ================= */

  let toastTimer = null;
  let toastAction = null;
  let errorMuteUntil = 0;
  function toast(msg, isError, action) {
    if (!isError && Date.now() < errorMuteUntil) return;
    if (isError) errorMuteUntil = Date.now() + 3000;
    const el = $('#toast');
    toastAction = action || null;
    el.innerHTML = esc(msg) + (action ? ' <button type="button" class="toast-btn" data-action="toast-action">' + esc(action.label) + '</button>' : '');
    el.classList.toggle('error', !!isError);
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.add('hidden'); toastAction = null; }, action ? 6000 : 2600);
  }

  function applyTheme() {
    const t = state.settings.theme === 'dark' || state.settings.theme === 'light' ? state.settings.theme : 'auto';
    document.documentElement.dataset.theme = t;
    const btn = $('#theme-toggle');
    if (btn) {
      btn.textContent = t === 'auto' ? '🌓' : (t === 'dark' ? '🌙' : '☀️');
      btn.title = '主题：' + (t === 'auto' ? '跟随系统' : t === 'dark' ? '深色' : '浅色');
    }
    if (state.tab === 'stats') renderStats();
  }

  function onCycleTheme() {
    const cur = state.settings.theme === 'dark' || state.settings.theme === 'light' ? state.settings.theme : 'auto';
    state.settings.theme = cur === 'auto' ? 'dark' : (cur === 'dark' ? 'light' : 'auto');
    saveKey('settings');
    applyTheme();
  }

  function askConfirm(text, cb) {
    pendingConfirm = cb;
    $('#confirm-text').textContent = text;
    modalOpenedAt = Date.now();
    show('#confirm-modal');
  }

  let modalOpenedAt = 0;

  function hideModal(sel) { $(sel).classList.add('hidden'); }

  function closeModal() {
    const modalStack = ['#confirm-modal', '#tx-modal', '#rec-modal', '#cat-modal', '#acc-modal'];
    for (const sel of modalStack) {
      if (!$(sel).classList.contains('hidden')) {
        $(sel).classList.add('hidden');
        if (sel === '#confirm-modal') pendingConfirm = null;
        return;
      }
    }
  }

  function closeAllModals() {
    ['#confirm-modal', '#tx-modal', '#rec-modal', '#cat-modal', '#acc-modal'].forEach(hide);
    pendingConfirm = null;
  }

  function reloadFromStorage() {
    const k = state.storage.keys;
    state.transactions = state.storage.load(k.transactions, []);
    state.accounts = state.storage.load(k.accounts, null) || deepCopy(Core.DEFAULT_ACCOUNTS);
    state.categories = state.storage.load(k.categories, null) || deepCopy(Core.DEFAULT_CATEGORIES);
    state.budgets = state.storage.load(k.budgets, {});
    state.settings = state.storage.load(k.settings, { currency: '¥' });
    state.recurrings = state.storage.load(k.recurrings, []);
    state.trash = state.storage.load(k.trash, []);
    applyTheme();
    render();
  }

  /* ================= 渲染分发 ================= */

  function render() {
    $('#month-label').textContent = state.monthKey;
    $('#storage-warn').classList.toggle('hidden', state.available);
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
    ['detail', 'stats', 'budget', 'manage'].forEach(p =>
      $('#page-' + p).classList.toggle('hidden', p !== state.tab));
    ({ detail: renderDetail, stats: renderStats, budget: renderBudget, manage: renderManage })[state.tab]();
  }

  /* ================= 明细页 ================= */

  function accountName(id) {
    const a = state.accounts.find(x => x.id === id);
    return a ? a.name : '未知账户';
  }

  function hi(text, kw) {
    if (!kw) return esc(text);
    const raw = String(text);
    const lower = raw.toLowerCase();
    const lkw = kw.toLowerCase();
    if (!lkw) return esc(raw);
    let out = '';
    let i = 0;
    for (;;) {
      const hit = lower.indexOf(lkw, i);
      if (hit < 0) { out += esc(raw.slice(i)); break; }
      out += esc(raw.slice(i, hit)) + '<mark>' + esc(raw.substr(hit, lkw.length)) + '</mark>';
      i = hit + lkw.length;
    }
    return out;
  }

  function catColor(id) {
    let h = 0;
    const s = String(id || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function txItemHtml(t) {
    const cat = Core.findCategory(state.categories, t.categoryId);
    const kw = state.filter.keyword;
    const icon = t.type === 'transfer' ? '🔁' : (cat ? cat.icon : '❓');
    const tint = t.type === 'transfer' ? 'transfer' : catColor(t.categoryId);
    const badge = t.recurringId ? ' <span title="周期记账自动生成">🔄</span>' : '';
    const tagText = (t.tags && t.tags.length) ? ' ' + t.tags.map(x => '#' + x).join(' ') : '';
    let title, cls, sign, line;
    if (t.type === 'transfer') {
      title = '转账';
      cls = 'transfer';
      sign = '';
      line = accountName(t.accountId) + ' → ' + accountName(t.toAccountId) + (t.note ? ' · ' + t.note : '');
    } else {
      const sub = cat ? Core.findSub(cat, t.subcategoryId) : null;
      title = cat ? cat.name : '未知分类';
      cls = t.type;
      sign = t.type === 'expense' ? '-' : '+';
      line = [sub ? sub.name : '', accountName(t.accountId), t.note].filter(Boolean).join(' · ');
    }
    return `<div class="tx-item" role="button" tabindex="0" aria-label="${esc(title + ' ' + sign + yuan(t.amount))}" data-action="edit-tx" data-id="${esc(t.id)}">
      <div class="tx-icon" style="background:${esc(tint)}1f">${esc(icon)}</div>
      <div class="tx-main">
        <div class="tx-cat">${hi(title, kw)}${badge}</div>
        <div class="tx-sub-note">${hi(line, kw)}<span class="tx-tags">${hi(tagText, kw)}</span></div>
      </div>
      <div class="tx-amount ${cls}">${sign}${yuan(t.amount)}</div>
    </div>`;
  }

  function allTags() {
    return Array.from(new Set(state.transactions.flatMap(t => t.tags || []))).sort();
  }

  function activeFilter() {
    const f = {};
    if (state.filter.type) f.type = state.filter.type;
    if (state.filter.categoryId) f.categoryId = state.filter.categoryId;
    if (state.filter.accountId) f.accountId = state.filter.accountId;
    if (state.filter.day) f.day = Number(state.filter.day);
    if (state.filter.tag) f.tag = state.filter.tag;
    if (state.filter.keyword) f.keyword = state.filter.keyword;
    if (state.filter.minYuan) {
      const v = parseFenAllowZero(state.filter.minYuan);
      if (v != null) f.minAmountFen = v;
    }
    if (state.filter.maxYuan) {
      const v = parseFenAllowZero(state.filter.maxYuan);
      if (v != null) f.maxAmountFen = v;
    }
    if (f.minAmountFen != null && f.maxAmountFen != null && f.minAmountFen > f.maxAmountFen) {
      const swap = f.minAmountFen;
      f.minAmountFen = f.maxAmountFen;
      f.maxAmountFen = swap;
    }
    return f;
  }

  function txListHtml() {
    const filtered = Core.filterTransactions(state.transactions, Object.assign({ monthKey: state.monthKey }, activeFilter()), state.categories);
    if (!filtered.length) {
      const hasAnyInMonth = state.transactions.some(t => Core.monthKeyOf(t.date) === state.monthKey);
      return '<div class="empty-tip">' + (hasAnyInMonth
        ? '没有符合当前筛选条件的记录'
        : '本月暂无记录，点右上角「＋ 记一笔」开始记账') + '</div>';
    }
    const dayChip = state.filter.day
      ? `<div class="day-chip-row"><button class="day-chip" data-action="clear-day">仅看 ${Number(state.filter.day)} 日 ✕</button></div>`
      : '';
    const groups = [];
    for (const t of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else groups.push({ date: t.date, items: [t] });
    }
    return dayChip + groups.map(g => {
      const exp = g.items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const inc = g.items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const parts = [];
      if (exp) parts.push('支 ' + Core.formatFen(exp));
      if (inc) parts.push('收 ' + Core.formatFen(inc));
      const d = g.date.slice(8, 10).replace(/^0/, '');
      return `<div class="day-group-head"><span>${Core.monthKeyOf(g.date).slice(5).replace(/^0/, '')}月${d}日 ${weekdayOf(g.date)}</span><span>${parts.join(' / ')}</span></div>`
        + g.items.map(txItemHtml).join('');
    }).join('');
  }

  function renderTxList() {
    const listEl = $('#tx-list');
    if (!listEl) return;
    listEl.innerHTML = txListHtml();
  }

  function renderDetail() {
    if (state.filter.tag) {
      const tags = allTags();
      if (!tags.includes(state.filter.tag)) state.filter.tag = '';
    }
    const summary = Core.monthSummary(state.transactions, state.monthKey);
    const balances = Core.accountBalances(state.accounts, state.transactions);
    let totalAssets = 0;
    for (const a of state.accounts) totalAssets += (balances.get(a.id) || 0);
    const f = state.filter;
    if (f.day && (Number(f.day) < 1 || Number(f.day) > Core.daysInMonth(state.monthKey))) f.day = '';
    const catOptions = type => state.categories.filter(c => c.type === type)
      .map(c => `<option value="${esc(c.id)}"${f.categoryId === c.id ? ' selected' : ''}>${esc(c.icon + ' ' + c.name)}</option>`).join('');
    const viewSeg = `
      <div class="view-seg">
        <button data-action="data-view" data-view="list" class="${state.detailView === 'list' ? 'active' : ''}">列表</button>
        <button data-action="data-view" data-view="calendar" class="${state.detailView === 'calendar' ? 'active' : ''}">日历</button>
      </div>`;
    $('#page-detail').innerHTML = `
      <div class="card summary-card">
        <div class="cell"><div class="label">本月支出</div><div class="num expense">${yuan(summary.expenseFen)}</div></div>
        <div class="cell"><div class="label">本月收入</div><div class="num income">${yuan(summary.incomeFen)}</div></div>
        <div class="cell"><div class="label">本月结余</div><div class="num">${yuan(summary.balanceFen)}</div></div>
        <div class="cell"><div class="label">总资产</div><div class="num">${yuan(totalAssets)}</div></div>
      </div>
      <div class="detail-toolbar">
        ${viewSeg}
        <div class="filter-bar">
          <select data-filter="type">
            <option value="">全部类型</option>
            <option value="expense"${f.type === 'expense' ? ' selected' : ''}>支出</option>
            <option value="income"${f.type === 'income' ? ' selected' : ''}>收入</option>
            <option value="transfer"${f.type === 'transfer' ? ' selected' : ''}>转账</option>
          </select>
          <select data-filter="categoryId">
            <option value="">全部分类</option>
            <optgroup label="支出">${catOptions('expense')}</optgroup>
            <optgroup label="收入">${catOptions('income')}</optgroup>
          </select>
          <select data-filter="accountId">
            <option value="">全部账户</option>
            ${state.accounts.map(a => `<option value="${esc(a.id)}"${f.accountId === a.id ? ' selected' : ''}>${esc(a.icon + ' ' + a.name)}</option>`).join('')}
          </select>
        <select data-filter="tag">
          <option value="">全部标签</option>
          ${allTags().map(tag => `<option value="${esc(tag)}"${f.tag === tag ? ' selected' : ''}>#${esc(tag)}</option>`).join('')}
        </select>
        <input data-filter="minYuan" type="text" inputmode="decimal" placeholder="金额≥" value="${esc(f.minYuan || '')}">
        <input data-filter="maxYuan" type="text" inputmode="decimal" placeholder="金额≤" value="${esc(f.maxYuan || '')}">
        <input data-filter="keyword" type="text" placeholder="搜索备注 / 分类" value="${esc(f.keyword)}">
        </div>
      </div>
      ${state.detailView === 'calendar' ? calendarHtml() : '<div id="tx-list"></div>'}`;
    if (state.detailView === 'list') renderTxList();
  }

  function calendarHtml() {
    const days = Core.dailyInOut(state.transactions, state.monthKey);
    const [y, m] = state.monthKey.split('-').map(Number);
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const today = Core.todayStr();
    const weeks = [];
    let cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push('<div class="cal-cell blank"></div>');
    days.forEach(d => {
      const dateStr = state.monthKey + '-' + pad2(d.day);
      const isToday = dateStr === today;
      const sel = Number(state.filter.day) === d.day;
      const marks = [];
      if (d.expenseFen > 0) marks.push('<span class="cal-mark out">' + Core.formatFen(d.expenseFen) + '</span>');
      if (d.incomeFen > 0) marks.push('<span class="cal-mark in">' + Core.formatFen(d.incomeFen) + '</span>');
      cells.push(`<div class="cal-cell${isToday ? ' today' : ''}${sel ? ' selected' : ''}" role="button" tabindex="0" aria-label="${d.day}日${d.expenseFen > 0 ? '，支出 ' + Core.formatFen(d.expenseFen) : ''}${d.incomeFen > 0 ? '，收入 ' + Core.formatFen(d.incomeFen) : ''}" data-action="cal-pick" data-day="${d.day}">
        <div class="cal-day">${d.day}</div>${marks.join('')}${d.expenseFen === 0 && d.incomeFen === 0 ? '<span class="cal-dot"></span>' : ''}</div>`);
      if (cells.length === 7) { weeks.push('<div class="cal-row">' + cells.join('') + '</div>'); cells = []; }
    });
    if (cells.length) weeks.push('<div class="cal-row">' + cells.join('') + '</div>');
    return `<div class="card cal-card">
      <div class="cal-head">${['一', '二', '三', '四', '五', '六', '日'].map(w => '<span>' + w + '</span>').join('')}</div>
      ${weeks.join('')}
      <p class="hint">点日期查看当日明细</p>
    </div>`;
  }

  /* ================= 记账模态 ================= */

  function optionAccounts(sel) {
    return state.accounts.map(a =>
      `<option value="${esc(a.id)}"${a.id === sel ? ' selected' : ''}>${esc(a.icon + ' ' + a.name)}</option>`).join('');
  }

  /* ================= 表单共享层（记账/周期两套模态收敛于此） ================= */

  const FORMS = {
    tx: {
      segId: 'tx-type', segAttr: 'txType',
      catGroup: 'tx-cat-group', accGroup: 'tx-account-group', transferGroup: 'tx-transfer-group',
      cat: 'tx-cat', sub: 'tx-sub', from: 'tx-from', to: 'tx-to', account: 'tx-account',
      quick: 'tx-sub-quick',
    },
    rec: {
      segId: 'rec-type', segAttr: 'recType',
      catGroup: 'rec-cat-group', accGroup: 'rec-account-group', transferGroup: 'rec-transfer-group',
      cat: 'rec-cat', sub: 'rec-sub', from: 'rec-from', to: 'rec-to', account: 'rec-account',
      quick: null,
    },
  };

  function renderSeg(kit, formType) {
    document.querySelectorAll('#' + kit.segId + ' button').forEach(b =>
      b.classList.toggle('active', b.dataset[kit.segAttr] === formType));
  }

  function renderAccountSelects(kit) {
    $('#' + kit.account).innerHTML = optionAccounts(null);
    $('#' + kit.from).innerHTML = optionAccounts(null);
    $('#' + kit.to).innerHTML = optionAccounts(null);
  }

  function renderCatOptions(kit, formType, keep) {
    const sel = $('#' + kit.cat);
    const prev = keep ? sel.value : '';
    const cats = state.categories.filter(c => c.type === formType);
    sel.innerHTML = cats.map(c =>
      `<option value="${esc(c.id)}">${esc(c.icon + ' ' + c.name)}</option>`).join('');
    if (cats.some(c => c.id === prev)) sel.value = prev;
  }

  function renderSubOptions(kit) {
    const cat = Core.findCategory(state.categories, $('#' + kit.cat).value);
    const cur = $('#' + kit.sub).value;
    const ranked = cat ? Core.rankSubs(state.transactions, cat) : [];
    $('#' + kit.sub).innerHTML = '<option value="">（只记到大类）</option>' + ranked.map(s =>
      `<option value="${esc(s.subId)}"${s.subId === cur ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
    if (kit.quick) {
      $('#' + kit.quick).innerHTML = ranked.map(s =>
        `<button type="button" data-sub-pick="${esc(s.subId)}" class="${s.subId === ($('#' + kit.sub).value || cur) ? 'active' : ''}">${esc(s.name)}</button>`).join('');
    }
  }

  function syncQuickActive() {
    document.querySelectorAll('#tx-sub-quick button').forEach(b =>
      b.classList.toggle('active', b.dataset.subPick === $('#tx-sub').value));
  }

  function applyFormType(kit, formType) {
    const isTransfer = formType === 'transfer';
    $('#' + kit.catGroup).classList.toggle('hidden', isTransfer);
    $('#' + kit.accGroup).classList.toggle('hidden', isTransfer);
    $('#' + kit.transferGroup).classList.toggle('hidden', !isTransfer);
    if (!isTransfer) {
      renderCatOptions(kit, formType, true);
      renderSubOptions(kit);
    }
  }

  function fillFormCommon(kit, type, t) {
    renderSeg(kit, type);
    renderAccountSelects(kit);
    if (type === 'transfer') {
      $('#' + kit.from).value = t ? t.accountId : (state.accounts[0] ? state.accounts[0].id : '');
      $('#' + kit.to).value = t ? t.toAccountId : (state.accounts[1] ? state.accounts[1].id : '');
    } else {
      if (!t) { $('#' + kit.cat).value = ''; $('#' + kit.sub).value = ''; }
      renderCatOptions(kit, type, !!t);
      if (t && t.categoryId) $('#' + kit.cat).value = t.categoryId;
      renderSubOptions(kit);
      if (t) $('#' + kit.sub).value = t.subcategoryId || '';
      $('#' + kit.account).value = t ? t.accountId : (state.accounts[0] ? state.accounts[0].id : '');
      if (kit.quick) syncQuickActive();
    }
    applyFormType(kit, type);
  }

  function readFormTarget(kit, type) {
    if (type === 'transfer') {
      return { accountId: $('#' + kit.from).value, toAccountId: $('#' + kit.to).value, categoryId: null, subcategoryId: null };
    }
    return { accountId: $('#' + kit.account).value, toAccountId: null, categoryId: $('#' + kit.cat).value || null, subcategoryId: $('#' + kit.sub).value || null };
  }

  function renderTxTypeSeg() { renderSeg(FORMS.tx, state.formType); }
  function renderTxSubOptions() { renderSubOptions(FORMS.tx); }
  function onFormTypeChanged() { applyFormType(FORMS.tx, state.formType); }
  function renderRecTypeSeg() { renderSeg(FORMS.rec, state.recFormType); }
  function renderRecSubOptions() { renderSubOptions(FORMS.rec); }
  function onRecTypeChanged() { applyFormType(FORMS.rec, state.recFormType); }

  function openTxModal(txId) {
    const t = txId ? state.transactions.find(x => x.id === txId) : null;
    state.editingId = txId || null;
    state.formType = t ? t.type : 'expense';
    $('#tx-modal-title').textContent = t ? '编辑记录' : '记一笔';
    $('#tx-amount').value = t ? Core.formatFen(t.amount) : '';
    $('#tx-date').value = t ? t.date : Core.todayStr();
    $('#tx-note').value = t ? (t.note || '') : '';
    $('#tx-tags').value = t && t.tags ? t.tags.join(',') : '';
    $('#tx-delete').classList.toggle('hidden', !t);
    $('#tx-dup').classList.toggle('hidden', !t);
    fillFormCommon(FORMS.tx, state.formType, t);
    modalOpenedAt = Date.now();
    show('#tx-modal');
    $('#tx-amount').focus();
  }

  function onTxSubmit(e) {
    e.preventDefault();
    const editingId = state.editingId;
    const type = state.formType;
    const amount = parseAmountInput($('#tx-amount').value);
    const rawTags = $('#tx-tags').value.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    const tags = Array.from(new Set(rawTags)).slice(0, 5);
    const tagsTruncated = rawTags.filter(Boolean).length !== tags.length;
    const t = Object.assign({
      id: editingId || Core.genId('tx'),
      type,
      amount: amount == null ? NaN : amount,
      date: $('#tx-date').value,
      note: $('#tx-note').value.trim(),
      tags,
    }, readFormTarget(FORMS.tx, type));
    const v = Core.validateTransaction(t, state.categories, state.accounts);
    if (!v.ok) { toast(v.errors.join('；'), true); return; }
    t.createdAt = new Date().toISOString();
    if (editingId) {
      const idx = state.transactions.findIndex(x => x.id === editingId);
      if (idx === -1) { toast('记录不存在或已被删除，保存失败', true); return; }
      if (state.transactions[idx].createdAt) t.createdAt = state.transactions[idx].createdAt;
      if (state.transactions[idx].recurringId) t.recurringId = state.transactions[idx].recurringId;
      state.transactions[idx] = t;
    } else {
      state.transactions.push(t);
    }
    saveKey('transactions');
    hideModal('#tx-modal');
    render();
    toast((editingId ? '已保存修改' : '已记一笔') + (tagsTruncated ? '（标签超出 5 个，已截断）' : ''));
  }

  function onDeleteTx() {
    const id = state.editingId;
    const idx = state.transactions.findIndex(x => x.id === id);
    if (idx === -1) { toast('记录不存在或已被删除', true); return; }
    askConfirm('确定删除这笔记录吗？可在管理页回收站恢复。', () => {
      const cur = state.transactions.findIndex(x => x.id === id);
      if (cur === -1) { hideModal('#tx-modal'); toast('记录不存在或已被删除', true); return; }
      const removed = state.transactions.splice(cur, 1)[0];
      state.trash.unshift(Object.assign({ deletedAt: new Date().toISOString() }, removed));
      if (state.trash.length > 200) state.trash.length = 200;
      saveKey('transactions');
      saveKey('trash');
      hideModal('#tx-modal');
      render();
      toast('已移入回收站', false, { label: '撤销', cb() {
        const i = state.trash.findIndex(x => x.id === removed.id);
        if (i >= 0) state.trash.splice(i, 1);
        state.transactions.push(removed);
        saveKey('trash');
        saveKey('transactions');
        render();
        toast('已撤销删除');
      } });
    });
  }

  /* ================= 统计页与图表 ================= */

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 10), h = Math.max(rect.height, 10);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function themeColor(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function shortFen(fen) {
    const v = Math.round(fen);
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + '万';
    if (abs >= 100000) return (v / 100000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(Math.round(v / 100));
  }

  function drawEmpty(ctx, w, h, text) {
    ctx.fillStyle = themeColor('--muted', '#8a8f99');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  }

  function drawAxis(ctx, w, h, padL, padT, padB, max) {
    ctx.strokeStyle = themeColor('--line', '#ececef');
    ctx.fillStyle = themeColor('--muted', '#8a8f99');
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 2; i++) {
      const v = max * i / 2;
      const y = h - padB - (v / max) * (h - padT - padB);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - 4, y);
      ctx.stroke();
      ctx.fillText(shortFen(v), padL - 6, y);
    }
  }

  function drawDonut(canvas, items, emptyText) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const total = items.reduce((s, it) => s + it.value, 0);
    if (total <= 0) { drawEmpty(ctx, w, h, emptyText || ('本月暂无' + (state.statsType === 'expense' ? '支出' : '收入') + '记录')); return; }
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 10, r = R * 0.6;
    let a0 = -Math.PI / 2;
    items.forEach((it, i) => {
      const a1 = a0 + (it.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, r, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = it.color || PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      a0 = a1;
    });
    ctx.fillStyle = themeColor('--text', '#26282e');
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Core.formatFen(total), cx, cy - 9);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = themeColor('--muted', '#8a8f99');
    ctx.fillText('合计（元）', cx, cy + 11);
  }

  function drawBars(canvas, data, color) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const padL = 46, padT = 12, padB = 22;
    const max = Math.max.apply(null, data.map(d => d.value).concat([1]));
    drawAxis(ctx, w, h, padL, padT, padB, max);
    const plotW = w - padL - 8;
    const cw = plotW / data.length;
    const bw = Math.max(cw * 0.72, 1);
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '59');
    ctx.fillStyle = grad;
    data.forEach((d, i) => {
      if (d.value <= 0) return;
      const bh = (d.value / max) * (h - padT - padB);
      ctx.fillRect(padL + i * cw + (cw - bw) / 2, h - padB - bh, bw, bh);
    });
    ctx.fillStyle = themeColor('--muted', '#8a8f99');
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.forEach((d, i) => {
      if (d.label % 5 === 0 || i === data.length - 1) {
        ctx.fillText(String(d.label), padL + i * cw + cw / 2, h - padB + 5);
      }
    });
  }

  function drawPairedBars(canvas, data) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const padL = 46, padT = 12, padB = 22;
    const max = Math.max.apply(null, data.reduce((arr, d) => arr.concat([d.incomeFen, d.expenseFen]), [1]));
    drawAxis(ctx, w, h, padL, padT, padB, max);
    const plotW = w - padL - 8;
    const slot = plotW / data.length;
    const bw = Math.min(slot * 0.3, 22);
    data.forEach((d, i) => {
      const cx = padL + i * slot + slot / 2;
      const bh1 = (d.expenseFen / max) * (h - padT - padB);
      const bh2 = (d.incomeFen / max) * (h - padT - padB);
      ctx.fillStyle = '#e05656';
      if (bh1 > 0) ctx.fillRect(cx - bw - 2, h - padB - bh1, bw, bh1);
      ctx.fillStyle = '#2f9e63';
      if (bh2 > 0) ctx.fillRect(cx + 2, h - padB - bh2, bw, bh2);
      ctx.fillStyle = themeColor('--muted', '#8a8f99');
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(Number(d.monthKey.slice(5)) + '月', cx, h - padB + 5);
    });
  }

  function renderStats() {
    const el = $('#page-stats');
    const type = state.statsType;
    const typeName = type === 'expense' ? '支出' : '收入';
    const totals = Core.withCategoryDelta(
      Core.categoryTotals(state.transactions, state.categories, state.monthKey, type),
      Core.categoryTotals(state.transactions, state.categories, Core.shiftMonth(state.monthKey, -1), type)
    );
    const totalFen = totals.reduce((s, c) => s + c.amountFen, 0);
    const drillCat = state.drillCatId ? totals.find(c => c.categoryId === state.drillCatId) : null;
    const shown = drillCat ? drillCat.subs : totals;
    const drillEmpty = drillCat && !drillCat.subs.length;
    const shownTotalFen = drillCat ? drillCat.amountFen : totalFen;
    const statsYear = state.statsYear || Number(state.monthKey.slice(0, 4));
    const yearData = Core.yearStats(state.transactions, statsYear);
    const yearTop = yearData.topExpense.slice(0, 5).map(c => {
      const cat = Core.findCategory(state.categories, c.categoryId);
      return `<div class="manage-row"><span class="m-icon">${esc(cat ? cat.icon : '❓')}</span><span class="m-name">${esc(cat ? cat.name : c.categoryId)}</span><span class="m-actions">${yuan(c.amountFen)}</span></div>`;
    }).join('');
    const yearTopHtml = yearTop
      ? '<h3>全年支出分类排行</h3><div class="manage-section">' + yearTop + '</div>'
      : '<p class="hint">全年暂无支出记录</p>';
    const items = shown.map((c, i) => ({ label: c.name, value: c.amountFen, color: PALETTE[i % PALETTE.length] }));
    const deltaHtml = c => {
      if (c.deltaPct == null) return '<span class="delta">新</span>';
      if (c.deltaPct === 0) return '';
      const up = c.deltaPct > 0;
      const good = type === 'expense' ? !up : up;
      return `<span class="delta ${good ? 'delta-good' : 'delta-bad'}">${up ? '↑' : '↓'}${Math.abs(c.deltaPct)}%</span>`;
    };
    const legendHtml = shown.length ? shown.map((c, i) => {
      const pct = shownTotalFen > 0 ? Math.round(c.amountFen / shownTotalFen * 100) : 0;
      const drillAttr = drillCat ? '' : ` data-drill-cat="${esc(c.categoryId)}"`;
      const barPct = drillCat ? 0 : (shownTotalFen > 0 ? Math.round(c.amountFen / shownTotalFen * 100) : 0);
      const bar = drillCat ? '' : `<span class="legend-bar" style="width:${Math.min(100, barPct)}%;background:${PALETTE[i % PALETTE.length]}"></span>`;
      return `<div class="legend-item"${drillAttr} role="button" tabindex="0">
        ${bar}<span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="name">${esc(c.name)}</span>
        <span class="val">${yuan(c.amountFen)}</span>
        ${drillCat ? '' : deltaHtml(c)}
        <span class="pct">${pct}%</span>
      </div>`;
    }).join('') : (drillCat
      ? '<div class="empty-tip">该分类的支出都直接记在大类上，没有子分类明细</div>'
      : '<div class="empty-tip">暂无数据</div>');
    const head = drillCat
      ? `<button class="btn-small btn" data-action="drill-back">‹ 返回</button> ${esc(drillCat.icon)} ${esc(drillCat.name)} · ${yuan(drillCat.amountFen)}`
      : `本月${typeName}构成 · ${yuan(totalFen)}`;
    el.innerHTML = `
      <div class="stats-toggle">
        <button data-stats-type="expense" class="${type === 'expense' ? 'active' : ''}">支出</button>
        <button data-stats-type="income" class="${type === 'income' ? 'active' : ''}">收入</button>
      </div>
      <div class="card stat-donut">
        <h3>${head}</h3>
        <canvas id="stats-donut" class="chart"></canvas>
        <div class="legend">${legendHtml}</div>
        ${drillCat ? '' : '<p class="hint">点击某大类可查看其子分类占比</p>'}
      </div>
      <div class="card stat-daily"><h3>每日支出</h3><canvas id="stats-daily" class="chart"></canvas></div>
      <div class="card stat-trend"><h3>近 6 个月收支趋势</h3>
        <p class="hint"><span style="color:#e05656">■</span>&emsp;支出<span style="color:#2f9e63">■</span>&emsp;收入</p>
        <canvas id="stats-trend" class="chart"></canvas>
      </div>
      <div class="card stat-year">
        <h3>${statsYear} 年度报告
          <button class="btn-small btn" data-action="stats-year-prev" title="上一年">‹</button>
          <button class="btn-small btn" data-action="stats-year-next" title="下一年">›</button>
        </h3>
        <div class="summary-card">
          <div class="cell"><div class="label">全年收入</div><div class="num income">${yuan(yearData.incomeFen)}</div></div>
          <div class="cell"><div class="label">全年支出</div><div class="num expense">${yuan(yearData.expenseFen)}</div></div>
          <div class="cell"><div class="label">全年结余</div><div class="num">${yuan(yearData.balanceFen)}</div></div>
          <div class="cell"><div class="label">月均支出</div><div class="num expense">${yuan(Math.round(yearData.expenseFen / 12))}</div></div>
        </div>
        <canvas id="stats-year" class="chart"></canvas>
        ${yearTopHtml}
      </div>`;
    drawDonut($('#stats-donut'), items, drillEmpty ? '该分类未使用子分类' : undefined);
    drawBars($('#stats-daily'), Core.dailyTotals(state.transactions, state.monthKey).map(d => ({ label: d.day, value: d.amountFen })), '#e05656');
    drawPairedBars($('#stats-trend'), Core.monthlyTrend(state.transactions, state.monthKey, 6));
    drawBars($('#stats-year'), yearData.monthly.map(m => ({ label: Number(m.monthKey.slice(5)), value: m.expenseFen })), '#e05656');
  }

  /* ================= 预算页 ================= */

  function renderBudget(focusSel) {
    const el = $('#page-budget');
    const entry = state.budgets[state.monthKey] || null;
    const catTotals = Core.categoryTotals(state.transactions, state.categories, state.monthKey, 'expense');
    const st = Core.budgetStatus(entry, catTotals);
    const spentOf = id => {
      const c = catTotals.find(x => x.categoryId === id);
      return c ? c.amountFen : 0;
    };
    const lvCls = lv => lv === 'over' ? 'lv-over' : (lv === 'warn' ? 'lv-warn' : 'lv-ok');
    const summaryText = !st.hasBudget
      ? '还没有设置本月预算，先在下面填一个总预算或分类预算吧。'
      : (st.totalFen <= 0
        ? `本月已用 ${yuan(st.spentFen)}。`
        : (st.remainingFen >= 0
          ? `本月已用 ${yuan(st.spentFen)} / 预算 ${yuan(st.totalFen)}，还剩 ${yuan(st.remainingFen)} 可用。`
          : `本月已用 ${yuan(st.spentFen)}，已超出预算 ${yuan(-st.remainingFen)}，注意控制开支！`));
    const rows = state.categories.filter(c => c.type === 'expense').map(c => {
      const b = entry && entry.byCategory ? (Number(entry.byCategory[c.id]) || 0) : 0;
      const spent = spentOf(c.id);
      const ratio = b > 0 ? spent / b : 0;
      const bar = b > 0
        ? `<div class="progress"><div class="${lvCls(Core.levelOf(ratio))}" style="width:${Math.min(100, Math.floor(spent * 100 / b))}%"></div></div>`
        : '<div class="progress"></div>';
      return `<div class="budget-row">
        <span class="b-name">${esc(c.icon)} ${esc(c.name)}</span>
        <input type="text" inputmode="decimal" data-budget-cat="${esc(c.id)}" value="${b > 0 ? Core.formatFen(b) : ''}" placeholder="预算(元)">
        ${bar}
        <span class="b-spent">已用 ${Core.formatFen(spent)}</span>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="card">
        <h3>${state.monthKey} 预算</h3>
        <div class="budget-total-row">
          <span>总预算（元）</span>
          <input type="text" inputmode="decimal" id="budget-total" value="${entry && entry.total > 0 ? Core.formatFen(entry.total) : ''}" placeholder="如 3000">
        </div>
        ${st.hasBudget && st.totalFen > 0 ? `<div class="progress" style="height:14px"><div class="${lvCls(st.level)}" style="width:${Math.min(100, st.percent)}%"></div></div>` : ''}
        <p class="budget-summary-text">${summaryText}</p>
      </div>
      <div class="card">
        <h3>分类预算</h3>
        ${rows}
        <p class="hint">留空表示不设该分类预算；预算按月分别保存。</p>
      </div>`;
    if (focusSel) {
      const input = document.querySelector(focusSel);
      if (input) {
        input.focus();
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch (e) { /* 非 text 型忽略 */ }
      }
    }
  }

  function withBudgetEntry(mutate, errMsg, focusSel) {
    if (!state.budgets[state.monthKey]) state.budgets[state.monthKey] = { total: 0, byCategory: {} };
    const failed = mutate(state.budgets[state.monthKey]) === false;
    if (!failed) saveKey('budgets');
    renderBudget(focusSel);
    if (failed) toast(errMsg, true);
  }

  function onBudgetTotalChange(raw) {
    withBudgetEntry(entry => {
      const v = raw.trim();
      if (v === '') { entry.total = 0; return; }
      const fen = parseFenAllowZero(v);
      if (fen == null) return false;
      entry.total = fen;
    }, '总预算格式不正确', '#budget-total');
  }

  function onBudgetCatChange(catId, raw) {
    withBudgetEntry(entry => {
      const v = raw.trim();
      if (v === '') { delete entry.byCategory[catId]; return; }
      const fen = parseFenAllowZero(v);
      if (fen == null) return false;
      if (fen === 0) delete entry.byCategory[catId];
      else entry.byCategory[catId] = fen;
    }, '预算金额格式不正确', `[data-budget-cat="${catId}"]`);
  }

  /* ================= 管理页 ================= */

  function renderManage() {
    const el = $('#page-manage');
    const balances = Core.accountBalances(state.accounts, state.transactions);
    const catSection = type => {
      const typeName = type === 'expense' ? '支出' : '收入';
      const rows = state.categories.filter(c => c.type === type).map(c =>
        `<div class="manage-row">
          <span class="m-icon">${esc(c.icon)}</span>
          <span class="m-name">${esc(c.name)}<small>${c.subs.length} 个子分类</small></span>
          <span class="m-actions">
            <button class="btn btn-small" data-action="edit-cat" data-id="${esc(c.id)}">编辑</button>
            <button class="btn btn-small" data-action="del-cat" data-id="${esc(c.id)}">删除</button>
          </span>
        </div>`).join('');
      return `<div class="manage-section">
        <h3>${typeName}分类（${state.categories.filter(c => c.type === type).length}）</h3>
        ${rows}
        <div class="add-form">
          <input class="input-icon" id="new-cat-icon-${type}" type="text" maxlength="4" placeholder="图标">
          <input id="new-cat-name-${type}" type="text" maxlength="10" placeholder="新增${typeName}分类名称">
          <button class="btn-primary btn-small" data-action="add-cat" data-type="${type}">添加</button>
        </div>
      </div>`;
    };
    const accRows = state.accounts.map(a =>
      `<div class="manage-row">
        <span class="m-icon">${esc(a.icon)}</span>
        <span class="m-name">${esc(a.name)}<small>余额 ${yuan(balances.get(a.id) || 0)}</small></span>
        <span class="m-actions">
          <button class="btn btn-small" data-action="edit-acc" data-id="${esc(a.id)}">编辑</button>
          <button class="btn btn-small" data-action="del-acc" data-id="${esc(a.id)}">删除</button>
        </span>
      </div>`).join('');
    const FREQ_NAMES = { daily: '每日', weekly: '每周', monthly: '每月' };
    const recRows = state.recurrings.map(r => {
      const cat = Core.findCategory(state.categories, r.categoryId);
      const sub = cat ? Core.findSub(cat, r.subcategoryId) : null;
      const line = r.type === 'transfer'
        ? accountName(r.accountId) + ' → ' + accountName(r.toAccountId)
        : (cat ? cat.name : '?') + (sub ? '/' + sub.name : '');
      return `<div class="manage-row">
        <span class="m-icon">🔁</span>
        <span class="m-name">${esc(line)}<small>${esc(FREQ_NAMES[r.frequency] || r.frequency)} · 下次 ${esc(r.nextDate)}${r.note ? ' · ' + esc(r.note) : ''}</small></span>
        <span class="m-actions">
          <button class="btn btn-small" data-action="edit-rec" data-id="${esc(r.id)}">编辑</button>
          <button class="btn btn-small" data-action="del-rec" data-id="${esc(r.id)}">删除</button>
        </span>
      </div>`;
    }).join('');
    const corruptKeys = [];
    for (const k of Object.values(state.storage.keys)) {
      try {
        const raw = state.storage.backend.getItem(k + '.corrupt-backup');
        if (raw != null) corruptKeys.push({ key: k + '.corrupt-backup', size: raw.length });
      } catch (e) { /* 后端不可访问时忽略 */ }
    }
    const trashRows = state.trash.map(t => {
      const cat = Core.findCategory(state.categories, t.categoryId);
      const sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-';
      const desc = t.type === 'transfer'
        ? accountName(t.accountId) + ' → ' + accountName(t.toAccountId)
        : (cat ? cat.name : '未知分类');
      return `<div class="manage-row">
        <span class="m-icon">🗑️</span>
        <span class="m-name">${esc(desc)}<small>${esc(t.date)} · ${sign}${yuan(t.amount)}${t.note ? ' · ' + esc(t.note) : ''}</small></span>
        <span class="m-actions">
          <button class="btn btn-small" data-action="restore-trash" data-id="${esc(t.id)}">恢复</button>
          <button class="btn btn-small" data-action="purge-trash" data-id="${esc(t.id)}">彻底删除</button>
        </span>
      </div>`;
    }).join('');
    const corruptBlock = corruptKeys.length
      ? `<h3>损坏数据备份</h3><p class="hint">检测到启动时被替换的损坏数据原文，可导出后尝试人工恢复：</p>` +
        corruptKeys.map(c => `<div class="manage-row">
          <span class="m-icon">🧯</span>
          <span class="m-name">${esc(c.key)}<small>${c.size} 字符</small></span>
          <span class="m-actions">
            <button class="btn btn-small" data-action="export-corrupt" data-key="${esc(c.key)}">导出</button>
            <button class="btn btn-small" data-action="del-corrupt" data-key="${esc(c.key)}">删除</button>
          </span>
        </div>`).join('')
      : '';
    el.innerHTML = `
      <div class="card manage-section">
        <h3>周期记账（${state.recurrings.length}）</h3>
        ${recRows || '<p class="hint">房租、订阅、工资这类固定收支可以设为周期，到期自动生成。</p>'}
        <div class="add-form">
          <button class="btn-primary btn-small" data-action="add-rec">＋ 新增周期记账</button>
        </div>
      </div>
      <div class="card manage-section">
        <h3>回收站（${state.trash.length}）</h3>
        ${trashRows || '<p class="hint">删除的记录会在这里保留（最多 200 条），可随时恢复。</p>'}
        ${state.trash.length ? '<div class="add-form"><button class="btn-danger btn-small" data-action="clear-trash">清空回收站</button></div>' : ''}
      </div>
      <div class="card manage-section">
        <h3>账户管理（${state.accounts.length}）</h3>
        ${accRows}
        <div class="add-form">
          <input class="input-icon" id="new-acc-icon" type="text" maxlength="4" placeholder="图标">
          <input id="new-acc-name" type="text" maxlength="10" placeholder="新账户名称">
          <input id="new-acc-initial" type="text" inputmode="decimal" placeholder="期初余额(元)">
          <button class="btn-primary btn-small" data-action="add-acc">添加</button>
        </div>
      </div>
      <div class="card">${catSection('expense')}</div>
      <div class="card">${catSection('income')}</div>
      ${corruptKeys.length ? `<div class="card">${corruptBlock}</div>` : ''}
      <div class="card">
        <h3>数据备份</h3>
        <div class="data-actions">
          <button class="btn" data-action="export">导出备份（JSON）</button>
          <button class="btn" data-action="import-click">导入备份</button>
          <button class="btn" data-action="export-csv">导出明细（CSV）</button>
          <button class="btn" data-action="import-csv-click">导入 CSV</button>
          <button class="btn-danger" data-action="clear-data">清空全部数据</button>
        </div>
        <p class="hint">数据保存在本机浏览器中，换电脑或清浏览器缓存前请先导出备份。导入会覆盖当前全部数据；CSV 导入为追加模式。</p>
        <input type="file" id="import-file" accept=".json,application/json" class="hidden">
        <input type="file" id="import-csv-file" accept=".csv,text/csv" class="hidden">
      </div>`;
  }

  function onAddCat(type) {
    const name = $('#new-cat-name-' + type).value.trim();
    if (!name) { toast('请填写分类名称', true); return; }
    if (state.categories.some(c => c.name === name)) { toast('已存在同名分类，CSV 导入按名称匹配，请换一个名字', true); return; }
    const icon = $('#new-cat-icon-' + type).value.trim() || (type === 'expense' ? '🏷️' : '💰');
    const c = { id: Core.genId('cat'), type, name, icon, subs: [] };
    state.categories.push(c);
    saveKey('categories');
    renderManage();
    openCatModal(c.id);
  }

  function onDeleteCat(id) {
    const refs = state.transactions.filter(t => t.categoryId === id).length
      + state.recurrings.filter(r => r.categoryId === id).length
      + state.trash.filter(t => t.categoryId === id).length;
    if (refs > 0) { toast(`有 ${refs} 笔记录或周期模板使用该分类，无法删除`, true); return; }
    askConfirm('确定删除该分类及其全部子分类吗？', () => {
      state.categories = state.categories.filter(c => c.id !== id);
      if (state.filter.categoryId === id) state.filter.categoryId = '';
      for (const mk of Object.keys(state.budgets)) {
        const e = state.budgets[mk];
        if (e && e.byCategory) delete e.byCategory[id];
      }
      saveKey('categories');
      saveKey('budgets');
      render();
      toast('已删除分类');
    });
  }

  const EMOJI_CHOICES = ['🍜', '☕', '🛒', '🚌', '🚗', '🏠', '🎮', '🏥', '📖', '🎓', '🎁', '💳', '📈', '💼', '📦', '🧧', '🐱', '🐶', '👕', '📱', '💊', '🎬', '✈️', '🏖️'];

  function renderEmojiGrid() {
    $('#emoji-grid').innerHTML = EMOJI_CHOICES.map(e =>
      `<button type="button" class="emoji-cell${$('#cat-icon').value === e ? ' active' : ''}" data-action="pick-icon" data-emoji="${e}">${e}</button>`).join('');
  }

  function openCatModal(catId) {
    const cat = catId ? Core.findCategory(state.categories, catId) : null;
    state.catEditorId = catId || null;
    state.catDraft = cat ? deepCopy(cat) : { id: null, type: 'expense', name: '', icon: '', subs: [] };
    $('#cat-modal-title').textContent = '编辑分类';
    $('#cat-icon').value = cat ? cat.icon : '';
    $('#cat-name').value = cat ? cat.name : '';
    $('#cat-new-sub').value = '';
    renderCatSubs();
    renderEmojiGrid();
    modalOpenedAt = Date.now();
    show('#cat-modal');
    $('#cat-name').focus();
  }

  function renderCatSubs() {
    $('#cat-subs').innerHTML = state.catDraft.subs.map(s =>
      `<div class="sub-row">
        <span class="sub-name">${esc(s.name)}</span>
        <button type="button" class="btn btn-small" data-action="del-sub" data-id="${esc(s.id)}">删除</button>
      </div>`).join('') || '<p class="hint">还没有子分类，在下方添加</p>';
  }

  function onAddSub() {
    const name = $('#cat-new-sub').value.trim();
    if (!name) { toast('请填写子分类名称', true); return; }
    if (state.catDraft.subs.some(s => s.name === name)) { toast('子分类名称重复', true); return; }
    state.catDraft.subs.push({ id: Core.genId('sub'), name });
    $('#cat-new-sub').value = '';
    renderCatSubs();
  }

  function onDelSub(subId) {
    const refs = state.transactions.filter(t => t.subcategoryId === subId).length
      + state.recurrings.filter(r => r.subcategoryId === subId).length
      + state.trash.filter(t => t.subcategoryId === subId).length;
    if (refs > 0) { toast(`有 ${refs} 笔记录或周期模板使用该子分类，无法删除`, true); return; }
    state.catDraft.subs = state.catDraft.subs.filter(s => s.id !== subId);
    renderCatSubs();
  }

  function onCatSubmit(e) {
    e.preventDefault();
    const name = $('#cat-name').value.trim();
    if (!name) { toast('请填写分类名称', true); return; }
    if (state.categories.some(c => c.name === name && c.id !== state.catEditorId)) { toast('已存在同名分类，CSV 导入按名称匹配，请换一个名字', true); return; }
    const icon = $('#cat-icon').value.trim() || (state.catDraft.type === 'expense' ? '🏷️' : '💰');
    if (state.catEditorId) {
      const cat = Core.findCategory(state.categories, state.catEditorId);
      if (!cat) { toast('分类不存在，请重新打开编辑', true); return; }
      cat.name = name;
      cat.icon = icon;
      cat.subs = state.catDraft.subs;
    } else {
      state.categories.push({ id: Core.genId('cat'), type: state.catDraft.type, name, icon, subs: state.catDraft.subs });
    }
    saveKey('categories');
    hideModal('#cat-modal');
    render();
    toast('分类已保存');
  }

  function parseInitialFen(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (s === '') return 0;
    let sign = 1, body = s;
    if (s[0] === '-') { sign = -1; body = s.slice(1); }
    const fen = Core.parseYuanToFen(body);
    if (fen != null) return sign * fen;
    return /^-?0+(\.0+)?$/.test(s) ? 0 : null;
  }

  function onAddAcc() {
    const name = $('#new-acc-name').value.trim();
    if (!name) { toast('请填写账户名称', true); return; }
    if (state.accounts.some(a => a.name === name)) { toast('已存在同名账户，CSV 导入按名称匹配，请换一个名字', true); return; }
    const icon = $('#new-acc-icon').value.trim() || '💰';
    const initial = parseInitialFen($('#new-acc-initial').value);
    if (initial == null) { toast('期初余额格式不正确', true); return; }
    state.accounts.push({ id: Core.genId('acc'), name, icon, initialBalance: initial });
    saveKey('accounts');
    render();
    toast('账户已添加');
  }

  function onDeleteAcc(id) {
    if (!id) return;
    const refs = state.transactions.filter(t => t.accountId === id || t.toAccountId === id).length
      + state.recurrings.filter(r => r.accountId === id || r.toAccountId === id).length
      + state.trash.filter(t => t.accountId === id || t.toAccountId === id).length;
    if (refs > 0) { toast(`有 ${refs} 笔记录或周期模板使用该账户，无法删除`, true); return; }
    askConfirm('确定删除该账户吗？', () => {
      state.accounts = state.accounts.filter(a => a.id !== id);
      if (state.filter.accountId === id) state.filter.accountId = '';
      saveKey('accounts');
      hideModal('#acc-modal');
      render();
      toast('已删除账户');
    });
  }

  function openAccModal(accId) {
    const a = accId ? state.accounts.find(x => x.id === accId) : null;
    state.accEditorId = accId || null;
    $('#acc-modal-title').textContent = '编辑账户';
    $('#acc-icon').value = a ? a.icon : '';
    $('#acc-name').value = a ? a.name : '';
    $('#acc-initial').value = a && a.initialBalance ? Core.formatFen(a.initialBalance) : '';
    const balances = Core.accountBalances(state.accounts, state.transactions);
    $('#acc-modal .hint').textContent = a
      ? `当前余额 ${yuan(balances.get(a.id) || 0)}，自动计算：期初余额 ＋ 收入 − 支出 ± 转账`
      : '余额自动计算：期初余额 ＋ 收入 − 支出 ± 转账';
    $('#acc-delete').classList.toggle('hidden', !a);
    modalOpenedAt = Date.now();
    show('#acc-modal');
    $('#acc-name').focus();
  }

  function onAccSubmit(e) {
    e.preventDefault();
    const name = $('#acc-name').value.trim();
    if (!name) { toast('请填写账户名称', true); return; }
    if (state.accounts.some(a => a.name === name && a.id !== state.accEditorId)) { toast('已存在同名账户，CSV 导入按名称匹配，请换一个名字', true); return; }
    const icon = $('#acc-icon').value.trim() || '💰';
    const initial = parseInitialFen($('#acc-initial').value);
    if (initial == null) { toast('期初余额格式不正确', true); return; }
    const acc = state.accounts.find(x => x.id === state.accEditorId);
    if (!acc) { toast('账户不存在，请重新打开编辑', true); return; }
    acc.name = name;
    acc.icon = icon;
    acc.initialBalance = initial;
    saveKey('accounts');
    hideModal('#acc-modal');
    render();
    toast('账户已保存');
  }

  /* ================= 周期记账与 CSV ================= */

  function openRecModal(recId) {
    const r = recId ? state.recurrings.find(x => x.id === recId) : null;
    state.recEditorId = recId || null;
    state.recFormType = r ? r.type : 'expense';
    $('#rec-modal-title').textContent = r ? '编辑周期记账' : '新增周期记账';
    $('#rec-amount').value = r ? Core.formatFen(r.amount) : '';
    $('#rec-date').value = r ? r.nextDate : Core.todayStr();
    $('#rec-note').value = r ? (r.note || '') : '';
    $('#rec-freq').value = r ? r.frequency : 'monthly';
    $('#rec-delete').classList.toggle('hidden', !r);
    fillFormCommon(FORMS.rec, state.recFormType, r);
    $('#rec-freq').value = r ? r.frequency : 'monthly';
    modalOpenedAt = Date.now();
    show('#rec-modal');
    $('#rec-amount').focus();
  }

  function onRecSubmit(e) {
    e.preventDefault();
    const editingId = state.recEditorId;
    const type = state.recFormType;
    const amount = Core.parseYuanToFen($('#rec-amount').value);
    const rec = Object.assign({
      id: editingId || Core.genId('rec'),
      type,
      amount: amount == null ? NaN : amount,
      note: $('#rec-note').value.trim(),
      tags: [],
      frequency: $('#rec-freq').value,
      nextDate: $('#rec-date').value,
    }, readFormTarget(FORMS.rec, type));
    const v = Core.validateTransaction(Object.assign({}, rec, { date: rec.nextDate }), state.categories, state.accounts);
    if (!v.ok) { toast(v.errors.join('；'), true); return; }
    delete rec.date;
    const prevRec = editingId ? state.recurrings.find(x => x.id === editingId) : null;
    rec.anchorDay = (prevRec && prevRec.nextDate === rec.nextDate && Number.isInteger(prevRec.anchorDay))
      ? prevRec.anchorDay
      : Number(rec.nextDate.slice(8, 10));
    rec.tags = prevRec && Array.isArray(prevRec.tags) ? prevRec.tags : [];
    if (editingId) {
      const idx = state.recurrings.findIndex(x => x.id === editingId);
      if (idx === -1) { toast('模板不存在或已被删除', true); return; }
      state.recurrings[idx] = rec;
    } else {
      state.recurrings.push(rec);
    }
    const gen = Core.generateDueRecurrings(state.recurrings, Core.todayStr(), state.categories, state.accounts);
    state.recurrings = gen.recurrings;
    if (gen.transactions.length) state.transactions.push(...gen.transactions);
    saveKey('recurrings');
    saveKey('transactions');
    hideModal('#rec-modal');
    render();
    toast(gen.generated > 0 ? '周期记账已保存，本次已生成 ' + gen.generated + ' 笔' : '周期记账已保存，到期将自动生成');
    if (gen.errors.length) toast('有 ' + gen.errors.length + ' 个周期模板失效，请检查', true);
  }

  function onRecDelete() {
    const id = state.recEditorId;
    askConfirm('确定删除该周期模板吗？已生成的记录不受影响。', () => {
      state.recurrings = state.recurrings.filter(x => x.id !== id);
      saveKey('recurrings');
      hideModal('#rec-modal');
      render();
      toast('已删除周期模板');
    });
  }

  function onExportCsv() {
    const csv = Core.toCSV(state.transactions, state.categories, state.accounts);
    if (desktopBridge) {
      desktopBridge.exportFile({
        defaultName: '记账明细_' + Core.todayStr().replace(/-/g, '') + '.csv',
        content: csv,
        filters: [{ name: 'CSV 明细', extensions: ['csv'] }],
      }).then(r => {
        if (r && r.ok) toast('已导出到 ' + r.path);
        else if (r && !r.canceled) toast('导出失败：' + (r.error || '未知错误'), true);
      });
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '记账明细_' + Core.todayStr().replace(/-/g, '') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('CSV 明细已导出');
  }

  function onImportClick(kind) {
    if (desktopBridge) {
      desktopBridge.importFile({ kind }).then(r => {
        if (!r || r.canceled) return;
        if (!r.ok) { toast('读取文件失败：' + (r.error || '未知错误'), true); return; }
        if (kind === 'json') handleImportJsonText(r.content);
        else handleImportCsvText(r.content);
      });
      return;
    }
    (kind === 'json' ? $('#import-file') : $('#import-csv-file')).click();
  }

  function onImportFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('文件超过 10MB，请确认选择的是本应用的备份文件', true); return; }
    const reader = new FileReader();
    reader.onerror = () => toast('文件读取失败', true);
    reader.onload = () => handleImportJsonText(reader.result);
    reader.readAsText(file);
  }

  function onImportCsvFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('文件超过 10MB，请确认选择的是本应用的明细文件', true); return; }
    const reader = new FileReader();
    reader.onerror = () => toast('文件读取失败', true);
    reader.onload = () => handleImportCsvText(reader.result);
    reader.readAsText(file, 'UTF-8');
  }

  function handleImportJsonText(text) {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { toast('文件不是有效的 JSON', true); return; }
    const v = Core.validateImport(parsed);
    if (!v.ok) { toast('导入失败：' + v.errors.join('；'), true); return; }
    askConfirm(`导入将覆盖当前全部数据（共 ${v.data.transactions.length} 笔交易），确定继续？`, () => {
      closeAllModals();
      const prev = {
        transactions: state.transactions, accounts: state.accounts, categories: state.categories,
        budgets: state.budgets, settings: state.settings, recurrings: state.recurrings,
      };
      closeModal();
      state.transactions = v.data.transactions;
      state.accounts = v.data.accounts;
      state.categories = v.data.categories;
      state.budgets = v.data.budgets;
      state.settings = v.data.settings && typeof v.data.settings === 'object' ? v.data.settings : { currency: '¥' };
      state.recurrings = Array.isArray(v.data.recurrings) ? v.data.recurrings : [];
      state.trash = Array.isArray(v.data.trash) ? v.data.trash : [];
      state.filter = { type: '', categoryId: '', accountId: '', tag: '', day: '', minYuan: '', maxYuan: '', keyword: '' };
      state.drillCatId = null;
      if (!saveAll()) {
        state.transactions = prev.transactions;
        state.accounts = prev.accounts;
        state.categories = prev.categories;
        state.budgets = prev.budgets;
        state.settings = prev.settings;
        state.recurrings = prev.recurrings;
        state.trash = prev.trash;
        saveAll();
        toast('存储空间不足，导入已撤销；请清理空间或先导出旧数据后重试', true);
        render();
        return;
      }
      applyTheme();
      render();
      toast('导入成功');
    });
  }

  /* ================= 数据导入导出 ================= */

  function onExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        transactions: state.transactions,
        accounts: state.accounts,
        categories: state.categories,
        budgets: state.budgets,
        settings: state.settings,
        recurrings: state.recurrings,
        trash: state.trash,
      },
    };
    const text = JSON.stringify(payload, null, 2);
    if (desktopBridge) {
      desktopBridge.exportFile({
        defaultName: '记账备份_' + Core.todayStr().replace(/-/g, '') + '.json',
        content: text,
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
      }).then(r => {
        if (r && r.ok) toast('已导出到 ' + r.path);
        else if (r && !r.canceled) toast('导出失败：' + (r.error || '未知错误'), true);
      });
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '记账备份_' + Core.todayStr().replace(/-/g, '') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('备份文件已导出');
  }

  function txDupKey(t) {
    return [t.date, t.amount, t.type, t.categoryId, t.subcategoryId, t.accountId, t.toAccountId, (t.tags || []).join('、'), t.note].join('|');
  }

  function handleImportCsvText(text) {
    const kind = Core.detectBillKind(text);
    if (kind) {
      const bill = Core.parseBillCsv(text, kind, state.accounts, { fallbackAccountId: (state.accounts[0] || {}).id || null, categories: state.categories });
      if (bill.headerFound) { handleImportBill(text, kind, bill); return; }
    }
    const parsed = Core.parseCSV(text, state.categories, state.accounts);
    if (!parsed.transactions.length) {
      toast('没有可导入的行：' + parsed.errors.slice(0, 2).map(e => e.message).join('；'), true);
      return;
    }
    const existing = new Set(state.transactions.map(txDupKey));
    const dupCount = parsed.transactions.filter(t => existing.has(txDupKey(t))).length;
    const dupNote = dupCount > 0 ? '，其中 ' + dupCount + ' 笔可能与现有记录重复' : '';
    const skipNote = parsed.errors.length ? '，' + parsed.errors.length + ' 行有误将被跳过' : '';
    askConfirm(`将追加 ${parsed.transactions.length} 笔记录${dupNote}${skipNote}，确定导入？`, () => {
      const now = new Date().toISOString();
      for (const t of parsed.transactions) {
        t.id = Core.genId('tx');
        t.createdAt = now;
        state.transactions.push(t);
      }
      saveKey('transactions');
      render();
      toast('已导入 ' + parsed.transactions.length + ' 笔' + (parsed.errors.length ? '，跳过 ' + parsed.errors.length + ' 行' : ''));
    });
  }

  function handleImportBill(text, kind, preParsed) {
    const kindName = kind === 'alipay' ? '支付宝' : '微信';
    const fallbackId = (state.accounts[0] || {}).id || null;
    const parsed = preParsed || Core.parseBillCsv(text, kind, state.accounts, { fallbackAccountId: fallbackId, categories: state.categories });
    if (!parsed.transactions.length) {
      toast('没有可导入的行：' + parsed.errors.slice(0, 2).map(e => e.message).join('；'), true);
      return;
    }
    const income = parsed.transactions.filter(t => t.type === 'income').length;
    const expense = parsed.transactions.length - income;
    const skipNote = parsed.errors.length ? '，' + parsed.errors.length + ' 行跳过' : '';
    const existing = new Set(state.transactions.map(txDupKey));
    const dupCount = parsed.transactions.filter(t => existing.has(txDupKey(t))).length;
    const dupNote = dupCount > 0 ? '，其中 ' + dupCount + ' 笔可能与现有记录重复' : '';
    const fallbackName = (state.accounts[0] || {}).name || '默认账户';
    askConfirm(`识别为${kindName}账单：收入 ${income} 笔、支出 ${expense} 笔${dupNote}${skipNote}。无法识别支付方式的记录将记入「${fallbackName}」，导入后可在明细中调整。确定追加导入？`, () => {
      state.transactions.push(...parsed.transactions);
      saveKey('transactions');
      render();
      toast(`已导入 ${parsed.transactions.length} 笔${kindName}账单${parsed.errors.length ? '，跳过 ' + parsed.errors.length + ' 行' : ''}`);
    });
  }

  function onClearData() {
    askConfirm('将删除全部数据且无法恢复，确定清空吗？', () => {
      askConfirm('再次确认：真的要清空全部数据吗？', () => {
        closeAllModals();
        state.storage.clear();
        state.transactions = [];
        state.accounts = deepCopy(Core.DEFAULT_ACCOUNTS);
        state.categories = deepCopy(Core.DEFAULT_CATEGORIES);
        state.budgets = {};
        state.settings = { currency: '¥' };
        state.recurrings = [];
        state.trash = [];
        state.filter = { type: '', categoryId: '', accountId: '', tag: '', day: '', minYuan: '', maxYuan: '', keyword: '' };
        state.drillCatId = null;
        saveAll();
        applyTheme();
        render();
        toast('已清空全部数据');
      });
    });
  }

  /* ================= 事件绑定 ================= */

  function bindEvents() {
    document.addEventListener('click', e => {
      if (e.target.classList && e.target.classList.contains('modal')) {
        if (Date.now() - modalOpenedAt > 300) closeModal();
        return;
      }
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { state.tab = tabBtn.dataset.tab; render(); return; }
      const seg = e.target.closest('[data-tx-type]');
      if (seg) { state.formType = seg.dataset.txType; renderTxTypeSeg(); onFormTypeChanged(); return; }
      const rseg = e.target.closest('[data-rec-type]');
      if (rseg) { state.recFormType = rseg.dataset.recType; renderRecTypeSeg(); onRecTypeChanged(); return; }
      const st = e.target.closest('[data-stats-type]');
      if (st) { state.statsType = st.dataset.statsType; state.drillCatId = null; render(); return; }
      const drill = e.target.closest('[data-drill-cat]');
      if (drill) { state.drillCatId = drill.dataset.drillCat; renderStats(); return; }
      const quick = e.target.closest('[data-sub-pick]');
      if (quick) { $('#tx-sub').value = quick.dataset.subPick; syncQuickActive(); return; }
      const act = e.target.closest('[data-action]');
      if (!act) return;
      switch (act.dataset.action) {
        case 'prev-month': state.monthKey = Core.shiftMonth(state.monthKey, -1); state.statsYear = null; render(); break;
        case 'next-month': state.monthKey = Core.shiftMonth(state.monthKey, 1); state.statsYear = null; render(); break;
        case 'open-add': openTxModal(null); break;
        case 'date-today': $('#tx-date').value = Core.todayStr(); break;
        case 'date-yesterday': $('#tx-date').value = Core.addDays(Core.todayStr(), -1); break;
        case 'duplicate-tx': {
          const src = state.transactions.find(x => x.id === state.editingId);
          if (!src) break;
          const copy = Object.assign({}, src, { id: Core.genId('tx'), date: Core.todayStr(), createdAt: new Date().toISOString() });
          delete copy.recurringId;
          state.transactions.push(copy);
          saveKey('transactions');
          state.editingId = copy.id;
          render();
          toast('已创建副本（日期改为今天），可继续修改');
          break;
        }
        case 'cal-pick':
          state.filter.day = act.dataset.day;
          state.detailView = 'list';
          render();
          break;
        case 'clear-day': state.filter.day = ''; render(); break;
        case 'data-view': {
          const btn = e.target.closest('[data-view]');
          state.detailView = btn.dataset.view;
          render();
          break;
        }
        case 'back-top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
        case 'edit-tx': openTxModal(act.dataset.id); break;
        case 'delete-tx': onDeleteTx(); break;
        case 'close-modal': closeModal(); break;
        case 'confirm-ok': {
          const now = Date.now();
          if (now - lastConfirmOkAt < 300) break;
          lastConfirmOkAt = now;
          const cb = pendingConfirm;
          pendingConfirm = null;
          hide('#confirm-modal');
          if (cb) cb();
          break;
        }
        case 'confirm-cancel': pendingConfirm = null; hide('#confirm-modal'); break;
        case 'drill-back': state.drillCatId = null; renderStats(); break;
        case 'stats-year-prev': state.statsYear = (state.statsYear || Number(state.monthKey.slice(0, 4))) - 1; renderStats(); break;
        case 'stats-year-next': state.statsYear = (state.statsYear || Number(state.monthKey.slice(0, 4))) + 1; renderStats(); break;
        case 'toast-action': {
          const a = toastAction;
          toastAction = null;
          hide('#toast');
          clearTimeout(toastTimer);
          if (a && a.cb) a.cb();
          break;
        }
        case 'cycle-theme': onCycleTheme(); break;
        case 'add-rec': openRecModal(null); break;
        case 'edit-rec': openRecModal(act.dataset.id); break;
        case 'del-rec': state.recEditorId = act.dataset.id; onRecDelete(); break;
        case 'delete-rec': onRecDelete(); break;
        case 'pick-icon': {
          $('#cat-icon').value = act.dataset.emoji;
          document.querySelectorAll('#emoji-grid .emoji-cell').forEach(b =>
            b.classList.toggle('active', b.dataset.emoji === act.dataset.emoji));
          break;
        }
        case 'restore-trash': {
          const i = state.trash.findIndex(x => x.id === act.dataset.id);
          if (i >= 0) {
            const item = state.trash.splice(i, 1)[0];
            delete item.deletedAt;
            state.transactions.push(item);
            saveKey('trash');
            saveKey('transactions');
            render();
            toast('已恢复到明细');
          }
          break;
        }
        case 'purge-trash': {
          const tid = act.dataset.id;
          askConfirm('彻底删除后无法恢复，确定吗？', () => {
            state.trash = state.trash.filter(x => x.id !== tid);
            saveKey('trash');
            render();
            toast('已彻底删除');
          });
          break;
        }
        case 'clear-trash':
          if (!state.trash.length) { toast('回收站是空的'); break; }
          askConfirm('清空回收站后所有已删除记录将彻底消失，确定吗？', () => {
            state.trash = [];
            saveKey('trash');
            render();
            toast('回收站已清空');
          });
          break;
        case 'export-csv': onExportCsv(); break;
        case 'import-csv-click': onImportClick('csv'); break;
        case 'reload-app': location.reload(); break;
        case 'export-corrupt': {
          const raw = state.storage.backend.getItem(act.dataset.key);
          if (raw != null) {
            const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = act.dataset.key.replace(/^bk\./, '').replace(/[^\w.-]/g, '_') + '.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }
          break;
        }
        case 'del-corrupt': {
          const key = act.dataset.key;
          askConfirm('确定删除该损坏备份吗？删除后无法找回。', () => {
            try { state.storage.backend.removeItem(key); } catch (err) { /* 忽略 */ }
            render();
            toast('已删除损坏备份');
          });
          break;
        }
        case 'add-sub': onAddSub(); break;
        case 'del-sub': onDelSub(act.dataset.id); break;
        case 'add-cat': onAddCat(act.dataset.type); break;
        case 'edit-cat': openCatModal(act.dataset.id); break;
        case 'del-cat': onDeleteCat(act.dataset.id); break;
        case 'add-acc': onAddAcc(); break;
        case 'edit-acc': openAccModal(act.dataset.id); break;
        case 'del-acc': onDeleteAcc(act.dataset.id); break;
        case 'delete-acc': onDeleteAcc(state.accEditorId); break;
        case 'export': onExport(); break;
        case 'import-click': onImportClick('json'); break;
        case 'clear-data': onClearData(); break;
      }
    });
    document.addEventListener('change', e => {
      if (e.target.id === 'tx-cat') { renderTxSubOptions(); return; }
      if (e.target.id === 'rec-cat') { renderRecSubOptions(); return; }
      if (e.target.dataset.filter) {
        if (e.target.dataset.filter === 'keyword') return;
        state.filter[e.target.dataset.filter] = e.target.value;
        renderDetail();
        return;
      }
      if (e.target.id === 'budget-total') { onBudgetTotalChange(e.target.value); return; }
      if (e.target.dataset.budgetCat) { onBudgetCatChange(e.target.dataset.budgetCat, e.target.value); return; }
      if (e.target.id === 'import-file') { onImportFile(e.target.files[0]); e.target.value = ''; return; }
      if (e.target.id === 'import-csv-file') { onImportCsvFile(e.target.files[0]); e.target.value = ''; return; }
    });
    let keywordTimer = null;
    document.addEventListener('input', e => {
      if (e.target.dataset && e.target.dataset.filter === 'keyword') {
        state.filter.keyword = e.target.value;
        clearTimeout(keywordTimer);
        keywordTimer = setTimeout(renderTxList, 120);
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const anyModalOpen = ['#tx-modal', '#cat-modal', '#acc-modal', '#rec-modal', '#confirm-modal']
        .some(s => !$(s).classList.contains('hidden'));
      if (e.key === 'Enter' || e.key === ' ') {
        const el = e.target.closest ? e.target.closest('[role="button"][data-action]') : null;
        if (el && !anyModalOpen) { e.preventDefault(); el.click(); }
        return;
      }
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (anyModalOpen) return;
      if (e.key === 'n' || e.key === 'N') { openTxModal(null); return; }
      if (e.key === 'ArrowLeft') { state.monthKey = Core.shiftMonth(state.monthKey, -1); render(); return; }
      if (e.key === 'ArrowRight') { state.monthKey = Core.shiftMonth(state.monthKey, 1); render(); }
    });
    const isFileDrag = e => e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
    document.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });
    document.addEventListener('drop', e => { if (isFileDrag(e)) e.preventDefault(); });
    window.addEventListener('scroll', () => {
      const btn = $('#back-top');
      if (btn) btn.classList.toggle('hidden', window.scrollY <= 400);
    }, { passive: true });
    window.addEventListener('storage', e => {
      if (!e.key || e.key.indexOf('bk.') !== 0 || e.key.indexOf('bkself.') === 0) return;
      if (e.newValue === e.oldValue) return;
      const anyModalOpen = ['#tx-modal', '#cat-modal', '#acc-modal', '#rec-modal', '#confirm-modal']
        .some(s => !$(s).classList.contains('hidden'));
      if (anyModalOpen) {
        $('#sync-warn').classList.remove('hidden');
        return;
      }
      reloadFromStorage();
      toast('已同步其他窗口的修改');
    });
    $('#tx-form').addEventListener('submit', onTxSubmit);
    $('#cat-form').addEventListener('submit', onCatSubmit);
    $('#acc-form').addEventListener('submit', onAccSubmit);
    $('#rec-form').addEventListener('submit', onRecSubmit);
  }

  /* ================= 自检模式（?selftest=1，使用独立存储前缀） ================= */

  function runSelftest() {
    const out = {};
    window.__probe = [];
    try {
      const bs = Core.createBrowserStorage();
      state.available = bs.available;
      state.storage = new Core.Storage(bs.backend, 'bkself.');
      state.storage.clear();
      state.transactions = [];
      state.accounts = deepCopy(Core.DEFAULT_ACCOUNTS);
      state.categories = deepCopy(Core.DEFAULT_CATEGORIES);
      state.budgets = {};
      state.accounts[0].initialBalance = 100000;
      state.monthKey = Core.monthKeyOf(Core.todayStr());
      saveAll();
      render();

      const submit = over => {
        openTxModal(null);
        state.formType = over.type;
        renderTxTypeSeg();
        onFormTypeChanged();
        $('#tx-amount').value = over.amount;
        $('#tx-date').value = over.date || Core.todayStr();
        $('#tx-note').value = over.note || '';
        if (over.type === 'transfer') {
          $('#tx-from').value = over.from;
          $('#tx-to').value = over.to;
        } else {
          $('#tx-cat').value = over.cat;
          renderTxSubOptions();
          $('#tx-sub').value = over.sub || '';
          $('#tx-account').value = over.account;
        }
        $('#tx-form').dispatchEvent(new Event('submit', { cancelable: true }));
      };

      window.__probe = [];
      submit({ type: 'expense', amount: '25.50', cat: 'e1', sub: 'e1s1', account: 'acc_cash', note: '豆浆油条' });
      submit({ type: 'income', amount: '100', cat: 'i1', sub: 'i1s1', account: 'acc_bank' });
      submit({ type: 'transfer', amount: '50', from: 'acc_cash', to: 'acc_bank' });
      const countAfterValid = state.transactions.length;

      submit({ type: 'expense', amount: 'abc', cat: 'e1', account: 'acc_cash' });

      const summary = Core.monthSummary(state.transactions, state.monthKey);
      const balances = Core.accountBalances(state.accounts, state.transactions);
      const persisted = new Core.Storage(bs.backend, 'bkself.').load('bkself.transactions', []);

      out.recordCount = countAfterValid;
      out.invalidRejected = countAfterValid === 3 && state.transactions.length === 3;
      out.expenseFen = summary.expenseFen;
      out.incomeFen = summary.incomeFen;
      out.balanceFen = summary.balanceFen;
      out.cashBalanceFen = balances.get('acc_cash');
      out.bankBalanceFen = balances.get('acc_bank');
      out.persistedCount = persisted.length;

      const savedTab = state.tab;
      state.tab = 'budget';
      render();
      const spentEl = document.querySelector('#page-budget .b-spent');
      out.budgetSpentText = spentEl ? spentEl.textContent : 'none';
      state.tab = savedTab;
      closeModal();
      render();

      const expTx = state.transactions.find(t => t.type === 'expense');
      openTxModal(expTx.id);
      $('#tx-amount').value = '30';
      $('#tx-form').dispatchEvent(new Event('submit', { cancelable: true }));
      const editedOk = state.transactions.find(t => t.id === expTx.id).amount === 3000;

      const transferTx = state.transactions.find(t => t.type === 'transfer');
      state.editingId = transferTx.id;
      onDeleteTx();
      const cb = pendingConfirm;
      pendingConfirm = null;
      if (cb) cb();
      const persistedAfterDelete = new Core.Storage(bs.backend, 'bkself.').load('bkself.transactions', []);
      out.editDeleteOk = editedOk
        && !state.transactions.some(t => t.id === transferTx.id)
        && Core.monthSummary(state.transactions, state.monthKey).expenseFen === 3000
        && persistedAfterDelete.length === 2;

      state.categories.push({ id: 'cat_test', type: 'expense', name: '测试大类', icon: '🧪', subs: [{ id: 'sub_test', name: '测试子类' }] });
      saveKey('categories');
      state.catDraft = deepCopy(Core.findCategory(state.categories, 'e1'));
      onDelSub('e1s1');
      out.subDeleteBlocked = state.catDraft.subs.some(s => s.id === 'e1s1');
      onDeleteCat('cat_test');
      const cbCat = pendingConfirm;
      pendingConfirm = null;
      if (cbCat) cbCat();
      out.unusedCatDeleted = !Core.findCategory(state.categories, 'cat_test');
      const accCountBefore = state.accounts.length;
      onDeleteAcc('acc_cash');
      out.accDeleteBlocked = state.accounts.length === accCountBefore;
      out.protectionOk = out.subDeleteBlocked && out.unusedCatDeleted && out.accDeleteBlocked;
      closeAllModals();

      state.recurrings = [];
      state.recurrings.push({
        id: 'rc_self', type: 'expense', amount: 2000, categoryId: 'e2', subcategoryId: 'e2s1',
        accountId: 'acc_bank', toAccountId: null, note: '月票', tags: ['通勤'],
        frequency: 'monthly', nextDate: Core.addDays(Core.todayStr(), -1),
      });
      const gen = Core.generateDueRecurrings(state.recurrings, Core.todayStr(), state.categories, state.accounts);
      state.recurrings = gen.recurrings;
      if (gen.transactions.length) state.transactions.push(...gen.transactions);
      saveKey('recurrings');
      saveKey('transactions');
      out.recurringOk = gen.generated === 1
        && state.transactions.some(t => t.recurringId === 'rc_self' && t.tags && t.tags.includes('通勤') && t.date === Core.addDays(Core.todayStr(), -1))
        && state.recurrings[0].nextDate > Core.todayStr();

      openTxModal(null);
      state.formType = 'expense';
      renderTxTypeSeg();
      onFormTypeChanged();
      $('#tx-amount').value = '12';
      $('#tx-cat').value = 'e1';
      renderTxSubOptions();
      $('#tx-sub').value = 'e1s4';
      $('#tx-account').value = 'acc_cash';
      $('#tx-tags').value = '测试, 标签2, 测试';
      $('#tx-form').dispatchEvent(new Event('submit', { cancelable: true }));
      const taggedTx = state.transactions[state.transactions.length - 1];
      out.tagsOk = taggedTx.amount === 1200
        && JSON.stringify(taggedTx.tags) === JSON.stringify(['测试', '标签2']);

      submit({ type: 'expense', amount: '10+5.5', cat: 'e3', account: 'acc_cash' });
      out.exprOk = state.transactions[state.transactions.length - 1].amount === 1550;

      const csv = Core.toCSV(state.transactions, state.categories, state.accounts);
      const pc = Core.parseCSV(csv, state.categories, state.accounts);
      out.csvOk = pc.ok && pc.transactions.length === state.transactions.length;

      out.pass = countAfterValid === 3
        && out.invalidRejected
        && summary.expenseFen === 2550
        && summary.incomeFen === 10000
        && summary.balanceFen === 7450
        && balances.get('acc_cash') === 92450
        && balances.get('acc_bank') === 15000
        && persisted.length === 3
        && out.budgetSpentText === '已用 25.50'
        && out.editDeleteOk
        && out.protectionOk
        && out.recurringOk
        && out.tagsOk
        && out.csvOk
        && out.exprOk;
    } catch (e) {
      out.pass = false;
      out.error = String(e && e.stack ? e.stack : e);
    }
    const el = $('#selftest-result');
    el.textContent = 'SELFTEST ' + JSON.stringify(out);
    el.classList.remove('hidden');
  }

  init();
})();
