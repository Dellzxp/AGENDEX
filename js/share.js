/* Agendex — pacotes de projeto, comparação e importação */
(function () {
  const U = Agendex.U;
  const UI = Agendex.UI;
  const DB = Agendex.DB;
  const S = {};

  S.KIND_LABEL = { tasks: 'Tarefa', events: 'Evento', finance: 'Lançamento', members: 'Participante' };

  function author() {
    return { id: DB.data.profile.id, name: DB.data.profile.name || 'Sem nome' };
  }

  S.log = function (project, action) {
    project.history = project.history || [];
    project.history.unshift({ at: Date.now(), author: DB.data.profile.name || 'Você', action: action });
    project.history = project.history.slice(0, 150);
  };

  S.buildPackage = function (project) {
    const a = author();
    const pkg = {
      format: 'agendex.project',
      formatVersion: 1,
      packageId: U.uid(),
      createdAt: Date.now(),
      author: a,
      version: project.version || 1,
      project: U.clone(project),
      checksum: ''
    };
    pkg.checksum = U.hash(JSON.stringify(pkg.project));
    return pkg;
  };

  S.exportProject = function (project) {
    const pkg = S.buildPackage(project);
    project.version = (project.version || 1) + 1;
    project.versions = project.versions || [];
    project.versions.unshift({
      packageId: pkg.packageId,
      version: pkg.version,
      authorId: pkg.author.id,
      authorName: pkg.author.name,
      at: pkg.createdAt,
      direction: 'export',
      summary: {
        tasks: (project.tasks || []).length,
        events: (project.events || []).length,
        finance: (project.finance || []).length,
        members: (project.members || []).length
      },
      conflicts: 0
    });
    S.log(project, 'Versão v' + pkg.version + ' exportada');
    DB.save(true);
    const file = 'agendex-' + U.slug(project.name) + '-v' + pkg.version + '-' + U.slug(pkg.author.name) + '.json';
    U.download(file, JSON.stringify(pkg, null, 2));
    UI.toast('Versão v' + pkg.version + ' exportada');
    return pkg;
  };

  S.parsePackage = function (text) {
    let pkg;
    try { pkg = JSON.parse(text); } catch (e) { throw new Error('Arquivo inválido: não é um JSON legível.'); }
    if (!pkg || pkg.format !== 'agendex.project') throw new Error('Este arquivo não é um pacote de projeto do Agendex.');
    if (!pkg.project || !pkg.project.id) throw new Error('O pacote não contém um projeto válido.');
    if (pkg.checksum) {
      const check = U.hash(JSON.stringify(pkg.project));
      if (check !== pkg.checksum) throw new Error('Falha na verificação de integridade. O arquivo pode ter sido alterado ou corrompido.');
    }
    if (!Array.isArray(pkg.project.tasks)) pkg.project.tasks = [];
    if (!Array.isArray(pkg.project.events)) pkg.project.events = [];
    if (!Array.isArray(pkg.project.finance)) pkg.project.finance = [];
    if (!Array.isArray(pkg.project.members)) pkg.project.members = [];
    if (!Array.isArray(pkg.project.versions)) pkg.project.versions = [];
    if (!Array.isArray(pkg.project.history)) pkg.project.history = [];
    if (!Array.isArray(pkg.project.deleted)) pkg.project.deleted = [];
    return pkg;
  };

  function recordLabel(kind, rec) {
    if (!rec) return 'registro';
    if (kind === 'tasks' || kind === 'events') return rec.title || 'sem título';
    if (kind === 'finance') return rec.name || 'lançamento';
    if (kind === 'members') return rec.name || 'participante';
    return 'registro';
  }
  S.recordLabel = recordLabel;

  function diffCollection(kind, localArr, incomingArr, localTomb) {
    const out = { kind: kind, added: [], updated: [], conflicts: [], same: 0, skipped: 0 };
    const map = {};
    (localArr || []).forEach(function (r) { map[r.id] = r; });
    (incomingArr || []).forEach(function (inc) {
      const l = map[inc.id];
      const t = localTomb[kind + ':' + inc.id];
      const incAt = inc.updatedAt || 0;
      if (!l) {
        if (t && (t.at || 0) >= incAt) { out.skipped++; return; }
        out.added.push(inc);
        return;
      }
      const localAt = l.updatedAt || 0;
      if (incAt > localAt) {
        out.updated.push({ incoming: inc, local: l });
      } else if (incAt < localAt) {
        out.conflicts.push({ kind: kind, local: l, incoming: inc, reason: 'sua versão é mais recente' });
      } else if (JSON.stringify(strip(inc)) !== JSON.stringify(strip(l))) {
        out.conflicts.push({ kind: kind, local: l, incoming: inc, reason: 'mesmo horário, conteúdo diferente' });
      } else {
        out.same++;
      }
    });
    return out;
  }

  function strip(r) {
    const c = Object.assign({}, r);
    delete c.updatedAt;
    return c;
  }

  S.diff = function (local, incoming) {
    const localTomb = {};
    (local.deleted || []).forEach(function (t) { localTomb[t.kind + ':' + t.id] = t; });
    const cols = {};
    ['tasks', 'events', 'finance', 'members'].forEach(function (k) {
      cols[k] = diffCollection(k, local[k] || [], incoming[k] || [], localTomb);
    });

    const deletedIncoming = [];
    (incoming.deleted || []).forEach(function (t) {
      const arr = local[t.kind] || [];
      const rec = arr.find(function (r) { return r.id === t.id; });
      if (!rec) return;
      if ((rec.updatedAt || 0) > (t.at || 0)) {
        cols[t.kind].conflicts.push({ kind: t.kind, local: rec, incoming: null, reason: 'excluído na versão recebida, mas você alterou depois' });
      } else {
        deletedIncoming.push({ kind: t.kind, id: t.id, at: t.at, local: rec });
      }
    });

    const metaFields = ['name', 'description', 'color', 'category', 'start', 'end', 'budget', 'ownerId'];
    let meta = { apply: false, conflict: false, local: local, incoming: incoming, changes: [] };
    metaFields.forEach(function (f) {
      if (JSON.stringify(local[f]) !== JSON.stringify(incoming[f])) {
        meta.changes.push({ field: f, local: local[f], incoming: incoming[f] });
      }
    });
    if (meta.changes.length) {
      if ((incoming.updatedAt || 0) > (local.updatedAt || 0)) meta.apply = true;
      else meta.conflict = true;
    }

    const counts = { added: 0, updated: 0, conflicts: 0, deleted: 0 };
    Object.keys(cols).forEach(function (k) {
      counts.added += cols[k].added.length;
      counts.updated += cols[k].updated.length;
      counts.conflicts += cols[k].conflicts.length;
    });
    counts.deleted = deletedIncoming.length;
    counts.conflicts += meta.conflict ? 1 : 0;
    counts.conflicts += deletedIncoming.length;
    return { collections: cols, meta: meta, deletedIncoming: deletedIncoming, counts: counts };
  };

  function mergeTombstones(local, incoming) {
    const map = {};
    (local.deleted || []).concat(incoming.deleted || []).forEach(function (t) {
      const key = t.kind + ':' + t.id;
      if (!map[key] || (map[key].at || 0) < (t.at || 0)) map[key] = t;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).slice(-500);
  }

  S.apply = function (local, pkg, decisions) {
    const incoming = pkg.project;
    const diff = S.diff(local, incoming);
    const out = U.clone(local);
    decisions = decisions || {};

    if (diff.meta.apply || decisions.meta === 'theirs') {
      ['name', 'description', 'color', 'category', 'start', 'end', 'budget', 'ownerId'].forEach(function (f) {
        if (incoming[f] !== undefined) out[f] = incoming[f];
      });
    }

    let applied = 0, conflictsResolved = 0;
    ['tasks', 'events', 'finance', 'members'].forEach(function (kind) {
      const d = diff.collections[kind];
      out[kind] = out[kind] || [];
      const map = {};
      out[kind].forEach(function (r) { map[r.id] = r; });

      d.added.forEach(function (rec) {
        map[rec.id] = U.clone(rec);
        applied++;
      });
      d.updated.forEach(function (u) {
        map[u.incoming.id] = U.clone(u.incoming);
        applied++;
      });
      d.conflicts.forEach(function (c) {
        const key = kind + ':' + c.local.id;
        if (decisions[key] === 'theirs' && c.incoming) {
          map[c.local.id] = U.clone(c.incoming);
          conflictsResolved++;
        } else if (decisions[key] === 'delete') {
          delete map[c.local.id];
          out.deleted = out.deleted || [];
          out.deleted.push({ kind: kind, id: c.local.id, at: Date.now() });
          conflictsResolved++;
        }
      });
      out[kind] = Object.keys(map).map(function (k) { return map[k]; });
    });

    diff.deletedIncoming.forEach(function (d) {
      const key = d.kind + ':' + d.id;
      if (decisions[key] === 'delete') {
        out[d.kind] = (out[d.kind] || []).filter(function (r) { return r.id !== d.id; });
        out.deleted = out.deleted || [];
        out.deleted.push({ kind: d.kind, id: d.id, at: Date.now() });
        conflictsResolved++;
      }
    });

    out.deleted = mergeTombstones(out, incoming);

    const vmap = {};
    (out.versions || []).concat(incoming.versions || []).forEach(function (v) {
      if (!v || !v.packageId) return;
      if (!vmap[v.packageId] || (vmap[v.packageId].at || 0) < (v.at || 0)) vmap[v.packageId] = v;
    });
    out.versions = Object.keys(vmap).map(function (k) { return vmap[k]; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 60);

    const hmap = {};
    (out.history || []).concat(incoming.history || []).forEach(function (h) {
      if (!h) return;
      hmap[(h.at || 0) + '|' + h.action] = h;
    });
    out.history = Object.keys(hmap).map(function (k) { return hmap[k]; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 150);

    out.versions.unshift({
      packageId: pkg.packageId,
      version: pkg.version || 1,
      authorId: pkg.author ? pkg.author.id : '',
      authorName: pkg.author ? pkg.author.name : 'Amigo',
      at: Date.now(),
      direction: 'import',
      summary: {
        tasks: (incoming.tasks || []).length,
        events: (incoming.events || []).length,
        finance: (incoming.finance || []).length,
        members: (incoming.members || []).length
      },
      conflicts: conflictsResolved
    });

    out.appliedPackages = (out.appliedPackages || []).concat([pkg.packageId]).slice(-200);
    out.version = Math.max(out.version || 1, incoming.version || 1);
    out.updatedAt = Date.now();
    out.id = local.id;
    out.createdAt = local.createdAt || Date.now();
    (out.events || []).forEach(function (e) { e.projectId = out.id; });
    (out.tasks || []).forEach(function (t) { t.projectId = out.id; });

    ensureSelfMember(out);
    S.log(out, 'Versão v' + (pkg.version || 1) + ' de ' + (pkg.author ? pkg.author.name : 'amigo') + ' importada' + (conflictsResolved ? ' (' + conflictsResolved + ' conflito(s) resolvido(s))' : ''));
    return { project: out, applied: applied, conflictsResolved: conflictsResolved, diff: diff };
  };

  function ensureSelfMember(project) {
    project.members = project.members || [];
    const me = DB.data.profile;
    let linked = project.members.find(function (m) { return m.profileId && m.profileId === me.id; });
    if (linked) return;
    const byName = project.members.find(function (m) { return !m.profileId && U.norm(m.name) === U.norm(me.name || ''); });
    if (byName && me.name) {
      byName.profileId = me.id;
      byName.updatedAt = Date.now();
      return;
    }
    project.members.push({
      id: U.uid(),
      name: me.name || 'Você',
      role: 'editor',
      profileId: me.id,
      updatedAt: Date.now()
    });
  }
  S.ensureSelfMember = ensureSelfMember;

  S.commit = function (project) {
    const idx = DB.data.projects.findIndex(function (p) { return p.id === project.id; });
    if (idx >= 0) DB.data.projects[idx] = project;
    else DB.data.projects.unshift(project);
    DB.save(true);
  };

  S.importNew = function (pkg) {
    const p = U.clone(pkg.project);
    p.id = p.id || U.uid();
    p.createdAt = p.createdAt || Date.now();
    p.updatedAt = Date.now();
    p.appliedPackages = (p.appliedPackages || []).concat([pkg.packageId]);
    p.versions = (p.versions || []).concat([{
      packageId: pkg.packageId,
      version: pkg.version || 1,
      authorId: pkg.author ? pkg.author.id : '',
      authorName: pkg.author ? pkg.author.name : 'Amigo',
      at: Date.now(),
      direction: 'import',
      summary: {
        tasks: (p.tasks || []).length,
        events: (p.events || []).length,
        finance: (p.finance || []).length,
        members: (p.members || []).length
      },
      conflicts: 0
    }]);
    (p.events || []).forEach(function (e) { e.projectId = p.id; });
    (p.tasks || []).forEach(function (t) { t.projectId = p.id; });
    ensureSelfMember(p);
    S.log(p, 'Projeto recebido de ' + (pkg.author ? pkg.author.name : 'amigo'));
    S.commit(p);
    return p;
  };

  function conflictRow(kind, c) {
    const key = kind + ':' + c.local.id;
    const label = recordLabel(kind, c.local);
    return '<div class="conflict" data-conflict="' + U.esc(key) + '">' +
      '<div class="conflict-info"><span class="badge">' + U.esc(S.KIND_LABEL[kind] || kind) + '</span><b>' + U.esc(label) + '</b><small>' + U.esc(c.reason) + '</small></div>' +
      '<div class="segmented small" role="group">' +
        '<label><input type="radio" name="c-' + U.esc(key) + '" value="mine" checked><span>Manter meu</span></label>' +
        '<label><input type="radio" name="c-' + U.esc(key) + '" value="' + (c.incoming ? 'theirs' : 'delete') + '"><span>' + (c.incoming ? 'Usar recebido' : 'Excluir') + '</span></label>' +
      '</div>' +
    '</div>';
  }

  S.importFlow = async function (file) {
    try {
      if (!file) file = await U.pickFile('.json,application/json');
      if (!file) return;
      const text = await U.readFile(file);
      const pkg = S.parsePackage(text);
      const local = DB.data.projects.find(function (p) { return p.id === pkg.project.id; });

      if (!local) {
        const ok = await UI.confirm({
          title: 'Importar projeto',
          message: 'Receber "' + pkg.project.name + '" de ' + (pkg.author ? pkg.author.name : 'um amigo') + '?',
          detail: '<span class="muted">O projeto será criado na sua lista com ' + ((pkg.project.tasks || []).length + (pkg.project.events || []).length + (pkg.project.finance || []).length) + ' registros. Você entra como editor.</span>',
          confirmLabel: 'Importar projeto'
        });
        if (!ok) return;
        const p = S.importNew(pkg);
        UI.toast('Projeto importado');
        if (Agendex.App) Agendex.App.go('#/project/' + p.id);
        return;
      }

      if ((local.appliedPackages || []).indexOf(pkg.packageId) >= 0) {
        UI.toast('Esta versão já foi importada antes.', 'error');
        return;
      }
      const dupVersion = (local.versions || []).find(function (v) { return v.packageId === pkg.packageId; });
      if (dupVersion) {
        UI.toast('Esta versão já está no histórico deste projeto.', 'error');
        return;
      }

      const diff = S.diff(local, pkg.project);
      const total = diff.counts.added + diff.counts.updated + diff.counts.conflicts + diff.counts.deleted;
      if (!total && !diff.meta.apply) {
        UI.toast('Nada novo nesta versão.');
        return;
      }

      const conflictRows = [];
      Object.keys(diff.collections).forEach(function (k) {
        diff.collections[k].conflicts.forEach(function (c) { conflictRows.push(conflictRow(k, c)); });
      });
      diff.deletedIncoming.forEach(function (d) {
        conflictRows.push(conflictRow(d.kind, { kind: d.kind, local: d.local, incoming: null, reason: 'excluído na versão recebida' }));
      });

      const metaRow = diff.meta.conflict
        ? '<div class="conflict" data-conflict="meta"><div class="conflict-info"><span class="badge">Projeto</span><b>Dados do projeto</b><small>sua versão é mais recente ou igual</small></div><div class="segmented small"><label><input type="radio" name="c-meta" value="mine" checked><span>Manter meu</span></label><label><input type="radio" name="c-meta" value="theirs"><span>Usar recebido</span></label></div></div>'
        : '';

      const updatedNames = [];
      Object.keys(diff.collections).forEach(function (k) {
        diff.collections[k].updated.forEach(function (u) { updatedNames.push(recordLabel(k, u.incoming)); });
      });
      const addedNames = [];
      Object.keys(diff.collections).forEach(function (k) {
        diff.collections[k].added.forEach(function (r) { addedNames.push(recordLabel(k, r)); });
      });

      const body =
        '<div class="import-head">' +
          '<div><b>' + U.esc(pkg.project.name) + '</b><p class="muted small">Versão v' + U.esc(pkg.version || 1) + ' · ' + U.esc(pkg.author ? pkg.author.name : 'amigo') + ' · ' + U.esc(U.fmtDateTime(pkg.createdAt)) + '</p></div>' +
        '</div>' +
        '<div class="stat-chips">' +
          '<span class="chip ok">+' + diff.counts.added + ' novos</span>' +
          '<span class="chip">' + diff.counts.updated + ' atualizados</span>' +
          '<span class="chip ' + (diff.counts.conflicts ? 'warn' : '') + '">' + diff.counts.conflicts + ' conflitos</span>' +
          (diff.counts.deleted ? '<span class="chip warn">' + diff.counts.deleted + ' exclusões</span>' : '') +
        '</div>' +
        (metaRow || conflictRows.length
          ? '<h4 class="import-title">Precisa da sua decisão</h4><div class="conflict-list">' + metaRow + conflictRows.join('') + '</div>'
          : '<p class="muted small">Nenhum conflito. As alterações mais recentes serão aplicadas automaticamente.</p>') +
        (updatedNames.length ? '<details class="import-details"><summary>' + updatedNames.length + ' registro(s) serão atualizados</summary><p class="muted small">' + U.esc(updatedNames.join(', ')) + '</p></details>' : '') +
        (addedNames.length ? '<details class="import-details"><summary>' + addedNames.length + ' registro(s) novos</summary><p class="muted small">' + U.esc(addedNames.join(', ')) + '</p></details>' : '') +
        '<p class="import-note">' + U.icon('info', 15) + ' Um backup do estado atual é feito antes de aplicar. Nada é substituído sem esta confirmação.</p>';

      UI.modal({
        title: 'Versão de ' + (pkg.author ? pkg.author.name : 'amigo'),
        subtitle: 'Compare antes de aplicar',
        body: body,
        width: 680,
        footer: '<button class="btn ghost" data-close="1">Cancelar</button><button class="btn primary" id="apply-import">Aplicar importação</button>',
        onMount: function (modal) {
          modal.querySelector('#apply-import').addEventListener('click', async function () {
            const decisions = {};
            modal.querySelectorAll('.conflict').forEach(function (el) {
              const key = el.getAttribute('data-conflict');
              const checked = el.querySelector('input[type=radio]:checked');
              decisions[key] = checked ? checked.value : 'mine';
            });
            try { await DB.forceBackup(); } catch (e) { console.warn(e); }
            const res = S.apply(local, pkg, decisions);
            S.commit(res.project);
            UI.close();
            UI.toast('Versão importada' + (res.conflictsResolved ? ' · ' + res.conflictsResolved + ' conflito(s) resolvido(s)' : ''));
            if (Agendex.App) Agendex.App.refresh();
          });
        }
      });
    } catch (e) {
      console.error(e);
      UI.toast(e.message || 'Não foi possível importar o arquivo.', 'error');
    }
  };

  window.Agendex.Share = S;
})();
