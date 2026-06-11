# Plano: Notificação de Login e Melhorias no Telegram

> **Status:** Rascunho
> **Criado em:** 2026-06-10
> **Origem:** Conversa em 2026-06-10

## 1. O que estamos construindo

Três melhorias nas notificações Telegram do sistema admin:

1. Disparar notificação quando um login de admin é realizado com sucesso, incluindo país de origem e vários emojis de exclamação para destacar o alerta.
2. Incluir na notificação de `page_view` um indicador visual quando a visita tiver um `clickId` (gclid, wbraid ou gbraid) associado à sessão.

Ambas as mudanças aumentam a observabilidade operacional: o operador sabe imediatamente quando alguém acessa o painel e quando uma visita veio de tráfego pago rastreado.

## 2. Fora do escopo

- Notificação de logout (`deleteSession`)
- Rate limiting ou deduplicação de notificações de login
- Notificação de tentativas de login com falha
- Mudanças no schema do banco ou nos eventos de analytics

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | A notificação de login é disparada em `adminApiController.postSession`, dentro do callback de sucesso de `rotateAdminSession` | É o único ponto onde uma autenticação completa e a sessão foi criada; disparar antes seria prematuro | Controller importa `notify` e `extractRequestMeta` |
| AD-2 | O flag `hasClickId` é derivado de `session.params` logo após `getOrCreateSession` em `publicApiController.getPublicPresell` | `session.params` já contém gclid/wbraid/gbraid mesclados; não é necessário re-ler o query | O valor passado ao notify reflete o estado real da sessão |
| AD-3 | País do login vem de `extractRequestMeta(req)` (header `cf-ipcountry`) — o mesmo mecanismo usado em page_view e cta_click | Consistência com o restante do sistema; sem nova dependência | Se não houver Cloudflare na frente, `country` será `null` |

## 4. Requisitos

- RF-1: Após login de admin bem-sucedido, `notify("admin.login", ...)` é chamado com país e tipo de dispositivo.
- RF-2: A mensagem Telegram de login deve conter múltiplos emojis de exclamação (❗) para ser visualmente distinta.
- RF-3: Quando `presell.page_view` é notificado e a sessão possui qualquer `clickId` (gclid, wbraid ou gbraid), a mensagem deve exibir um indicador explícito de click ID.
- RNF-1: A falha na notificação não deve impactar o fluxo principal de login nem de page_view (comportamento já garantido pelo `try/catch` existente em `telegram.service.js`).

## 5. Critérios de Aceite Globais

- [ ] Login com credenciais válidas gera mensagem Telegram contendo emojis ❗ e país (quando disponível)
- [ ] Page view com `gclid`/`wbraid`/`gbraid` na sessão gera mensagem com indicador de click ID
- [ ] Page view sem click ID não exibe o indicador
- [ ] Build sem erros, todos os testes passando

## 6. Tasks

### Fase 1: Implementação + Testes
> Entrega: as três melhorias funcionando e cobertas por testes

#### Task 1: Adicionar formato `admin.login` ao telegram.service e disparar no controller

**Arquivos:**
- `backend/src/services/telegram.service.js` — novo case `admin.login` em `formatMessage`
- `backend/src/controllers/adminApiController.js` — importar `notify` + `extractRequestMeta`; chamar `notify("admin.login", ...)` no callback de sucesso de `rotateAdminSession`

**Mudanças:**

Em `telegram.service.js`, novo case:
```js
case 'admin.login':
  return `❗❗❗ *Login de admin detectado* ❗❗❗${visitor}`;
```
onde `visitor` já inclui país e dispositivo via `formatVisitorLine`.

Em `adminApiController.js`:
```js
const { notify } = require('../services/telegram.service');
const { extractRequestMeta } = require('../utils/request-meta');
// ...
return rotateAdminSession(req, { isAdmin: true }, (error) => {
  if (error) { /* ... */ }
  notify('admin.login', extractRequestMeta(req));
  return respondWithSession(req, res);
});
```

- **Prova:** Valida que controller → service → telegram API estão conectados para o novo evento
- **Done-when:**
  - [ ] `formatMessage('admin.login', { country: 'BR', device_type: 'desktop' })` retorna string com `❗❗❗` e `BR`
  - [ ] `postSession` bem-sucedido chama `notify('admin.login', ...)`
- **Verificar:** `node -e "const {formatMessage} = require('./backend/src/services/telegram.service'); console.log(formatMessage('admin.login', {country:'BR', device_type:'desktop'}))"`  *(adaptado para export)*
- **Balizador:** Se a string resultante contiver `❗❗❗` e `BR`, está no caminho certo.

---

#### Task 2: Indicador de clickId em page_view

**Arquivos:**
- `backend/src/services/telegram.service.js` — atualizar case `presell.page_view` para exibir indicador quando `data.hasClickId` for verdadeiro
- `backend/src/controllers/publicApiController.js` — derivar `hasClickId` de `session.params` e passar ao `notify`

**Mudanças:**

Em `publicApiController.js`:
```js
const session = getOrCreateSession(req);
recordEventWithSession(req, presell, 'page_view', session);
const hasClickId = Boolean(session.params.gclid || session.params.wbraid || session.params.gbraid);
notify('presell.page_view', { title: presell.title, slug: presell.slug, hasClickId, ...extractRequestMeta(req) });
```

Em `telegram.service.js`:
```js
case 'presell.page_view':
  return `👁 *Visita*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}${data.hasClickId ? '\n🎯 *Click ID*' : ''}${visitor}`;
```

- **Prova:** Valida que a flag `hasClickId` flui de session params → controller → service → mensagem final
- **Done-when:**
  - [ ] `formatMessage('presell.page_view', { ..., hasClickId: true })` retorna string com `🎯`
  - [ ] `formatMessage('presell.page_view', { ..., hasClickId: false })` NÃO contém `🎯`
- **Verificar:** Mesma chamada isolada ao `formatMessage`
- **Balizador:** Se o indicador aparece somente quando `hasClickId: true`, está correto.

---

#### Task 3: Cobertura de testes

**Arquivo:** `backend/src/__tests__/telegramService.test.js`

Novos casos:
- `admin.login` sem país → mensagem contém `❗❗❗` mas não contém país
- `admin.login` com `country: 'BR'` → mensagem contém `❗❗❗` e `BR`
- `presell.page_view` com `hasClickId: true` → mensagem contém indicador (ex.: `🎯`)
- `presell.page_view` com `hasClickId: false` → mensagem não contém o indicador

- **Cobre:** `telegram.service.js` — formatação de `admin.login` e `presell.page_view` com flag
- **Done-when:**
  - [ ] Todos os quatro novos casos passam
  - [ ] Nenhum teste existente quebra
- **Verificar:** `cd backend && npm test -- --testPathPattern=telegramService`

---
**Checkpoint Fase 1:** `npm test` verde + `formatMessage` funcionando manualmente + aprovação para merge.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `cf-ipcountry` ausente em dev/staging (sem Cloudflare) | Alta | Baixo | `country` será `null`; `formatVisitorLine` já ignora campos nulos |
| Escape do Markdown do Telegram falhar com emojis de exclamação | Baixa | Baixo | `escapeMd` só escapa caracteres ASCII especiais; emojis passam sem alteração |

## 8. Perguntas em aberto

- [ ] O emoji de indicador de click ID deve ser `🎯` ou outro? (assumido `🎯` no plano)
- [ ] Quantidade de `❗` na mensagem de login: o plano usa 3 (`❗❗❗`) antes e 3 depois do texto. Confirmar.
