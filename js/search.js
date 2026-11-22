/* Agendex — pesquisa global */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const L = Agendex.Logic;
  const UI = Agendex.UI;
  const S = {};

  function collect(q) {
    const n = U.norm(q);
    const out = [];
    function add(type, icon, title, sub, action) {
      out.push({ type: type, icon: icon, title: title, sub: sub, action: action });
    }
    L.allEvents().forEach(function (e) {
      if (!n || U.norm([e.title, e.category, e.location, e.notes, e.participants].join(' ')).indexOf(n) >= 0) {
        add('Evento', 'calendar', e.title, [U.fmtDate(e.date), e.time, e.category].filter(Boolean).join(' · '), function () { Agendex.Views.agenda.openEvent(e.id); });
      }
    });
    L.allTasks().forEach(function (t) {
      if (!n || U.norm([t.title, t.category, t.notes].join(' ')).indexOf(n) >= 0) {
        add('Tarefa', 'check', t.title, [t.due ? U.fmtDate(t.due) : 'sem prazo', t.category].filter(Boolean).join(' · '), function () { Agendex.Views.agenda.openTask(t.id); });
      }
    });
    (DB.data.transactions || []).forEach(function (t) {
      if (!n || U.norm([t.name, t.category, t.notes].join(' ')).indexOf(n) >= 0) {
        add(t.type === 'income' ? 'Receita' : t.type === 'transfer' ? 'Transferência' : 'Despesa', 'wallet', t.name, [U.fmtDate(t.date), U.money(t.amount), t.category].filter(Boolean).join(' · '), function () { Agendex.Views.finance.openTransaction(t.id); });
      }
    });
    (DB.data.projects || []).forEach(function (p) {
      if (!n || U.norm([p.name, p.description, p.category].join(' ')).indexOf(n) >= 0) {
        add('Projeto', 'folder', p.name, [p.category, (p.members || []).length + ' participante(s)'].filter(Boolean).join(' · '), function () { Agendex.App.go('#/project/' + p.id); });
      }
      (p.finance || []).forEach(function (f) {
        if (!n || U.norm([f.name, f.category, f.notes].join(' ')).indexOf(n) >= 0) {
          add('Projeto · ' + (f.type === 'contribution' ? 'aporte' : 'despesa'), 'users', f.name, [p.name, U.fmtDate(f.date), U.money(f.amount)].join(' · '), function () { Agendex.App.go('#/project/' + p.id); });
        }
      });
      (p.members || []).forEach(function (m) {
        if (n && U.norm(m.name).indexOf(n) >= 0) {
          add('Participante', 'users', m.name, p.name + ' · ' + (m.role || ''), function () { Agendex.App.go('#/project/' + p.id); });
        }
      });
    });
    (DB.data.goals || []).forEach(function (g) {
      if (!n || U.norm(g.name).indexOf(n) >= 0) {
        add('Meta', 'target', g.name, U.money(L.goalSaved(g)) + ' de ' + U.money(g.target), function () { Agendex.Views.finance.openGoal(g.id); });
      }
    });
    (DB.data.accounts || []).forEach(function (a) {
      if (n && U.norm(a.name).indexOf(n) >= 0) {
        add('Conta', 'wallet', a.name, U.money(L.accountBalance(a)), function () { Agendex.Views.finance.openAccount(a.id); });
      }
    });
    return out.slice(0, 40);
  }

  function resultsHTML(list, q) {
    if (!q) {
      return '<div class="search-hint"><p class="muted small">Pesquise por eventos, tarefas, lançamentos, projetos, participantes e metas.</p><div class="search-suggestions">' +
        ['mercado', 'reunião', 'viagem', 'salário'].map(function (s) { return '<button class="chip" data-q="' + s + '">' + s + '</button>'; }).join('') +
      '</div></div>';
    }
    if (!list.length) return '<p class="muted small" style="padding:14px 4px">Nada encontrado para “' + U.esc(q) + '”.</p>';
    return '<div class="search-results">' + list.map(function (r, i) {
      return '<button class="search-result" data-idx="' + i + '">' +
        '<span class="row-icon">' + U.icon(r.icon, 16) + '</span>' +
        '<span class="row-main"><b>' + U.esc(r.title) + '</b><small>' + U.esc(r.sub || '') + '</small></span>' +
        '<span class="badge">' + U.esc(r.type) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  S.open = function (initial) {
    let list = [];
    UI.modal({
      title: 'Pesquisar',
      subtitle: 'Em todos os seus dados locais',
      width: 620,
      body: '<div class="search-modal"><div class="search-input-wrap">' + U.icon('search', 18) + '<input class="search-input" id="gs-input" placeholder="Digite para buscar…" value="' + U.esc(initial || '') + '" autocomplete="off"></div><div id="gs-results"></div></div>',
      onMount: function (modal) {
        const input = modal.querySelector('#gs-input');
        const box = modal.querySelector('#gs-results');
        function update() {
          list = collect(input.value);
          box.innerHTML = resultsHTML(list, input.value.trim());
          box.querySelectorAll('[data-idx]').forEach(function (el) {
            el.addEventListener('click', function () {
              const item = list[Number(el.getAttribute('data-idx'))];
              UI.close();
              if (item) setTimeout(item.action, 40);
            });
          });
          box.querySelectorAll('[data-q]').forEach(function (el) {
            el.addEventListener('click', function () { input.value = el.getAttribute('data-q'); update(); input.focus(); });
          });
        }
        input.addEventListener('input', update);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && list.length) {
            e.preventDefault();
            const item = list[0];
            UI.close();
            setTimeout(item.action, 40);
          }
        });
        update();
        setTimeout(function () { input.focus(); input.select(); }, 50);
      }
    });
  };

  window.Agendex.Search = S;
})();
