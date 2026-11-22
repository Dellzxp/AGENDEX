/* Agendex — aplicação */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const UI = Agendex.UI;
  const L = Agendex.Logic;
  const Views = Agendex.Views;
  const App = { route: 'overview' };

  const META = {
    overview: ['Visão geral', 'Tudo o que importa hoje'],
    agenda: ['Agenda', 'Compromissos, eventos e tarefas'],
    finance: ['Financeiro', 'Contas, lançamentos, orçamentos e metas'],
    projects: ['Projetos', 'Individuais e compartilhados por arquivo'],
    reports: ['Relatórios', 'Resumos e comparações'],
    support: ['Apoie o Agendex', 'Contribuição voluntária via Pix'],
    settings: ['Configurações', 'Preferências, dados e backups'],
    help: ['Ajuda', 'Guia rápido do Agendex']
  };

  function parseHash() {
    const raw = (location.hash || '#/overview').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { name: 'overview' };
    if (parts[0] === 'project' && parts[1]) return { name: 'project', id: parts[1] };
    if (META[parts[0]]) return { name: parts[0] };
    return { name: 'overview' };
  }

  App.go = function (hash) {
    if (location.hash === hash) renderRoute(false);
    else location.hash = hash;
  };

  App.refresh = function () { renderRoute(false); };

  function renderRoute(scrollTop) {
    const r = parseHash();
    App.route = r.name;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === r.name);
    });
    const view = document.getElementById('view');
    view.innerHTML = '';
    try {
      if (r.name === 'project') {
        Views.projects.renderDetail(view, r.id);
        const p = DB.data.projects.find(function (x) { return x.id === r.id; });
        setTitle(p ? p.name : 'Projeto', p ? 'Projeto · ' + (p.members || []).length + ' participante(s)' : 'Projeto');
      } else {
        Views[r.name].render(view);
        const m = META[r.name] || META.overview;
        setTitle(m[0], m[1]);
      }
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="page"><div class="card"><h3>Algo deu errado ao abrir esta tela</h3><p class="muted small">' + U.esc(e.message || 'Erro desconhecido') + '</p><button class="btn small ghost" onclick="location.reload()">Recarregar</button></div></div>';
    }
    closeSidebar();
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' });
    updateStatus();
  }

  function setTitle(t, s) {
    const a = document.getElementById('page-title');
    const b = document.getElementById('page-sub');
    if (a) a.textContent = t;
    if (b) b.textContent = s || '';
  }

  App.applyTheme = function () {
    const s = DB.data.settings;
    const dark = s.theme === 'dark' || (s.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--accent', s.accent || '#7028C8');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0c0c0e' : '#ffffff');
  };

  function statusClass() {
    if (DB.status === 'error') return 'err';
    if (DB.status === 'reconnect' || DB.status === 'saving') return 'warn';
    if (DB.dirHandle) return 'ok';
    return 'local';
  }

  function updateStatus() {
    const label = document.getElementById('storage-label');
    if (label) label.textContent = DB.statusLabel();
    const dot = document.getElementById('storage-dot');
    if (dot) dot.className = 'status-dot ' + statusClass();
    const notif = document.getElementById('notif-count');
    if (notif) {
      const n = L.notifications().length;
      notif.textContent = n > 9 ? '9+' : String(n);
      notif.classList.toggle('hidden', !n);
    }
    const banner = document.getElementById('app-banner');
    if (!banner) return;
    if (DB.status === 'reconnect') {
      banner.className = 'app-banner show';
      banner.innerHTML = U.icon('alert', 16) + '<span>A pasta <b>' + U.esc(DB.folderName || 'conectada') + '</b> precisa de permissão para salvar.</span><button class="btn small primary" id="banner-reconnect">Reconectar</button>';
      const btn = banner.querySelector('#banner-reconnect');
      if (btn) btn.addEventListener('click', async function () {
        try { await DB.reconnect(); UI.toast('Pasta reconectada'); App.refresh(); }
        catch (e) { UI.toast(e.message || 'Não foi possível reconectar.', 'error'); }
      });
    } else if (DB.status === 'error') {
      banner.className = 'app-banner show error';
      banner.innerHTML = U.icon('alert', 16) + '<span>' + U.esc(DB.error || 'Falha ao salvar na pasta.') + '</span><button class="btn small ghost" id="banner-settings">Abrir configurações</button>';
      const btn = banner.querySelector('#banner-settings');
      if (btn) btn.addEventListener('click', function () { App.go('#/settings'); });
    } else {
      banner.className = 'app-banner';
      banner.innerHTML = '';
    }
  }

  function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
  }

  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.toggle('open');
    if (ov) ov.classList.toggle('show');
  }

  App.quickAdd = function (type) {
    closeMenu();
    if (type === 'event') Views.agenda.openEvent();
    else if (type === 'task') Views.agenda.openTask();
    else if (type === 'income' || type === 'expense' || type === 'transfer' || type === 'transaction') Views.finance.openTransaction(null, type === 'transaction' ? 'expense' : type);
    else if (type === 'account') Views.finance.openAccount();
    else if (type === 'goal') Views.finance.openGoal();
    else if (type === 'project') Views.projects.openProject();
  };

  function closeMenu() {
    const menu = document.getElementById('quick-menu');
    if (menu) menu.hidden = true;
  }

  App.connectFolder = async function () {
    try {
      const existing = await DB.connectFolder();
      if (existing) {
        const load = await UI.confirm({
          title: 'Pasta com dados',
          message: 'A pasta escolhida já contém um arquivo do Agendex.',
          detail: '<span class="muted">Carregar os dados da pasta ou manter os atuais e sobrescrever o arquivo?</span>',
          confirmLabel: 'Carregar da pasta',
          cancelLabel: 'Manter os atuais'
        });
        if (load) DB.adopt(existing);
        else await DB.saveNow();
      } else {
        await DB.saveNow();
      }
      UI.toast('Pasta conectada');
      App.refresh();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      UI.toast(e.message || 'Não foi possível conectar a pasta.', 'error');
    }
  };

  App.openNotifications = function () {
    const list = L.notifications();
    const body = list.length
      ? '<div class="rows">' + list.map(function (n, i) {
          return '<button class="row-item row-btn" data-notif="' + i + '"><span class="row-icon ' + (n.tone === 'danger' ? 'danger' : n.tone === 'warn' ? 'warn' : '') + '">' + U.icon(n.tone === 'danger' ? 'alert' : n.tone === 'warn' ? 'clock' : 'bell', 16) + '</span><span class="row-main"><b>' + U.esc(n.title) + '</b><small>' + U.esc(n.text) + '</small></span><span class="muted tiny">' + U.fmtDate(n.date) + '</span></button>';
        }).join('') + '</div>'
      : UI.empty('check', 'Nada pendente', 'Sem contas atrasadas, tarefas vencidas ou compromissos próximos.', '');
    UI.modal({
      title: 'Notificações',
      subtitle: 'Avisos calculados a partir dos seus dados',
      body: body,
      width: 560,
      onMount: function (modal) {
        modal.querySelectorAll('[data-notif]').forEach(function (el) {
          el.addEventListener('click', function () {
            const n = list[Number(el.getAttribute('data-notif'))];
            UI.close();
            if (n) setTimeout(function () { App.go(n.route); }, 40);
          });
        });
      }
    });
  };

  function onboarding() {
    if (DB.data.settings.onboarded) return;
    UI.modal({
      title: 'Bem-vindo ao Agendex',
      subtitle: 'Organização pessoal, financeira e coletiva. Offline por padrão.',
      width: 540,
      dismissable: false,
      body: '<div class="welcome">' +
        '<p>Seus dados ficam neste computador. Sem conta, sem servidor, sem sincronização automática.</p>' +
        '<div class="field"><label for="ob-name">Como você quer ser chamado?</label><input class="input" id="ob-name" placeholder="Seu nome" value="' + U.esc(DB.data.profile.name) + '"></div>' +
        '<div class="note">' + U.icon('folder', 16) + '<span>Recomendado: conecte uma pasta para salvar o arquivo <b>agendex.json</b> e backups automáticos. Você também pode começar só no navegador e mudar depois.</span></div>' +
      '</div>',
      footer: '<button class="btn ghost" id="ob-browser">Usar neste navegador</button><button class="btn primary" id="ob-folder"' + (DB.supported() ? '' : ' disabled') + '>Conectar pasta</button>',
      onMount: function (modal) {
        const name = modal.querySelector('#ob-name');
        function finish() {
          DB.data.profile.name = name.value.trim();
          DB.data.settings.onboarded = true;
          DB.save(true);
        }
        modal.querySelector('#ob-browser').addEventListener('click', function () {
          finish();
          UI.close();
          UI.toast('Tudo pronto. Comece pelo financeiro ou pela agenda.');
          App.refresh();
        });
        const folder = modal.querySelector('#ob-folder');
        if (folder) folder.addEventListener('click', async function () {
          finish();
          UI.close();
          App.refresh();
          await App.connectFolder();
        });
      }
    });
  }

  /* ---------- PWA: instalação, offline e atualização ---------- */
  const Install = { event: null, ios: false, reloading: false };

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function updateInstallButton() {
    const btn = document.getElementById('install-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', isStandalone() || (!Install.event && !Install.ios));
  }

  function showUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (!banner) return;
    banner.className = 'app-banner show update';
    banner.innerHTML = U.icon('download', 16) + '<span>Nova versão do Agendex disponível.</span><button class="btn small primary" id="update-now">Atualizar agora</button>';
    const btn = banner.querySelector('#update-now');
    if (btn) btn.addEventListener('click', function () {
      Install.reloading = true;
      if (App.sw && App.sw.waiting) App.sw.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(function () { location.reload(); }, 350);
    });
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (Install.reloading) { location.reload(); return; }
      if (hadController) showUpdateBanner();
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      App.sw = reg;
      if (reg.waiting && hadController) showUpdateBanner();
      reg.addEventListener('updatefound', function () {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', function () {
          if (next.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
        });
      });
    }).catch(function () {});
  }

  function installHelp() {
    const steps = Install.ios
      ? ['Abra o Agendex no <b>Safari</b>.', 'Toque em <b>Compartilhar</b> (quadrado com seta).', 'Escolha <b>Adicionar à Tela de Início</b>.', 'Confirme o nome <b>Agendex</b> e toque em <b>Adicionar</b>.']
      : ['Abra o Agendex no <b>Chrome</b> ou <b>Edge</b>.', 'Clique no ícone de <b>instalar</b> na barra de endereço ou no menu do navegador.', 'Escolha <b>Instalar Agendex</b>.', 'O app abre em janela própria e fica no menu Iniciar / área de trabalho.'];
    UI.modal({
      title: 'Instalar o Agendex',
      subtitle: isStandalone() ? 'Já está instalado neste dispositivo' : 'Computador e celular',
      body: (isStandalone()
        ? '<p class="muted small">Você já está usando o Agendex como aplicativo.</p>'
        : '<ol class="install-steps">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
          '<div class="note">' + U.icon('lock', 16) + '<span>A instalação exige <b>HTTPS</b> (GitHub Pages) ou <b>localhost</b>. Abrir o arquivo direto pelo disco continua funcionando, mas sem instalação automática.</span></div>') +
        '<p class="muted tiny" style="margin-top:10px">No Android, o menu do Chrome também mostra “Instalar aplicativo”. No iPhone, apenas o Safari permite adicionar à Tela de Início.</p>',
      footer: '<button class="btn ghost" data-close>Fechar</button>',
      width: 520
    });
  }

  App.install = {
    available: function () { return !!Install.event; },
    standalone: isStandalone,
    ios: function () { return Install.ios; },
    prompt: async function () {
      if (!Install.event) { installHelp(); return false; }
      Install.event.prompt();
      let choice = null;
      try { choice = await Install.event.userChoice; } catch (e) {}
      Install.event = null;
      updateInstallButton();
      if (choice && choice.outcome === 'accepted') { UI.toast('Instalando o Agendex…'); return true; }
      return false;
    },
    help: installHelp,
    checkUpdate: function () {
      if (!App.sw) { UI.toast('A atualização automática só funciona quando o app está publicado online.', ''); return; }
      App.sw.update().then(function () { UI.toast('Verificando atualização…'); }).catch(function () { UI.toast('Não foi possível verificar agora.', 'error'); });
    }
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    Install.event = e;
    updateInstallButton();
  });
  window.addEventListener('appinstalled', function () {
    Install.event = null;
    updateInstallButton();
    UI.toast('Agendex instalado neste dispositivo');
  });

  function bindShell() {
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.addEventListener('click', function () { closeSidebar(); });
    });

    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.addEventListener('click', function () { App.install.prompt(); });

    const search = document.getElementById('search-trigger');
    if (search) search.addEventListener('click', function () { Agendex.Search.open(); });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('focus', function () {
      searchInput.blur();
      Agendex.Search.open();
    });

    const notif = document.getElementById('notif-btn');
    if (notif) notif.addEventListener('click', App.openNotifications);

    const quick = document.getElementById('quick-add');
    const menu = document.getElementById('quick-menu');
    if (quick && menu) {
      quick.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      menu.querySelectorAll('[data-quick]').forEach(function (el) {
        el.addEventListener('click', function () { App.quickAdd(el.getAttribute('data-quick')); });
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.quick-wrap')) closeMenu();
    });

    const storage = document.getElementById('storage-status');
    if (storage) storage.addEventListener('click', function () { App.go('#/settings'); });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        Agendex.Search.open();
      }
    });

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = function () { if (DB.data.settings.theme === 'auto') App.applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  window.addEventListener('hashchange', function () { renderRoute(true); });

  App.init = async function () {
    Install.ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isStandalone()) document.documentElement.classList.add('pwa-standalone');
    await DB.init();
    App.applyTheme();
    bindShell();
    renderRoute(false);
    updateInstallButton();
    initServiceWorker();
    DB.onStatus(function () { updateStatus(); });
    updateStatus();
    if (DB.status === 'reconnect') updateStatus();
    setTimeout(onboarding, 450);
  };

  window.Agendex.App = App;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
  else App.init();
})();
