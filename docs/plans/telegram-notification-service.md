# Plano: Telegram Notification Service

> **Status:** Rascunho
> **Criado em:** 2026-06-04
> **Origem:** [PRD — docs/prd-telegram-notification-service.md](../prd-telegram-notification-service.md) | [issue #161](https://github.com/Matheus-96/presell-creator/issues/161)

## 1. O que estamos construindo

Um serviço de notificação via Telegram (`telegram.service.js`) que expõe uma única função `notify(type, data)`, importável de qualquer ponto do backend. O serviço é totalmente opcional: sem as variáveis de ambiente configuradas, opera em no-op silencioso sem afetar boot ou fluxo principal. A instrumentação de pontos específicos fica fora do escopo — este plano entrega apenas a fundação.

## 2. Fora do escopo

- Instrumentação de pontos específicos (`presellService`, controllers, middleware)
- Recebimento de mensagens / webhook do Telegram
- Múltiplos destinatários ou roteamento por tipo
- Retry automático com backoff
- Validação das variáveis no boot (`getEnv()`)
- Interface de configuração via painel admin

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | Serviço importado diretamente (sem EventEmitter) | Simples, rastreável, suficiente para notificações operacionais | Quem usa cria dependência de import — aceitável |
| AD-2 | Interface `notify(type, data)` com tipos nomeados | Permite formatação diferenciada por tipo sem refatoração futura | Novos tipos exigem entrada no formatador interno |
| AD-3 | `fetch` nativo, sem biblioteca externa | Node 18+ já tem fetch; evita dependência desnecessária | Sem helpers de retry/polling da lib — ok para este escopo |
| AD-4 | Variáveis lidas diretamente de `process.env` via `loadEnv()`, fora do objeto `getEnv()` | Telegram é opcional; não deve causar erro de validação se ausente | Config do Telegram não aparece no objeto de config central |
| AD-5 | No-op gracioso se variáveis ausentes | Não bloqueia boot em ambientes sem Telegram configurado | Erros de configuração são silenciosos — detectáveis apenas testando o envio |
| AD-6 | Falhas de envio capturadas internamente com `console.error` | Notificação é efeito colateral; nunca quebra o fluxo principal | Falhas persistentes aparecem no log mas não alertam ativamente |

## 4. Requisitos

- RF-1: O sistema deve exportar uma função `notify(type, data)` assíncrona que envia uma mensagem ao Telegram.
- RF-2: A mensagem enviada deve ser formatada de acordo com o `type` recebido.
- RF-3: Se `TELEGRAM_BOT_TOKEN` ou `TELEGRAM_CHAT_ID` estiverem ausentes, `notify` deve retornar sem enviar nada.
- RF-4: Se o envio falhar (rede, token inválido, rate limit), `notify` deve capturar o erro, logar via `console.error` e retornar sem lançar.
- RNF-1: O serviço não deve adicionar nenhuma dependência nova ao `package.json`.
- RNF-2: O serviço deve seguir o padrão de arquivo dos demais services em `backend/src/services/`.

## 5. Critérios de Aceite Globais

- [ ] `notify("presell.created", { title: "Teste" })` com variáveis configuradas envia mensagem ao Telegram
- [ ] `notify(...)` sem variáveis configuradas retorna silenciosamente sem erro
- [ ] `notify(...)` com API do Telegram retornando erro não lança exceção e loga no console
- [ ] Nenhum `npm install` necessário
- [ ] Build sem erros, testes passando (`npm test` no backend)

## 6. Tasks

### Fase 1: Fundação + Testes

> Entrega: `notify()` funcional e testada — pronta para ser instrumentada onde e quando quiser

#### Task 1: Criar `telegram.service.js`

- **Prova:** valida que a camada de serviço se integra ao sistema de config existente e ao `fetch` nativo
- **Done-when:**
  - [ ] Arquivo criado em `backend/src/services/telegram.service.js`
  - [ ] Exporta `async function notify(type, data)`
  - [ ] Lê `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` via `loadEnv()` de `config/env.js`
  - [ ] Retorna imediatamente (no-op) se qualquer variável estiver ausente ou vazia
  - [ ] Formata mensagem de texto com base no `type` (ao menos um type de exemplo; tipos desconhecidos usam fallback genérico)
  - [ ] Chama `POST https://api.telegram.org/bot{TOKEN}/sendMessage` via `fetch` nativo
  - [ ] Captura qualquer erro e loga via `console.error` sem propagar
- **Verificar:** adicionar temporariamente uma chamada `notify("test", { msg: "ok" })` no boot e confirmar recebimento no Telegram
- **Balizador:** se a mensagem chega no Telegram com as variáveis configuradas, e não há erro com variáveis ausentes, está correto.

#### Task 1T: Testes — `telegram.service.js`

- **Cobre:** todos os comportamentos da interface pública de `notify`
- **Done-when:**
  - [ ] Teste: com variáveis configuradas, `fetch` é chamado com URL e payload corretos
  - [ ] Teste: com `TELEGRAM_BOT_TOKEN` ausente, `fetch` não é chamado
  - [ ] Teste: com `TELEGRAM_CHAT_ID` ausente, `fetch` não é chamado
  - [ ] Teste: quando `fetch` lança erro, `notify` não lança e chama `console.error`
  - [ ] Teste: quando API retorna status não-ok, `notify` não lança e chama `console.error`
  - [ ] Todos os testes passam em `npm test`
- **Verificar:** `npm test --testPathPattern=telegram` no diretório `backend/`
- **Prior art:** padrão de mock de módulo com `jest.resetModules()` + `jest.doMock()` usado em `__tests__/errorHandler.test.js`

---
**Checkpoint Fase 1:** `npm test` verde + envio manual confirmado no Telegram + nenhuma dependência nova adicionada.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `fetch` não disponível em versão do Node < 18 | Baixa | Médio | Verificar `node --version` no ambiente de deploy; fallback com `require('node:https')` se necessário |
| Rate limit do Telegram em picos de eventos | Baixa | Baixo | Fora do escopo agora; mitigado com queue/debounce no futuro |

## 8. Perguntas em aberto

- [ ] Há tipos nomeados que você já sabe que vai usar e quer que o formatador cubra desde o início? (ex: `presell.created`, `error.critical`)
