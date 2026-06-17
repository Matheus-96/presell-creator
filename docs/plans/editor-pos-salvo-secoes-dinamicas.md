# Plano: Editor Pós-Salvo + Seções Dinâmicas

> **Status:** Rascunho
> **Criado em:** 2026-06-13
> **Origem:** [GitHub Issue #177](https://github.com/victormatheus/presell-creator/issues/177)

## 1. O que estamos construindo

Duas melhorias complementares à presell V2: (1) a IA passa a decidir se inclui faq e testimonials com base na análise do produto — hero e footer são sempre obrigatórios — eliminando seções genéricas vazias; (2) uma nova página `/presells-v2/:id/edit` permite editar qualquer presell V2 já salva sem regerar do zero, com formulário estruturado à esquerda e preview ao vivo à direita, salvando via `PUT /api/admin/presells-v2/:id` que re-renderiza o HTML SSR.

## 2. Fora do escopo

- Reordenação de seções por drag-and-drop ou botões ↑↓
- Adição ou remoção de seções inteiras após a criação
- Regeneração de seções individuais com IA
- Edição do slug após a criação
- Edição da URL original analisada
- Upload de imagens (`imageUrl` e `avatarUrl` permanecem sempre `null`)

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | `normalizeSections` inclui faq/testimonials apenas se a LLM as retornou; hero e footer sempre presentes com defaults | Seções obrigatórias vs. opcionais explicitadas no código | Presells existentes no banco não são afetadas — têm sempre 4 seções e continuam editáveis |
| AD-2 | O slug não pode ser alterado pelo endpoint `PUT`; não é aceito no body | Imutabilidade da URL pública após criação | A página de edição exibe o slug como `readonly`, sem campo de edição |
| AD-3 | `ctaUrl` do Hero é a fonte da verdade para `affiliate_url` no banco no endpoint PUT | Evita campo duplicado e mantém o contrato existente | O endpoint extrai `affiliateUrl` de `sections.hero.props.ctaUrl` antes de persistir |
| AD-4 | Modais de add/remove operam apenas no estado local React; persistência ocorre somente no clique de "Salvar" | Consistente com o padrão da PresellsV2NewPage | Não há persistência parcial; o usuário pode descartar alterações fechando a aba |
| AD-5 | O endpoint PUT reutiliza a validação Zod (`zodSectionSchema`) já existente | Zero contrato novo para manter | Sections inválidas no body retornam 400 da mesma forma que o POST |
| AD-6 | `renderSectionsToHtml` é chamado no controller (não no repository) | Padrão existente no `createV2` | O repository recebe `renderedHtml` já pronto como parâmetro |

## 4. Requisitos

- RF-1: O sistema deve, na geração via IA, sempre incluir hero e footer; incluir faq e testimonials apenas se a LLM as retornar
- RF-2: O sistema deve recalcular `order` sequencialmente (hero → opcionais na ordem da LLM → footer) após normalizar
- RF-3: O sistema deve expor `PUT /api/admin/presells-v2/:id` que aceita `{ sections: Section[] }`, re-renderiza o HTML SSR e persiste as mudanças
- RF-4: O endpoint PUT deve retornar 404 para ID inexistente e 400 para body inválido
- RF-5: O frontend deve ter a rota `/presells-v2/:id/edit` com layout em duas colunas (formulário | preview)
- RF-6: O formulário deve ter campos específicos por tipo de seção (hero, faq, testimonials, footer)
- RF-7: Itens de lista (faq.items, testimonials.items, footer.links) devem ser adicionáveis via modal e removíveis via modal de confirmação
- RF-8: O slug deve ser exibido como `readonly` no topo da página de edição
- RF-9: Ao salvar com sucesso, o frontend deve redirecionar para `/presells-v2`
- RF-10: A listagem de presells V2 deve ter um link/botão "Editar" por item navegando para `/presells-v2/:id/edit`
- RNF-1: A atualização do HTML SSR deve ser síncrona no mesmo request do PUT (sem job assíncrono)

## 5. Critérios de Aceite Globais

- [ ] Gerar uma presell via IA com produto que não justifique FAQ: a presell criada tem só hero + footer (2 seções)
- [ ] Gerar uma presell via IA com produto que justifique todas: a presell tem hero + faq + testimonials + footer (4 seções)
- [ ] `GET /lp/:slug` após `PUT` reflete as seções editadas sem reload manual
- [ ] `PUT /api/admin/presells-v2/:id` retorna 404 para ID inexistente
- [ ] `PUT /api/admin/presells-v2/:id` retorna 400 para body sem sections
- [ ] Página de edição exibe preview ao alterar qualquer campo do formulário
- [ ] Modal de adicionar item confirma a adição; modal de remover exige confirmação
- [ ] Slug exibido como readonly na página de edição não pode ser editado
- [ ] Após salvar, o usuário é redirecionado para `/presells-v2`
- [ ] Listagem tem botão "Editar" por item
- [ ] Build sem erros, testes passando

## 6. Tasks

### Fase 1: Seções Dinâmicas — Valida a Lógica Central da IA
> Entrega: a IA gera entre 2 e 4 seções dependendo do produto; o código garante hero/footer sempre presentes e faq/testimonials apenas quando a LLM decidiu incluir

#### Task 1: Refatorar `normalizeSections` para seções opcionais

- **Prova:** valida que a função central de normalização produz o array correto independente do que a LLM retornar
- **Arquivo:** `backend/src/services/v2/analyzeUrlForSections.js`
- **Done-when:**
  - [ ] Se a LLM omitir faq, o resultado NÃO contém seção faq
  - [ ] Se a LLM omitir testimonials, o resultado NÃO contém seção testimonials
  - [ ] Se a LLM retornar ambas, o resultado as contém na ordem em que vieram
  - [ ] Hero é sempre o primeiro elemento e footer é sempre o último
  - [ ] Os valores de `order` são recalculados sequencialmente (0, 1, … N-1) após a normalização
  - [ ] Hero e footer com defaults quando a LLM os omite (mesmo comportamento atual)
- **Verificar:** `cd backend && npx jest analyzeUrlForSections --testPathPattern normalizeSections`
- **Balizador:** Se `normalizeSections(['hero', 'footer'])` retornar array de 2 elementos com orders 0 e 1, está no caminho certo.

#### Task 1T: Testes — `normalizeSections`

- **Cobre:** função `normalizeSections` em `analyzeUrlForSections.js`
- **Arquivo de teste:** `backend/src/__tests__/normalizeSections.test.js` (novo)
- **Done-when:**
  - [ ] Caso: só hero + footer → 2 seções, orders 0 e 1
  - [ ] Caso: hero + faq + footer → 3 seções, orders 0, 1, 2
  - [ ] Caso: hero + testimonials + footer → 3 seções, orders 0, 1, 2
  - [ ] Caso: todas as 4 → 4 seções, orders 0–3
  - [ ] Caso: LLM retorna hero+faq em qualquer ordem → hero sempre primeiro, footer sempre último
  - [ ] Caso: LLM omite hero → hero gerado com defaults; LLM omite footer → footer gerado com defaults
- **Verificar:** `cd backend && npx jest normalizeSections`

#### Task 2: Refatorar o prompt de geração para seções dinâmicas

- **Prova:** valida que a instrução dada à LLM muda seu comportamento de "sempre 4 fixas" para "2 a 4 conforme o produto"
- **Arquivo:** `backend/src/services/v2/analyzeUrlForSections.js`, função `buildSystemPrompt`
- **Done-when:**
  - [ ] O prompt declara explicitamente hero e footer como obrigatórios
  - [ ] O prompt declara faq e testimonials como opcionais, a incluir apenas se agregam valor
  - [ ] O prompt permite retornar entre 2 e 4 seções
  - [ ] O prompt mantém hero sempre primeiro e footer sempre último
  - [ ] A regra "EXATAMENTE 4 itens" foi removida do prompt
  - [ ] O schema de exemplo no prompt foi atualizado para mostrar uma variação com só 2 seções (hero + footer)
- **Verificar:** ler o output de `buildSystemPrompt()` e confirmar a ausência da regra rígida de 4
- **Balizador:** O texto do prompt não contém "EXATAMENTE 4" e contém "obrigatóri" para hero e footer.

---
**Checkpoint Fase 1:** `cd backend && npx jest` passa. `normalizeSections` com array `[hero, footer]` retorna 2 seções.

---

### Fase 2: Endpoint de Atualização — Prova o E2E do Backend
> Entrega: `PUT /api/admin/presells-v2/:id` funciona, re-renderiza o HTML e persiste as mudanças

#### Task 3: Repository + Controller + Rota `PUT /api/admin/presells-v2/:id`

- **Prova:** valida que backend aceita edições e atualiza o HTML SSR
- **Arquivos:**
  - `backend/src/repositories/presellV2Repository.js` — adicionar `updatePresellV2`
  - `backend/src/controllers/adminPresellsV2Controller.js` — adicionar `updateV2`
  - `backend/src/routes/apiAdminPresellsV2.js` — registrar `PUT /:id`
- **Done-when:**
  - [ ] `updatePresellV2({ id, sections, renderedHtml })` executa UPDATE em `presells_v2` com `sections_json`, `rendered_html`, `affiliate_url` e `updated_at = datetime('now')` (SQLite não atualiza automático)
  - [ ] `updateV2` valida o body com `zodSectionSchema` por item; retorna 400 se inválido
  - [ ] `updateV2` extrai `affiliateUrl` de `sections.find(s => s.type === 'hero').props.ctaUrl`
  - [ ] `updateV2` chama `renderSectionsToHtml(sections)` e passa o resultado ao repository
  - [ ] Retorna 200 com o presell atualizado no formato `serializePresellV2Detail`
  - [ ] Retorna 404 para ID inexistente
  - [ ] Rota registrada com `requireApiAuth` e `verifyApiCsrf`
- **Verificar:** `curl -X PUT http://localhost:3001/api/admin/presells-v2/1 -H "Content-Type: application/json" -d '{"sections":[...]}'` (via skill backend-curl)
- **Balizador:** `GET /api/admin/presells-v2/:id` após o PUT retorna as sections atualizadas e `updatedAt` renovado.

#### Task 3T: Testes — Endpoint `PUT /api/admin/presells-v2/:id`

- **Cobre:** rota PUT e comportamento do controller
- **Arquivo de teste:** `backend/src/__tests__/presellsV2Routes.test.js` (adicionar describe block)
- **Done-when:**
  - [ ] 200 com sections atualizadas após PUT válido
  - [ ] `rendered_html` atualizado (verificar via `GET /lp/:slug`)
  - [ ] `updatedAt` diferente do `createdAt` após o PUT
  - [ ] 404 para ID inexistente
  - [ ] 400 para body sem sections ou com section inválida
  - [ ] Slug não muda após o PUT
- **Verificar:** `cd backend && npx jest presellsV2Routes`

---
**Checkpoint Fase 2:** `cd backend && npx jest` passa. PUT → GET → `/lp/:slug` mostra HTML atualizado.

---

### Fase 3: Página de Edição — Frontend Completo
> Entrega: usuário pode editar qualquer presell V2 pelo admin, ver preview ao vivo e salvar

#### Task 4: Rota, API client e esqueleto da página de edição

- **Prova:** valida que a rota carrega o detail da presell e exibe o layout de duas colunas com preview
- **Arquivos:**
  - `frontend/src/features/presells-v2/lib/presells-v2-api.ts` — adicionar `getPresellV2ById` e `updatePresellV2`
  - `frontend/src/features/presells-v2/pages/PresellsV2EditPage.tsx` — criar página com layout (esqueleto)
  - `frontend/src/features/presells-v2/presells-v2.route.tsx` — registrar `/presells-v2/:id/edit`
- **Done-when:**
  - [ ] `getPresellV2ById(id)` chama `GET /admin/presells-v2/:id` e retorna `PresellV2Detail`
  - [ ] `updatePresellV2(id, { sections })` chama `PUT /admin/presells-v2/:id`
  - [ ] A rota `/presells-v2/:id/edit` renderiza `PresellsV2EditPage`
  - [ ] A página exibe o slug como campo `readonly` no topo
  - [ ] Layout em duas colunas: coluna esquerda (formulário placeholder) | coluna direita (`SectionsPreview` com as sections do GET)
  - [ ] Estado `sections` inicializado com os dados do GET detail via `useQuery`
  - [ ] Loading state enquanto carrega o detail
  - [ ] Error state se o GET falhar
- **Verificar:** navegar para `/presells-v2/:id/edit` — a página abre com o slug correto e o preview visível
- **Balizador:** O `SectionsPreview` exibe as seções da presell existente sem erro.

#### Task 5: Formulários por seção + modais de add/remove

- **Prova:** valida que alterar qualquer campo propaga ao preview em tempo real e que modais de add/remove funcionam
- **Arquivo:** `frontend/src/features/presells-v2/pages/PresellsV2EditPage.tsx`
- **Done-when:**
  - [ ] **Hero**: campos headline, subtitle, ctaText, ctaUrl (label "URL de afiliado"), bgColor; cada `onChange` chama `setSections(...)`
  - [ ] **FAQ**: campo título + lista de items; cada item tem question e answer; ícone de remoção por item abre modal de confirmação; botão "Adicionar pergunta" abre modal com formulário (question, answer)
  - [ ] **Testimonials**: campo título + lista de items (name, role, text); remoção e adição via modais
  - [ ] **Footer**: campo legalText + lista de links (label, url); remoção e adição via modais
  - [ ] Alterar qualquer campo atualiza `sections` e o `SectionsPreview` reflete a mudança imediatamente
  - [ ] Modal de adicionar: confirmar adiciona o item ao array local; cancelar fecha sem mudar estado
  - [ ] Modal de remover: confirmar remove o item; cancelar fecha sem mudar estado
  - [ ] Botão "Salvar alterações" chama `updatePresellV2` com o estado atual e redireciona para `/presells-v2` em sucesso
  - [ ] Em caso de erro no PUT: exibe mensagem de erro inline (não redireciona)
  - [ ] Sections de tipos ausentes (ex: presell só com hero+footer) não mostram accordion das opcionais
- **Verificar:** abrir a página de edição, mudar o headline do Hero — o preview atualiza. Adicionar uma pergunta no FAQ — aparece na lista. Remover — some após confirmação. Salvar — redireciona para a listagem.
- **Balizador:** O preview muda em tempo real sem latência de rede.

#### Task 5T: Testes — `PresellsV2EditPage`

- **Cobre:** interações do usuário na página de edição
- **Arquivo:** `frontend/src/features/presells-v2/__tests__/PresellsV2EditPage.test.tsx` (novo)
- **Done-when:**
  - [ ] Alterar o headline do Hero atualiza o preview (mudança visível no DOM)
  - [ ] Modal de adicionar FAQ item: preencher e confirmar → item aparece na lista
  - [ ] Modal de remover FAQ item: confirmar → item some da lista
  - [ ] Botão "Salvar alterações" chama `updatePresellV2` com as sections do estado atual
  - [ ] Em sucesso do PUT: `navigate` chamado com `/presells-v2`
  - [ ] Em erro do PUT: mensagem de erro exibida, sem redirecionamento
  - [ ] Slug exibido como readonly
- **Verificar:** `cd frontend && npx vitest run --reporter=verbose PresellsV2EditPage`

#### Task 6: Botão "Editar" na listagem

- **Prova:** valida a navegação da listagem para a página de edição
- **Arquivo:** `frontend/src/features/presells-v2/pages/PresellsV2ListPage.tsx`
- **Done-when:**
  - [ ] Cada item da lista tem um botão ou link "Editar"
  - [ ] Clicar em "Editar" navega para `/presells-v2/:id/edit`
  - [ ] Teste existente `PresellsV2ListPage.test.tsx` atualizado para verificar o botão "Editar"
- **Verificar:** listar presells → clicar "Editar" em qualquer item → página de edição abre com as sections corretas
- **Balizador:** O `id` da presell na URL de edição bate com o item clicado na listagem.

---
**Checkpoint Fase 3:** `cd frontend && npx vitest run` passa. Build `npm run build:frontend` sem erros. Fluxo completo: lista → editar → mudar campo → preview atualiza → salvar → lista.

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| LLM ignora instrução de seções opcionais e sempre retorna 4 | Alta | Médio | `normalizeSections` é a garantia; o prompt é best-effort. Testes cobrem `normalizeSections` independente do comportamento da LLM |
| `SectionsPreview` não aceita array dinâmico (hero+footer sem as do meio) | Média | Alto | Verificar o `registry.ts` antes de implementar — o componente mapeia `sections.map(s => registry[s.type])`, então funciona para qualquer subconjunto |
| Presells existentes com 4 seções quebram na página de edição | Baixa | Alto | A Task 5 trata a ausência de seções opcionais exibindo apenas os accordions das seções presentes |
| `updated_at` não existe na tabela `presells_v2` | Baixa | Alto | Verificar o schema em `db/migrations.js` antes da Task 3; adicionar coluna se ausente |

## 8. Perguntas em aberto

Nenhuma — todas resolvidas antes do início.

- [x] `presells_v2` tem `updated_at TEXT NOT NULL DEFAULT (datetime('now'))` (migration 013). O UPDATE deve setar explicitamente `updated_at = datetime('now')`, pois SQLite não atualiza automático.
- [x] `SectionsPreview` itera qualquer array via `.sort(order)` + `getSection(type)` e retorna `null` para tipos ausentes — funciona com hero+footer sem alteração.
