/* Agendex — configurações */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const UI = Agendex.UI;
  const V = {};

  function themeButtons() {
    const cur = DB.data.settings.theme;
    return [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (t) {
      return '<button data-theme="' + t[0] + '" class="' + (cur === t[0] ? 'active' : '') + '">' + t[1] + '</button>';
    }).join('');
  }

  function accentSwatches() {
    const cur = DB.data.settings.accent;
    return U.ACCENTS.map(function (a) {
      return '<button class="swatch' + (U.norm(cur) === U.norm(a.value) ? ' active' : '') + '" data-accent="' + a.value + '" title="' + a.name + '" style="background:' + a.value + '"></button>';
    }).join('') +
    '<label class="swatch custom" title="Cor personalizada"><input type="color" id="custom-accent" value="' + U.esc(cur) + '"><span>+</span></label>';
  }

  function categorySection() {
    return ['income', 'expense', 'event'].map(function (kind) {
      const labels = { income: 'Receitas', expense: 'Despesas', event: 'Eventos' };
      return '<div class="cat-block"><div class="cat-head"><b>' + labels[kind] + '</b><button class="link" data-add-cat="' + kind + '">Adicionar</button></div>' +
        '<div class="cat-chips">' + DB.data.categories[kind].map(function (c) {
          return '<span class="cat-chip">' + U.esc(c) + '<button data-del-cat="' + kind + '|' + U.esc(c) + '" aria-label="Remover">' + U.icon('x', 12) + '</button></span>';
        }).join('') + '</div></div>';
    }).join('');
  }

  V.render = function (root) {
    const s = DB.data.settings;
    const p = DB.data.profile;
    let html = '<div class="page settings-page">';

    html += '<section class="card"><div class="card-head"><h3>Perfil</h3></div>' +
      '<div class="settings-row"><div class="field"><label for="set-name">Seu nome</label><input class="input" id="set-name" value="' + U.esc(p.name) + '" placeholder="Como você quer ser chamado"></div>' +
      '<div class="field"><label>Identificador local</label><div class="static-field mono tiny">' + U.esc(p.id) + '</div></div></div>' +
      '<p class="muted small">O nome aparece nos projetos compartilhados e no histórico das versões.</p>' +
    '</section>';

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h3>Aparência</h3></div>' +
        '<label class="field-label">Tema</label><div class="segmented" id="theme-seg">' + themeButtons() + '</div>' +
        '<label class="field-label">Cor de destaque</label><div class="swatches">' + accentSwatches() + '</div>' +
        '<p class="muted small">A cor é aplicada a botões, seleções e indicadores. O tema automático segue o sistema.</p>' +
      '</section>' +
      '<section class="card"><div class="card-head"><h3>Preferências</h3></div>' +
        '<div class="field"><label for="set-currency">Moeda</label><select class="input" id="set-currency">' +
          [['BRL', 'Real (R$)'], ['USD', 'Dólar (US$)'], ['EUR', 'Euro (€)']].map(function (c) {
            return '<option value="' + c[0] + '"' + (s.currency === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label for="set-first">Primeiro dia da semana</label><select class="input" id="set-first">' +
          '<option value="0"' + (Number(s.firstDay) === 0 ? ' selected' : '') + '>Domingo</option>' +
          '<option value="1"' + (Number(s.firstDay) === 1 ? ' selected' : '') + '>Segunda-feira</option>' +
        '</select></div>' +
      '</section>' +
    '</div>';

    html += '<section class="card"><div class="card-head"><h3>Armazenamento</h3><span class="muted small">' + U.esc(DB.statusLabel()) + '</span></div>' +
      '<p class="muted small">Os dados ficam neste computador. Conecte uma pasta para gravar automaticamente o arquivo <span class="mono">agendex.json</span> e manter backups.</p>' +
      '<div class="storage-box">' +
        '<div class="storage-info"><span class="row-icon">' + U.icon(DB.dirHandle ? 'folder' : 'database', 18) + '</span><div><b>' + (DB.dirHandle ? U.esc(DB.folderName) : 'Somente neste navegador') + '</b><small>' + (DB.dirHandle ? 'Pasta conectada · backups automáticos' : 'Os dados ficam no armazenamento local do navegador') + '</small></div></div>' +
        '<div class="storage-actions">' +
          (DB.supported()
            ? (DB.dirHandle
              ? '<button class="btn ghost small" data-save-now>Salvar agora</button><button class="btn ghost small" data-disconnect>Desconectar</button>'
              : '<button class="btn primary small" data-connect>Conectar pasta</button>')
            : '<span class="muted small">Seu navegador não permite escolher pasta. Use Chrome ou Edge, ou exporte manualmente.</span>') +
        '</div>' +
      '</div>' +
      '<div class="settings-actions">' +
        '<button class="btn ghost small" data-export-all>' + U.icon('download', 15) + 'Exportar todos os dados</button>' +
        '<button class="btn ghost small" data-import-all>' + U.icon('upload', 15) + 'Importar backup</button>' +
        '<button class="btn ghost small" data-demo>Carregar exemplo</button>' +
        '<button class="btn ghost small danger-text" data-reset>Apagar tudo</button>' +
      '</div>' +
      (DB.dirHandle ? '<div class="backups"><div class="cat-head"><b>Backups na pasta</b><button class="link" data-refresh-backups>Atualizar</button></div><div id="backup-list"><p class="muted small">Carregando…</p></div></div>' : '') +
    '</section>';

    html += '<section class="card"><div class="card-head"><h3>Aplicativo</h3><span class="muted small">' + (Agendex.App.install.standalone() ? 'instalado' : 'computador e celular') + '</span></div>' +
      '<p class="muted small">Use o Agendex como app: janela própria, ícone no sistema e funcionamento offline. Os dados continuam neste dispositivo.</p>' +
      '<div class="storage-box">' +
        '<div class="storage-info"><span class="row-icon">' + U.icon(Agendex.App.install.standalone() ? 'check' : 'download', 18) + '</span><div><b>' + (Agendex.App.install.standalone() ? 'Aplicativo instalado' : 'Instalar o Agendex') + '</b><small>' + (Agendex.App.install.standalone() ? 'Abrindo em modo aplicativo' : (Agendex.App.install.available() ? 'Disponível neste navegador' : 'Veja o passo a passo para o seu dispositivo')) + '</small></div></div>' +
        '<div class="storage-actions">' +
          (Agendex.App.install.standalone()
            ? '<button class="btn ghost small" data-check-update>Verificar atualização</button>'
            : (Agendex.App.install.available() ? '<button class="btn primary small" data-install-app>Instalar aplicativo</button>' : '') +
              '<button class="btn ghost small" data-install-help>Como instalar</button>') +
        '</div>' +
      '</div>' +
      '<p class="muted tiny" style="margin-top:8px">No iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. A instalação exige HTTPS (GitHub Pages) ou localhost.</p>' +
    '</section>';

    html += '<section class="card"><div class="card-head"><h3>Categorias</h3></div><p class="muted small">Categorias organizam eventos, receitas e despesas. Remover uma categoria não altera registros antigos.</p>' + categorySection() + '</section>';

    html += '<section class="card"><div class="card-head"><h3>Apoio via Pix</h3></div>' +
      '<div class="settings-row"><div class="field"><label for="set-pix">Chave Pix exibida em “Apoie o Agendex”</label><input class="input mono" id="set-pix" value="' + U.esc(s.pixKey) + '"></div></div>' +
      '<p class="muted small">A contribuição é opcional. Nenhuma função é bloqueada. A confirmação do pagamento acontece no seu banco.</p>' +
    '</section>';

    html += '<section class="card about-card"><div class="card-head"><h3>Sobre</h3><span class="muted small">v1.0.0</span></div>' +
      '<p class="muted small">Agendex — organização pessoal, financeira e coletiva. Funciona offline, sem servidor e sem banco de dados online. Seus dados são seus.</p>' +
      '<p class="muted tiny">Arquivos: um banco local (<span class="mono">agendex.json</span>), backups na pasta escolhida e pacotes de projeto exportados manualmente.</p>' +
    '</section>';

    html += '</div>';
    root.innerHTML = html;

    const nameEl = root.querySelector('#set-name');
    if (nameEl) nameEl.addEventListener('change', function () {
      const old = DB.data.profile.name;
      DB.data.profile.name = nameEl.value.trim();
      DB.data.projects.forEach(function (pr) {
        (pr.members || []).forEach(function (m) {
          if (m.profileId === DB.data.profile.id) m.name = DB.data.profile.name || 'Você';
        });
      });
      DB.save(true);
      UI.toast('Nome atualizado');
      if (old !== DB.data.profile.name) Agendex.App.refresh();
    });

    root.querySelectorAll('[data-theme]').forEach(function (el) {
      el.addEventListener('click', function () {
        DB.data.settings.theme = el.getAttribute('data-theme');
        DB.save();
        Agendex.App.applyTheme();
        root.querySelectorAll('[data-theme]').forEach(function (b) { b.classList.toggle('active', b === el); });
      });
    });
    root.querySelectorAll('[data-accent]').forEach(function (el) {
      el.addEventListener('click', function () {
        DB.data.settings.accent = el.getAttribute('data-accent');
        DB.save();
        Agendex.App.applyTheme();
        V.render(root);
      });
    });
    const custom = root.querySelector('#custom-accent');
    if (custom) custom.addEventListener('input', function () {
      DB.data.settings.accent = custom.value;
      DB.save();
      Agendex.App.applyTheme();
    });
    const currency = root.querySelector('#set-currency');
    if (currency) currency.addEventListener('change', function () {
      DB.data.settings.currency = currency.value;
      DB.save(true);
      UI.toast('Moeda atualizada');
      V.render(root);
    });
    const first = root.querySelector('#set-first');
    if (first) first.addEventListener('change', function () {
      DB.data.settings.firstDay = Number(first.value);
      DB.save();
      UI.toast('Preferência salva');
    });

    const connect = root.querySelector('[data-connect]');
    if (connect) connect.addEventListener('click', async function () {
      try {
        const existing = await DB.connectFolder();
        if (existing) {
          const load = await UI.confirm({
            title: 'Pasta com dados',
            message: 'A pasta escolhida já contém um arquivo do Agendex.',
            detail: '<span class="muted">Carregar os dados da pasta ou manter os dados atuais e sobrescrever o arquivo?</span>',
            confirmLabel: 'Carregar da pasta',
            cancelLabel: 'Manter os atuais'
          });
          if (load) DB.adopt(existing);
          else await DB.saveNow();
        } else {
          await DB.saveNow();
        }
        UI.toast('Pasta conectada');
        V.render(root);
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        UI.toast(e.message || 'Não foi possível conectar a pasta.', 'error');
      }
    });
    const saveNow = root.querySelector('[data-save-now]');
    if (saveNow) saveNow.addEventListener('click', async function () {
      await DB.saveNow();
      UI.toast(DB.status === 'error' ? DB.error : 'Dados salvos na pasta', DB.status === 'error' ? 'error' : '');
    });
    const disconnect = root.querySelector('[data-disconnect]');
    if (disconnect) disconnect.addEventListener('click', async function () {
      const ok = await UI.confirm({ title: 'Desconectar pasta', message: 'Parar de salvar automaticamente na pasta?', detail: '<span class="muted">Os dados continuam neste navegador e na pasta. Você pode reconectar depois.</span>', confirmLabel: 'Desconectar' });
      if (!ok) return;
      await DB.disconnectFolder();
      UI.toast('Pasta desconectada');
      V.render(root);
    });
    const installApp = root.querySelector('[data-install-app]');
    if (installApp) installApp.addEventListener('click', async function () {
      const ok = await Agendex.App.install.prompt();
      if (ok) setTimeout(function () { V.render(root); }, 400);
    });
    root.querySelectorAll('[data-install-help]').forEach(function (el) {
      el.addEventListener('click', function () { Agendex.App.install.help(); });
    });
    const checkUpdate = root.querySelector('[data-check-update]');
    if (checkUpdate) checkUpdate.addEventListener('click', function () { Agendex.App.install.checkUpdate(); });

    const exportAll = root.querySelector('[data-export-all]');    if (exportAll) exportAll.addEventListener('click', function () {
      U.download('agendex-backup-' + U.today() + '.json', DB.exportJSON());
      UI.toast('Backup exportado');
    });
    const importAll = root.querySelector('[data-import-all]');
    if (importAll) importAll.addEventListener('click', async function () {
      const file = await U.pickFile('.json,application/json');
      if (!file) return;
      try {
        const text = await U.readFile(file);
        const parsed = JSON.parse(text);
        if (parsed.format !== 'agendex.db') throw new Error('Este arquivo não é um backup do Agendex.');
        const ok = await UI.confirm({
          title: 'Importar backup',
          message: 'Substituir todos os dados atuais pelo backup?',
          detail: '<span class="muted">Um backup do estado atual é mantido na pasta, se houver uma conectada.</span>',
          danger: true,
          confirmLabel: 'Substituir dados'
        });
        if (!ok) return;
        try { await DB.forceBackup(); } catch (e) { console.warn(e); }
        DB.importJSON(text);
        UI.toast('Backup restaurado');
        Agendex.App.refresh();
      } catch (e) {
        UI.toast(e.message || 'Arquivo inválido.', 'error');
      }
    });
    const demo = root.querySelector('[data-demo]');
    if (demo) demo.addEventListener('click', async function () {
      const ok = await UI.confirm({
        title: 'Carregar dados de exemplo',
        message: 'Substituir os dados atuais pelo exemplo demonstrativo?',
        detail: '<span class="muted">O exemplo inclui contas, lançamentos, eventos e um projeto compartilhado fictício. Use apenas para testar.</span>',
        danger: true,
        confirmLabel: 'Carregar exemplo'
      });
      if (!ok) return;
      try { await DB.forceBackup(); } catch (e) { console.warn(e); }
      DB.data = DB.demo();
      DB.data.meta.demo = true;
      DB.save(true);
      UI.toast('Dados de exemplo carregados');
      Agendex.App.go('#/overview');
    });
    const reset = root.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', async function () {
      const ok = await UI.confirm({
        title: 'Apagar todos os dados',
        message: 'Isso remove contas, lançamentos, eventos, projetos e metas deste dispositivo.',
        detail: '<span class="text-danger">Não há como desfazer sem um backup.</span>',
        danger: true,
        confirmLabel: 'Apagar tudo'
      });
      if (!ok) return;
      try { await DB.forceBackup(); } catch (e) { console.warn(e); }
      DB.reset();
      DB.data.settings.onboarded = true;
      DB.save(true);
      UI.toast('Dados apagados');
      Agendex.App.go('#/overview');
    });
    const pix = root.querySelector('#set-pix');
    if (pix) pix.addEventListener('change', function () {
      DB.data.settings.pixKey = pix.value.trim();
      DB.save(true);
      UI.toast('Chave Pix atualizada');
    });

    root.querySelectorAll('[data-add-cat]').forEach(function (el) {
      el.addEventListener('click', async function () {
        const kind = el.getAttribute('data-add-cat');
        const name = await UI.prompt({ title: 'Nova categoria', label: 'Nome da categoria', confirmLabel: 'Adicionar' });
        if (!name) return;
        if (DB.data.categories[kind].some(function (c) { return U.norm(c) === U.norm(name); })) {
          UI.toast('Essa categoria já existe.', 'error');
          return;
        }
        DB.data.categories[kind].push(name);
        DB.save(true);
        V.render(root);
      });
    });
    root.querySelectorAll('[data-del-cat]').forEach(function (el) {
      el.addEventListener('click', async function () {
        const parts = el.getAttribute('data-del-cat').split('|');
        const kind = parts[0], name = parts.slice(1).join('|');
        const ok = await UI.confirm({ title: 'Remover categoria', message: 'Remover "' + name + '"?', detail: '<span class="muted">Registros antigos mantêm a categoria.</span>', confirmLabel: 'Remover' });
        if (!ok) return;
        DB.data.categories[kind] = DB.data.categories[kind].filter(function (c) { return c !== name; });
        DB.save(true);
        V.render(root);
      });
    });

    const refreshBtn = root.querySelector('[data-refresh-backups]');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { loadBackups(root); });
    if (DB.dirHandle) loadBackups(root);
  };

  async function loadBackups(root) {
    const box = root.querySelector('#backup-list');
    if (!box) return;
    const list = await DB.listBackups();
    if (!list.length) { box.innerHTML = '<p class="muted small">Nenhum backup ainda. Eles são criados ao salvar, a cada 5 minutos.</p>'; return; }
    box.innerHTML = list.map(function (b) {
      return '<div class="backup-row"><span class="row-main"><b>' + U.esc(b.name) + '</b><small>' + U.fmtDateTime(b.at) + ' · ' + Math.round(b.size / 1024) + ' KB</small></span><button class="btn small ghost" data-restore="' + U.esc(b.name) + '">Restaurar</button></div>';
    }).join('');
    box.querySelectorAll('[data-restore]').forEach(function (el) {
      el.addEventListener('click', async function () {
        const name = el.getAttribute('data-restore');
        const ok = await UI.confirm({ title: 'Restaurar backup', message: 'Substituir os dados atuais pelo backup ' + name + '?', detail: '<span class="muted">O estado atual será salvo como novo backup antes.</span>', danger: true, confirmLabel: 'Restaurar' });
        if (!ok) return;
        try {
          const data = await DB.readBackup(name);
          await DB.forceBackup();
          DB.adopt(data);
          UI.toast('Backup restaurado');
          Agendex.App.refresh();
        } catch (e) {
          UI.toast(e.message || 'Não foi possível restaurar.', 'error');
        }
      });
    });
  }

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.settings = V;
})();
