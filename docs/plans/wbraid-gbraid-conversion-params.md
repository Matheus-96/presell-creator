# Plano: Passar wbraid/gbraid nos eventos de conversão Google Ads

> **Status:** Concluído
> **Criado em:** 2026-06-05
> **Origem:** Conversa em 2026-06-05

## 1. O que estamos construindo

O gtag já captura `wbraid` e `gbraid` automaticamente via `gtag('config')` quando esses parâmetros estão na URL, mas para iOS o Google recomenda passá-los **explicitamente** no payload de `gtag('event','conversion',{...})` — tanto no disparo de pageview quanto no de CTA — garantindo atribuição mesmo em cenários onde o auto-tagging pode falhar (ex.: redirecionamentos antes do carregamento do gtag). O restante da stack (armazenamento em `params_json`, repasse à URL do afiliado) já funciona.

## 2. Fora do escopo

- Exibir `wbraid`/`gbraid` no dashboard de analytics da presell
- Qualquer alteração em banco, migrations ou contrato de API

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | Passar `wbraid`/`gbraid` via `Object.assign` no objeto do evento gtag, lendo de `params` (já populado do `location.search`) | Mantém o script inline sem nova variável global; reutiliza o `params` já existente | Se nenhum dos dois estiver na URL, `clickIds` fica vazio e o comportamento atual é preservado |
| AD-2 | Não alterar a lógica do `resolveRedirect` server-side | `wbraid`/`gbraid` já passam corretamente ao afiliado pelo `buildRedirectUrl` | Sem impacto em rotas ou contratos |

## 4. Requisitos

- RF-1: Se `params['wbraid']` ou `params['gbraid']` estiver presente na URL da presell, o valor deve ser incluído no payload de `gtag('event','conversion')` do page_view (quando configurado)
- RF-2: Se `params['wbraid']` ou `params['gbraid']` estiver presente, o valor deve ser incluído no payload de `gtag('event','conversion')` do CTA click (quando configurado)
- RNF-1: Quando nenhum dos dois estiver presente, o comportamento atual é preservado exatamente

## 5. Critérios de Aceite Globais

- [ ] HTML renderizado com `wbraid=ABC` na URL contém `wbraid` no objeto de conversão do pageview
- [ ] HTML renderizado com `gbraid=XYZ` na URL contém `gbraid` no objeto de conversão do CTA
- [ ] HTML renderizado sem `wbraid`/`gbraid` não contém essas chaves no objeto de conversão
- [ ] Build sem erros e testes passando

## 6. Tasks

### Fase 1: Tracer Bullet — click IDs chegam ao evento de conversão

> Entrega: HTML renderizado contém `wbraid`/`gbraid` no payload do gtag quando presentes na URL

#### Task 1: Modificar `renderTrackingScript` para incluir wbraid/gbraid nos eventos de conversão

- **Prova:** o script inline passa os click IDs ao gtag sem afetar conversões sem esses parâmetros
- **Done-when:**
  - [ ] Em `presellRenderer.js`, logo antes do `ctaRedirect` e do `pageviewConversionSnippet`, existe uma variável `clickIds` que lê `params['wbraid']` e `params['gbraid']`
  - [ ] `pageviewConversionSnippet`: usa `Object.assign({send_to:...},clickIds)` em vez do objeto literal plano
  - [ ] `ctaRedirect` (quando há conversão): usa `Object.assign({send_to:...,event_callback:...},clickIds)`
  - [ ] Quando não há `wbraid`/`gbraid` na URL, o resultado do `Object.assign` é idêntico ao comportamento anterior
- **Verificar:** abrir `/p/:slug?wbraid=TEST123` no browser e inspecionar o HTML fonte — procurar `wbraid` dentro do `gtag('event','conversion'`
- **Balizador:** o HTML fonte contém `Object.assign` (ou equivalente inline) com `wbraid`/`gbraid` quando presentes

#### Task 1T: Testes — click IDs nos eventos de conversão

- **Cobre:** lógica condicional de `wbraid`/`gbraid` em `renderTrackingScript`
- **Done-when:**
  - [ ] Caso feliz wbraid: presell com pixel + label CTA, URL com `wbraid=TEST` → HTML contém `wbraid` dentro do bloco de conversão do CTA
  - [ ] Caso feliz gbraid: presell com pixel + label pageview, URL com `gbraid=TEST` → HTML contém `gbraid` dentro do bloco de conversão do pageview
  - [ ] Sem click IDs: URL sem `wbraid`/`gbraid` → HTML não contém essas chaves nos blocos de conversão
  - [ ] Regressão: testes existentes de CTA e pageview (sem click IDs) continuam passando
- **Verificar:** `cd backend && npm test`
- **Balizador:** todos os testes do `presellRenderer.test.js` passam

---
**Checkpoint Fase 1:** build limpo + HTML inspecionado manualmente com wbraid no fonte + `npm test` verde.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `Object.assign` aumentar tamanho do script inline | Baixa | Baixo — 1-2 linhas a mais | Não é problema; o script já é minificado inline |
| Google ignorar os click IDs explícitos quando já capturados via `gtag('config')` | Baixa | Nenhum — duplicate não causa erro, Google usa o primeiro | Seguro passar mesmo assim |

## 8. Perguntas em aberto

_(nenhuma)_
