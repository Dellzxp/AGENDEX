/* Agendex — armazenamento local */
(function () {
  const U = Agendex.U;
  const KEY = 'agendex.db.v1';
  const DIR_KEY = 'agendex.dir';

  const DB = {
    data: null,
    dirHandle: null,
    folderName: '',
    status: 'local',
    error: '',
    lastSaved: 0,
    lastDisk: 0,
    lastBackup: 0,
    _diskTimer: null,
    _statusFns: []
  };

  function defaults() {
    const now = Date.now();
    return {
      format: 'agendex.db',
      schema: 1,
      profile: { id: U.uid(), name: '', createdAt: now },
      settings: {
        theme: 'auto',
        accent: '#7028C8',
        currency: 'BRL',
        firstDay: 1,
        pixKey: '8f328749-c88c-410a-8cc9-6fcbfc153694',
        onboarded: false
      },
      categories: {
        income: ['Salário', 'Freelance', 'Vendas', 'Rendimentos', 'Presentes', 'Outros'],
        expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Compras', 'Dívidas', 'Outros'],
        event: ['Pessoal', 'Trabalho', 'Estudo', 'Saúde', 'Social', 'Viagem', 'Outros']
      },
      accounts: [],
      transactions: [],
      events: [],
      tasks: [],
      goals: [],
      budgets: [],
      projects: [],
      meta: { createdAt: now, updatedAt: now }
    };
  }

  function ensureShape(d) {
    const base = defaults();
    if (!d || typeof d !== 'object') return base;
    if (d.format && d.format !== 'agendex.db') throw new Error('Este arquivo não é um banco do Agendex.');
    d.format = 'agendex.db';
    d.schema = d.schema || 1;
    d.profile = Object.assign({}, base.profile, d.profile || {});
    if (!d.profile.id) d.profile.id = U.uid();
    d.settings = Object.assign({}, base.settings, d.settings || {});
    d.categories = Object.assign({}, base.categories, d.categories || {});
    ['income', 'expense', 'event'].forEach(function (k) {
      if (!Array.isArray(d.categories[k]) || !d.categories[k].length) d.categories[k] = base.categories[k].slice();
    });
    ['accounts', 'transactions', 'events', 'tasks', 'goals', 'budgets', 'projects'].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = [];
    });
    d.meta = Object.assign({}, base.meta, d.meta || {});
    return d;
  }

  DB.defaults = defaults;
  DB.ensureShape = ensureShape;

  DB.onStatus = function (fn) { DB._statusFns.push(fn); };
  function emit() {
    DB._statusFns.forEach(function (fn) { try { fn(DB); } catch (e) { console.warn(e); } });
  }
  DB.emit = emit;

  DB.setStatus = function (s, msg) {
    DB.status = s;
    DB.error = msg || '';
    emit();
  };

  DB.statusLabel = function () {
    if (DB.status === 'saving') return 'Salvando…';
    if (DB.status === 'saved') return 'Salvo na pasta';
    if (DB.status === 'error') return 'Falha ao salvar';
    if (DB.status === 'reconnect') return 'Reconectar pasta';
    if (DB.status === 'nofolder') return 'Somente neste navegador';
    if (DB.dirHandle) return 'Pasta conectada';
    return 'Salvo neste navegador';
  };

  /* ---------- IndexedDB (guarda o handle da pasta) ---------- */
  function idb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open('agendex-fs', 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbSet(key, val) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(key) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('kv', 'readonly');
        const rq = tx.objectStore('kv').get(key);
        rq.onsuccess = function () { resolve(rq.result); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }

  function idbDel(key) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---------- arquivos ---------- */
  function readText(dir, name) {
    return dir.getFileHandle(name).then(function (fh) {
      return fh.getFile();
    }).then(function (f) {
      return f.text();
    }).catch(function () { return null; });
  }

  function writeText(dir, name, text) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable();
    }).then(function (w) {
      return w.write(text).then(function () { return w.close(); });
    });
  }

  function stamp(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()) + '_' + U.pad(d.getHours()) + '-' + U.pad(d.getMinutes()) + '-' + U.pad(d.getSeconds());
  }

  DB.supported = function () { return typeof window.showDirectoryPicker === 'function'; };

  DB.connectFolder = async function () {
    if (!DB.supported()) throw new Error('Este navegador não permite escolher uma pasta. Use Chrome ou Edge.');
    const handle = await window.showDirectoryPicker({ id: 'agendex', mode: 'readwrite' });
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Permissão de gravação não concedida.');
    DB.dirHandle = handle;
    DB.folderName = handle.name;
    try { await idbSet(DIR_KEY, handle); } catch (e) { console.warn(e); }
    DB.setStatus('saved');
    const txt = await readText(handle, 'agendex.json');
    let existing = null;
    if (txt) {
      try { existing = ensureShape(JSON.parse(txt)); } catch (e) { existing = null; }
    }
    return existing;
  };

  DB.disconnectFolder = async function () {
    DB.dirHandle = null;
    DB.folderName = '';
    try { await idbDel(DIR_KEY); } catch (e) { console.warn(e); }
    DB.setStatus('local');
  };

  DB.reconnect = async function () {
    if (!DB.dirHandle) throw new Error('Nenhuma pasta salva.');
    const perm = await DB.dirHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Permissão não concedida.');
    DB.setStatus('saved');
    await DB.saveNow();
  };

  DB.adopt = function (incoming) {
    DB.data = ensureShape(incoming);
    DB.data.meta.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(DB.data));
    DB.saveNow();
    emit();
  };

  DB.save = function (immediate) {
    if (!DB.data) return;
    DB.data.meta.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(DB.data));
      DB.lastSaved = Date.now();
      if (!DB.dirHandle) DB.setStatus('local');
    } catch (e) {
      console.error(e);
      DB.setStatus('error', 'Armazenamento do navegador cheio. Conecte uma pasta para salvar.');
      return;
    }
    if (DB.dirHandle) {
      DB.setStatus('saving');
      clearTimeout(DB._diskTimer);
      if (immediate) DB.saveNow();
      else DB._diskTimer = setTimeout(function () { DB.saveNow(); }, 900);
    }
  };

  DB.saveNow = async function () {
    if (!DB.dirHandle || !DB.data) return;
    try {
      const perm = await DB.dirHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        DB.setStatus('reconnect');
        return;
      }
      DB.setStatus('saving');
      const now = Date.now();
      if (now - DB.lastBackup > 5 * 60 * 1000) {
        const cur = await readText(DB.dirHandle, 'agendex.json');
        if (cur) {
          try {
            const bdir = await DB.dirHandle.getDirectoryHandle('Backups', { create: true });
            await writeText(bdir, 'agendex-' + stamp() + '.json', cur);
            DB.lastBackup = now;
            await pruneBackups(bdir, 12);
          } catch (e) { console.warn('backup', e); }
        }
      }
      await writeText(DB.dirHandle, 'agendex.json', JSON.stringify(DB.data, null, 2));
      DB.lastDisk = Date.now();
      DB.setStatus('saved');
    } catch (e) {
      console.error(e);
      DB.setStatus('error', e.message || 'Não foi possível salvar na pasta.');
    }
  };

  async function pruneBackups(bdir, keep) {
    const names = [];
    for await (const entry of bdir.values()) {
      if (entry.kind === 'file' && /^agendex-.*\.json$/.test(entry.name)) names.push(entry.name);
    }
    names.sort();
    while (names.length > keep) {
      const old = names.shift();
      try { await bdir.removeEntry(old); } catch (e) { console.warn(e); }
    }
  }

  DB.listBackups = async function () {
    if (!DB.dirHandle) return [];
    try {
      const bdir = await DB.dirHandle.getDirectoryHandle('Backups');
      const out = [];
      for await (const entry of bdir.values()) {
        if (entry.kind === 'file' && /^agendex-.*\.json$/.test(entry.name)) {
          const f = await entry.getFile();
          out.push({ name: entry.name, size: f.size, at: f.lastModified });
        }
      }
      out.sort(function (a, b) { return b.at - a.at; });
      return out;
    } catch (e) {
      return [];
    }
  };

  DB.readBackup = async function (name) {
    if (!DB.dirHandle) throw new Error('Nenhuma pasta conectada.');
    const bdir = await DB.dirHandle.getDirectoryHandle('Backups');
    const txt = await readText(bdir, name);
    if (!txt) throw new Error('Backup não encontrado.');
    return ensureShape(JSON.parse(txt));
  };

  DB.forceBackup = async function () {
    if (!DB.dirHandle) return false;
    const cur = await readText(DB.dirHandle, 'agendex.json');
    if (!cur) return false;
    const bdir = await DB.dirHandle.getDirectoryHandle('Backups', { create: true });
    await writeText(bdir, 'agendex-' + stamp() + '.json', cur);
    await pruneBackups(bdir, 12);
    return true;
  };

  DB.exportJSON = function () {
    return JSON.stringify(DB.data, null, 2);
  };

  DB.importJSON = function (text) {
    const parsed = JSON.parse(text);
    const d = ensureShape(parsed);
    DB.data = d;
    DB.save(true);
    return d;
  };

  DB.reset = function () {
    DB.data = defaults();
    DB.save(true);
    return DB.data;
  };

  DB.init = async function () {
    let loaded = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = ensureShape(JSON.parse(raw));
    } catch (e) { console.warn('localStorage', e); }
    DB.data = loaded || defaults();

    try {
      const handle = await idbGet(DIR_KEY);
      if (handle) {
        DB.dirHandle = handle;
        DB.folderName = handle.name;
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const txt = await readText(handle, 'agendex.json');
          if (txt) {
            try {
              const disk = ensureShape(JSON.parse(txt));
              if ((disk.meta.updatedAt || 0) > (DB.data.meta.updatedAt || 0)) {
                DB.data = disk;
                localStorage.setItem(KEY, JSON.stringify(disk));
              }
            } catch (e) { console.warn('arquivo da pasta inválido', e); }
          }
          DB.status = 'saved';
        } else {
          DB.status = 'reconnect';
        }
      }
    } catch (e) { console.warn('pasta', e); }

    if (!DB.data.settings.onboarded) DB.status = DB.dirHandle ? DB.status : 'local';
    emit();
    return DB.data;
  };

  /* ---------- dados de exemplo ---------- */
  DB.demo = function () {
    const t = new Date();
    const iso = function (d) { return U.iso(d); };
    const day = function (offset) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + offset); return iso(d); };
    const monthDay = function (mOffset, d) { const x = new Date(t.getFullYear(), t.getMonth() + mOffset, d); return iso(x); };
    const d = defaults();
    d.settings.onboarded = true;
    d.profile.name = 'Você';
    d.categories.expense.push('Pet');
    d.accounts = [
      { id: U.uid(), name: 'Conta principal', type: 'checking', initial: 1200, createdAt: Date.now() },
      { id: U.uid(), name: 'Carteira', type: 'cash', initial: 120, createdAt: Date.now() },
      { id: U.uid(), name: 'Cartão', type: 'credit', initial: 0, limit: 3000, createdAt: Date.now() }
    ];
    const acc = d.accounts[0].id, card = d.accounts[2].id, cash = d.accounts[1].id;
    const tx = function (type, name, amount, date, category, accountId, status, extra) {
      return Object.assign({
        id: U.uid(), type: type, name: name, amount: amount, date: date, category: category || 'Outros',
        accountId: accountId || acc, status: status || 'paid', notes: '', recurrence: 'none',
        updatedAt: Date.now(), updatedBy: d.profile.id
      }, extra || {});
    };
    d.transactions = [
      tx('income', 'Salário', 3200, monthDay(0, 5), 'Salário'),
      tx('income', 'Freelance de design', 650, monthDay(0, 12), 'Freelance'),
      tx('expense', 'Mercado do mês', 480, monthDay(0, 7), 'Alimentação'),
      tx('expense', 'Aluguel', 1100, monthDay(0, 10), 'Moradia', acc, 'pending'),
      tx('expense', 'Internet', 99.9, monthDay(0, 15), 'Assinaturas', card),
      tx('expense', 'Farmácia', 64.5, monthDay(0, 18), 'Saúde'),
      tx('expense', 'Cinema', 70, monthDay(0, 20), 'Lazer', card),
      tx('expense', 'Gasolina', 180, monthDay(0, 21), 'Transporte'),
      tx('income', 'Salário', 3200, monthDay(-1, 5), 'Salário'),
      tx('expense', 'Mercado', 430, monthDay(-1, 8), 'Alimentação'),
      tx('expense', 'Aluguel', 1100, monthDay(-1, 10), 'Moradia'),
      tx('expense', 'Lazer', 210, monthDay(-1, 22), 'Lazer'),
      tx('income', 'Salário', 3000, monthDay(-2, 5), 'Salário'),
      tx('expense', 'Mercado', 455, monthDay(-2, 9), 'Alimentação'),
      tx('expense', 'Aluguel', 1100, monthDay(-2, 10), 'Moradia'),
      tx('expense', 'Curso online', 240, monthDay(-2, 14), 'Educação'),
      tx('income', 'Freelance', 900, monthDay(-3, 18), 'Freelance'),
      tx('expense', 'Mercado', 410, monthDay(-3, 8), 'Alimentação'),
      tx('expense', 'Aluguel', 1100, monthDay(-3, 10), 'Moradia'),
      tx('expense', 'Viagem', 620, monthDay(-3, 25), 'Lazer')
    ];
    d.events = [
      { id: U.uid(), title: 'Reunião de equipe', date: day(1), time: '09:30', duration: 60, location: 'Online', category: 'Trabalho', participants: '', notes: '', costPlanned: 0, projectId: '', done: false, recurrence: 'weekly', reminder: '1h', updatedAt: Date.now() },
      { id: U.uid(), title: 'Consulta médica', date: day(4), time: '15:00', duration: 45, location: 'Clínica', category: 'Saúde', participants: '', notes: '', costPlanned: 180, projectId: '', done: false, recurrence: 'none', reminder: '1d', updatedAt: Date.now() },
      { id: U.uid(), title: 'Aniversário da Ana', date: day(9), time: '', duration: 0, location: '', category: 'Social', participants: '', notes: 'Levar presente', costPlanned: 100, projectId: '', done: false, recurrence: 'none', reminder: '1d', updatedAt: Date.now() },
      { id: U.uid(), title: 'Fechamento do mês', date: day(-2), time: '18:00', duration: 60, location: '', category: 'Trabalho', participants: '', notes: '', costPlanned: 0, projectId: '', done: true, recurrence: 'none', reminder: 'none', updatedAt: Date.now() }
    ];
    d.tasks = [
      { id: U.uid(), title: 'Pagar conta de luz', due: day(2), priority: 'high', category: 'Casa', done: false, notes: '', projectId: '', updatedAt: Date.now() },
      { id: U.uid(), title: 'Renovar assinatura', due: day(6), priority: 'medium', category: 'Assinaturas', done: false, notes: '', projectId: '', updatedAt: Date.now() },
      { id: U.uid(), title: 'Organizar documentos', due: day(-1), priority: 'low', category: 'Pessoal', done: false, notes: '', projectId: '', updatedAt: Date.now() },
      { id: U.uid(), title: 'Revisar orçamento', due: day(-5), priority: 'medium', category: 'Finanças', done: true, notes: '', projectId: '', updatedAt: Date.now() }
    ];
    d.goals = [
      { id: U.uid(), name: 'Reserva de emergência', target: 6000, deadline: monthDay(6, 1), contributions: [{ id: U.uid(), amount: 1800, date: monthDay(0, 3), note: '' }], updatedAt: Date.now() },
      { id: U.uid(), name: 'Notebook novo', target: 3500, deadline: monthDay(4, 1), contributions: [{ id: U.uid(), amount: 900, date: monthDay(-1, 20), note: '' }], updatedAt: Date.now() }
    ];
    d.budgets = [
      { id: U.uid(), category: 'Alimentação', limit: 700 },
      { id: U.uid(), category: 'Lazer', limit: 300 },
      { id: U.uid(), category: 'Transporte', limit: 250 }
    ];
    const pid = U.uid();
    const me = { id: U.uid(), name: 'Você', role: 'admin', profileId: d.profile.id };
    const joao = { id: U.uid(), name: 'João', role: 'editor', profileId: '' };
    const maria = { id: U.uid(), name: 'Maria', role: 'colaborador', profileId: '' };
    d.projects = [{
      id: pid,
      name: 'Viagem com amigos',
      description: 'Casa na praia em janeiro. Dividir aluguel, mercado e transporte.',
      color: '#239B65',
      category: 'Viagem',
      start: monthDay(0, 1),
      end: monthDay(3, 15),
      budget: 2400,
      ownerId: d.profile.id,
      members: [me, joao, maria],
      tasks: [
        { id: U.uid(), title: 'Reservar a casa', due: day(5), priority: 'high', done: false, notes: '', updatedAt: Date.now() },
        { id: U.uid(), title: 'Montar lista de compras', due: day(8), priority: 'medium', done: false, notes: '', updatedAt: Date.now() },
        { id: U.uid(), title: 'Fechar transporte', due: day(12), priority: 'medium', done: true, notes: '', updatedAt: Date.now() }
      ],
      events: [
        { id: U.uid(), title: 'Reunião de planejamento', date: day(3), time: '20:00', duration: 60, location: 'Chamada', category: 'Social', notes: '', done: false, updatedAt: Date.now() }
      ],
      finance: [
        { id: U.uid(), type: 'contribution', memberId: me.id, name: 'Depósito inicial', amount: 400, date: day(-6), category: 'Aporte', status: 'paid', notes: '', updatedAt: Date.now() },
        { id: U.uid(), type: 'contribution', memberId: joao.id, name: 'Depósito inicial', amount: 350, date: day(-5), category: 'Aporte', status: 'paid', notes: '', updatedAt: Date.now() },
        { id: U.uid(), type: 'contribution', memberId: maria.id, name: 'Depósito inicial', amount: 300, date: day(-4), category: 'Aporte', status: 'paid', notes: '', updatedAt: Date.now() },
        { id: U.uid(), type: 'contribution', memberId: me.id, name: 'Segundo aporte', amount: 100, date: day(-2), category: 'Aporte', status: 'pending', notes: '', updatedAt: Date.now() },
        { id: U.uid(), type: 'expense', memberId: me.id, name: 'Sinal da casa', amount: 500, date: day(-3), category: 'Hospedagem', status: 'paid', notes: '', updatedAt: Date.now() },
        { id: U.uid(), type: 'expense', memberId: joao.id, name: 'Mercado', amount: 120, date: day(-1), category: 'Alimentação', status: 'paid', notes: '', updatedAt: Date.now() }
      ],
      versions: [],
      history: [{ at: Date.now(), author: 'Você', action: 'Projeto criado' }],
      deleted: [],
      version: 1,
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now()
    }];
    d.meta.updatedAt = Date.now();
    return d;
  };

  window.Agendex.DB = DB;
})();
