/* Agendex — cálculos compartilhados */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = {};

  function txs() { return DB.data.transactions || []; }
  function events() { return DB.data.events || []; }

  L.accountBalance = function (acc) {
    if (!acc) return 0;
    if (acc.type === 'credit') return L.creditUsed(acc);
    let b = Number(acc.initial) || 0;
    txs().forEach(function (t) {
      const v = Number(t.amount) || 0;
      if (t.type === 'income' && t.accountId === acc.id && t.status !== 'pending') b += v;
      if (t.type === 'expense' && t.accountId === acc.id && t.status !== 'pending') b -= v;
      if (t.type === 'transfer') {
        if (t.accountId === acc.id) b -= v;
        if (t.toAccountId === acc.id) b += v;
      }
    });
    return b;
  };

  L.creditUsed = function (acc) {
    let used = 0;
    txs().forEach(function (t) {
      const v = Number(t.amount) || 0;
      if (t.type === 'expense' && t.accountId === acc.id) used += v;
      if (t.type === 'transfer' && t.toAccountId === acc.id) used -= v;
    });
    return Math.max(0, used);
  };

  L.cashBalance = function () {
    return U.sum((DB.data.accounts || []).filter(function (a) { return a.type !== 'credit'; }), L.accountBalance);
  };

  L.monthStats = function (monthKey) {
    const key = monthKey || U.currentMonth();
    let income = 0, expense = 0, pending = 0, paidExpense = 0, paidIncome = 0;
    txs().forEach(function (t) {
      if (U.monthKey(t.date) !== key) return;
      const v = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += v;
        if (t.status !== 'pending') paidIncome += v;
      }
      if (t.type === 'expense') {
        expense += v;
        if (t.status === 'pending') pending += v;
        else paidExpense += v;
      }
    });
    return {
      month: key, income: income, expense: expense, result: income - expense,
      pending: pending, paidExpense: paidExpense, paidIncome: paidIncome
    };
  };

  L.categoryTotals = function (monthKey, type) {
    const map = {};
    txs().forEach(function (t) {
      if (U.monthKey(t.date) !== monthKey) return;
      if (type && t.type !== type) return;
      if (t.type === 'transfer') return;
      const c = t.category || 'Outros';
      map[c] = (map[c] || 0) + (Number(t.amount) || 0);
    });
    return Object.keys(map).map(function (c) { return { category: c, value: map[c] }; })
      .sort(function (a, b) { return b.value - a.value; });
  };

  L.monthSeries = function (n) {
    const out = [];
    const base = U.currentMonth();
    for (let i = n - 1; i >= 0; i--) out.push(U.monthKey(U.addMonths(base + '-01', -i)));
    return out;
  };

  L.upcomingBills = function (days) {
    const limit = U.addDays(U.today(), days == null ? 7 : days);
    return txs().filter(function (t) {
      return t.type === 'expense' && t.status === 'pending' && t.date <= limit;
    }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  };

  L.overdueBills = function () {
    const today = U.today();
    return txs().filter(function (t) { return t.type === 'expense' && t.status === 'pending' && t.date < today; });
  };

  L.isOccDone = function (ev, date) {
    if (ev.recurrence && ev.recurrence !== 'none') return (ev.doneDates || []).indexOf(date) >= 0;
    return !!ev.done;
  };

  L.occurrences = function (ev, start, end) {
    const out = [];
    if (!ev.date) return out;
    const rec = ev.recurrence || 'none';
    if (rec === 'none') {
      if (ev.date >= start && ev.date <= end) out.push({ ev: ev, date: ev.date });
      return out;
    }
    let d = ev.date;
    let guard = 0;
    while (d < start && guard < 2000) {
      if (rec === 'daily') d = U.addDays(d, 1);
      else if (rec === 'weekly') d = U.addDays(d, 7);
      else if (rec === 'monthly') d = U.addMonths(d, 1);
      else if (rec === 'yearly') d = U.addMonths(d, 12);
      else break;
      guard++;
    }
    guard = 0;
    while (d <= end && guard < 500) {
      out.push({ ev: ev, date: d });
      if (rec === 'daily') d = U.addDays(d, 1);
      else if (rec === 'weekly') d = U.addDays(d, 7);
      else if (rec === 'monthly') d = U.addMonths(d, 1);
      else if (rec === 'yearly') d = U.addMonths(d, 12);
      else break;
      guard++;
    }
    return out;
  };

  L.eventsBetween = function (start, end, projectId) {
    const list = [];
    L.allEvents().forEach(function (ev) {
      if (projectId && ev.projectId !== projectId) return;
      L.occurrences(ev, start, end).forEach(function (o) {
        list.push({ ev: o.ev, date: o.date, done: L.isOccDone(o.ev, o.date) });
      });
    });
    list.sort(function (a, b) {
      const da = a.date + ' ' + (a.ev.time || '99:99');
      const db = b.date + ' ' + (b.ev.time || '99:99');
      return da.localeCompare(db);
    });
    return list;
  };

  L.allEvents = function () {
    const out = (DB.data.events || []).slice();
    (DB.data.projects || []).forEach(function (p) {
      (p.events || []).forEach(function (e) {
        out.push(Object.assign({}, e, { projectId: p.id, _projectId: p.id }));
      });
    });
    return out;
  };

  L.findEvent = function (id) {
    const g = (DB.data.events || []).find(function (e) { return e.id === id; });
    if (g) return { ev: g, project: null };
    for (const p of (DB.data.projects || [])) {
      const e = (p.events || []).find(function (x) { return x.id === id; });
      if (e) return { ev: e, project: p };
    }
    return null;
  };

  L.allTasks = function () {
    const out = (DB.data.tasks || []).slice();
    (DB.data.projects || []).forEach(function (p) {
      (p.tasks || []).forEach(function (t) {
        out.push(Object.assign({}, t, { projectId: p.id, _projectId: p.id }));
      });
    });
    return out;
  };

  L.findTask = function (id) {
    const g = (DB.data.tasks || []).find(function (t) { return t.id === id; });
    if (g) return { task: g, project: null };
    for (const p of (DB.data.projects || [])) {
      const t = (p.tasks || []).find(function (x) { return x.id === id; });
      if (t) return { task: t, project: p };
    }
    return null;
  };

  L.nextEvents = function (days, limit) {
    const start = U.today();
    const end = U.addDays(start, days == null ? 30 : days);
    return L.eventsBetween(start, end).filter(function (o) { return !o.done; }).slice(0, limit || 5);
  };

  L.tasksOpen = function (projectId) {
    return L.allTasks().filter(function (t) {
      if (projectId && t.projectId !== projectId) return false;
      return !t.done;
    });
  };

  L.tasksOverdue = function () {
    const today = U.today();
    return L.tasksOpen().filter(function (t) { return t.due && t.due < today; });
  };

  L.goalSaved = function (goal) {
    return U.sum(goal.contributions || [], function (c) { return c.amount; });
  };

  L.budgetSpent = function (budget, monthKey) {
    return U.sum(txs().filter(function (t) {
      return t.type === 'expense' && t.category === budget.category && U.monthKey(t.date) === monthKey;
    }), function (t) { return t.amount; });
  };

  L.selfMember = function (project) {
    const me = DB.data.profile;
    return (project.members || []).find(function (m) { return m.profileId && m.profileId === me.id; }) ||
      (project.members || []).find(function (m) { return U.norm(m.name) === U.norm(me.name) && me.name; });
  };

  L.role = function (project) {
    const m = L.selfMember(project);
    return m ? m.role : null;
  };

  L.canEdit = function (project) {
    return L.role(project) !== 'visualizador';
  };

  L.canManage = function (project) {
    const r = L.role(project);
    return r === 'admin' || (!r && project.ownerId === DB.data.profile.id);
  };

  L.projectStats = function (project) {
    const s = L.financeStats(project.finance || [], project.members || []);
    s.budget = Number(project.budget) || 0;
    s.budgetPct = s.budget ? U.pct(s.raised, s.budget) : 0;
    s.missing = Math.max(0, s.budget - s.raised);
    s.openTasks = (project.tasks || []).filter(function (t) { return !t.done; }).length;
    s.totalTasks = (project.tasks || []).length;
    return s;
  };

  L.financeStats = function (fin, members) {
    fin = fin || [];
    members = members || [];
    const raised = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.status !== 'pending'; }), function (f) { return f.amount; });
    const pendingIn = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.status === 'pending'; }), function (f) { return f.amount; });
    const spent = U.sum(fin.filter(function (f) { return f.type === 'expense' && f.status !== 'pending'; }), function (f) { return f.amount; });
    const pendingOut = U.sum(fin.filter(function (f) { return f.type === 'expense' && f.status === 'pending'; }), function (f) { return f.amount; });
    const perMember = members.map(function (m) {
      const paid = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.memberId === m.id && f.status !== 'pending'; }), function (f) { return f.amount; });
      const pending = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.memberId === m.id && f.status === 'pending'; }), function (f) { return f.amount; });
      return { member: m, paid: paid, pending: pending };
    }).sort(function (a, b) { return b.paid - a.paid; });
    const cats = {};
    fin.filter(function (f) { return f.type === 'expense'; }).forEach(function (f) {
      cats[f.category || 'Outros'] = (cats[f.category || 'Outros'] || 0) + (Number(f.amount) || 0);
    });
    const categories = Object.keys(cats).map(function (c) { return { category: c, value: cats[c] }; }).sort(function (a, b) { return b.value - a.value; });
    return {
      raised: raised, pendingIn: pendingIn, spent: spent, pendingOut: pendingOut,
      balance: raised - spent, perMember: perMember, categories: categories,
      members: members.length
    };
  };

  L.balanceSeries = function (monthKeys) {
    const keys = monthKeys || [];
    if (!keys.length) return [];
    const first = keys[0];
    let base = U.sum((DB.data.accounts || []).filter(function (a) { return a.type !== 'credit'; }), function (a) { return a.initial; });
    txs().forEach(function (t) {
      if (U.monthKey(t.date) >= first || t.status === 'pending') return;
      if (t.type === 'income') base += Number(t.amount) || 0;
      if (t.type === 'expense') base -= Number(t.amount) || 0;
    });
    let running = base;
    return keys.map(function (m) {
      txs().forEach(function (t) {
        if (U.monthKey(t.date) !== m || t.status === 'pending') return;
        if (t.type === 'income') running += Number(t.amount) || 0;
        if (t.type === 'expense') running -= Number(t.amount) || 0;
      });
      return running;
    });
  };

  L.topExpenses = function (monthKey, limit) {
    return txs().filter(function (t) { return t.type === 'expense' && U.monthKey(t.date) === monthKey; })
      .sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })
      .slice(0, limit || 5);
  };

  L.expenseByAccount = function (monthKey) {
    const map = {};
    txs().forEach(function (t) {
      if (t.type !== 'expense' || U.monthKey(t.date) !== monthKey) return;
      const id = t.accountId || '';
      map[id] = (map[id] || 0) + (Number(t.amount) || 0);
    });
    return Object.keys(map).map(function (id) {
      return { accountId: id, name: L.accountName(id), value: map[id] };
    }).sort(function (a, b) { return b.value - a.value; });
  };

  L.incomeByCategory = function (monthKey) {
    return L.categoryTotals(monthKey, 'income');
  };

  L.projectOf = function (id) {
    return (DB.data.projects || []).find(function (p) { return p.id === id; });
  };

  L.accountName = function (id) {
    const a = (DB.data.accounts || []).find(function (x) { return x.id === id; });
    return a ? a.name : '—';
  };

  L.categoryColor = function (i) {
    return ['#7028C8', '#239B65', '#2563EB', '#C2410C', '#9F1239', '#0E7490', '#7C3AED', '#4D7C0F', '#B45309', '#475569'][i % 10];
  };

  L.notifications = function () {
    const out = [];
    const today = U.today();
    L.overdueBills().forEach(function (t) {
      out.push({ tone: 'danger', title: 'Conta atrasada', text: t.name + ' · ' + U.money(t.amount), date: t.date, route: '#/finance' });
    });
    L.tasksOverdue().forEach(function (t) {
      out.push({ tone: 'warn', title: 'Tarefa atrasada', text: t.title, date: t.due, route: '#/agenda' });
    });
    L.upcomingBills(3).forEach(function (t) {
      if (t.date >= today) out.push({ tone: 'info', title: 'Conta a vencer', text: t.name + ' · ' + U.fmtDate(t.date), date: t.date, route: '#/finance' });
    });
    L.nextEvents(2, 6).forEach(function (o) {
      out.push({ tone: 'info', title: 'Compromisso', text: o.ev.title + ' · ' + U.fmtDate(o.date) + (o.ev.time ? ' ' + o.ev.time : ''), date: o.date, route: '#/agenda' });
    });
    return out;
  };

  window.Agendex.Logic = L;
})();
