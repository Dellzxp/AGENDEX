/* Agendex — projetos e grupos */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const Share = Agendex.Share;
  const Charts = Agendex.Charts;
  const V = {};

  const state = { tab: 'overview', projectId: '', showPct: false };
  const ROLES = { admin: 'Administrador', editor: 'Editor', colaborador: 'Colaborador', visualizador: 'Visualizador' };

  function projectById(id) { return DB.data.projects.find(function (p) { return p.id === id; }); }

  function shape(p) {
    ['tasks', 'events', 'finance', 'members', 'versions', 'history', 'deleted'].forEach(function (k) {
      if (!Array.isArray(p[k])) p[k] = [];
    });
    if (!p.version) p.version = 1;
    return p;
  }

  function roleBadge(role) {
    const tone = role === 'admin' ? 'accent' : role === 'editor' ? 'ok' : role === 'colaborador' ? 'warn' : '';
    return UI.badge(ROLES[role] || role, tone);
  }

  function openProject(id) {
    const p = id ? projectById(id) : null;
    const isNew = !p;
    const me = DB.data.profile;
    UI.form({
      title: isNew ? 'Novo projeto' : 'Editar projeto',
      subtitle: isNew ? 'Um espaço para organizar sozinho ou com outras pessoas.' : '',
      width: 640,
      fields: [
        { name: 'name', label: 'Nome do projeto', required: true, full: true, value: p ? p.name : '', placeholder: 'Ex.: Viagem com amigos' },
        { name: 'description', label: 'Descrição', type: 'textarea', full: true, rows: 2, value: p ? p.description || '' : '' },
        { name: 'category', label: 'Categoria', value: p ? p.category || '' : '', placeholder: 'Ex.: Viagem, Casa, Trabalho' },
        { name: 'color', label: 'Cor', type: 'color', value: p ? p.color : U.PROJECT_COLORS[DB.data.projects.length % U.PROJECT_COLORS.length] },
        { name: 'start', label: 'Início', type: 'date', value: p ? p.start || '' : U.today() },
        { name: 'end', label: 'Término', type: 'date', value: p ? p.end || '' : '' },
        { name: 'budget', label: 'Orçamento previsto', type: 'number', min: 0, value: p ? p.budget || '' : '' }
      ],
      submitLabel: isNew ? 'Criar projeto' : 'Salvar',
      dangerAction: p ? {
        label: 'Excluir projeto',
        onClick: async function () {
          const ok = await UI.confirm({
            title: 'Excluir projeto',
            message: 'Excluir "' + p.name + '"?',
            detail: '<span class="muted">As outras pessoas continuam com as cópias delas. Esta ação remove apenas a sua.</span>',
            danger: true,
            confirmLabel: 'Excluir projeto'
          });
          if (!ok) return;
          DB.data.projects = DB.data.projects.filter(function (x) { return x.id !== p.id; });
          DB.save(true);
          UI.toast('Projeto excluído');
          Agendex.App.go('#/projects');
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let target = p;
        if (!target) {
          target = shape({
            id: U.uid(), name: '', description: '', color: v.color, category: '', start: '', end: '', budget: 0,
            ownerId: me.id,
            members: [{ id: U.uid(), name: me.name || 'Você', role: 'admin', profileId: me.id, updatedAt: now }],
            tasks: [], events: [], finance: [], versions: [], history: [], deleted: [],
            version: 1, createdAt: now, updatedAt: now, appliedPackages: []
          });
          DB.data.projects.unshift(target);
        }
        target.name = v.name.trim();
        target.description = v.description || '';
        target.category = v.category || '';
        target.color = v.color;
        target.start = v.start || '';
        target.end = v.end || '';
        target.budget = Number(v.budget) || 0;
        target.updatedAt = now;
        if (isNew) Share.log(target, 'Projeto criado');
        DB.save(true);
        UI.toast(isNew ? 'Projeto criado' : 'Projeto atualizado');
        if (isNew) setTimeout(function () { Agendex.App.go('#/project/' + target.id); }, 60);
        else Agendex.App.refresh();
      }
    });
  }

  function tomb(project, kind, id) {
    project.deleted = (project.deleted || []).filter(function (t) { return !(t.kind === kind && t.id === id); });
    project.deleted.push({ kind: kind, id: id, at: Date.now() });
  }

  function openEntry(projectId, id, type) {
    const p = projectById(projectId);
    if (!p) return;
    if (!L.canEdit(p)) { UI.toast('Seu acesso neste projeto é somente leitura.', 'error'); return; }
    const e = id ? (p.finance || []).find(function (x) { return x.id === id; }) : null;
    const isNew = !e;
    const memberOpts = (p.members || []).map(function (m) { return { value: m.id, label: m.name }; });
    if (!memberOpts.length) { UI.toast('Adicione um participante antes.', 'error'); return; }
    const typeVal = e ? e.type : (type || 'contribution');
    UI.form({
      title: isNew ? (typeVal === 'contribution' ? 'Novo aporte' : 'Nova despesa do projeto') : 'Editar lançamento',
      fields: [
        { name: 'type', label: 'Tipo', type: 'select', options: [{ value: 'contribution', label: 'Aporte / contribuição' }, { value: 'expense', label: 'Despesa' }], value: typeVal },
        { name: 'memberId', label: 'Participante', type: 'select', options: memberOpts, value: e ? e.memberId : memberOpts[0].value },
        { name: 'name', label: 'Descrição', required: true, value: e ? e.name : '', placeholder: typeVal === 'contribution' ? 'Ex.: Aporte de novembro' : 'Ex.: Aluguel da casa' },
        { name: 'amount', label: 'Valor', type: 'number', min: 0.01, required: true, value: e ? e.amount : '' },
        { name: 'date', label: 'Data', type: 'date', required: true, value: e ? e.date : U.today() },
        { name: 'category', label: 'Categoria', value: e ? e.category : (typeVal === 'contribution' ? 'Aporte' : 'Geral') },
        { name: 'status', label: 'Situação', type: 'select', options: [{ value: 'paid', label: 'Pago / recebido' }, { value: 'pending', label: 'Pendente' }], value: e ? e.status : 'paid' },
        { name: 'notes', label: 'Observações', type: 'textarea', full: true, value: e ? e.notes || '' : '' }
      ],
      submitLabel: isNew ? 'Salvar' : 'Salvar',
      onReady: function (modal, form) {
        const typeEl = form.elements.type;
        typeEl.addEventListener('change', function () {
          if (typeEl.value === 'contribution' && form.elements.category.value === 'Geral') form.elements.category.value = 'Aporte';
          if (typeEl.value === 'expense' && form.elements.category.value === 'Aporte') form.elements.category.value = 'Geral';
        });
      },
      dangerAction: e ? {
        label: 'Excluir lançamento',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir lançamento', message: 'Excluir "' + e.name + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          p.finance = p.finance.filter(function (x) { return x.id !== e.id; });
          tomb(p, 'finance', e.id);
          p.updatedAt = Date.now();
          DB.save(true);
          UI.toast('Lançamento excluído');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let target = e;
        if (!target) {
          target = { id: U.uid(), createdAt: now };
          p.finance.push(target);
        }
        target.type = v.type;
        target.memberId = v.memberId;
        target.name = v.name.trim();
        target.amount = Math.abs(Number(v.amount)) || 0;
        target.date = v.date;
        target.category = v.category || (v.type === 'contribution' ? 'Aporte' : 'Geral');
        target.status = v.status;
        target.notes = v.notes || '';
        target.updatedAt = now;
        target.updatedBy = DB.data.profile.id;
        p.deleted = (p.deleted || []).filter(function (t) { return !(t.kind === 'finance' && t.id === target.id); });
        p.updatedAt = now;
        DB.save(true);
        UI.toast(isNew ? 'Lançamento criado' : 'Lançamento atualizado');
        Agendex.App.refresh();
      }
    });
  }

  function openMember(projectId, id) {
    const p = projectById(projectId);
    if (!p) return;
    if (!L.canManage(p)) { UI.toast('Somente administradores podem editar participantes.', 'error'); return; }
    const m = id ? p.members.find(function (x) { return x.id === id; }) : null;
    const isNew = !m;
    UI.form({
      title: isNew ? 'Adicionar participante' : 'Editar participante',
      subtitle: isNew ? 'Depois de importar o projeto, a pessoa entra com o papel definido aqui.' : '',
      fields: [
        { name: 'name', label: 'Nome', required: true, full: true, value: m ? m.name : '', placeholder: 'Ex.: Maria' },
        { name: 'role', label: 'Permissão', type: 'select', options: [{ value: 'admin', label: 'Administrador' }, { value: 'editor', label: 'Editor' }, { value: 'colaborador', label: 'Colaborador' }, { value: 'visualizador', label: 'Visualizador' }], value: m ? m.role : 'editor' }
      ],
      submitLabel: isNew ? 'Adicionar' : 'Salvar',
      dangerAction: m ? {
        label: 'Remover',
        onClick: async function () {
          const used = (p.finance || []).some(function (f) { return f.memberId === m.id; });
          if (used) { UI.toast('Este participante possui lançamentos. Exclua ou reatribua antes.', 'error'); return; }
          if (p.members.length <= 1) { UI.toast('O projeto precisa de pelo menos um participante.', 'error'); return; }
          const ok = await UI.confirm({ title: 'Remover participante', message: 'Remover "' + m.name + '"?', danger: true, confirmLabel: 'Remover' });
          if (!ok) return;
          p.members = p.members.filter(function (x) { return x.id !== m.id; });
          tomb(p, 'members', m.id);
          p.updatedAt = Date.now();
          DB.save(true);
          UI.toast('Participante removido');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let target = m;
        if (!target) {
          target = { id: U.uid(), profileId: '' };
          p.members.push(target);
        }
        target.name = v.name.trim();
        target.role = v.role;
        target.updatedAt = now;
        if (U.norm(target.name) === U.norm(DB.data.profile.name)) target.profileId = DB.data.profile.id;
        p.deleted = (p.deleted || []).filter(function (t) { return !(t.kind === 'members' && t.id === target.id); });
        p.updatedAt = now;
        DB.save(true);
        UI.toast(isNew ? 'Participante adicionado' : 'Participante atualizado');
        Agendex.App.refresh();
      }
    });
  }

  function toggleProjectTask(projectId, taskId) {
    const p = projectById(projectId);
    if (!p) return;
    const t = (p.tasks || []).find(function (x) { return x.id === taskId; });
    if (!t) return;
    t.done = !t.done;
    t.updatedAt = Date.now();
    p.updatedAt = Date.now();
    DB.save();
    Agendex.App.refresh();
  }

  /* ---------------- lista ---------------- */
  V.render = function (root) {
    const projects = DB.data.projects;
    let html = '<div class="page">';

    html += '<div class="view-toolbar">' +
      '<div class="page-title-inline"><h2>Projetos</h2><p class="muted small">Individuais e compartilhados por arquivo</p></div>' +
      '<div class="toolbar-group">' +
        '<button class="btn ghost small" data-import-project>' + U.icon('upload', 15) + 'Importar</button>' +
        '<button class="btn primary small" data-new-project>' + U.icon('plus', 15) + 'Novo projeto</button>' +
      '</div>' +
    '</div>';

    if (!projects.length) {
      html += UI.empty('folder', 'Nenhum projeto ainda', 'Crie um projeto para organizar uma viagem, a casa, a família ou um trabalho em grupo. Para entrar em um projeto de outra pessoa, importe o arquivo recebido.', '<button class="btn primary small" data-new-project>Criar projeto</button> <button class="btn ghost small" data-import-project>Importar arquivo</button>');
    } else {
      html += '<div class="project-grid">' + projects.map(function (p) {
        shape(p);
        const s = L.projectStats(p);
        const members = p.members.slice(0, 4);
        return '<button class="project-card" data-project="' + U.esc(p.id) + '">' +
          '<span class="project-color" style="background:' + U.esc(p.color) + '"></span>' +
          '<div class="project-card-body">' +
            '<div class="project-card-top"><h3>' + U.esc(p.name) + '</h3><span class="muted small">v' + U.esc(p.version || 1) + '</span></div>' +
            '<p class="project-desc">' + U.esc(p.description || 'Sem descrição') + '</p>' +
            '<div class="project-meta">' +
              '<span>' + U.esc(p.category || 'Projeto') + '</span>' +
              '<span>' + s.members + ' participante(s)</span>' +
              (p.end ? '<span>até ' + U.fmtDate(p.end) + '</span>' : '') +
            '</div>' +
            (s.budget ? '<div class="project-budget"><div class="budget-line"><span>' + U.money(s.raised) + ' de ' + U.money(s.budget) + '</span><span>' + Math.round(s.budgetPct) + '%</span></div>' + UI.bar(s.budgetPct, p.color) + '</div>' : '') +
            '<div class="project-foot"><div class="avatars">' + members.map(function (m, i) {
              return '<span class="avatar sm" style="background:' + U.esc(U.PROJECT_COLORS[i % U.PROJECT_COLORS.length]) + ';color:#fff" title="' + U.esc(m.name) + '">' + U.esc(U.initials(m.name)) + '</span>';
            }).join('') + '</div><span class="muted tiny">Atualizado ' + U.relTime(p.updatedAt) + '</span></div>' +
          '</div>' +
        '</button>';
      }).join('') + '</div>';
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('[data-new-project]').forEach(function (el) {
      el.addEventListener('click', function () { openProject(); });
    });
    root.querySelectorAll('[data-import-project]').forEach(function (el) {
      el.addEventListener('click', function () { Share.importFlow(); });
    });
    root.querySelectorAll('[data-project]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go('#/project/' + el.getAttribute('data-project')); });
    });
  };

  /* ---------------- detalhe ---------------- */
  function detailTabs() {
    return [['overview', 'Visão geral'], ['agenda', 'Agenda'], ['finance', 'Finanças'], ['tasks', 'Tarefas'], ['members', 'Participantes'], ['versions', 'Versões dos amigos'], ['history', 'Histórico']];
  }

  function overviewTab(p) {
    const s = L.projectStats(p);
    const me = DB.data.profile;
    let html = '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-top"><span>Arrecadado</span>' + U.icon('arrowUp', 17) + '</div><div class="kpi-value text-green">' + U.money(s.raised) + '</div><div class="kpi-sub">' + (s.pendingIn ? U.money(s.pendingIn) + ' pendente' : 'sem pendências') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Gasto</span>' + U.icon('arrowDown', 17) + '</div><div class="kpi-value">' + U.money(s.spent) + '</div><div class="kpi-sub">' + (s.pendingOut ? U.money(s.pendingOut) + ' a pagar' : 'tudo pago') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Saldo do projeto</span>' + U.icon('wallet', 17) + '</div><div class="kpi-value ' + (s.balance < 0 ? 'text-danger' : '') + '">' + U.money(s.balance) + '</div><div class="kpi-sub">arrecadado menos gasto</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span>Tarefas abertas</span>' + U.icon('check', 17) + '</div><div class="kpi-value">' + s.openTasks + '</div><div class="kpi-sub">de ' + s.totalTasks + ' tarefa(s)</div></div>' +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card">' +
        '<div class="card-head"><h3>Sobre o projeto</h3><button class="link" data-edit-project>Editar</button></div>' +
        '<p class="project-about">' + U.esc(p.description || 'Sem descrição.') + '</p>' +
        '<div class="meta-list">' +
          '<div><span>Categoria</span><b>' + U.esc(p.category || '—') + '</b></div>' +
          '<div><span>Início</span><b>' + U.fmtDate(p.start) + '</b></div>' +
          '<div><span>Término</span><b>' + U.fmtDate(p.end) + '</b></div>' +
          '<div><span>Orçamento</span><b>' + U.money(p.budget) + '</b></div>' +
        '</div>' +
        (p.budget ? '<div class="project-budget big"><div class="budget-line"><span>Arrecadado</span><span>' + Math.round(s.budgetPct) + '%</span></div>' + UI.bar(s.budgetPct, p.color) + '<p class="muted small">' + (s.missing ? 'Faltam ' + U.money(s.missing) + ' para o orçamento.' : 'Orçamento completo.') + '</p></div>' : '') +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h3>Participantes</h3><button class="link" data-go-tab="members">Gerenciar</button></div>' +
        '<div class="member-list">' + p.members.map(function (m, i) {
          const paid = U.sum((p.finance || []).filter(function (f) { return f.type === 'contribution' && f.memberId === m.id && f.status !== 'pending'; }), function (f) { return f.amount; });
          return '<div class="member-row">' +
            '<span class="avatar sm" style="background:' + U.esc(U.PROJECT_COLORS[i % U.PROJECT_COLORS.length]) + ';color:#fff">' + U.esc(U.initials(m.name)) + '</span>' +
            '<span class="row-main"><b>' + U.esc(m.name) + (m.profileId === me.id ? ' <span class="muted tiny">(você)</span>' : '') + '</b><small>' + U.esc(ROLES[m.role] || m.role) + '</small></span>' +
            '<span class="row-value">' + U.money(paid) + '</span>' +
          '</div>';
        }).join('') + '</div>' +
      '</section>' +
    '</div>';

    const hist = (p.history || []).slice(0, 6);
    html += '<section class="card"><div class="card-head"><h3>Atividade recente</h3><button class="link" data-go-tab="history">Ver histórico</button></div>' +
      (hist.length ? '<div class="timeline compact">' + hist.map(function (h) {
        return '<div class="timeline-item static"><span class="timeline-time">' + U.fmtDateTime(h.at) + '</span><span class="timeline-dot"></span><span class="row-main"><b>' + U.esc(h.action) + '</b><small>' + U.esc(h.author) + '</small></span></div>';
      }).join('') + '</div>' : '<p class="muted small">Sem atividade registrada.</p>') +
    '</section>';
    return html;
  }

  function agendaTab(p) {
    const canEdit = L.canEdit(p);
    const evs = (p.events || []).slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    let html = '<div class="card"><div class="card-head"><h3>Agenda do projeto</h3>' + (canEdit ? '<button class="btn small primary" data-new-project-event>' + U.icon('plus', 14) + 'Evento</button>' : '') + '</div>';
    if (!evs.length) html += UI.empty('calendar', 'Nenhum evento', 'Marque reuniões, prazos e encontros do grupo.', canEdit ? '<button class="btn small ghost" data-new-project-event>Criar evento</button>' : '');
    else html += '<div class="rows">' + evs.map(function (e) {
      const d = U.parse(e.date);
      return '<button class="row-item row-btn" data-project-event="' + U.esc(e.id) + '">' +
        '<span class="date-chip"><b>' + U.pad(d.getDate()) + '</b><small>' + U.monthLabel(e.date.slice(0, 7), true).split('/')[0] + '</small></span>' +
        '<span class="row-main"><b>' + U.esc(e.title) + '</b><small>' + U.esc([e.time, e.category, e.location].filter(Boolean).join(' · ') || 'Dia inteiro') + (e.recurrence && e.recurrence !== 'none' ? ' · recorrente' : '') + '</small></span>' +
        (e.done ? UI.badge('Concluído', 'ok') : '') +
      '</button>';
    }).join('') + '</div></div>';
    return html;
  }

  function financeTab(p) {
    const s = L.projectStats(p);
    const canEdit = L.canEdit(p);
    const memberBars = s.perMember.map(function (x, i) {
      return { label: x.member.name, value: x.paid, color: U.PROJECT_COLORS[i % U.PROJECT_COLORS.length] };
    });
    let html = '<div class="stat-chips">' +
      '<span class="chip ok">Arrecadado ' + U.money(s.raised) + '</span>' +
      '<span class="chip">Gasto ' + U.money(s.spent) + '</span>' +
      '<span class="chip ' + (s.balance < 0 ? 'warn' : '') + '">Saldo ' + U.money(s.balance) + '</span>' +
      (s.pendingIn ? '<span class="chip warn">A receber ' + U.money(s.pendingIn) + '</span>' : '') +
      (s.pendingOut ? '<span class="chip warn">A pagar ' + U.money(s.pendingOut) + '</span>' : '') +
    '</div>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Contribuição por participante</h3><button class="link" data-toggle-pct>' + (state.showPct ? 'Valores' : 'Percentual') + '</button></div>' +
        Charts.hBars(memberBars, { pct: state.showPct, total: s.raised, format: state.showPct ? function (v) { return Math.round(U.pct(v, s.raised)) + '%'; } : null }) +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Despesas por categoria</h3></div>' +
        Charts.hBars(s.categories.map(function (c, i) { return { label: c.category, value: c.value, color: L.categoryColor(i) }; }), {}) +
      '</section>' +
    '</div>';

    const entries = (p.finance || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    html += '<section class="card"><div class="card-head"><h3>Lançamentos do projeto</h3><div class="head-actions">' +
      (canEdit ? '<button class="btn small ghost" data-new-entry="expense">' + U.icon('arrowDown', 14) + 'Despesa</button><button class="btn small primary" data-new-entry="contribution">' + U.icon('plus', 14) + 'Aporte</button>' : '') +
    '</div></div>';
    if (!entries.length) html += UI.empty('wallet', 'Nada lançado', 'Registre os aportes e as despesas do grupo.', canEdit ? '<button class="btn small ghost" data-new-entry="contribution">Novo aporte</button>' : '');
    else {
      html += '<div class="tx-table project-tx"><div class="tx-head"><span>Data</span><span>Descrição</span><span>Participante</span><span>Categoria</span><span>Situação</span><span class="ta-r">Valor</span></div>';
      entries.forEach(function (e) {
        const m = p.members.find(function (x) { return x.id === e.memberId; });
        html += '<div class="tx-row" data-edit-entry="' + U.esc(e.id) + '">' +
          '<span class="tx-date">' + U.fmtDate(e.date) + '</span>' +
          '<span class="tx-name"><span class="tx-dot ' + (e.type === 'contribution' ? 'income' : 'expense') + '"></span><b>' + U.esc(e.name) + '</b></span>' +
          '<span>' + U.esc(m ? m.name : '—') + '</span>' +
          '<span class="tx-cat">' + U.esc(e.category || '—') + '</span>' +
          '<span>' + UI.statusBadge(e.status) + '</span>' +
          '<span class="tx-val ' + (e.type === 'contribution' ? 'text-green' : '') + '">' + (e.type === 'contribution' ? '+' : '−') + U.money(e.amount) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '</section>';
    return html;
  }

  function tasksTab(p) {
    const canEdit = L.canEdit(p);
    const tasks = (p.tasks || []).slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.due || '9999').localeCompare(b.due || '9999');
    });
    let html = '<section class="card"><div class="card-head"><h3>Tarefas do projeto</h3>' + (canEdit ? '<button class="btn small primary" data-new-project-task>' + U.icon('plus', 14) + 'Tarefa</button>' : '') + '</div>';
    if (!tasks.length) html += UI.empty('check', 'Nenhuma tarefa', 'Divida o trabalho entre o grupo.', canEdit ? '<button class="btn small ghost" data-new-project-task>Criar tarefa</button>' : '');
    else html += '<div class="task-list">' + tasks.map(function (t) {
      const late = t.due && t.due < U.today() && !t.done;
      return '<div class="task-row' + (t.done ? ' done' : '') + '">' +
        '<button class="task-check' + (t.done ? ' on' : '') + '" data-toggle-project-task="' + U.esc(t.id) + '">' + (t.done ? U.icon('check', 13) : '') + '</button>' +
        '<button class="task-main" data-project-task="' + U.esc(t.id) + '"><b>' + U.esc(t.title) + '</b><small>' + (t.due ? '<span class="' + (late ? 'text-danger' : '') + '">' + U.fmtDate(t.due) + '</span>' : 'Sem prazo') + '</small></button>' +
        UI.badge(t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa', t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warn' : '') +
      '</div>';
    }).join('') + '</div></section>';
    return html;
  }

  function membersTab(p) {
    const canManage = L.canManage(p);
    let html = '<section class="card"><div class="card-head"><h3>Participantes</h3>' + (canManage ? '<button class="btn small primary" data-new-member>' + U.icon('plus', 14) + 'Adicionar</button>' : '') + '</div>';
    if (!canManage) html += '<p class="muted small">Somente administradores editam participantes. As permissões também valem para o que cada pessoa pode alterar no arquivo compartilhado.</p>';
    html += '<div class="member-table">' + p.members.map(function (m, i) {
      const paid = U.sum((p.finance || []).filter(function (f) { return f.type === 'contribution' && f.memberId === m.id && f.status !== 'pending'; }), function (f) { return f.amount; });
      return '<div class="member-row">' +
        '<span class="avatar sm" style="background:' + U.esc(U.PROJECT_COLORS[i % U.PROJECT_COLORS.length]) + ';color:#fff">' + U.esc(U.initials(m.name)) + '</span>' +
        '<span class="row-main"><b>' + U.esc(m.name) + '</b><small>' + (m.profileId === DB.data.profile.id ? 'Você · ' : '') + 'contribuiu com ' + U.money(paid) + '</small></span>' +
        roleBadge(m.role) +
        (canManage ? '<button class="icon-btn small" data-edit-member="' + U.esc(m.id) + '">' + U.icon('edit', 15) + '</button>' : '') +
      '</div>';
    }).join('') + '</div></section>';
    html += '<div class="note">' + U.icon('info', 16) + '<span>As permissões são um acordo de uso. Como cada pessoa tem uma cópia local, o Agendex aplica as regras na interface e na exportação.</span></div>';
    return html;
  }

  function versionsTab(p) {
    const versions = (p.versions || []).slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    const latest = {};
    versions.forEach(function (v) {
      const key = v.authorId || v.authorName || '?';
      if (!latest[key] || (latest[key].at || 0) < (v.at || 0)) latest[key] = v;
    });
    const latestList = Object.keys(latest).map(function (k) { return latest[k]; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); });

    let html = '<div class="share-intro">' +
      '<div><h3>Compartilhamento por arquivo</h3><p>Não existe sincronização automática. Cada pessoa exporta a própria versão, envia para o grupo e importa as versões recebidas aqui.</p></div>' +
      '<div class="share-actions"><button class="btn ghost" data-export-version>' + U.icon('download', 15) + 'Exportar minha versão</button><button class="btn primary" data-import-version>' + U.icon('upload', 15) + 'Importar versão</button></div>' +
    '</div>';

    html += '<ol class="steps"><li><b>Exporte</b> e envie o arquivo para os participantes.</li><li><b>Cada pessoa importa</b>, altera a própria cópia e exporta de novo.</li><li><b>Você importa</b> as versões recebidas nesta aba. O Agendex compara antes de aplicar.</li></ol>';

    html += '<section class="card"><div class="card-head"><h3>Última versão por participante</h3><span class="muted small">' + versions.length + ' pacote(s) registrado(s)</span></div>';
    if (!latestList.length) html += '<p class="muted small">Nenhuma versão ainda. Exporte a primeira para começar.</p>';
    else html += '<div class="tx-table versions"><div class="tx-head"><span>Participante</span><span>Versão</span><span>Data</span><span>Situação</span><span>Registros</span></div>' +
      latestList.map(function (v) {
        const isMine = v.authorId === DB.data.profile.id;
        return '<div class="tx-row">' +
          '<span><b>' + U.esc(isMine ? 'Você' : v.authorName || '—') + '</b></span>' +
          '<span>v' + U.esc(v.version || 1) + '</span>' +
          '<span class="tx-date">' + U.fmtDateTime(v.at) + '</span>' +
          '<span>' + (v.direction === 'import' ? UI.badge('Importada', 'ok') : UI.badge('Sua exportação', '')) + (v.conflicts ? ' ' + UI.badge(v.conflicts + ' conflito(s)', 'warn') : '') + '</span>' +
          '<span class="muted small">' + ((v.summary && (v.summary.tasks + v.summary.events + v.summary.finance)) || 0) + ' registro(s)</span>' +
        '</div>';
      }).join('') + '</div>';
    html += '</section>';

    if (versions.length) {
      html += '<details class="card history-details"><summary>Histórico completo de versões</summary><div class="tx-table versions"><div class="tx-head"><span>Participante</span><span>Versão</span><span>Data</span><span>Direção</span><span>Registros</span></div>' +
        versions.map(function (v) {
          return '<div class="tx-row"><span>' + U.esc(v.authorId === DB.data.profile.id ? 'Você' : v.authorName || '—') + '</span><span>v' + U.esc(v.version || 1) + '</span><span class="tx-date">' + U.fmtDateTime(v.at) + '</span><span>' + (v.direction === 'import' ? 'Recebida' : 'Exportada') + '</span><span class="muted small">' + ((v.summary && (v.summary.tasks + v.summary.events + v.summary.finance)) || 0) + '</span></div>';
        }).join('') + '</div></details>';
    }

    html += '<div class="note warn">' + U.icon('alert', 16) + '<span>O compartilhamento é manual, não simultâneo. Se duas pessoas alterarem o mesmo registro, a importação mostra o conflito e você escolhe o que manter.</span></div>';
    return html;
  }

  function historyTab(p) {
    const hist = p.history || [];
    if (!hist.length) return '<section class="card">' + UI.empty('clock', 'Sem histórico', 'As ações do projeto aparecem aqui.', '') + '</section>';
    return '<section class="card"><div class="card-head"><h3>Histórico do projeto</h3></div><div class="timeline">' + hist.map(function (h) {
      return '<div class="timeline-item static"><span class="timeline-time">' + U.fmtDateTime(h.at) + '</span><span class="timeline-dot"></span><span class="row-main"><b>' + U.esc(h.action) + '</b><small>' + U.esc(h.author) + '</small></span></div>';
    }).join('') + '</div></section>';
  }

  V.renderDetail = function (root, id) {
    const p = projectById(id);
    if (!p) {
      root.innerHTML = '<div class="page">' + UI.empty('folder', 'Projeto não encontrado', 'Ele pode ter sido excluído.', '<button class="btn small ghost" data-back>Voltar aos projetos</button>') + '</div>';
      const b = root.querySelector('[data-back]');
      if (b) b.addEventListener('click', function () { Agendex.App.go('#/projects'); });
      return;
    }
    shape(p);
    if (state.projectId !== id) { state.projectId = id; state.tab = 'overview'; }
    const canEdit = L.canEdit(p);
    const tabs = detailTabs();

    let html = '<div class="page project-page">';
    html += '<button class="back-link" data-back>' + U.icon('chevronLeft', 15) + 'Projetos</button>';
    html += '<div class="project-header">' +
      '<div class="project-title"><span class="project-dot big" style="background:' + U.esc(p.color) + '"></span><div><h2>' + U.esc(p.name) + '</h2><p class="muted small">' + U.esc([p.category, p.members.length + ' participante(s)', p.end ? 'até ' + U.fmtDate(p.end) : ''].filter(Boolean).join(' · ')) + '</p></div></div>' +
      '<div class="header-actions">' +
        '<button class="btn ghost small" data-export-version>' + U.icon('download', 15) + 'Exportar</button>' +
        '<button class="btn ghost small" data-import-version>' + U.icon('upload', 15) + 'Importar</button>' +
        '<button class="btn small" data-edit-project>' + U.icon('edit', 15) + 'Editar</button>' +
      '</div>' +
    '</div>';

    if (!canEdit) html += '<div class="note warn">' + U.icon('lock', 16) + '<span>Você está como visualizador neste projeto. A edição está desativada.</span></div>';

    html += '<div class="tabs">' + tabs.map(function (t) {
      return '<button data-dtab="' + t[0] + '" class="' + (state.tab === t[0] ? 'active' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div>';

    if (state.tab === 'overview') html += overviewTab(p);
    else if (state.tab === 'agenda') html += agendaTab(p);
    else if (state.tab === 'finance') html += financeTab(p);
    else if (state.tab === 'tasks') html += tasksTab(p);
    else if (state.tab === 'members') html += membersTab(p);
    else if (state.tab === 'versions') html += versionsTab(p);
    else html += historyTab(p);

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('[data-back]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.go('#/projects'); });
    });
    root.querySelectorAll('[data-dtab]').forEach(function (el) {
      el.addEventListener('click', function () { state.tab = el.getAttribute('data-dtab'); V.renderDetail(root, id); });
    });
    root.querySelectorAll('[data-go-tab]').forEach(function (el) {
      el.addEventListener('click', function () { state.tab = el.getAttribute('data-go-tab'); V.renderDetail(root, id); });
    });
    root.querySelectorAll('[data-edit-project]').forEach(function (el) {
      el.addEventListener('click', function () { openProject(id); });
    });
    root.querySelectorAll('[data-export-version]').forEach(function (el) {
      el.addEventListener('click', function () { Share.exportProject(p); Agendex.App.refresh(); });
    });
    root.querySelectorAll('[data-import-version]').forEach(function (el) {
      el.addEventListener('click', function () { Share.importFlow(); });
    });
    const newEv = root.querySelector('[data-new-project-event]');
    if (newEv) newEv.addEventListener('click', function () { Agendex.Views.agenda.openEvent(null, { projectId: id, date: U.today() }); });
    root.querySelectorAll('[data-project-event]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.Views.agenda.openEvent(el.getAttribute('data-project-event')); });
    });
    const newTask = root.querySelector('[data-new-project-task]');
    if (newTask) newTask.addEventListener('click', function () { Agendex.Views.agenda.openTask(null, { projectId: id }); });
    root.querySelectorAll('[data-toggle-project-task]').forEach(function (el) {
      el.addEventListener('click', function () { toggleProjectTask(id, el.getAttribute('data-toggle-project-task')); });
    });
    root.querySelectorAll('[data-project-task]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.Views.agenda.openTask(el.getAttribute('data-project-task')); });
    });
    root.querySelectorAll('[data-new-entry]').forEach(function (el) {
      el.addEventListener('click', function () { openEntry(id, null, el.getAttribute('data-new-entry')); });
    });
    root.querySelectorAll('[data-edit-entry]').forEach(function (el) {
      el.addEventListener('click', function () { openEntry(id, el.getAttribute('data-edit-entry')); });
    });
    const pctBtn = root.querySelector('[data-toggle-pct]');
    if (pctBtn) pctBtn.addEventListener('click', function () { state.showPct = !state.showPct; V.renderDetail(root, id); });
    const addMember = root.querySelector('[data-new-member]');
    if (addMember) addMember.addEventListener('click', function () { openMember(id); });
    root.querySelectorAll('[data-edit-member]').forEach(function (el) {
      el.addEventListener('click', function () { openMember(id, el.getAttribute('data-edit-member')); });
    });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.projects = V;
  V.openProject = openProject;
})();
