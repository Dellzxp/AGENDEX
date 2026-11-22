/* Agendex — apoio voluntário */
(function () {
  const U = Agendex.U;
  const DB = Agendex.DB;
  const UI = Agendex.UI;
  const V = {};

  V.render = function (root) {
    const key = DB.data.settings.pixKey || '';
    root.innerHTML = '<div class="page support-page">' +
      '<div class="support-hero">' +
        '<div class="support-mark">' + U.icon('heart', 24) + '</div>' +
        '<h2>Apoie o Agendex</h2>' +
        '<p>O aplicativo é gratuito e todas as funções essenciais continuam liberadas. Se ele te ajuda, você pode contribuir para manter o desenvolvimento.</p>' +
        '<div class="support-note">' + U.icon('info', 15) + '<span>Contribuição opcional. Pagar não desbloqueia nada e não pagar não bloqueia nada.</span></div>' +
      '</div>' +

      '<div class="support-grid">' +
        '<section class="card pix-card">' +
          '<div class="card-head"><h3>Chave Pix</h3><span class="badge">voluntário</span></div>' +
          '<div class="pix-key mono" id="pix-key">' + U.esc(key) + '</div>' +
          '<div class="pix-actions"><button class="btn primary" data-copy-pix>' + U.icon('copy', 16) + 'Copiar chave Pix</button><button class="btn ghost" data-copy-amount="5">Copiar e contribuir R$ 5</button></div>' +
          '<p class="muted small">Cole a chave no aplicativo do seu banco e escolha o valor. A confirmação acontece fora do Agendex.</p>' +
          '<div class="amounts"><span class="muted small">Sugestões:</span>' +
            [2, 5, 10, 25].map(function (v) {
              return '<button class="amount" data-copy-amount="' + v + '">R$ ' + v + '</button>';
            }).join('') +
          '</div>' +
        '</section>' +

        '<section class="card">' +
          '<div class="card-head"><h3>Como contribuir</h3></div>' +
          '<ol class="steps">' +
            '<li><b>Copie a chave Pix</b> ao lado.</li>' +
            '<li><b>Abra o app do seu banco</b> e escolha Pix.</li>' +
            '<li><b>Cole a chave</b>, informe o valor e confirme.</li>' +
            '<li><b>Pronto.</b> Não é necessário enviar comprovante nem criar conta.</li>' +
          '</ol>' +
          '<p class="muted small">O Agendex não processa pagamentos, não vê seus dados bancários e não confirma recebimentos automaticamente.</p>' +
        '</section>' +
      '</div>' +

      '<section class="card support-why">' +
        '<div class="card-head"><h3>Para onde vai a contribuição</h3></div>' +
        '<div class="why-grid">' +
          '<div><b>Desenvolvimento</b><p class="muted small">Manutenção, correções e novas funções.</p></div>' +
          '<div><b>Testes e publicação</b><p class="muted small">Assinatura de código, builds e distribuição.</p></div>' +
          '<div><b>Projeto independente</b><p class="muted small">Sem anúncios, sem venda de dados, sem assinatura obrigatória.</p></div>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><h3>Transparência</h3></div>' +
        '<ul class="plain-list">' +
          '<li>Todas as funções essenciais são gratuitas.</li>' +
          '<li>Não existe bloqueio por falta de pagamento.</li>' +
          '<li>Não existe limite artificial para incentivar doações.</li>' +
          '<li>A chave Pix pode ser alterada nas configurações.</li>' +
          '<li>A confirmação do recebimento é externa ao aplicativo.</li>' +
        '</ul>' +
      '</section>' +
    '</div>';

    root.querySelectorAll('[data-copy-pix]').forEach(function (el) {
      el.addEventListener('click', function () { UI.copy(key, 'Chave Pix copiada'); });
    });
    root.querySelectorAll('[data-copy-amount]').forEach(function (el) {
      el.addEventListener('click', function () {
        UI.copy(key, 'Chave copiada. Informe R$ ' + el.getAttribute('data-copy-amount') + ' no seu banco.');
      });
    });
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.support = V;
})();
