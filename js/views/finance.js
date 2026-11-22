/* Agendex — financeiro */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const Charts = Agendex.Charts;
  const V = {};

  const state = { tab: 'panel', month: U.currentMonth(), type: 'all', account: '' };

  const TYPES = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' };
  const ACC_TYPES = { checking: 'Conta corrente', cash: 'Carteira', credit: 'Cartão de crédito' };

  function accounts() { return DB.data.accounts || []; }
  function accountOptions() {
    return accounts().map(function (a) { return { value: a.id, label: a.name + (a.type === 'credit' ? ' (cartão)' : '') }; });
  }

  function openAccount(id) {
    const acc = id ? accounts().find(function (a) { return a.id === id; }) : null;
    const isNew = !acc;
    UI.form({
      title: isNew ? 'Nova conta' : 'Editar conta',
      fields: [
        { name: 'name', label: 'Nome', required: true, full: true, value: acc ? acc.name : '', placeholder: 'Ex.: Conta principal' },
        { name: 'type', label: 'Tipo', type: 'select', options: [{ value: 'checking', label: 'Conta corrente' }, { value: 'cash', label: 'Carteira' }, { value: 'credit', label: 'Cartão de crédito' }], value: acc ? acc.type : 'checking' },
        { name: 'initial', label: 'Saldo inicial', type: 'number', value: acc ? acc.initial || 0 : 0 },
        { name: 'limit', label: 'Limite do cartão', type: 'number', min: 0, value: acc ? acc.limit || 0 : 0, hint: 'Somente para cartão de crédito' }
      ],
      submitLabel: isNew ? 'Criar conta' : 'Salvar',
      onReady: function (modal, form) {
        const typeEl = form.elements.type;
        function sync() {
          const credit = typeEl.value === 'credit';
          const initialField = modal.querySelector('[data-field=initial]');
          const limitField = modal.querySelector('[data-field=limit]');
          if (initialField) initialField.style.display = credit ? 'none' : '';
          if (limitField) limitField.style.display = credit ? '' : 'none';
        }
        typeEl.addEventListener('change', sync);
        sync();
      },
      dangerAction: acc ? {
        label: 'Excluir conta',
        onClick: async function () {
          const used = DB.data.transactions.some(function (t) { return t.accountId === acc.id || t.toAccountId === acc.id; });
          if (used) {
            UI.toast('Esta conta possui lançamentos. Exclua ou mova os lançamentos antes.', 'error');
            return;
          }
          const ok = await UI.confirm({ title: 'Excluir conta', message: 'Excluir "' + acc.name + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          DB.data.accounts = accounts().filter(function (a) { return a.id !== acc.id; });
          DB.save(true);
          UI.toast('Conta excluída');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let a = acc;
        if (!a) { a = { id: U.uid(), createdAt: now }; DB.data.accounts.push(a); }
        a.name = v.name.trim();
        a.type = v.type;
        a.initial = Number(v.initial) || 0;
        a.limit = Number(v.limit) || 0;
        a.updatedAt = now;
        DB.save(true);
        UI.toast(isNew ? 'Conta criada' : 'Conta atualizada');
        Agendex.App.refresh();
      }
    });
  }

  function openTransaction(id, presetType) {
    const tx = id ? DB.data.transactions.find(function (t) { return t.id === id; }) : null;
    const isNew = !tx;
    if (!accounts().length) {
      UI.toast('Crie uma conta antes de lançar.', 'error');
      openAccount();
      return;
    }
    const allCats = Array.from(new Set((DB.data.categories.income || []).concat(DB.data.categories.expense || [])));
    const accOpts = accountOptions();
    const typeVal = tx ? tx.type : (presetType || 'expense');
    UI.form({
      title: isNew ? (presetType === 'income' ? 'Nova receita' : presetType === 'transfer' ? 'Nova transferência' : 'Nova despesa') : 'Editar lançamento',
      width: 640,
      fields: [
        { name: 'type', label: 'Tipo', type: 'select', options: [{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'transfer', label: 'Transferência' }], value: typeVal },
        { name: 'name', label: 'Descrição', required: true, value: tx ? tx.name : '', placeholder: 'Ex.: Mercado do mês' },
        { name: 'amount', label: 'Valor', type: 'number', min: 0.01, required: true, value: tx ? tx.amount : '' },
        { name: 'date', label: 'Data', type: 'date', required: true, value: tx ? tx.date : U.today() },
        { name: 'category', label: 'Categoria', type: 'select', options: allCats, value: tx ? tx.category : (typeVal === 'income' ? DB.data.categories.income[0] : DB.data.categories.expense[0]) },
        { name: 'accountId', label: 'Conta', type: 'select', options: accOpts, value: tx ? tx.accountId : (accounts()[0] || {}).id },
        { name: 'toAccountId', label: 'Conta de destino', type: 'select', options: accOpts, value: tx ? tx.toAccountId || '' : (accounts()[1] || {}).id || '' },
        { name: 'status', label: 'Situação', type: 'select', options: [{ value: 'paid', label: 'Pago / recebido' }, { value: 'pending', label: 'Pendente' }], value: tx ? tx.status : 'paid' },
        { name: 'notes', label: 'Observações', type: 'textarea', full: true, value: tx ? tx.notes || '' : '' }
      ],
      submitLabel: isNew ? 'Salvar lançamento' : 'Salvar',
      onReady: function (modal, form) {
        const typeEl = form.elements.type;
        function sync() {
          const isTransfer = typeEl.value === 'transfer';
          const cat = modal.querySelector('[data-field=category]');
          const to = modal.querySelector('[data-field=toAccountId]');
          const status = modal.querySelector('[data-field=status]');
          if (cat) cat.style.display = isTransfer ? 'none' : '';
          if (to) to.style.display = isTransfer ? '' : 'none';
          if (status) status.style.display = isTransfer ? 'none' : '';
        }
        typeEl.addEventListener('change', sync);
        sync();
      },
      validate: function (v) {
        if (v.type === 'transfer' && v.accountId === v.toAccountId) return 'Escolha contas diferentes para transferir.';
        return null;
      },
      dangerAction: tx ? {
        label: 'Excluir lançamento',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir lançamento', message: 'Excluir "' + tx.name + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          DB.data.transactions = DB.data.transactions.filter(function (t) { return t.id !== tx.id; });
          DB.save(true);
          UI.toast('Lançamento excluído');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let t = tx;
        if (!t) { t = { id: U.uid(), createdAt: now }; DB.data.transactions.push(t); }
        t.type = v.type;
        t.name = v.name.trim();
        t.amount = Math.abs(Number(v.amount)) || 0;
        t.date = v.date;
        t.category = v.type === 'transfer' ? 'Transferência' : v.category;
        t.accountId = v.accountId;
        t.toAccountId = v.type === 'transfer' ? v.toAccountId : '';
        t.status = v.type === 'transfer' ? 'paid' : v.status;
        t.notes = v.notes || '';
        t.updatedAt = now;
        t.updatedBy = DB.data.profile.id;
        DB.save(true);
        UI.toast(isNew ? 'Lançamento criado' : 'Lançamento atualizado');
        Agendex.App.refresh();
      }
    });
  }

  function openBudget(id) {
    const b = id ? DB.data.budgets.find(function (x) { return x.id === id; }) : null;
    const isNew = !b;
    UI.form({
      title: isNew ? 'Novo orçamento' : 'Editar orçamento',
      fields: [
        { name: 'category', label: 'Categoria', type: 'select', options: DB.data.categories.expense, value: b ? b.category : DB.data.categories.expense[0], required: true },
        { name: 'limit', label: 'Limite mensal', type: 'number', min: 0, required: true, value: b ? b.limit : '' }
      ],
      submitLabel: isNew ? 'Criar orçamento' : 'Salvar',
      dangerAction: b ? {
        label: 'Excluir orçamento',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir orçamento', message: 'Excluir o limite de "' + b.category + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          DB.data.budgets = DB.data.budgets.filter(function (x) { return x.id !== b.id; });
          DB.save(true);
          UI.toast('Orçamento excluído');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        let x = b;
        if (!x) { x = { id: U.uid() }; DB.data.budgets.push(x); }
        x.category = v.category;
        x.limit = Number(v.limit) || 0;
        DB.save(true);
        UI.toast(isNew ? 'Orçamento criado' : 'Orçamento atualizado');
        Agendex.App.refresh();
      }
    });
  }

  function openGoal(id) {
    const g = id ? DB.data.goals.find(function (x) { return x.id === id; }) : null;
    const isNew = !g;
    UI.form({
      title: isNew ? 'Nova meta' : 'Editar meta',
      subtitle: g ? U.money(L.goalSaved(g)) + ' de ' + U.money(g.target) + ' guardados' : '',
      fields: [
        { name: 'name', label: 'Nome da meta', required: true, full: true, value: g ? g.name : '', placeholder: 'Ex.: Reserva de emergência' },
        { name: 'target', label: 'Valor desejado', type: 'number', min: 0.01, required: true, value: g ? g.target : '' },
        { name: 'deadline', label: 'Prazo', type: 'date', value: g ? g.deadline || '' : '' }
      ],
      submitLabel: isNew ? 'Criar meta' : 'Salvar',
      dangerAction: g ? {
        label: 'Excluir meta',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir meta', message: 'Excluir "' + g.name + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          DB.data.goals = DB.data.goals.filter(function (x) { return x.id !== g.id; });
          DB.save(true);
          UI.toast('Meta excluída');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        let x = g;
        if (!x) { x = { id: U.uid(), contributions: [], createdAt: Date.now() }; DB.data.goals.push(x); }
        x.name = v.name.trim();
        x.target = Number(v.target) || 0;
        x.deadline = v.deadline || '';
        x.updatedAt = Date.now();
        DB.save(true);
        UI.toast(isNew ? 'Meta criada' : 'Meta atualizada');
        Agendex.App.refresh();
      }
    });
  }

  function openContribution(goalId) {
    const g = DB.data.goals.find(function (x) { return x.id === goalId; });
    if (!g) return;
    UI.form({
      title: 'Guardar valor',
      subtitle: g.name + ' · ' + U.money(L.goalSaved(g)) + ' de ' + U.money(g.target),
      fields: [
        { name: 'amount', label: 'Valor', type: 'number', min: 0.01, required: true },
        { name: 'date', label: 'Data', type: 'date', required: true, value: U.today() },
        { name: 'note', label: 'Observação', full: true, placeholder: 'Opcional' }
      ],
      submitLabel: 'Adicionar',
      onSubmit: function (v) {
        g.contributions = g.contributions || [];
        g.contributions.push({ id: U.uid(), amount: Number(v.amount) || 0, date: v.date, note: v.note || '' });
        g.updatedAt = Date.now();
        DB.save(true);
        UI.toast('Valor adicionado à meta');
        Agendex.App.refresh();
      }
    });
  }

  function markPaid(id) {
    const t = DB.data.transactions.find(function (x) { return x.id === id; });
    if (!t) return;
    t.status = 'paid';
    t.updatedAt = Date.now();
    DB.save();
    UI.toast('Lançamento marcado como pago');
    Agendex.App.refresh();
  }

  function monthPicker() {
    return '<div class="month-picker">' +
      '<button class="icon-btn" data-month-nav="-1" aria-label="Mês anterior">' + U.icon('chevronLeft', 16) + '</button>' +
      '<input type="month" class="input month-input" id="fin-month" value="' + U.esc(state.month) + '">' +
      '<button class="icon-btn" data-month-nav="1" aria-label="Próximo mês">' + U.icon('chevronRight', 16) + '</button>' +
    '</div>';
  }

  function panel() {
    const st = L.monthStats(state.month);
    const cash = L.cashBalance();
    const months = L.monthSeries(6);
    const incomeSeries = months.map(function (m) { return L.monthStats(m).income; });
    const expenseSeries = months.map(function (m) { return L.monthStats(m).expense; });
    const cats = L.categoryTotals(state.month, 'expense');
    const bills = DB.data.transactions.filter(function (t) { return t.type === 'expense' && t.status === 'pending'; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 5);
    const budgets = DB.data.budgets.slice(0, 4);
    const goals = DB.data.goals.slice(0, 3);

    let html = '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-top"><span>Saldo em contas</span>' + U.icon('wallet', 17) + '</div><div class="kpi-value ' + (cash < 0 ? 'text-danger' : '') + '">' + U.money(cash) + '</div><div class="kpi-sub">' + accounts().filter(function (a) { return a.type !== 'credit'; }).length + ' conta(s)</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Receitas</span>' + U.icon('arrowUp', 17) + '</div><div class="kpi-value text-green">' + U.money(st.income) + '</div><div class="kpi-sub">' + U.monthLabel(state.month) + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Despesas</span>' + U.icon('arrowDown', 17) + '</div><div class="kpi-value">' + U.money(st.expense) + '</div><div class="kpi-sub">' + (st.pending ? U.money(st.pending) + ' pendente' : 'sem pendências') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Resultado</span>' + U.icon('chart', 17) + '</div><div class="kpi-value ' + (st.result >= 0 ? 'text-green' : 'text-danger') + '">' + U.money(st.result) + '</div><div class="kpi-sub">' + (st.result >= 0 ? 'economia no mês' : 'acima do que entrou') + '</div></div>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card">' +
        '<div class="card-head"><h3>Receitas e despesas</h3><span class="muted small">últimos 6 meses</span></div>' +
        Charts.legend([{ label: 'Receitas', color: 'var(--green)' }, { label: 'Despesas', color: 'var(--accent)' }]) +
        Charts.groupedBars({ labels: months.map(function (m) { return U.monthShort(m); }), series: [{ name: 'Receitas', color: 'var(--green)', data: incomeSeries }, { name: 'Despesas', color: 'var(--accent)', data: expenseSeries }] }) +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h3>Gastos por categoria</h3><span class="muted small">' + U.monthLabel(state.month) + '</span></div>' +
        Charts.donut(cats.slice(0, 6).map(function (c, i) {
          return { label: c.category, value: c.value, color: L.categoryColor(i) };
        }), { centerLabel: 'despesas' }) +
      '</section>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card">' +
        '<div class="card-head"><h3>Contas a pagar</h3><span class="muted small">' + bills.length + ' pendente(s)</span></div>' +
        (bills.length ? '<div class="rows">' + bills.map(function (t) {
          const late = t.date < U.today();
          return '<div class="row-item">' +
            '<span class="row-icon ' + (late ? 'danger' : 'warn') + '">' + U.icon('clock', 16) + '</span>' +
            '<button class="row-main row-btn-plain" data-edit-tx="' + U.esc(t.id) + '"><b>' + U.esc(t.name) + '</b><small>' + (late ? 'Atrasada · ' : 'Vence ') + U.fmtDate(t.date) + '</small></button>' +
            '<span class="row-value">' + U.money(t.amount) + '</span>' +
            '<button class="btn small ghost" data-pay="' + U.esc(t.id) + '">Pagar</button>' +
          '</div>';
        }).join('') + '</div>' : UI.empty('check', 'Nada a pagar', 'Nenhuma conta pendente.', '')) +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h3>Orçamentos</h3><button class="link" data-tab-go="budgets">Ver todos</button></div>' +
        (budgets.length ? '<div class="budget-list">' + budgets.map(function (b) {
          const spent = L.budgetSpent(b, state.month);
          const pct = U.pct(spent, b.limit);
          return '<div class="budget-mini">' +
            '<div class="budget-line"><span>' + U.esc(b.category) + '</span><span class="muted">' + U.money(spent) + ' / ' + U.money(b.limit) + '</span></div>' +
            UI.bar(pct, pct > 100 ? 'var(--danger)' : pct > 80 ? 'var(--warn)' : 'var(--accent)') +
          '</div>';
        }).join('') + '</div>' : UI.empty('chart', 'Sem orçamento', 'Defina limites por categoria.', '<button class="btn small ghost" data-new="budget">Criar orçamento</button>')) +
      '</section>' +
    '</div>';

    html += '<section class="card">' +
      '<div class="card-head"><h3>Metas</h3><button class="link" data-tab-go="goals">Ver metas</button></div>' +
      (goals.length ? '<div class="goal-grid">' + goals.map(function (g) {
        const saved = L.goalSaved(g);
        const pct = U.pct(saved, g.target);
        return '<div class="goal-card"><div class="goal-top"><b>' + U.esc(g.name) + '</b><span>' + Math.round(pct) + '%</span></div>' +
          UI.bar(pct, 'var(--green)') +
          '<div class="goal-meta"><span>' + U.money(saved) + ' de ' + U.money(g.target) + '</span>' + (g.deadline ? '<span class="muted small">até ' + U.fmtDate(g.deadline) + '</span>' : '') + '</div>' +
        '</div>';
      }).join('') + '</div>' : UI.empty('target', 'Nenhuma meta', 'Crie uma meta e acompanhe o progresso.', '<button class="btn small ghost" data-new="goal">Criar meta</button>')) +
    '</section>';

    return html;
  }

  function transactions() {
    let list = DB.data.transactions.filter(function (t) { return U.monthKey(t.date) === state.month; });
    if (state.type !== 'all') list = list.filter(function (t) { return t.type === state.type; });
    if (state.account) list = list.filter(function (t) { return t.accountId === state.account || t.toAccountId === state.account; });
    list.sort(function (a, b) { return b.date.localeCompare(a.date); });

    let html = '<div class="filter-row">' +
      '<select class="input select-sm" id="fin-type">' +
        ['all|Todos os tipos', 'income|Receitas', 'expense|Despesas', 'transfer|Transferências'].map(function (v) {
          const p = v.split('|');
          return '<option value="' + p[0] + '"' + (state.type === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
        }).join('') +
      '</select>' +
      '<select class="input select-sm" id="fin-acc">' +
        '<option value="">Todas as contas</option>' +
        accounts().map(function (a) { return '<option value="' + U.esc(a.id) + '"' + (state.account === a.id ? ' selected' : '') + '>' + U.esc(a.name) + '</option>'; }).join('') +
      '</select>' +
      '<span class="muted small">' + list.length + ' lançamento(s)</span>' +
    '</div>';

    if (!list.length) return html + UI.empty('wallet', 'Nenhum lançamento', 'Nada registrado neste mês com estes filtros.', '<button class="btn small ghost" data-new="expense">Nova despesa</button>');

    html += '<div class="tx-table">' +
      '<div class="tx-head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Conta</span><span>Situação</span><span class="ta-r">Valor</span></div>';
    list.forEach(function (t) {
      const isIn = t.type === 'income';
      const isOut = t.type === 'expense';
      const isTr = t.type === 'transfer';
      const late = t.status === 'pending' && t.date < U.today();
      html += '<div class="tx-row" data-edit-tx="' + U.esc(t.id) + '">' +
        '<span class="tx-date">' + U.fmtDate(t.date) + '</span>' +
        '<span class="tx-name"><span class="tx-dot ' + t.type + '"></span><b>' + U.esc(t.name) + '</b>' + (t.notes ? '<small>' + U.esc(t.notes) + '</small>' : '') + '</span>' +
        '<span class="tx-cat">' + U.esc(t.category || '—') + '</span>' +
        '<span class="tx-acc">' + U.esc(isTr ? L.accountName(t.accountId) + ' → ' + L.accountName(t.toAccountId) : L.accountName(t.accountId)) + '</span>' +
        '<span>' + (isTr ? UI.badge('Transferência', '') : (late ? UI.badge('Atrasado', 'danger') : UI.statusBadge(t.status))) + '</span>' +
        '<span class="tx-val ' + (isIn ? 'text-green' : isOut ? '' : 'muted') + '">' + (isIn ? '+' : isOut ? '−' : '') + U.money(t.amount) + '</span>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function accountsTab() {
    if (!accounts().length) return UI.empty('wallet', 'Nenhuma conta', 'Cadastre onde seu dinheiro fica.', '<button class="btn small primary" data-new="account">Criar conta</button>');
    return '<div class="account-grid">' + accounts().map(function (a) {
      const bal = L.accountBalance(a);
      const credit = a.type === 'credit';
      const used = credit ? L.creditUsed(a) : 0;
      const limit = Number(a.limit) || 0;
      return '<div class="account-card">' +
        '<div class="account-head"><span class="account-type">' + U.esc(ACC_TYPES[a.type] || a.type) + '</span><button class="icon-btn small" data-edit-acc="' + U.esc(a.id) + '">' + U.icon('edit', 15) + '</button></div>' +
        '<h3>' + U.esc(a.name) + '</h3>' +
        (credit
          ? '<div class="account-value">' + U.money(used) + '<small> usado de ' + U.money(limit) + '</small></div>' + UI.bar(limit ? U.pct(used, limit) : 0, used > limit ? 'var(--danger)' : 'var(--accent)')
          : '<div class="account-value">' + U.money(bal) + '</div>') +
      '</div>';
    }).join('') + '</div>';
  }

  function budgetsTab() {
    if (!DB.data.budgets.length) return UI.empty('chart', 'Sem orçamentos', 'Defina um limite mensal por categoria e compare com o realizado.', '<button class="btn small primary" data-new="budget">Criar orçamento</button>');
    return '<div class="budget-cards">' + DB.data.budgets.map(function (b) {
      const spent = L.budgetSpent(b, state.month);
      const pct = U.pct(spent, b.limit);
      const over = spent > b.limit;
      return '<div class="budget-card">' +
        '<div class="card-head"><h3>' + U.esc(b.category) + '</h3><button class="icon-btn small" data-edit-budget="' + U.esc(b.id) + '">' + U.icon('edit', 15) + '</button></div>' +
        '<div class="budget-numbers"><b>' + U.money(spent) + '</b><span class="muted">de ' + U.money(b.limit) + '</span></div>' +
        UI.bar(pct, over ? 'var(--danger)' : pct > 80 ? 'var(--warn)' : 'var(--accent)') +
        '<div class="budget-foot"><span class="' + (over ? 'text-danger' : 'muted') + ' small">' + (over ? 'Passou ' + U.money(spent - b.limit) : 'Restam ' + U.money(b.limit - spent)) + '</span><span class="muted small">' + Math.round(pct) + '%</span></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function goalsTab() {
    if (!DB.data.goals.length) return UI.empty('target', 'Nenhuma meta', 'Junte dinheiro com objetivo e prazo definidos.', '<button class="btn small primary" data-new="goal">Criar meta</button>');
    return '<div class="goal-grid wide">' + DB.data.goals.map(function (g) {
      const saved = L.goalSaved(g);
      const pct = U.pct(saved, g.target);
      return '<div class="goal-card">' +
        '<div class="goal-top"><b>' + U.esc(g.name) + '</b><span>' + Math.round(pct) + '%</span></div>' +
        UI.bar(pct, 'var(--green)') +
        '<div class="goal-meta"><span>' + U.money(saved) + ' de ' + U.money(g.target) + '</span>' + (g.deadline ? '<span class="muted small">até ' + U.fmtDate(g.deadline) + '</span>' : '') + '</div>' +
        '<div class="goal-actions"><button class="btn small ghost" data-goal-add="' + U.esc(g.id) + '">' + U.icon('plus', 14) + 'Guardar</button><button class="btn small ghost" data-goal-edit="' + U.esc(g.id) + '">Editar</button></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  V.openTransaction = openTransaction;
  V.openAccount = openAccount;
  V.openBudget = openBudget;
  V.openGoal = openGoal;
  V.openContribution = openContribution;

  V.render = function (root) {
    let html = '<div class="page">';

    html += '<div class="view-toolbar">' +
      '<div class="segmented">' +
        [['panel', 'Painel'], ['transactions', 'Lançamentos'], ['accounts', 'Contas'], ['budgets', 'Orçamentos'], ['goals', 'Metas']].map(function (t) {
          return '<button data-tab="' + t[0] + '" class="' + (state.tab === t[0] ? 'active' : '') + '">' + t[1] + '</button>';
        }).join('') +
      '</div>' +
      '<div class="toolbar-group">' +
        (['panel', 'transactions', 'budgets'].indexOf(state.tab) >= 0 ? monthPicker() : '') +
        (state.tab === 'panel' || state.tab === 'transactions'
          ? '<button class="btn small ghost" data-new="income">' + U.icon('arrowUp', 14) + 'Receita</button><button class="btn small ghost" data-new="expense">' + U.icon('arrowDown', 14) + 'Despesa</button><button class="btn small ghost" data-new="transfer">' + U.icon('transfer', 14) + 'Transferir</button>'
          : '') +
        (state.tab === 'accounts' ? '<button class="btn primary small" data-new="account">' + U.icon('plus', 15) + 'Conta</button>' : '') +
        (state.tab === 'budgets' ? '<button class="btn primary small" data-new="budget">' + U.icon('plus', 15) + 'Orçamento</button>' : '') +
        (state.tab === 'goals' ? '<button class="btn primary small" data-new="goal">' + U.icon('plus', 15) + 'Meta</button>' : '') +
      '</div>' +
    '</div>';

    if (state.tab === 'panel') html += panel();
    else if (state.tab === 'transactions') html += transactions();
    else if (state.tab === 'accounts') html += accountsTab();
    else if (state.tab === 'budgets') html += budgetsTab();
    else html += goalsTab();

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('[data-tab]').forEach(function (el) {
      el.addEventListener('click', function () { state.tab = el.getAttribute('data-tab'); V.render(root); });
    });
    root.querySelectorAll('[data-tab-go]').forEach(function (el) {
      el.addEventListener('click', function () { state.tab = el.getAttribute('data-tab-go'); V.render(root); });
    });
    const monthEl = root.querySelector('#fin-month');
    if (monthEl) monthEl.addEventListener('change', function () { if (monthEl.value) { state.month = monthEl.value; V.render(root); } });
    root.querySelectorAll('[data-month-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        const d = Number(el.getAttribute('data-month-nav'));
        state.month = U.addMonths(state.month + '-01', d).slice(0, 7);
        V.render(root);
      });
    });
    root.querySelectorAll('[data-new]').forEach(function (el) {
      el.addEventListener('click', function () {
        const t = el.getAttribute('data-new');
        if (t === 'income' || t === 'expense' || t === 'transfer') openTransaction(null, t);
        else if (t === 'account') openAccount();
        else if (t === 'budget') openBudget();
        else if (t === 'goal') openGoal();
      });
    });
    root.querySelectorAll('[data-edit-tx]').forEach(function (el) {
      el.addEventListener('click', function () { openTransaction(el.getAttribute('data-edit-tx')); });
    });
    root.querySelectorAll('[data-pay]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); markPaid(el.getAttribute('data-pay')); });
    });
    root.querySelectorAll('[data-edit-acc]').forEach(function (el) {
      el.addEventListener('click', function () { openAccount(el.getAttribute('data-edit-acc')); });
    });
    root.querySelectorAll('[data-edit-budget]').forEach(function (el) {
      el.addEventListener('click', function () { openBudget(el.getAttribute('data-edit-budget')); });
    });
    root.querySelectorAll('[data-goal-add]').forEach(function (el) {
      el.addEventListener('click', function () { openContribution(el.getAttribute('data-goal-add')); });
    });
    root.querySelectorAll('[data-goal-edit]').forEach(function (el) {
      el.addEventListener('click', function () { openGoal(el.getAttribute('data-goal-edit')); });
    });
    const typeSel = root.querySelector('#fin-type');
    if (typeSel) typeSel.addEventListener('change', function () { state.type = typeSel.value; V.render(root); });
    const accSel = root.querySelector('#fin-acc');
    if (accSel) accSel.addEventListener('change', function () { state.account = accSel.value; V.render(root); });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.finance = V;
})();
