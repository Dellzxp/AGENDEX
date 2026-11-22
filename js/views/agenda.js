/* Agendex — agenda e tarefas */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const V = {};

  const state = { tab: 'events', view: 'month', cursor: U.today(), taskFilter: 'open' };

  function catColor(cat) {
    const i = (DB.data.categories.event || []).indexOf(cat);
    return L.categoryColor(i < 0 ? 0 : i);
  }

  function projectOptions(selected) {
    return [{ value: '', label: 'Sem projeto' }].concat(DB.data.projects.map(function (p) {
      return { value: p.id, label: p.name };
    }));
  }

  V.openEvent = function (id, opts) {
    opts = opts || {};
    const found = id ? L.findEvent(id) : null;
    const ev = found ? found.ev : null;
    const oldProject = found ? found.project : null;
    const isNew = !ev;
    const date = opts.date || (ev ? ev.date : U.today());
    const recurring = ev && ev.recurrence && ev.recurrence !== 'none';
    const doneVal = ev ? (recurring && opts.occDate ? L.isOccDone(ev, opts.occDate) : !!ev.done) : false;
    const projects = DB.data.projects.map(function (p) { return { value: p.id, label: p.name }; });
    const fields = [
      { name: 'title', label: 'Nome do evento', required: true, full: true, value: ev ? ev.title : '', placeholder: 'Ex.: Reunião de equipe' },
      { name: 'date', label: 'Data', type: 'date', required: true, value: date },
      { name: 'time', label: 'Horário', type: 'time', value: ev ? ev.time || '' : '' },
      { name: 'duration', label: 'Duração (min)', type: 'number', min: 0, value: ev ? ev.duration || '' : '' },
      { name: 'category', label: 'Categoria', type: 'select', options: DB.data.categories.event, value: ev ? ev.category : DB.data.categories.event[0] },
      { name: 'projectId', label: 'Projeto', type: 'select', options: [{ value: '', label: 'Sem projeto' }].concat(projects), value: ev ? ev.projectId || '' : (opts.projectId || '') },
      { name: 'location', label: 'Local', value: ev ? ev.location || '' : '', placeholder: 'Opcional' },
      { name: 'participants', label: 'Participantes', value: ev ? ev.participants || '' : '', placeholder: 'Separe por vírgula' },
      { name: 'costPlanned', label: 'Custo previsto', type: 'number', min: 0, value: ev ? ev.costPlanned || '' : '' },
      { name: 'reminder', label: 'Lembrete', type: 'select', options: [{ value: 'none', label: 'Sem lembrete' }, { value: '10m', label: '10 minutos antes' }, { value: '1h', label: '1 hora antes' }, { value: '1d', label: '1 dia antes' }, { value: '1w', label: '1 semana antes' }], value: ev ? ev.reminder || 'none' : 'none' },
      { name: 'recurrence', label: 'Recorrência', type: 'select', options: [{ value: 'none', label: 'Não repete' }, { value: 'daily', label: 'Diariamente' }, { value: 'weekly', label: 'Semanalmente' }, { value: 'monthly', label: 'Mensalmente' }, { value: 'yearly', label: 'Anualmente' }], value: ev ? ev.recurrence || 'none' : 'none' },
      { name: 'notes', label: 'Observações', type: 'textarea', full: true, value: ev ? ev.notes || '' : '' },
      { name: 'done', label: 'Concluído', type: 'checkbox', value: doneVal },
      { name: 'makeExpense', label: 'Lançar custo previsto como despesa pendente', type: 'checkbox', value: false, hint: 'Cria uma conta a pagar no financeiro com a data do evento.' }
    ];

    UI.form({
      title: isNew ? 'Novo evento' : 'Editar evento',
      subtitle: opts.occDate && recurring ? 'Ocorrência de ' + U.fmtDate(opts.occDate) + ' de um evento recorrente' : '',
      fields: fields,
      submitLabel: isNew ? 'Criar evento' : 'Salvar',
      dangerAction: ev ? {
        label: 'Excluir evento',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir evento', message: 'Excluir "' + ev.title + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          if (oldProject) {
            oldProject.events = (oldProject.events || []).filter(function (e) { return e.id !== ev.id; });
            oldProject.updatedAt = Date.now();
          } else {
            DB.data.events = DB.data.events.filter(function (e) { return e.id !== ev.id; });
          }
          DB.save(true);
          UI.toast('Evento excluído');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let target = ev;
        const targetProject = v.projectId ? L.projectOf(v.projectId) : null;
        if (!target) {
          target = { id: U.uid(), createdAt: now, doneDates: [], updatedAt: now, updatedBy: DB.data.profile.id };
          if (targetProject) {
            targetProject.events = targetProject.events || [];
            targetProject.events.push(target);
            targetProject.updatedAt = now;
          } else {
            DB.data.events.push(target);
          }
        } else {
          const wasProject = oldProject ? oldProject.id : '';
          const willProject = targetProject ? targetProject.id : '';
          if (wasProject !== willProject) {
            if (oldProject) {
              oldProject.events = (oldProject.events || []).filter(function (e) { return e.id !== target.id; });
              oldProject.updatedAt = now;
            } else {
              DB.data.events = DB.data.events.filter(function (e) { return e.id !== target.id; });
            }
            if (targetProject) {
              targetProject.events = targetProject.events || [];
              targetProject.events.push(target);
              targetProject.updatedAt = now;
            } else {
              DB.data.events.push(target);
            }
          } else if (targetProject) {
            targetProject.updatedAt = now;
          }
        }
        target.title = v.title.trim();
        target.date = v.date;
        target.time = v.time;
        target.duration = Number(v.duration) || 0;
        target.category = v.category;
        target.projectId = v.projectId || '';
        target.location = v.location || '';
        target.participants = v.participants || '';
        target.costPlanned = Number(v.costPlanned) || 0;
        target.reminder = v.reminder;
        target.recurrence = v.recurrence;
        target.notes = v.notes || '';
        target.updatedAt = now;
        target.updatedBy = DB.data.profile.id;
        if (target.recurrence && target.recurrence !== 'none' && opts.occDate) {
          target.doneDates = target.doneDates || [];
          if (v.done) { if (target.doneDates.indexOf(opts.occDate) < 0) target.doneDates.push(opts.occDate); }
          else target.doneDates = target.doneDates.filter(function (d) { return d !== opts.occDate; });
        } else {
          target.done = !!v.done;
        }
        if (v.makeExpense && target.costPlanned > 0 && !target.expenseId) {
          const acc = DB.data.accounts.find(function (a) { return a.type !== 'credit'; });
          const tx = {
            id: U.uid(), type: 'expense', name: target.title, amount: target.costPlanned,
            date: target.date, category: 'Outros', accountId: acc ? acc.id : '', status: 'pending',
            notes: 'Gerado pelo evento "' + target.title + '"', recurrence: 'none',
            updatedAt: now, updatedBy: DB.data.profile.id
          };
          DB.data.transactions.push(tx);
          target.expenseId = tx.id;
        }
        DB.save(true);
        UI.toast(isNew ? 'Evento criado' : 'Evento atualizado');
        Agendex.App.refresh();
      }
    });
  };

  V.openTask = function (id, opts) {
    opts = opts || {};
    const found = id ? L.findTask(id) : null;
    const task = found ? found.task : null;
    const oldProject = found ? found.project : null;
    const isNew = !task;
    const projects = DB.data.projects.map(function (p) { return { value: p.id, label: p.name }; });
    const cats = ['Pessoal', 'Trabalho', 'Estudo', 'Casa', 'Finanças', 'Saúde', 'Outros'];
    UI.form({
      title: isNew ? 'Nova tarefa' : 'Editar tarefa',
      fields: [
        { name: 'title', label: 'Tarefa', required: true, full: true, value: task ? task.title : '', placeholder: 'Ex.: Pagar conta de luz' },
        { name: 'due', label: 'Prazo', type: 'date', value: task ? task.due || '' : (opts.due || '') },
        { name: 'priority', label: 'Prioridade', type: 'select', options: [{ value: 'low', label: 'Baixa' }, { value: 'medium', label: 'Média' }, { value: 'high', label: 'Alta' }], value: task ? task.priority : 'medium' },
        { name: 'category', label: 'Categoria', type: 'select', options: cats, value: task ? task.category : 'Pessoal' },
        { name: 'projectId', label: 'Projeto', type: 'select', options: [{ value: '', label: 'Sem projeto' }].concat(projects), value: task ? task.projectId || '' : (opts.projectId || '') },
        { name: 'notes', label: 'Observações', type: 'textarea', full: true, value: task ? task.notes || '' : '' },
        { name: 'done', label: 'Concluída', type: 'checkbox', value: task ? !!task.done : false }
      ],
      submitLabel: isNew ? 'Criar tarefa' : 'Salvar',
      dangerAction: task ? {
        label: 'Excluir tarefa',
        onClick: async function () {
          const ok = await UI.confirm({ title: 'Excluir tarefa', message: 'Excluir "' + task.title + '"?', danger: true, confirmLabel: 'Excluir' });
          if (!ok) return;
          if (oldProject) {
            oldProject.tasks = (oldProject.tasks || []).filter(function (t) { return t.id !== task.id; });
            oldProject.updatedAt = Date.now();
          } else {
            DB.data.tasks = DB.data.tasks.filter(function (t) { return t.id !== task.id; });
          }
          DB.save(true);
          UI.toast('Tarefa excluída');
          Agendex.App.refresh();
        }
      } : null,
      onSubmit: function (v) {
        const now = Date.now();
        let t = task;
        const targetProject = v.projectId ? L.projectOf(v.projectId) : null;
        if (!t) {
          t = { id: U.uid(), createdAt: now, updatedAt: now, updatedBy: DB.data.profile.id };
          if (targetProject) {
            targetProject.tasks = targetProject.tasks || [];
            targetProject.tasks.push(t);
            targetProject.updatedAt = now;
          } else {
            DB.data.tasks.push(t);
          }
        } else {
          const wasProject = oldProject ? oldProject.id : '';
          const willProject = targetProject ? targetProject.id : '';
          if (wasProject !== willProject) {
            if (oldProject) {
              oldProject.tasks = (oldProject.tasks || []).filter(function (x) { return x.id !== t.id; });
              oldProject.updatedAt = now;
            } else {
              DB.data.tasks = DB.data.tasks.filter(function (x) { return x.id !== t.id; });
            }
            if (targetProject) {
              targetProject.tasks = targetProject.tasks || [];
              targetProject.tasks.push(t);
              targetProject.updatedAt = now;
            } else {
              DB.data.tasks.push(t);
            }
          } else if (targetProject) {
            targetProject.updatedAt = now;
          }
        }
        t.title = v.title.trim();
        t.due = v.due;
        t.priority = v.priority;
        t.category = v.category;
        t.projectId = v.projectId || '';
        t.notes = v.notes || '';
        t.done = !!v.done;
        t.updatedAt = now;
        t.updatedBy = DB.data.profile.id;
        DB.save(true);
        UI.toast(isNew ? 'Tarefa criada' : 'Tarefa atualizada');
        Agendex.App.refresh();
      }
    });
  };

  function toggleTask(id) {
    const found = L.findTask(id);
    if (!found) return;
    const t = found.task;
    t.done = !t.done;
    t.updatedAt = Date.now();
    t.updatedBy = DB.data.profile.id;
    if (found.project) found.project.updatedAt = Date.now();
    DB.save();
    Agendex.App.refresh();
  }

  function weekStart(iso) {
    const d = U.parse(iso);
    const fd = Number(DB.data.settings.firstDay) || 0;
    const diff = (d.getDay() - fd + 7) % 7;
    return U.addDays(iso, -diff);
  }

  function shift(dir) {
    if (state.view === 'month') state.cursor = U.addMonths(state.cursor, dir);
    else if (state.view === 'week') state.cursor = U.addDays(state.cursor, dir * 7);
    else state.cursor = U.addDays(state.cursor, dir);
  }

  function monthTitle() {
    return U.monthLabel(U.monthKey(state.cursor));
  }

  function chip(o) {
    const ev = o.ev;
    const color = ev.projectId ? ((L.projectOf(ev.projectId) || {}).color || 'var(--accent)') : catColor(ev.category);
    return '<button class="cal-chip' + (o.done ? ' done' : '') + '" style="--chip:' + U.esc(color) + '" data-event="' + U.esc(ev.id) + '" data-occ="' + U.esc(o.date) + '" title="' + U.esc(ev.title + (ev.time ? ' · ' + ev.time : '')) + '">' +
      (ev.time ? '<span class="chip-time">' + U.esc(ev.time) + '</span>' : '') +
      '<span class="chip-title">' + U.esc(ev.title) + '</span>' +
    '</button>';
  }

  function renderMonth() {
    const firstDay = Number(DB.data.settings.firstDay) || 0;
    const first = U.monthKey(state.cursor) + '-01';
    const offset = (U.parse(first).getDay() - firstDay + 7) % 7;
    const gridStart = U.addDays(first, -offset);
    const days = [];
    for (let i = 0; i < 42; i++) days.push(U.addDays(gridStart, i));
    const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heads = [];
    for (let i = 0; i < 7; i++) heads.push(weekLabels[(firstDay + i) % 7]);
    const month = U.monthKey(state.cursor);
    const today = U.today();

    let html = '<div class="cal-week-head">' + heads.map(function (h) { return '<span>' + h + '</span>'; }).join('') + '</div><div class="cal-grid">';
    days.forEach(function (d) {
      const list = L.eventsBetween(d, d);
      const tasks = L.allTasks().filter(function (t) { return t.due === d && !t.done; });
      const out = U.monthKey(d) !== month;
      html += '<div class="cal-cell' + (out ? ' out' : '') + (d === today ? ' today' : '') + '" data-day="' + d + '">' +
        '<div class="cal-day-head"><button class="cal-day" data-day-view="' + d + '">' + U.parse(d).getDate() + '</button>' +
          '<button class="day-add" data-add-day="' + d + '" title="Novo evento em ' + U.fmtDate(d) + '">' + U.icon('plus', 13) + '</button>' +
        '</div>' +
        '<div class="cal-events">' + list.slice(0, 3).map(chip).join('') +
          (list.length > 3 ? '<span class="cal-more">+' + (list.length - 3) + '</span>' : '') +
        '</div>' +
        (tasks.length ? '<div class="cal-tasks">' + tasks.length + ' tarefa' + (tasks.length > 1 ? 's' : '') + '</div>' : '') +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderWeek() {
    const start = weekStart(state.cursor);
    let html = '<div class="week-grid">';
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(start, i);
      const list = L.eventsBetween(d, d);
      const tasks = L.allTasks().filter(function (t) { return t.due === d && !t.done; });
      const isToday = d === U.today();
      html += '<div class="week-col' + (isToday ? ' today' : '') + '">' +
        '<div class="week-head"><span>' + U.fmtDateShort(d) + '</span><button class="day-add" data-add-day="' + d + '">' + U.icon('plus', 13) + '</button></div>' +
        '<div class="week-body">' +
          (list.length ? list.map(function (o) {
            const color = o.ev.projectId ? ((L.projectOf(o.ev.projectId) || {}).color || 'var(--accent)') : catColor(o.ev.category);
            return '<button class="week-event' + (o.done ? ' done' : '') + '" style="--chip:' + U.esc(color) + '" data-event="' + U.esc(o.ev.id) + '" data-occ="' + U.esc(o.date) + '">' +
              '<b>' + U.esc(o.ev.title) + '</b><small>' + U.esc([o.ev.time, o.ev.category].filter(Boolean).join(' · ')) + '</small></button>';
          }).join('') : '<p class="muted tiny">Livre</p>') +
          (tasks.length ? '<div class="week-tasks">' + tasks.length + ' tarefa(s)</div>' : '') +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderDay() {
    const d = state.cursor;
    const list = L.eventsBetween(d, d);
    const tasks = L.allTasks().filter(function (t) { return t.due === d; });
    let html = '<div class="day-view"><div class="day-head"><h3>' + U.fmtDateShort(d) + '</h3><button class="btn small primary" data-add-day="' + d + '">' + U.icon('plus', 14) + 'Evento</button></div>';
    if (!list.length && !tasks.length) html += UI.empty('calendar', 'Dia livre', 'Nenhum evento ou tarefa para esta data.', '');
    if (list.length) {
      html += '<div class="timeline">' + list.map(function (o) {
        return '<button class="timeline-item' + (o.done ? ' done' : '') + '" data-event="' + U.esc(o.ev.id) + '" data-occ="' + U.esc(o.date) + '">' +
          '<span class="timeline-time">' + U.esc(o.ev.time || 'dia') + '</span>' +
          '<span class="timeline-dot" style="background:' + U.esc(o.ev.projectId ? ((L.projectOf(o.ev.projectId) || {}).color || 'var(--accent)') : catColor(o.ev.category)) + '"></span>' +
          '<span class="row-main"><b>' + U.esc(o.ev.title) + '</b><small>' + U.esc([o.ev.category, o.ev.location, o.ev.duration ? o.ev.duration + ' min' : ''].filter(Boolean).join(' · ')) + '</small></span>' +
        '</button>';
      }).join('') + '</div>';
    }
    if (tasks.length) {
      html += '<h4 class="subhead">Tarefas do dia</h4><div class="task-list">' + tasks.map(taskRow).join('') + '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderList() {
    const start = U.today();
    const end = U.addDays(start, 60);
    const list = L.eventsBetween(start, end);
    if (!list.length) return UI.empty('calendar', 'Nada marcado', 'Nenhum compromisso nos próximos 60 dias.', '<button class="btn small ghost" data-new-event>Novo evento</button>');
    const groups = {};
    list.forEach(function (o) { (groups[o.date] = groups[o.date] || []).push(o); });
    return '<div class="agenda-list">' + Object.keys(groups).map(function (d) {
      return '<div class="agenda-day"><div class="agenda-day-head"><b>' + U.fmtDateShort(d) + '</b><small>' + U.fmtDate(d) + '</small></div>' +
        '<div class="rows">' + groups[d].map(function (o) {
          const color = o.ev.projectId ? ((L.projectOf(o.ev.projectId) || {}).color || 'var(--accent)') : catColor(o.ev.category);
          return '<button class="row-item row-btn' + (o.done ? ' done' : '') + '" data-event="' + U.esc(o.ev.id) + '" data-occ="' + U.esc(o.date) + '">' +
            '<span class="time-chip">' + U.esc(o.ev.time || '—') + '</span>' +
            '<span class="row-main"><b>' + U.esc(o.ev.title) + '</b><small>' + U.esc([o.ev.category, o.ev.location].filter(Boolean).join(' · ') || 'Dia inteiro') + '</small></span>' +
            '<span class="dot" style="background:' + U.esc(color) + '"></span>' +
          '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  }

  function taskRow(t) {
    const late = t.due && t.due < U.today() && !t.done;
    const pr = t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa';
    const project = t.projectId ? L.projectOf(t.projectId) : null;
    return '<div class="task-row' + (t.done ? ' done' : '') + '">' +
      '<button class="task-check' + (t.done ? ' on' : '') + '" data-toggle-task="' + U.esc(t.id) + '" aria-label="Concluir">' + (t.done ? U.icon('check', 13) : '') + '</button>' +
      '<button class="task-main" data-task="' + U.esc(t.id) + '">' +
        '<b>' + U.esc(t.title) + '</b>' +
        '<small>' + (t.due ? '<span class="' + (late ? 'text-danger' : '') + '">' + U.fmtDate(t.due) + '</span>' : 'Sem prazo') + ' · ' + U.esc(t.category || 'Geral') + (project ? ' · ' + U.esc(project.name) : '') + '</small>' +
      '</button>' +
      UI.badge(pr, t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warn' : '') +
    '</div>';
  }

  V.render = function (root) {
    let html = '<div class="page">';

    html += '<div class="view-toolbar">' +
      '<div class="segmented">' +
        '<button data-tab="events" class="' + (state.tab === 'events' ? 'active' : '') + '">Eventos</button>' +
        '<button data-tab="tasks" class="' + (state.tab === 'tasks' ? 'active' : '') + '">Tarefas</button>' +
      '</div>';

    if (state.tab === 'events') {
      html += '<div class="toolbar-group">' +
        '<div class="segmented small">' +
          ['month|Mês', 'week|Semana', 'day|Dia', 'list|Lista'].map(function (v) {
            const p = v.split('|');
            return '<button data-view="' + p[0] + '" class="' + (state.view === p[0] ? 'active' : '') + '">' + p[1] + '</button>';
          }).join('') +
        '</div>' +
        (state.view !== 'list' ? '<div class="nav-group"><button class="icon-btn" data-nav="-1" aria-label="Anterior">' + U.icon('chevronLeft', 17) + '</button><button class="btn ghost small" data-today>Hoje</button><button class="icon-btn" data-nav="1" aria-label="Próximo">' + U.icon('chevronRight', 17) + '</button></div>' : '') +
        '<button class="btn primary small" data-new-event>' + U.icon('plus', 15) + 'Evento</button>' +
      '</div>';
    } else {
      html += '<div class="toolbar-group">' +
        '<div class="segmented small">' +
          ['open|Abertas', 'done|Concluídas', 'all|Todas'].map(function (v) {
            const p = v.split('|');
            return '<button data-filter="' + p[0] + '" class="' + (state.taskFilter === p[0] ? 'active' : '') + '">' + p[1] + '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn primary small" data-new-task>' + U.icon('plus', 15) + 'Tarefa</button>' +
      '</div>';
    }
    html += '</div>';

    if (state.tab === 'events') {
      if (state.view === 'month') html += '<div class="cal-title">' + monthTitle() + '</div>' + renderMonth();
      else if (state.view === 'week') {
        const ws = weekStart(state.cursor), we = U.addDays(ws, 6);
        html += '<div class="cal-title">' + U.fmtDate(ws) + ' — ' + U.fmtDate(we) + '</div>' + renderWeek();
      } else if (state.view === 'day') {
        html += renderDay();
      } else {
        html += '<div class="cal-title">Próximos 60 dias</div>' + renderList();
      }
    } else {
      let tasks = L.allTasks();
      if (state.taskFilter === 'open') tasks = tasks.filter(function (t) { return !t.done; });
      if (state.taskFilter === 'done') tasks = tasks.filter(function (t) { return t.done; });
      tasks.sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.due || '9999').localeCompare(b.due || '9999');
      });
      html += '<div class="task-summary muted small">' + L.tasksOpen().length + ' tarefa(s) em aberto · ' + L.tasksOverdue().length + ' atrasada(s)</div>';
      html += tasks.length ? '<div class="task-list">' + tasks.map(taskRow).join('') + '</div>' : UI.empty('check', 'Nada por aqui', 'Nenhuma tarefa neste filtro.', '<button class="btn small ghost" data-new-task>Nova tarefa</button>');
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('[data-tab]').forEach(function (el) {
      el.addEventListener('click', function () { state.tab = el.getAttribute('data-tab'); V.render(root); });
    });
    root.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function () { state.view = el.getAttribute('data-view'); V.render(root); });
    });
    root.querySelectorAll('[data-filter]').forEach(function (el) {
      el.addEventListener('click', function () { state.taskFilter = el.getAttribute('data-filter'); V.render(root); });
    });
    root.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { shift(Number(el.getAttribute('data-nav'))); V.render(root); });
    });
    const todayBtn = root.querySelector('[data-today]');
    if (todayBtn) todayBtn.addEventListener('click', function () { state.cursor = U.today(); V.render(root); });
    const newEvent = root.querySelector('[data-new-event]');
    if (newEvent) newEvent.addEventListener('click', function () { V.openEvent(null, { date: state.view === 'day' ? state.cursor : U.today() }); });
    const newTask = root.querySelector('[data-new-task]');
    if (newTask) newTask.addEventListener('click', function () { V.openTask(); });
    root.querySelectorAll('[data-add-day]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); V.openEvent(null, { date: el.getAttribute('data-add-day') }); });
    });
    root.querySelectorAll('[data-day-view]').forEach(function (el) {
      el.addEventListener('click', function () { state.cursor = el.getAttribute('data-day-view'); state.view = 'day'; V.render(root); });
    });
    root.querySelectorAll('[data-event]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        V.openEvent(el.getAttribute('data-event'), { occDate: el.getAttribute('data-occ') });
      });
    });
    root.querySelectorAll('[data-toggle-task]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); toggleTask(el.getAttribute('data-toggle-task')); });
    });
    root.querySelectorAll('[data-task]').forEach(function (el) {
      el.addEventListener('click', function () { V.openTask(el.getAttribute('data-task')); });
    });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.agenda = V;
})();
