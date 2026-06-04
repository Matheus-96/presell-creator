# Plano: SSR — Renderização server-side de presells via HTML estático

> **Status:** Rascunho
> **Criado em:** 2026-06-04
> **Origem:** [issue #160](https://github.com/Matheus-96/presell-creator/issues/160) · [PRD](../prd-ssr-presells.md)

## 1. O que estamos construindo

Hoje `/p/:slug` serve o `index.html` da SPA — o crawler do Google encontra uma página vazia e rejeita o anúncio. Vamos gerar um HTML estático completo para cada presell no momento do save e armazená-lo no banco. O Express passa a servir esse HTML diretamente, garantindo que o conteúdo seja visível sem JavaScript.

## 2. Fora do escopo

- SSR para o painel admin (permanece SPA)
- Geração de HTML para presells `draft`
- Invalidação de cache CDN
- Sitemap ou indexação automática no Google Search
- Preview SSR no editor de presell

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | HTML armazenado no banco (`rendered_html TEXT`) | Mantém presell e HTML sincronizados no mesmo store; evita dessincronização disco/DB em deploys | Queries de update passam a incluir o campo; SELECT de `/p/:slug` carrega o HTML |
| AD-2 | Templates React compilados via esbuild em build time | Separação clara entre compilação (build) e execução (runtime); sem overhead de transpilação em produção | Novo step `build:templates` no processo de build; backend importa `templates.bundle.js` |
| AD-3 | `renderToStaticMarkup` sem hidratação client-side | HTML puramente estático, sem atributos React; menor payload, sem bundle JS necessário | Não é possível reidratar no cliente sem bundle separado; interatividade fica no JS inline mínimo |
| AD-4 | Regenerar em todo `savePresell()` — criar e atualizar | HTML nunca fica desatualizado; sem estado "dirty" para gerenciar | Falha de renderização não bloqueia o save (try/catch + log) |
| AD-5 | CSS servido em rota estável `/assets/presell.css` | Vite gera hashes no nome; HTML estático precisa de URL imutável entre builds | Backend expõe rota que lê o CSS mais recente do `frontend/dist/assets/` |
| AD-6 | Fallback para SPA quando `rendered_html IS NULL` | Presells legados continuam funcionando durante a transição | Script de migração elimina os NULLs de presells `published` no deploy |

## 4. Requisitos

- RF-1: O sistema deve gerar HTML estático para todo presell ao ser criado ou salvo.
- RF-2: A rota `GET /p/:slug` deve responder com o HTML armazenado quando disponível.
- RF-3: O HTML gerado deve incluir `<head>` completo (title, description, OG tags, canonical).
- RF-4: O HTML gerado deve incluir JS inline para tracking, analytics e redirecionamento CTA.
- RF-5: O deploy deve regenerar o HTML de todos os presells `published` existentes.
- RNF-1: Falha na renderização não deve impedir o save do presell.
- RNF-2: O bundle de templates deve ser gerado em build time, não em runtime.

## 5. Critérios de Aceite Globais

- [ ] `GET /p/:slug` de um presell `published` retorna 200 com `Content-Type: text/html` e conteúdo real (headline visível no HTML)
- [ ] O HTML retornado contém `<meta property="og:title">` com o título do presell
- [ ] O HTML retornado contém `<link rel="canonical">` com a URL correta
- [ ] O Google Pixel é injetado no HTML quando `google_pixel` está configurado
- [ ] O CTA redireciona corretamente com tracking params da URL do visitante
- [ ] Salvar um presell atualiza o `rendered_html` no banco
- [ ] Presells `draft` continuam sem `rendered_html` gerado
- [ ] Build limpo: `npm run build:split` sem erros
- [ ] Testes passando: `npm test --workspace backend`

## 6. Tasks

---

### Fase 1: Tracer Bullet — pipeline E2E mínimo
> Entrega: um presell salvo gera HTML no banco; `GET /p/:slug` serve esse HTML

---

#### Task 1: Migration + métodos de repositório para `rendered_html`

- **Prova:** o schema aceita e persiste o HTML; o repositório expõe leitura e escrita do campo.
- **Done-when:**
  - [x] Migration `010_add_rendered_html` executada: coluna `rendered_html TEXT DEFAULT NULL` na tabela `presells`
  - [x] `updatePresell` e `createPresell` no repositório incluem `rendered_html` no INSERT/UPDATE
  - [x] `getPublishedPresell` retorna o campo `rendered_html`
- **Verificar:** `node -e "require('./backend/src/db/migrations'); const db = require('./backend/src/db/connection').db; console.log(db.prepare('PRAGMA table_info(presells)').all().map(c => c.name))"`
- **Balizador:** Se a saída incluir `rendered_html`, está no caminho certo.

---

#### Task 2: Script esbuild para bundle dos templates React

- **Prova:** os templates `.tsx` do frontend são compiláveis para um módulo JS que o backend pode importar via `require()`.
- **Done-when:**
  - [x] Script `scripts/build-templates.js` criado na raiz do repo
  - [x] Script compila `frontend/src/features/presells/templates/index.ts` para `backend/src/templates/templates.bundle.js` via esbuild (target: node, format: cjs, bundle: true)
  - [x] O bundle exporta `{ registry }` — o mapa `templateId → ReactComponent` já existente no frontend
  - [x] `npm run build:templates` adicionado ao `package.json` raiz e ao `build:split`
  - [x] `backend/src/templates/templates.bundle.js` listado no `.gitignore`
- **Verificar:** `node -e "const r = require('./backend/src/templates/templates.bundle.js'); console.log(Object.keys(r.registry))"`
- **Balizador:** Se imprimir os 8 IDs de template (`offer-modal`, `app-ad`, etc.), o bundle está correto.

---

#### Task 3: Serviço `presellRenderer`

- **Prova:** dado um objeto presell com dados reais, o serviço retorna uma string HTML com o conteúdo do presell visível.
- **Done-when:**
  - [x] `backend/src/services/presellRenderer.js` criado
  - [x] Exporta `renderPresellHtml(presell): string`
  - [x] Usa `react-dom/server` → `renderToStaticMarkup` com o componente do bundle
  - [x] Retorna documento HTML completo (<!doctype html> + head mínimo + body com o template)
  - [x] Lança erro descritivo quando `templateId` não existe no bundle
- **Verificar:** `node -e "const r = require('./backend/src/services/presellRenderer'); console.log(r.renderPresellHtml({id:1,slug:'t',template:'offer-modal',title:'T',headline:'H',subtitle:'S',cta_text:'CTA',affiliate_url:'https://a.com',settings_json:'{}',bullets:'',body:''}).substring(0,200))"`
- **Balizador:** Se imprimir HTML com `<!doctype html>` e o texto `H` (headline), o serviço funciona.

---

#### Task 3T: Testes — `presellRenderer`

- **Cobre:** lógica de renderização em `presellRenderer`
- **Done-when:**
  - [x] Dado presell com headline `"Headline Teste"`, o HTML contém `"Headline Teste"`
  - [x] Dado presell com `slug = "meu-presell"`, o HTML contém `canonical` com `/p/meu-presell`
  - [x] Dado presell com `google_pixel = "AW-123"`, o HTML contém `"AW-123"`
  - [x] Dado presell com `google_pixel = null`, o HTML não contém código de pixel
  - [x] Dado `templateId` inexistente, `renderPresellHtml` lança erro
- **Verificar:** `npm test --workspace backend -- --testPathPattern presellRenderer`

---

**Checkpoint Fase 1:** `npm run build:templates` sem erros + testes de `presellRenderer` passando + verificação manual do bundle.

---

### Fase 2: Serving & Wiring
> Entrega: presells salvos atualizam o HTML; `GET /p/:slug` serve HTML real; CSS carrega

---

#### Task 4: Wiring — disparar `presellRenderer` no `savePresell`

- **Prova:** ao salvar um presell via API, o `rendered_html` no banco é atualizado automaticamente.
- **Done-when:**
  - [x] `presellService.savePresell()` chama `renderPresellHtml(presell)` após o save no repositório
  - [x] Em caso de erro na renderização, loga o erro e não lança exceção (save continua)
  - [x] `presellRepository.updatePresell` e `createPresell` recebem e persistem `rendered_html`
  - [x] Presells com `status = 'draft'` também geram HTML (simplifica a lógica; HTML de draft não é servido publicamente)
- **Verificar:** via API ou sqlite3: salvar um presell e checar `SELECT rendered_html IS NOT NULL FROM presells WHERE id = ?`
- **Balizador:** Se a coluna estiver preenchida após o save, o wiring está correto.

---

#### Task 5: Rota `GET /p/:slug` — servir HTML estático

- **Prova:** visitar `/p/slug-existente` retorna o HTML armazenado, não o `index.html` da SPA.
- **Done-when:**
  - [x] `createPublicPresellSpaHandler` substituído por handler que lê `rendered_html` do banco
  - [x] Se `rendered_html` não for NULL: `res.set('Content-Type', 'text/html').send(rendered_html)`
  - [x] Se `rendered_html` for NULL (legado): fallback para `res.sendFile(frontendDistIndexFile)`
  - [x] Se presell não existir ou não for `published`: 404
- **Verificar:** `curl -s http://localhost:3000/p/<slug> | head -5` deve mostrar `<!doctype html>` com conteúdo real
- **Balizador:** Se o `curl` mostrar o headline do presell no HTML, a rota está correta.

---

#### Task 6: CSS estável + head completo com OG tags

- **Prova:** o HTML gerado carrega o CSS corretamente e tem metadados completos.
- **Done-when:**
  - [x] Backend expõe rota `/assets/presell.css` que serve o arquivo CSS mais recente de `frontend/dist/assets/*.css`
  - [x] `presellRenderer` inclui no `<head>`: `<link rel="stylesheet" href="/assets/presell.css">`, `<title>`, `<meta name="description">`, tags OG (`og:title`, `og:description`, `og:image`, `og:type`), `<link rel="canonical">`
  - [x] `og:image` usa a URL absoluta da imagem do presell (via `mediaPathService`)
- **Verificar:** `curl -s http://localhost:3000/p/<slug> | grep -E 'og:|canonical|presell.css'`
- **Balizador:** Se as tags aparecerem com os valores corretos do presell, a task está completa.

---

#### Task 6T: Testes — rota `GET /p/:slug`

- **Cobre:** comportamento público da rota após a mudança de SPA para HTML estático
- **Done-when:**
  - [x] Presell `published` com `rendered_html` preenchido → 200, `Content-Type: text/html`, HTML contém o conteúdo armazenado
  - [x] Presell `published` com `rendered_html = NULL` → 200, fallback para SPA index.html
  - [x] Presell `draft` → 404
  - [x] Slug inexistente → 404
  - [x] Padrão de mock seguido de `publicRoutes.test.js` (jest.doMock + supertest)
- **Verificar:** `npm test --workspace backend -- --testPathPattern publicRoutes`

---

**Checkpoint Fase 2:** build limpo + testes de rota passando + verificação manual no browser (CSS carregado, OG tags corretas no `<head>`).

---

### Fase 3: Tracking JS + Migração
> Entrega: tracking e analytics funcionando; todos os presells `published` servem HTML

---

#### Task 7: JS inline de tracking e analytics

- **Prova:** ao visitar um presell via HTML estático, os eventos de analytics são registrados e o CTA redireciona com os tracking params da URL.
- **Done-when:**
  - [ ] `presellRenderer` injeta `<script>` inline no `<body>` com:
    - Captura de `trackingParam` da query string (`?gclid=...`)
    - Disparo de `POST /api/public/presells/:slug/events` com `eventType: "page_view"`
    - Handler de clique no CTA: chama `POST /api/public/presells/:slug/redirect` e redireciona para a URL retornada
    - Injeção do Google Pixel snippet quando `googlePixelId` está presente
  - [ ] O script não usa nenhuma dependência externa (vanilla JS)
  - [ ] Todos os 8 templates usam `data-cta-button` no elemento do CTA; o JS inline usa `querySelector('[data-cta-button]')` para registrar o handler
- **Verificar:** no browser, abrir DevTools → Network → visitar `/p/:slug` → confirmar requisição `page_view` e clique no CTA disparando redirect
- **Balizador:** Se os eventos aparecerem no banco (`SELECT * FROM events ORDER BY id DESC LIMIT 5`), o tracking está funcionando.

---

#### Task 8: Script de migração para presells `published` existentes

- **Prova:** após rodar o script, nenhum presell `published` tem `rendered_html = NULL`.
- **Done-when:**
  - [ ] Script `scripts/migrate-render-presells.js` criado na raiz
  - [ ] Busca todos os presells com `status = 'published' AND rendered_html IS NULL`
  - [ ] Para cada um, chama `renderPresellHtml` e salva com `UPDATE`
  - [ ] Execução idempotente: rodar duas vezes não duplica trabalho
  - [ ] Logs de progresso e erros por presell
  - [ ] Script integrado ao processo de deploy (ex: chamado após `npm run build:split`)
- **Verificar:** `node scripts/migrate-render-presells.js` → output mostra `N presells migrados, 0 erros`
- **Balizador:** `SELECT COUNT(*) FROM presells WHERE status='published' AND rendered_html IS NULL` deve retornar 0.

---

#### Task 8T: Testes — script de migração

- **Cobre:** lógica idempotente e cobertura do script de migração
- **Done-when:**
  - [ ] Com 3 presells `published` sem `rendered_html`: após migração, todos têm HTML
  - [ ] Presell `draft` sem `rendered_html`: não é processado pelo script
  - [ ] Presell `published` com `rendered_html` já preenchido: não é reprocessado
  - [ ] Falha de renderização em 1 presell: script continua e reporta erro, os demais são migrados
- **Verificar:** `npm test --workspace backend -- --testPathPattern migrate`

---

**Checkpoint Fase 3:** todos os critérios de aceite globais atendidos + testes passando + verificação manual do tracking no browser.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Templates usam `window`/`document` no render direto — `renderToStaticMarkup` lança erro | Alta | Alto | Auditar todos os 8 templates antes da Task 3; mover refs de browser para `useEffect` |
| CSS com hash muda a cada build, quebrando HTMLs já gerados no banco | Média | Alto | Rota `/assets/presell.css` estável resolve; regenerar HTML no próximo save também corrige |
| Bundle esbuild falha com algum import de browser (ex: `import.meta`, CSS modules) | Média | Médio | Testar bundle na Task 2 com todos os templates; isolar problemas cedo |
| `rendered_html` grande aumenta tempo de SELECT em queries de listagem | Baixa | Baixo | Garantir que queries de listagem (`listPresells`, `listPresellCollection`) não selecionam `rendered_html` |

## 8. Perguntas em aberto

Nenhuma.
