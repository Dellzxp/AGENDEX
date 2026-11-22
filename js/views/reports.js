/* Agendex — relatórios e comparações */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const Charts = Agendex.Charts;
  const V = {};

  const state = { scope: 'personal', month: U.currentMonth(), pct: false, months: 6, member: '', category: '' };

  function monthNav() {
    return '<div class="month-picker">' +
      '<button class="icon-btn" data-month-nav="-1" aria-label="Mês anterior">' + U.icon('chevronLeft', 16) + '</button>' +
      '<input type="month" class="input month-input" id="rep-month" value="' + U.esc(state.month) + '">' +
      '<button class="icon-btn" data-month-nav="1" aria-label="Próximo mês">' + U.icon('chevronRight', 16) + '</button>' +
    '</div>';
  }

  function monthsToggle() {
    return '<div class="segmented small">' + [6, 12].map(function (n) {
      return '<button data-months="' + n + '" class="' + (state.months === n ? 'active' : '') + '">' + n + ' meses</button>';
    }).join('') + '</div>';
  }

  function delta(cur, prev) {
    if (!prev) return '<span class="muted small">sem base anterior</span>';
    const d = ((cur - prev) / Math.abs(prev)) * 100;
    const up = d >= 0;
    return '<span class="' + (up ? 'text-green' : 'text-danger') + ' small">' + (up ? '▲' : '▼') + ' ' + Math.abs(d).toFixed(0) + '% vs. mês anterior</span>';
  }

  function indicator(label, value, sub) {
    return '<div class="indicator"><span>' + U.esc(label) + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
  }

  function unique(list) {
    return Array.from(new Set(list));
  }

  function num(v) { return (Number(v) || 0).toFixed(2).replace('.', ','); }

  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

  function csvText(rows) {
    return '\ufeff' + rows.map(function (r) {
      return r.map(csvCell).join(';');
    }).join('\r\n');
  }

  /* ---------------- pessoal ---------------- */
  function personal() {
    const month = state.month;
    const st = L.monthStats(month);
    const prev = L.monthStats(U.monthKey(U.addMonths(month + '-01', -1)));
    const months = L.monthSeries(state.months);
    const stats = months.map(function (m) { return L.monthStats(m); });
    const cats = L.categoryTotals(month, 'expense');
    const incomeCats = L.incomeByCategory(month);
    const cash = L.cashBalance();
    const balances = L.balanceSeries(months);
    const top = L.topExpenses(month, 5);
    const byAccount = L.expenseByAccount(month);
    const monthTx = DB.data.transactions.filter(function (t) { return U.monthKey(t.date) === month; });
    const nonTransfer = monthTx.filter(function (t) { return t.type !== 'transfer'; });
    const ticket = nonTransfer.length ? U.sum(nonTransfer, function (t) { return t.amount; }) / nonTransfer.length : 0;
    const biggest = top[0];
    const paidPct = st.expense ? (st.paidExpense / st.expense) * 100 : 0;
    const dayAvg = st.expense / Math.max(1, U.daysInMonth(month));

    let html = '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-top"><span>Receitas</span>' + U.icon('arrowUp', 17) + '</div><div class="kpi-value text-green">' + U.money(st.income) + '</div><div class="kpi-sub">' + delta(st.income, prev.income) + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Despesas</span>' + U.icon('arrowDown', 17) + '</div><div class="kpi-value">' + U.money(st.expense) + '</div><div class="kpi-sub">' + delta(st.expense, prev.expense) + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Resultado</span>' + U.icon('chart', 17) + '</div><div class="kpi-value ' + (st.result >= 0 ? 'text-green' : 'text-danger') + '">' + U.money(st.result) + '</div><div class="kpi-sub">' + (prev.result !== 0 ? 'antes: ' + U.money(prev.result) : 'sem comparação') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Saldo em contas</span>' + U.icon('wallet', 17) + '</div><div class="kpi-value">' + U.money(cash) + '</div><div class="kpi-sub">saldo atual</div></div>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Receitas e despesas</h3><span class="muted small">últimos ' + state.months + ' meses</span></div>' +
        Charts.legend([{ label: 'Receitas', color: 'var(--green)' }, { label: 'Despesas', color: 'var(--accent)' }]) +
        Charts.groupedBars({ labels: months.map(function (m) { return U.monthShort(m); }), series: [{ name: 'Receitas', color: 'var(--green)', data: stats.map(function (s) { return s.income; }) }, { name: 'Despesas', color: 'var(--accent)', data: stats.map(function (s) { return s.expense; }) }] }) +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Gastos por categoria</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
        Charts.donut(cats.slice(0, 7).map(function (c, i) { return { label: c.category, value: c.value, color: L.categoryColor(i) }; }), { centerLabel: 'despesas' }) +
      '</section>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Evolução do saldo</h3><span class="muted small">saldo acumulado em contas</span></div>' +
        Charts.legend([{ label: 'Saldo', color: 'var(--accent)' }]) +
        Charts.line({ labels: months.map(function (m) { return U.monthShort(m); }), data: balances }) +
        '<p class="muted small" style="margin-top:6px">Considera saldo inicial das contas e lançamentos pagos. Transferências não alteram o total.</p>' +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Indicadores do mês</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
        '<div class="indicator-grid">' +
          indicator('Gasto médio por dia', U.money(dayAvg), U.daysInMonth(month) + ' dias no mês') +
          indicator('Maior despesa', biggest ? U.money(biggest.amount) : '—', biggest ? U.esc(biggest.name) : 'sem despesas') +
          indicator('Ticket médio', U.money(ticket), nonTransfer.length + ' lançamento(s)') +
          indicator('Despesas pagas', Math.round(paidPct) + '%', U.money(st.pending) + ' pendente') +
        '</div>' +
      '</section>' +
    '</div>';

    html += '<section class="card"><div class="card-head"><h3>Comparação entre meses</h3><span class="muted small">resultado e variação</span></div>' +
      '<div class="tx-table compare"><div class="tx-head"><span>Mês</span><span class="ta-r">Receitas</span><span class="ta-r">Despesas</span><span class="ta-r">Resultado</span><span class="ta-r">Variação</span></div>' +
      stats.map(function (s, i) {
        let variation = '<span class="muted">—</span>';
        if (i) {
          const before = stats[i - 1].result;
          if (before !== 0) {
            const d = ((s.result - before) / Math.abs(before)) * 100;
            variation = '<span class="' + (d >= 0 ? 'text-green' : 'text-danger') + '">' + (d >= 0 ? '+' : '') + d.toFixed(0) + '%</span>';
          } else if (s.result !== 0) {
            variation = '<span class="' + (s.result >= 0 ? 'text-green' : 'text-danger') + '">' + (s.result >= 0 ? '+' : '') + U.moneyShort(s.result) + '</span>';
          }
        }
        return '<div class="tx-row' + (s.month === month ? ' current' : '') + '">' +
          '<span><b>' + U.monthLabel(s.month) + '</b></span>' +
          '<span class="ta-r text-green">' + U.money(s.income) + '</span>' +
          '<span class="ta-r">' + U.money(s.expense) + '</span>' +
          '<span class="ta-r ' + (s.result >= 0 ? 'text-green' : 'text-danger') + '"><b>' + U.money(s.result) + '</b></span>' +
          '<span class="ta-r">' + variation + '</span>' +
        '</div>';
      }).join('') + '</div></section>';

    const periodCats = {};
    months.forEach(function (m) {
      L.categoryTotals(m, 'expense').forEach(function (c) {
        periodCats[c.category] = (periodCats[c.category] || 0) + c.value;
      });
    });
    const catRows = Object.keys(periodCats).map(function (c) {
      const current = (cats.find(function (x) { return x.category === c; }) || {}).value || 0;
      return { category: c, total: periodCats[c], avg: periodCats[c] / months.length, current: current };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 8);
    const periodTotal = U.sum(catRows, function (r) { return r.total; });

    html += '<section class="card"><div class="card-head"><h3>Categorias no período</h3><span class="muted small">' + state.months + ' meses · despesas</span></div>' +
      (catRows.length ? '<div class="tx-table compare"><div class="tx-head"><span>Categoria</span><span class="ta-r">Total</span><span class="ta-r">Média/mês</span><span class="ta-r">' + U.monthShort(month) + '</span><span class="ta-r">% do total</span></div>' +
        catRows.map(function (r) {
          return '<div class="tx-row"><span><b>' + U.esc(r.category) + '</b></span>' +
            '<span class="ta-r">' + U.money(r.total) + '</span>' +
            '<span class="ta-r muted">' + U.money(r.avg) + '</span>' +
            '<span class="ta-r">' + U.money(r.current) + '</span>' +
            '<span class="ta-r">' + (periodTotal ? Math.round(U.pct(r.total, periodTotal)) + '%' : '—') + '</span></div>';
        }).join('') + '</div>' : '<p class="muted small">Sem despesas no período.</p>') +
    '</section>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Orçado x realizado</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
      (DB.data.budgets.length ? '<div class="budget-list">' + DB.data.budgets.map(function (b) {
        const spent = L.budgetSpent(b, month);
        const pct = U.pct(spent, b.limit);
        const over = spent > b.limit;
        return '<div class="budget-mini"><div class="budget-line"><span>' + U.esc(b.category) + '</span><span class="muted">' + U.money(spent) + ' / ' + U.money(b.limit) + '</span></div>' + UI.bar(pct, over ? 'var(--danger)' : pct > 80 ? 'var(--warn)' : 'var(--accent)') + '</div>';
      }).join('') + '</div>' : '<p class="muted small">Nenhum orçamento definido.</p>') +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Metas</h3><span class="muted small">progresso</span></div>' +
      (DB.data.goals.length ? '<div class="budget-list">' + DB.data.goals.map(function (g) {
        const saved = L.goalSaved(g);
        const pct = U.pct(saved, g.target);
        return '<div class="budget-mini"><div class="budget-line"><span>' + U.esc(g.name) + '</span><span class="muted">' + U.money(saved) + ' / ' + U.money(g.target) + '</span></div>' + UI.bar(pct, 'var(--green)') + '</div>';
      }).join('') + '</div>' : '<p class="muted small">Nenhuma meta definida.</p>') +
      '</section>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Maiores despesas</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
        (top.length ? '<div class="rows">' + top.map(function (t) {
          return '<button class="row-item row-btn" data-edit-tx="' + U.esc(t.id) + '">' +
            '<span class="row-icon">' + U.icon('arrowDown', 16) + '</span>' +
            '<span class="row-main"><b>' + U.esc(t.name) + '</b><small>' + U.esc([t.category, U.fmtDate(t.date)].filter(Boolean).join(' · ')) + '</small></span>' +
            '<span class="row-value">' + U.money(t.amount) + '</span>' +
          '</button>';
        }).join('') + '</div>' : '<p class="muted small">Sem despesas neste mês.</p>') +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Gastos por conta</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
        Charts.hBars(byAccount.map(function (a, i) { return { label: a.name, value: a.value, color: L.categoryColor(i) }; }), {}) +
      '</section>' +
    '</div>';

    html += '<section class="card"><div class="card-head"><h3>Receitas por categoria</h3><span class="muted small">' + U.monthLabel(month) + '</span></div>' +
      Charts.hBars(incomeCats.map(function (c) { return { label: c.category, value: c.value, color: 'var(--green)' }; }), {}) +
    '</section>';

    html += '<div class="note">' + U.icon('lock', 16) + '<span>Estes relatórios usam apenas os dados salvos neste computador. Nada é enviado para a internet.</span></div>';
    return html;
  }

  /* ---------------- projeto ---------------- */
  function projectReport(p) {
    const members = p.members || [];
    const all = p.finance || [];
    const categories = unique(all.map(function (f) { return f.category || 'Outros'; })).sort();
    const fin = all.filter(function (f) {
      if (state.member && f.memberId !== state.member) return false;
      if (state.category && (f.category || 'Outros') !== state.category) return false;
      return true;
    });
    const s = L.financeStats(fin, members);
    const full = L.projectStats(p);
    const budget = Number(p.budget) || 0;
    const budgetPct = budget ? U.pct(s.raised, budget) : 0;
    const missing = Math.max(0, budget - s.raised);
    const months = L.monthSeries(state.months);
    const seriesIn = months.map(function (m) {
      return U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.status !== 'pending' && U.monthKey(f.date) === m; }), function (f) { return f.amount; });
    });
    const seriesOut = months.map(function (m) {
      return U.sum(fin.filter(function (f) { return f.type === 'expense' && f.status !== 'pending' && U.monthKey(f.date) === m; }), function (f) { return f.amount; });
    });
    const memberBars = s.perMember.map(function (x, i) {
      return { label: x.member.name, value: x.paid, color: U.PROJECT_COLORS[i % U.PROJECT_COLORS.length] };
    });
    const filtered = state.member || state.category;
    const monthIn = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.status !== 'pending' && U.monthKey(f.date) === state.month; }), function (f) { return f.amount; });
    const monthOut = U.sum(fin.filter(function (f) { return f.type === 'expense' && f.status !== 'pending' && U.monthKey(f.date) === state.month; }), function (f) { return f.amount; });
    const monthPendIn = U.sum(fin.filter(function (f) { return f.type === 'contribution' && f.status === 'pending' && U.monthKey(f.date) === state.month; }), function (f) { return f.amount; });
    const monthPendOut = U.sum(fin.filter(function (f) { return f.type === 'expense' && f.status === 'pending' && U.monthKey(f.date) === state.month; }), function (f) { return f.amount; });

    let html = '';
    if (filtered) {
      html += '<div class="stat-chips"><span class="chip ok">Filtro ativo</span>' +
        (state.member ? '<span class="chip">' + U.esc((members.find(function (m) { return m.id === state.member; }) || {}).name || 'Participante') + '</span>' : '') +
        (state.category ? '<span class="chip">' + U.esc(state.category) + '</span>' : '') +
        '<button class="link" data-clear-filters>Limpar filtros</button></div>';
    }

    html += '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-top"><span>Arrecadado</span>' + U.icon('arrowUp', 17) + '</div><div class="kpi-value text-green">' + U.money(s.raised) + '</div><div class="kpi-sub">' + (s.pendingIn ? U.money(s.pendingIn) + ' pendente' : 'tudo recebido') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Total gasto</span>' + U.icon('arrowDown', 17) + '</div><div class="kpi-value">' + U.money(s.spent) + '</div><div class="kpi-sub">' + (s.pendingOut ? U.money(s.pendingOut) + ' a pagar' : 'tudo pago') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Saldo</span>' + U.icon('wallet', 17) + '</div><div class="kpi-value ' + (s.balance < 0 ? 'text-danger' : '') + '">' + U.money(s.balance) + '</div><div class="kpi-sub">arrecadado − gasto</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>' + (budget ? 'Falta para o orçamento' : 'Orçamento') + '</span>' + U.icon('target', 17) + '</div><div class="kpi-value">' + (budget ? U.money(missing) : '—') + '</div><div class="kpi-sub">' + (budget ? Math.round(budgetPct) + '% de ' + U.money(budget) : 'não definido') + '</div></div>' +
    '</div>';

    html += '<section class="card"><div class="card-head"><h3>Resumo do mês</h3><span class="muted small">' + U.monthLabel(state.month) + (filtered ? ' · com filtro' : '') + '</span></div>' +
      '<div class="indicator-grid four">' +
        indicator('Aportes recebidos', U.money(monthIn), monthPendIn ? U.money(monthPendIn) + ' pendente' : 'nada pendente') +
        indicator('Gastos pagos', U.money(monthOut), monthPendOut ? U.money(monthPendOut) + ' a pagar' : 'nada a pagar') +
        indicator('Resultado do mês', '<span class="' + (monthIn - monthOut >= 0 ? 'text-green' : 'text-danger') + '">' + U.money(monthIn - monthOut) + '</span>', 'aportes − gastos') +
        indicator('Média por participante', members.length ? U.money((monthIn + monthPendIn) / members.length) : '—', members.length ? 'aporte médio no mês' : 'sem participantes') +
      '</div>' +
    '</section>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Contribuição por participante</h3><button class="link" data-toggle-pct>' + (state.pct ? 'Mostrar valores' : 'Mostrar percentual') + '</button></div>' +
        Charts.hBars(memberBars, { pct: state.pct, total: s.raised, format: state.pct ? function (v) { return Math.round(U.pct(v, s.raised)) + '%'; } : null }) +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Despesas por categoria</h3><span class="muted small">' + (filtered ? 'com filtro' : 'todo o projeto') + '</span></div>' +
        Charts.hBars(s.categories.map(function (c, i) { return { label: c.category, value: c.value, color: L.categoryColor(i) }; }), {}) +
      '</section>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Aportes e gastos</h3><span class="muted small">últimos ' + state.months + ' meses</span></div>' +
        Charts.legend([{ label: 'Aportes', color: 'var(--green)' }, { label: 'Gastos', color: 'var(--accent)' }]) +
        Charts.groupedBars({ labels: months.map(function (m) { return U.monthShort(m); }), series: [{ name: 'Aportes', color: 'var(--green)', data: seriesIn }, { name: 'Gastos', color: 'var(--accent)', data: seriesOut }] }) +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Participação financeira</h3><span class="muted small">todo o projeto</span></div>' +
        '<div class="tx-table mini"><div class="tx-head"><span>Participante</span><span>Pago</span><span>Pendente</span><span class="ta-r">% do total</span></div>' +
        s.perMember.map(function (x) {
          return '<div class="tx-row"><span><b>' + U.esc(x.member.name) + '</b></span><span class="text-green">' + U.money(x.paid) + '</span><span class="' + (x.pending ? 'text-warn' : 'muted') + '">' + U.money(x.pending) + '</span><span class="ta-r">' + (s.raised ? Math.round(U.pct(x.paid, s.raised)) + '%' : '—') + '</span></div>';
        }).join('') + '</div>' +
      '</section>' +
    '</div>';

    html += '<section class="card"><div class="card-head"><h3>Comparação mensal do projeto</h3><span class="muted small">' + state.months + ' meses</span></div>' +
      '<div class="tx-table compare"><div class="tx-head"><span>Mês</span><span class="ta-r">Aportes</span><span class="ta-r">Gastos</span><span class="ta-r">Resultado</span><span class="ta-r">Saldo acumulado</span></div>' +
      months.map(function (m, i) {
        let acumulado = 0;
        for (let k = 0; k <= i; k++) acumulado += seriesIn[k] - seriesOut[k];
        return '<div class="tx-row' + (m === state.month ? ' current' : '') + '">' +
          '<span><b>' + U.monthLabel(m) + '</b></span>' +
          '<span class="ta-r text-green">' + U.money(seriesIn[i]) + '</span>' +
          '<span class="ta-r">' + U.money(seriesOut[i]) + '</span>' +
          '<span class="ta-r ' + (seriesIn[i] - seriesOut[i] >= 0 ? 'text-green' : 'text-danger') + '"><b>' + U.money(seriesIn[i] - seriesOut[i]) + '</b></span>' +
          '<span class="ta-r">' + U.money(acumulado) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="muted small" style="margin-top:8px">Aportes e gastos pagos, agrupados pela data de cada lançamento.</p>' +
    '</section>';

    const n = members.length;
    const cota = n ? full.spent / n : 0;
    html += '<section class="card"><div class="card-head"><h3>Divisão igual dos gastos</h3><span class="muted small">cota por participante: ' + U.money(cota) + '</span></div>' +
      '<div class="tx-table compare"><div class="tx-head"><span>Participante</span><span class="ta-r">Contribuiu</span><span class="ta-r">Cota</span><span class="ta-r">Diferença</span><span class="ta-r">Situação</span></div>' +
      members.map(function (m) {
        const paid = (full.perMember.find(function (x) { return x.member.id === m.id; }) || {}).paid || 0;
        const diff = paid - cota;
        return '<div class="tx-row"><span><b>' + U.esc(m.name) + '</b></span><span class="ta-r text-green">' + U.money(paid) + '</span><span class="ta-r">' + U.money(cota) + '</span><span class="ta-r ' + (diff >= 0 ? 'text-green' : 'text-danger') + '">' + (diff >= 0 ? '+' : '−') + U.money(Math.abs(diff)) + '</span><span class="ta-r">' + (diff >= -0.5 ? UI.badge('Em dia', 'ok') : UI.badge('Deve completar', 'warn')) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="muted small" style="margin-top:8px">Considera todos os lançamentos do projeto e divisão igual das despesas. Aportes pendentes ainda não entram como contribuição.</p>' +
    '</section>';

    html += '<section class="card"><div class="card-head"><h3>Pendências por participante</h3><span class="muted small">aportes e despesas em aberto</span></div>' +
      '<div class="tx-table mini"><div class="tx-head"><span>Participante</span><span class="ta-r">Aporte pendente</span><span class="ta-r">Despesa pendente</span><span class="ta-r">Total</span></div>' +
      members.map(function (m) {
        const pIn = U.sum(all.filter(function (f) { return f.type === 'contribution' && f.memberId === m.id && f.status === 'pending'; }), function (f) { return f.amount; });
        const pOut = U.sum(all.filter(function (f) { return f.type === 'expense' && f.memberId === m.id && f.status === 'pending'; }), function (f) { return f.amount; });
        return '<div class="tx-row"><span><b>' + U.esc(m.name) + '</b></span><span class="ta-r ' + (pIn ? 'text-warn' : 'muted') + '">' + U.money(pIn) + '</span><span class="ta-r ' + (pOut ? 'text-warn' : 'muted') + '">' + U.money(pOut) + '</span><span class="ta-r"><b>' + U.money(pIn + pOut) + '</b></span></div>';
      }).join('') + '</div>' +
    '</section>';

    html += '<div class="note">' + U.icon('users', 16) + '<span>Somente os lançamentos deste projeto entram no relatório. A vida financeira pessoal de cada participante permanece privada.</span></div>';
    return html;
  }

  /* ---------------- exportações ---------------- */
  function csvPersonal() {
    const month = state.month;
    const months = L.monthSeries(state.months);
    const rows = [
      ['Agendex — relatório pessoal'],
      ['Gerado em', U.fmtDateTime(Date.now())],
      ['Mês de referência', U.monthLabel(month)],
      [],
      ['Resumo por mês'],
      ['Mês', 'Receitas', 'Despesas', 'Resultado']
    ];
    months.forEach(function (m) {
      const s = L.monthStats(m);
      rows.push([U.monthLabel(m), num(s.income), num(s.expense), num(s.result)]);
    });
    rows.push([], ['Lançamentos de ' + U.monthLabel(month)], ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Situação', 'Valor']);
    DB.data.transactions.filter(function (t) { return U.monthKey(t.date) === month; }).forEach(function (t) {
      rows.push([t.date, t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência', t.name, t.category || '', L.accountName(t.accountId), t.status === 'paid' ? 'Pago' : 'Pendente', num(t.amount)]);
    });
    rows.push([], ['Gastos por categoria'], ['Categoria', 'Valor']);
    L.categoryTotals(month, 'expense').forEach(function (c) { rows.push([c.category, num(c.value)]); });
    rows.push([], ['Orçamentos'], ['Categoria', 'Limite', 'Gasto']);
    DB.data.budgets.forEach(function (b) { rows.push([b.category, num(b.limit), num(L.budgetSpent(b, month))]); });
    const periodCats = {};
    months.forEach(function (m) {
      L.categoryTotals(m, 'expense').forEach(function (c) { periodCats[c.category] = (periodCats[c.category] || 0) + c.value; });
    });
    rows.push([], ['Categorias no período (despesas)'], ['Categoria', 'Total', 'Média por mês']);
    Object.keys(periodCats).sort(function (a, b) { return periodCats[b] - periodCats[a]; }).forEach(function (c) {
      rows.push([c, num(periodCats[c]), num(periodCats[c] / months.length)]);
    });
    U.download('agendex-relatorio-pessoal-' + month + '.csv', csvText(rows), 'text/csv;charset=utf-8');
  }

  function csvProject(p) {
    const s = L.projectStats(p);
    const rows = [
      ['Agendex — relatório do projeto'],
      ['Projeto', p.name],
      ['Gerado em', U.fmtDateTime(Date.now())],
      [],
      ['Resumo'],
      ['Arrecadado', num(s.raised)],
      ['Gasto', num(s.spent)],
      ['Saldo', num(s.balance)],
      ['A receber', num(s.pendingIn)],
      ['A pagar', num(s.pendingOut)],
      ['Orçamento', num(s.budget)],
      ['Falta para o orçamento', num(s.missing)],
      [],
      ['Participantes'],
      ['Nome', 'Pago', 'Pendente', 'Cota igual', 'Diferença']
    ];
    const cota = p.members && p.members.length ? s.spent / p.members.length : 0;
    s.perMember.forEach(function (x) {
      rows.push([x.member.name, num(x.paid), num(x.pending), num(cota), num(x.paid - cota)]);
    });
    const months = L.monthSeries(state.months);
    rows.push([], ['Comparação mensal'], ['Mês', 'Aportes', 'Gastos', 'Resultado']);
    const seriesIn = months.map(function (m) {
      return U.sum((p.finance || []).filter(function (f) { return f.type === 'contribution' && f.status !== 'pending' && U.monthKey(f.date) === m; }), function (f) { return f.amount; });
    });
    const seriesOut = months.map(function (m) {
      return U.sum((p.finance || []).filter(function (f) { return f.type === 'expense' && f.status !== 'pending' && U.monthKey(f.date) === m; }), function (f) { return f.amount; });
    });
    months.forEach(function (m, i) { rows.push([U.monthLabel(m), num(seriesIn[i]), num(seriesOut[i]), num(seriesIn[i] - seriesOut[i])]); });
    rows.push([], ['Lançamentos'], ['Data', 'Tipo', 'Descrição', 'Participante', 'Categoria', 'Situação', 'Valor']);
    (p.finance || []).forEach(function (f) {
      const m = (p.members || []).find(function (x) { return x.id === f.memberId; });
      rows.push([f.date, f.type === 'contribution' ? 'Aporte' : 'Despesa', f.name, m ? m.name : '', f.category || '', f.status === 'paid' ? 'Pago' : 'Pendente', num(f.amount)]);
    });
    U.download('agendex-relatorio-' + U.slug(p.name) + '.csv', csvText(rows), 'text/csv;charset=utf-8');
  }

  V.render = function (root) {
    const projects = DB.data.projects;
    let currentProject = state.scope !== 'personal' ? projects.find(function (p) { return p.id === state.scope; }) : null;
    if (state.scope !== 'personal' && !currentProject) {
      state.scope = 'personal';
      state.member = '';
      state.category = '';
      currentProject = null;
    }

    let html = '<div class="page">';
    html += '<div class="view-toolbar">' +
      '<div class="toolbar-group">' +
        '<select class="input select-sm" id="rep-scope">' +
          '<option value="personal"' + (state.scope === 'personal' ? ' selected' : '') + '>Minha vida</option>' +
          projects.map(function (p) { return '<option value="' + U.esc(p.id) + '"' + (state.scope === p.id ? ' selected' : '') + '>' + U.esc(p.name) + '</option>'; }).join('') +
        '</select>' +
        monthNav() +
        monthsToggle() +
      '</div>' +
      '<div class="toolbar-group">' +
        '<button class="btn ghost small" data-csv>' + U.icon('download', 15) + 'Exportar CSV</button>' +
        '<button class="btn ghost small" data-print>' + U.icon('file', 15) + 'Imprimir / PDF</button>' +
      '</div>' +
    '</div>';

    if (currentProject) {
      const cats = unique((currentProject.finance || []).map(function (f) { return f.category || 'Outros'; })).sort();
      html += '<div class="filter-row">' +
        '<select class="input select-sm" id="rep-member"><option value="">Todos os participantes</option>' +
          (currentProject.members || []).map(function (m) { return '<option value="' + U.esc(m.id) + '"' + (state.member === m.id ? ' selected' : '') + '>' + U.esc(m.name) + '</option>'; }).join('') +
        '</select>' +
        '<select class="input select-sm" id="rep-cat"><option value="">Todas as categorias</option>' +
          cats.map(function (c) { return '<option value="' + U.esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + U.esc(c) + '</option>'; }).join('') +
        '</select>' +
      '</div>';
    }

    const title = currentProject ? currentProject.name : 'Relatório pessoal';
    html += '<div class="print-head"><b>Agendex</b><span>' + U.esc(title) + ' · ' + U.monthLabel(state.month) + '</span><small>Gerado em ' + U.fmtDateTime(Date.now()) + '</small></div>';
    html += '<div class="report-head"><h2>' + U.esc(title) + '</h2><p class="muted">' + U.monthLabel(state.month) + ' · ' + (currentProject ? 'comparação do grupo' : 'visão geral das suas finanças') + '</p></div>';

    html += currentProject ? projectReport(currentProject) : personal();
    html += '</div>';
    root.innerHTML = html;

    const scope = root.querySelector('#rep-scope');
    if (scope) scope.addEventListener('change', function () {
      state.scope = scope.value;
      state.member = '';
      state.category = '';
      V.render(root);
    });
    const monthEl = root.querySelector('#rep-month');
    if (monthEl) monthEl.addEventListener('change', function () { if (monthEl.value) { state.month = monthEl.value; V.render(root); } });
    root.querySelectorAll('[data-month-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.month = U.addMonths(state.month + '-01', Number(el.getAttribute('data-month-nav'))).slice(0, 7);
        V.render(root);
      });
    });
    root.querySelectorAll('[data-months]').forEach(function (el) {
      el.addEventListener('click', function () { state.months = Number(el.getAttribute('data-months')); V.render(root); });
    });
    const member = root.querySelector('#rep-member');
    if (member) member.addEventListener('change', function () { state.member = member.value; V.render(root); });
    const cat = root.querySelector('#rep-cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; V.render(root); });
    const clear = root.querySelector('[data-clear-filters]');
    if (clear) clear.addEventListener('click', function () { state.member = ''; state.category = ''; V.render(root); });
    const pctBtn = root.querySelector('[data-toggle-pct]');
    if (pctBtn) pctBtn.addEventListener('click', function () { state.pct = !state.pct; V.render(root); });
    root.querySelectorAll('[data-edit-tx]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.Views.finance.openTransaction(el.getAttribute('data-edit-tx')); });
    });
    const csvBtn = root.querySelector('[data-csv]');
    if (csvBtn) csvBtn.addEventListener('click', function () {
      if (currentProject) csvProject(currentProject); else csvPersonal();
      UI.toast('CSV exportado');
    });
    const printBtn = root.querySelector('[data-print]');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.reports = V;
})();
