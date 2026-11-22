/* Agendex — visão geral */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const V = {};

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  function kpi(icon, label, value, sub, tone) {
    return '<div class="kpi ' + (tone || '') + '">' +
      '<div class="kpi-top"><span>' + U.esc(label) + '</span>' + U.icon(icon, 17) + '</div>' +
      '<div class="kpi-value">' + U.esc(value) + '</div>' +
      (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') +
    '</div>';
  }

  function eventRow(o) {
    const d = U.parse(o.date);
    return '<button class="row-item row-btn" data-event="' + U.esc(o.ev.id) + '">' +
      '<span class="date-chip"><b>' + U.pad(d.getDate()) + '</b><small>' + U.monthLabel(o.date.slice(0, 7), true).split('/')[0] + '</small></span>' +
      '<span class="row-main"><b>' + U.esc(o.ev.title) + '</b><small>' + U.esc([o.ev.time, o.ev.category, o.ev.location].filter(Boolean).join(' · ') || 'Dia inteiro') + '</small></span>' +
      (o.ev.projectId ? '<span class="dot" style="background:' + U.esc((L.projectOf(o.ev.projectId) || {}).color || 'var(--accent)') + '"></span>' : '') +
    '</button>';
  }

  V.render = function (root) {
    const data = DB.data;
    const name = data.profile.name || 'você';
    const month = U.currentMonth();
    const st = L.monthStats(month);
    const cash = L.cashBalance();
    const bills = L.upcomingBills(7).slice(0, 4);
    const overdueTasks = L.tasksOverdue().slice(0, 3);
    const events = L.nextEvents(14, 5);
    const projects = data.projects.slice(0, 3);
    const goals = data.goals.slice(0, 3);
    const isEmpty = !data.accounts.length && !data.transactions.length && !data.events.length && !data.tasks.length && !data.projects.length;

    let html = '<div class="page">';

    html += '<div class="page-lead">' +
      '<div><h2 class="greeting">' + greeting() + ', ' + U.esc(name) + '.</h2>' +
      '<p class="muted">' + U.fmtDate(U.today()) + ' · ' + U.monthLabel(month) + '</p></div>' +
      '<div class="lead-actions">' +
        '<button class="btn ghost" data-go="#/agenda">' + U.icon('calendar', 16) + 'Agenda</button>' +
        '<button class="btn primary" data-new="transaction">' + U.icon('plus', 16) + 'Novo lançamento</button>' +
      '</div>' +
    '</div>';

    if (isEmpty) {
      html += '<div class="onboard">' +
        '<div class="onboard-mark">' + U.icon('spark', 22) + '</div>' +
        '<div><h3>Comece pelo essencial</h3><p>Cadastre uma conta, crie um evento e registre o primeiro lançamento. O Agendex salva tudo automaticamente.</p>' +
        '<div class="onboard-actions"><button class="btn primary" data-new="account">Criar conta</button><button class="btn ghost" data-new="event">Criar evento</button><button class="btn ghost" data-go="#/help">Ver guia</button></div></div>' +
      '</div>';
    }

    html += '<div class="kpi-grid">' +
      kpi('wallet', 'Saldo em contas', U.money(cash), data.accounts.filter(function (a) { return a.type !== 'credit'; }).length + ' conta(s) · ' + U.money(st.pending) + ' a pagar', cash < 0 ? 'negative' : '') +
      kpi('arrowUp', 'Receitas do mês', U.money(st.income), U.monthLabel(month)) +
      kpi('arrowDown', 'Despesas do mês', U.money(st.expense), st.pending ? U.money(st.pending) + ' ainda pendente' : 'todas quitadas') +
      kpi('chart', 'Resultado do mês', U.money(st.result), st.result >= 0 ? 'sobrou no mês' : 'gastou mais do que entrou', st.result >= 0 ? 'positive' : 'negative') +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card">' +
        '<div class="card-head"><h3>Próximos compromissos</h3><button class="link" data-go="#/agenda">Ver agenda</button></div>' +
        (events.length ? '<div class="rows">' + events.map(eventRow).join('') + '</div>' : UI.empty('calendar', 'Agenda livre', 'Nenhum compromisso nos próximos 14 dias.', '<button class="btn small ghost" data-new="event">Criar evento</button>')) +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h3>Pendências</h3><button class="link" data-go="#/finance">Ver financeiro</button></div>' +
        (bills.length || overdueTasks.length ?
          '<div class="rows">' +
            bills.map(function (t) {
              const late = t.date < U.today();
              return '<button class="row-item row-btn" data-tx="' + U.esc(t.id) + '">' +
                '<span class="row-icon ' + (late ? 'danger' : 'warn') + '">' + U.icon('clock', 16) + '</span>' +
                '<span class="row-main"><b>' + U.esc(t.name) + '</b><small>' + (late ? 'Atrasada desde ' : 'Vence ') + U.fmtDate(t.date) + ' · ' + U.esc(t.category) + '</small></span>' +
                '<span class="row-value">' + U.money(t.amount) + '</span>' +
              '</button>';
            }).join('') +
            overdueTasks.map(function (t) {
              return '<button class="row-item row-btn" data-task="' + U.esc(t.id) + '">' +
                '<span class="row-icon danger">' + U.icon('check', 16) + '</span>' +
                '<span class="row-main"><b>' + U.esc(t.title) + '</b><small>Tarefa atrasada · ' + U.fmtDate(t.due) + '</small></span>' +
                '<span class="row-value">' + UI.badge(t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa', t.priority === 'high' ? 'danger' : '') + '</span>' +
              '</button>';
            }).join('') +
          '</div>'
          : UI.empty('check', 'Tudo em dia', 'Sem contas vencidas ou tarefas atrasadas.', '')) +
      '</section>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card">' +
        '<div class="card-head"><h3>Projetos</h3><button class="link" data-go="#/projects">Ver todos</button></div>' +
        (projects.length ? '<div class="project-mini-list">' + projects.map(function (p) {
          const s = L.projectStats(p);
          return '<button class="project-mini" data-project="' + U.esc(p.id) + '">' +
            '<span class="project-dot" style="background:' + U.esc(p.color) + '"></span>' +
            '<span class="row-main"><b>' + U.esc(p.name) + '</b><small>' + s.members + ' participante(s) · ' + U.money(s.raised) + ' de ' + U.money(s.budget) + '</small>' +
              UI.bar(s.budgetPct, p.color) +
            '</span>' +
            '<span class="row-value">' + Math.round(s.budgetPct) + '%</span>' +
          '</button>';
        }).join('') + '</div>' : UI.empty('folder', 'Nenhum projeto', 'Crie um projeto individual ou compartilhado.', '<button class="btn small ghost" data-new="project">Criar projeto</button>')) +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h3>Metas</h3><button class="link" data-go="#/finance">Ver metas</button></div>' +
        (goals.length ? '<div class="goal-mini-list">' + goals.map(function (g) {
          const saved = L.goalSaved(g);
          const pct = U.pct(saved, g.target);
          return '<button class="goal-mini" data-goal="' + U.esc(g.id) + '">' +
            '<span class="row-main"><span class="goal-line"><b>' + U.esc(g.name) + '</b><span class="muted">' + U.money(saved) + ' / ' + U.money(g.target) + '</span></span>' +
              UI.bar(pct, 'var(--green)') +
            '</span>' +
            '<span class="row-value">' + Math.round(pct) + '%</span>' +
          '</button>';
        }).join('') + '</div>' : UI.empty('target', 'Nenhuma meta', 'Defina objetivos e acompanhe o progresso.', '<button class="btn small ghost" data-new="goal">Criar meta</button>')) +
      '</section>' +
    '</div>';

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('[data-go]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go(el.getAttribute('data-go')); });
    });
    root.querySelectorAll('[data-event]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.Views.agenda.openEvent(el.getAttribute('data-event')); });
    });
    root.querySelectorAll('[data-tx]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.Views.finance.openTransaction(el.getAttribute('data-tx')); });
    });
    root.querySelectorAll('[data-task]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go('#/agenda'); });
    });
    root.querySelectorAll('[data-project]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go('#/project/' + el.getAttribute('data-project')); });
    });
    root.querySelectorAll('[data-goal]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go('#/finance'); });
    });
    root.querySelectorAll('[data-new]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.quickAdd(el.getAttribute('data-new')); });
    });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.overview = V;
})();
