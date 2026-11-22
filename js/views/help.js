/* Agendex — ajuda */
(function () {
  const U = Agendex.U;
  const V = {};

  V.render = function (root) {
    root.innerHTML = '<div class="page help-page">' +
      '<div class="report-head"><h2>Como usar o Agendex</h2><p class="muted">Guia curto para começar e para compartilhar projetos sem servidor.</p></div>' +

      '<div class="grid-2">' +
        '<section class="card"><div class="card-head"><h3>Primeiros passos</h3></div>' +
          '<ol class="steps"><li><b>Crie uma conta</b> em Financeiro → Contas.</li><li><b>Registre receitas e despesas</b> em Financeiro → Lançamentos.</li><li><b>Marque compromissos</b> em Agenda → Evento.</li><li><b>Crie um projeto</b> quando quiser organizar algo com outras pessoas.</li></ol>' +
          '<p class="muted small">Tudo é salvo automaticamente. O indicador no rodapé do menu mostra onde os dados estão sendo gravados.</p>' +
        '</section>' +
        '<section class="card"><div class="card-head"><h3>Onde ficam os dados</h3></div>' +
          '<p class="small">O Agendex não usa servidor nem banco de dados online. Os dados ficam neste computador, em duas camadas:</p>' +
          '<ul class="plain-list"><li><b>Armazenamento do navegador</b> — cópia imediata de segurança.</li><li><b>Pasta conectada</b> — arquivo <span class="mono">agendex.json</span> e backups.</li></ul>' +
          '<p class="muted small">Conecte uma pasta em Configurações → Armazenamento para maior segurança. Exporte um backup antes de trocar de computador.</p>' +
        '</section>' +
      '</div>' +

      '<section class="card"><div class="card-head"><h3>Compartilhar um projeto por arquivo</h3><span class="muted small">manual, sem sincronização</span></div>' +
        '<ol class="steps long">' +
          '<li><b>O administrador cria o projeto</b> e adiciona os participantes em “Participantes”.</li>' +
          '<li><b>Exporta a versão</b> em “Versões dos amigos” e envia o arquivo por WhatsApp, e-mail ou outro meio.</li>' +
          '<li><b>O amigo importa</b> o arquivo. Ele recebe uma cópia local com as permissões definidas.</li>' +
          '<li><b>Cada pessoa altera a própria cópia</b> e exporta uma nova versão.</li>' +
          '<li><b>Ao receber uma versão</b>, importe na mesma aba. O Agendex compara registro por registro antes de aplicar.</li>' +
        '</ol>' +
        '<div class="note warn">' + U.icon('alert', 16) + '<span>Não existe sincronização em tempo real. Se duas pessoas editarem o mesmo item, aparece um conflito para você escolher qual versão manter. Sempre importe a versão mais recente antes de continuar trabalhando.</span></div>' +
      '</section>' +

      '<div class="grid-2">' +
        '<section class="card"><div class="card-head"><h3>Permissões</h3></div>' +
          '<ul class="plain-list"><li><b>Administrador</b> — edita o projeto e os participantes.</li><li><b>Editor</b> — altera dados do projeto.</li><li><b>Colaborador</b> — adiciona registros conforme o combinado.</li><li><b>Visualizador</b> — apenas consulta.</li></ul>' +
          '<p class="muted small">Como cada pessoa tem uma cópia local, as permissões são aplicadas na interface e na exportação. O arquivo em si não impede alguém de editar a própria cópia.</p>' +
        '</section>' +
        '<section class="card"><div class="card-head"><h3>Backups e recuperação</h3></div>' +
          '<ul class="plain-list"><li>Com uma pasta conectada, o Agendex cria backups a cada 5 minutos.</li><li>Backups ficam em <span class="mono">Backups/</span> e podem ser restaurados em Configurações.</li><li>Antes de importar um projeto ou backup, o estado atual é preservado.</li><li>Também é possível exportar todo o banco em JSON.</li></ul>' +
        '</section>' +
      '</div>' +

      '<section class="card"><div class="card-head"><h3>Perguntas frequentes</h3></div>' +
        '<details class="faq"><summary>Preciso de internet?</summary><p>Não para usar. A internet só é necessária para enviar arquivos a outras pessoas ou publicar o site.</p></details>' +
        '<details class="faq"><summary>O que acontece se eu fechar o navegador?</summary><p>Os dados continuam salvos no armazenamento local e na pasta conectada. Ao abrir de novo, o Agendex carrega o arquivo mais recente.</p></details>' +
        '<details class="faq"><summary>Posso usar em dois computadores?</summary><p>Sim, exportando e importando o banco completo ou os projetos. Não há sincronização automática entre eles.</p></details>' +
        '<details class="faq"><summary>Um participante pode ver minhas finanças pessoais?</summary><p>Não. Relatórios de projeto usam apenas os lançamentos daquele projeto. O financeiro pessoal fica separado.</p></details>' +
        '<details class="faq"><summary>Como faço para apoiar?</summary><p>Em “Apoie o Agendex” há uma chave Pix. A contribuição é opcional e não altera o acesso às funções.</p></details>' +
        '<details class="faq"><summary>O que é o arquivo .agendex?</summary><p>É um pacote JSON com o projeto, os participantes, as versões e uma verificação de integridade. Pode ser enviado como um arquivo comum.</p></details>' +
      '</section>' +

      '<div class="note">' + U.icon('lock', 16) + '<span>Privacidade por padrão: nenhum dado sai deste dispositivo sem você exportar e enviar um arquivo.</span></div>' +
    '</div>';
  };

  Agendex.Views = Agendex.Views || {};
  Agendex.Views.help = V;
})();
