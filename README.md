# Agendex

Organização pessoal, financeira e coletiva — em um único app local.

Agenda, finanças pessoais, projetos compartilhados por arquivo, relatórios e temas.
Funciona **sem servidor, sem login e sem banco de dados online**. Os dados ficam no seu computador.

---

## Como abrir

Não precisa instalar nada nem rodar build.

1. Abra a pasta `agendex`.
2. Dê duplo clique em `index.html`.

Pronto. O app abre no navegador e já salva automaticamente.

> Para usar o salvamento em **pasta do computador** (arquivo `agendex.json` + backups), abra por um servidor local ou publique no GitHub Pages. Navegadores só liberam a escolha de pasta em contexto seguro (`localhost` ou `https`).

### Abrir com servidor local (recomendado para testar a pasta)

No terminal, dentro da pasta `agendex`:

```powershell
# Python (já vem no Windows em muitos casos)
python -m http.server 8080

# ou com Node
npx serve .
```

Depois abra `http://localhost:8080`.

---

## Publicar no GitHub Pages

A pasta `agendex` **é** o repositório. Abra ela no VS Code (Arquivo → Abrir Pasta → `agendex`) e envie:

```powershell
git init
git add .
git commit -m "Agendex"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

O workflow já está em `.github/workflows/pages.yml` e publica o conteúdo da raiz.

1. No GitHub: **Settings → Pages → Source: GitHub Actions**.
2. O site fica em `https://SEU-USUARIO.github.io/SEU-REPO/`.

> Se preferir manter tudo dentro de uma pasta no repositório, mova o conteúdo de `agendex/` para a raiz do repo ou ajuste `path:` no workflow.

---

## O que tem no app

| Área | O que faz |
| --- | --- |
| **Visão geral** | Próximos compromissos, pendências, resumo do mês, projetos e metas |
| **Agenda** | Mês, semana, dia e lista; eventos, recorrência, lembretes, tarefas e prioridades |
| **Financeiro** | Contas, carteiras, cartões, receitas, despesas, transferências, orçamentos e metas |
| **Projetos** | Projetos individuais ou em grupo, com agenda, finanças, tarefas, participantes e versões |
| **Relatórios** | Receitas x despesas, gastos por categoria, orçado x realizado, comparação do grupo e CSV |
| **Apoie o Agendex** | Chave Pix para contribuição **opcional** (nada é bloqueado) |
| **Configurações** | Tema, cor de destaque, moeda, pasta de dados, backups, categorias e Pix |

### Regras financeiras aplicadas

- **Transferência** entre contas não entra como receita nem como despesa.
- **Pagamento de fatura** não duplica a despesa já registrada no cartão.
- **Saldo em contas** considera apenas contas e carteiras (o cartão mostra o valor usado do limite).
- Despesa **pendente** aparece em “contas a pagar” e não reduz o saldo até ser marcada como paga.

---

## Onde ficam os dados

Duas camadas, sem nuvem:

1. **Armazenamento do navegador** (`localStorage`) — gravação imediata.
2. **Pasta conectada** (Chrome/Edge) — arquivo `agendex.json` + pasta `Backups/` com até 12 cópias automáticas.

Conecte a pasta em **Configurações → Armazenamento**.

- Salva sozinho após cada alteração.
- Backup automático a cada 5 minutos.
- “Salvar agora”, “Exportar todos os dados” e “Importar backup” disponíveis.
- Antes de importar projeto ou restaurar backup, o estado atual é preservado.

### Limite importante

`localStorage` é por navegador e por endereço. Se você abrir o `index.html` direto do arquivo e depois publicar no GitHub Pages, são “origens” diferentes e os dados não se conversam. Escolha um jeito de abrir e mantenha. Para levar dados de um lugar a outro, use **Exportar todos os dados** e **Importar backup**.

---

## Compartilhamento de projetos (manual, por arquivo)

Não existe sincronização automática. O fluxo é:

1. O administrador cria o projeto e adiciona os participantes.
2. Em **Versões dos amigos**, clica em **Exportar minha versão**.
3. Envia o arquivo `.json` por WhatsApp, e-mail, Discord etc.
4. O amigo abre **Projetos → Importar** e recebe uma cópia local.
5. Cada pessoa altera a própria cópia e exporta de novo.
6. Ao receber uma versão, importe na mesma aba: o Agendex **compara registro por registro** antes de aplicar.

### O que o import faz

- Valida o arquivo e o checksum de integridade.
- Detecta versões já importadas (não duplica).
- Mostra quantos registros são novos, atualizados, excluídos e quantos são conflitos.
- Conflito = o mesmo registro alterado dos dois lados. Você escolhe **manter o seu** ou **usar o recebido**.
- Faz backup do estado atual antes de aplicar.
- Registra tudo no histórico do projeto e na tabela “Última versão por participante”.

### Permissões

Administrador, editor, colaborador e visualizador. Como cada pessoa tem uma cópia local, as permissões são aplicadas na interface e na exportação — é um acordo de uso, não um cadeado técnico.

---

## Estrutura do projeto

```
agendex/
├── index.html
├── assets/logo.svg
├── css/styles.css
└── js/
    ├── util.js       utilitários, datas, dinheiro, ícones
    ├── db.js         armazenamento, pasta, backups, dados de exemplo
    ├── ui.js         modais, formulários, confirmações, toasts
    ├── charts.js     gráficos em SVG/CSS (sem bibliotecas)
    ├── logic.js      cálculos de finanças, agenda, projetos
    ├── share.js      pacotes de projeto, comparação e conflitos
    ├── search.js     pesquisa global
    ├── app.js        rotas, tema, notificações, onboarding
    └── views/        overview, agenda, finance, projects, reports,
                      settings, support, help
```

Sem dependências, sem build, sem `node_modules`. JavaScript clássico (`<script>`), então funciona até abrindo o arquivo direto.

### Formatos de arquivo

- `agendex.db` — banco local completo (`localStorage` e `agendex.json`).
- `agendex.project` — pacote de projeto exportado, com `packageId`, autor, versão, checksum e snapshot do projeto.

---

## Apoio via Pix

Chave padrão: `8f328749-c88c-410a-8cc9-6fcbfc153694`

Editável em **Configurações → Apoio via Pix**. A contribuição é voluntária: **todas as funções essenciais são gratuitas** e nada é bloqueado por não pagar. O app não processa pagamento nem confirma recebimento — isso acontece no seu banco.

---

## Privacidade

- Nenhum dado sai do dispositivo sem você exportar e enviar um arquivo.
- Relatórios de projeto usam apenas lançamentos daquele projeto.
- O financeiro pessoal não é compartilhado com participantes.
- Sem anúncios, sem rastreamento, sem telemetria.
