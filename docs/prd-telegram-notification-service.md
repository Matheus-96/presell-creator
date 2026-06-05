# PRD: Telegram Notification Service

## Problem Statement

O backend não possui nenhum mecanismo de observabilidade operacional. Quando eventos importantes acontecem (criação de presell, erros críticos, deploys), o operador não é notificado em tempo real e depende de verificar logs manualmente.

## Solution

Criar um `telegram.service.js` no backend que expõe uma função de notificação via Telegram, completamente desacoplada do fluxo principal da aplicação. O serviço é opcional: se as variáveis de ambiente não estiverem configuradas, ele opera em no-op silencioso sem afetar o boot ou qualquer funcionalidade existente.

## User Stories

1. Como operador, quero receber notificações no Telegram quando eventos importantes ocorrem no backend, para que eu não precise monitorar logs manualmente.
2. Como desenvolvedor, quero chamar uma única função `notify(type, data)` em qualquer ponto do backend, para que a instrumentação seja simples e consistente.
3. Como desenvolvedor, quero que a função `notify` aceite um tipo nomeado e dados estruturados, para que mensagens possam ser formatadas de forma rica e diferenciada por tipo.
4. Como operador, quero que o serviço funcione sem o Telegram configurado, para que o backend inicialize normalmente em ambientes sem as variáveis `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.
5. Como operador, quero que falhas no envio ao Telegram sejam silenciadas com log no console, para que um problema externo (rede, token inválido, rate limit) nunca quebre o fluxo principal da aplicação.
6. Como operador, quero que o destinatário das notificações seja configurado via variável de ambiente, para que eu não precise alterar código para mudar o destino.
7. Como desenvolvedor, quero poder instrumentar qualquer ponto do backend (service, controller, middleware) importando diretamente o `telegram.service.js`, para que a integração seja direta e sem indireções desnecessárias.

## Implementation Decisions

- **Módulo principal:** `telegram.service.js` em `backend/src/services/`, seguindo a convenção de serviços já existente no projeto.
- **Interface pública:** uma única função exportada `notify(type, data)` — assíncrona, nunca lança exceção para o chamador.
- **Tipos nomeados:** o parâmetro `type` é uma string nomeada (ex: `"presell.created"`, `"error.critical"`) que o serviço usa para formatar a mensagem antes de enviar.
- **Transporte:** chamada direta à Telegram Bot API via `fetch` nativo (Node 18+), sem biblioteca adicional. Endpoint: `POST /bot{TOKEN}/sendMessage`.
- **Configuração:** duas variáveis de ambiente — `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. Ambas lidas via `loadEnv()` do `config/env.js` existente, mas **não** adicionadas ao objeto retornado por `getEnv()` (são opcionais e não devem causar erro de validação se ausentes).
- **No-op gracioso:** se qualquer uma das duas variáveis estiver ausente ou vazia no momento do envio, a função retorna imediatamente sem chamar a API e sem logar nada.
- **Tratamento de falhas:** qualquer erro de rede ou resposta de erro da API é capturado internamente, logado via `console.error`, e a função retorna sem propagar — o chamador nunca precisa tratar erros do Telegram.
- **Sem instrumentação no escopo:** o serviço é criado, mas nenhum `notify()` é chamado em pontos existentes do código neste PR. A instrumentação acontece em PRs futuros, à escolha do desenvolvedor.
- **Sem retry:** por simplicidade, não há retry automático. Se o envio falhar, o log é suficiente.

## Testing Decisions

- Bons testes verificam **comportamento externo**: se a função chama a API correta com o payload correto, se retorna sem lançar quando a API falha, e se é no-op quando as variáveis estão ausentes.
- **Módulo a testar:** `telegram.service.js` — interface simples e testável em isolamento.
- **Abordagem:** mockar `fetch` globalmente no escopo do teste e verificar chamadas. Seguir o padrão mais simples possível (Jest ou Node test runner nativo).

## Out of Scope

- Instrumentação de pontos específicos do backend (`presell.created`, `error.critical`, etc.) — será feito separadamente.
- Recebimento de mensagens / webhook do Telegram.
- Múltiplos destinatários ou roteamento de notificações por tipo.
- Retry automático com backoff.
- Validação das variáveis de ambiente no boot da aplicação.
- Interface de configuração via painel admin.

## Further Notes

- O `chat_id` pode ser obtido enviando uma mensagem para o bot e consultando `https://api.telegram.org/bot{TOKEN}/getUpdates`.
- Futuramente, a lista de tipos nomeados pode ser centralizada em `contracts/` como enum ou constante.
- Referência: [issue #161](https://github.com/Matheus-96/presell-creator/issues/161)
