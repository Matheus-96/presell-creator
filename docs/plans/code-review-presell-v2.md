# Plano: Code Review — PR feat/presell-v2

> **Status:** Em andamento
> **Criado em:** 2026-06-16
> **Origem:** Branch feat/presell-v2 vs master (14 commits, 53 arquivos, ~4700 linhas não-teste)

## 1. O que estamos revisando

O PR implementa o subsistema Presells V2 completo: tabela, CRUD admin, análise de URL por IA (async job), renderização SSR via esbuild, e editor frontend com seções reutilizáveis (hero, FAQ, testimonials, footer). O objetivo desta revisão é identificar problemas de correctude, segurança e arquitetura antes do merge — excluindo análise de testes unitários.

## 2. Fora do escopo

- Arquivos de teste (`__tests__/`, `.test.tsx`, `.test.js`)
- Revisão de cobertura de testes
- Revisão do arquivo `.sandcastle/`

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | Sections renderizadas server-side via esbuild bundle | Presell V2 é HTML estático servido por rota pública | Build step obrigatório antes de iniciar o backend |
| AD-2 | Async job pattern para analyze-url (IA) | Chamada IA pode levar 30–90s | Frontend faz polling em `GET /jobs/:jobId` |
| AD-3 | sections_json como JSON blob (sem schema em DB) | Flexibilidade para adicionar tipos de seção sem migration | Validação delegada ao Zod no backend |
| AD-4 | patchSection genérico com TypeScript discriminated union | Type-safe em tempo de compilação | Casting interno necessário (`as SectionOfType<T>`) |
| AD-5 | Componentes frontend < 150 linhas (AD do projeto) | Manutenibilidade | PresellsV2NewPage.tsx (344 linhas) viola este AD |

## 4. Checklist de revisão — itens críticos rastreados

- RF-1: Slug duplicado deve retornar 409 com mensagem clara
- RF-2: Análise de URL por IA deve ter timeout de 90s e tratamento de erro mapeado
- RF-3: `rendered_html` nunca pode ser servido NULL como 200 OK
- RF-4: Todas rotas admin devem exigir auth + CSRF
- RNF-1: Nenhum arquivo frontend pode exceder 150 linhas (AD do projeto)
- RNF-2: Nenhuma query SQL deve usar concatenação de string (SQL injection)
- RNF-3: `extractAffiliateUrl` não deve vazar erros silenciosos

## 5. Critérios de Aceite Globais

- [ ] Nenhum arquivo frontend ultrapassa 150 linhas após ajustes
- [ ] Detecção de slug duplicado usa `error.code` (não string matching)
- [ ] `rendered_html` NULL retorna 503/503, não 200 vazio
- [ ] `ERROR_MESSAGES` do frontend em sync com `errorCode` do backend
- [ ] `extractAffiliateUrl` está no service layer (não no controller)
- [ ] Build do bundle (`scripts/build-sections.js`) sem erros documentado no README/setup
- [ ] Todos os pontos de segurança revisados (rate limiting, SSRF, XSS)

## 6. Tasks

### Fase 1: Fundação — DB, Repository e Contracts
> Entrega: camadas de persistência e contratos de API validados como corretos e seguros

#### Task 1: Revisar migration + testSchema
- **Prova:** Schema da tabela `presells_v2` é consistente entre migration e testSchema
- **Done-when:**
  - [ ] `backend/src/db/migrations.js` — verificar que migration 013 está correta (tipos, índices, NOT NULL)
  - [ ] `backend/src/db/testSchema.js` — confirmar que replica migration 013 fielmente (sem divergência de colunas/tipos)
  - [ ] Anotar qualquer divergência entre os dois
- **Verificar:** `diff <(grep -A20 "013_presells_v2" backend/src/db/migrations.js) <(grep -A20 "presells_v2" backend/src/db/testSchema.js)`
- **Balizador:** Se os dois schemas definem as mesmas colunas com os mesmos tipos, está no caminho certo.

#### Task 2: Revisar presellV2Repository
- **Prova:** Todas queries usam prepared statements e erros são mapeados corretamente
- **Done-when:**
  - [ ] Confirmar que nenhuma query usa concatenação de string (SQL injection)
  - [ ] Avaliar `isUniqueSlugError()` — string matching em mensagem de erro é frágil; propor uso de `error.code === 'SQLITE_CONSTRAINT_UNIQUE'`
  - [ ] Verificar que `createPresellV2` retorna objeto completo (extra query aceitável ou não?)
  - [ ] Anotar finding com severidade e proposta de fix
- **Verificar:** `grep -n "sql\|query\|db.prepare\|isUniqueSlug" backend/src/repositories/presellV2Repository.js`
- **Balizador:** Se todas as queries passam por `db.prepare()`, a camada de repositório é segura.

#### Task 3: Revisar contracts/presellsV2.js
- **Prova:** Schema Zod é consistente e não tem dual-accept desnecessário
- **Done-when:**
  - [ ] Identificar se aceitar `affiliateUrl` + `affiliate_url` é intencional ou confusão de API
  - [ ] Verificar que `sections` schema valida `type`, `order` e `props` corretamente
  - [ ] Confirmar que `parseSections` com fallback `[]` não mascara dados corrompidos silenciosamente
  - [ ] Listar campos opcionais vs. obrigatórios e verificar consistência com o banco
- **Verificar:** Ler `backend/src/contracts/presellsV2.js` completo
- **Balizador:** Se o schema Zod mapeia 1:1 com as colunas da tabela (sem ambiguidade), está no caminho certo.

---
**Checkpoint Fase 1:** Findings documentados para DB/Repository/Contracts. Prosseguir para backend lógica.

---

### Fase 2: Backend — Services, Controllers e Routes
> Entrega: lógica de negócio, segurança e tratamento de erros validados

#### Task 4: Revisar sectionsRenderer + build-sections
- **Prova:** O pipeline esbuild → require → renderToStaticMarkup não tem pontos cegos
- **Done-when:**
  - [ ] Verificar que `sectionsRenderer.js` trata ausência de bundle (arquivo não existe)
  - [ ] Confirmar que `registry` é validado como não-vazio antes de usar
  - [ ] Revisar `scripts/build-sections.js` — externals corretos? saída no lugar certo?
  - [ ] Verificar se `sections.bundle.js` está no `.gitignore` (deve estar — gerado)
- **Verificar:** `cat backend/src/services/sectionsRenderer.js && cat scripts/build-sections.js && grep sections.bundle .gitignore`
- **Balizador:** Se `sectionsRenderer.js` lança erro descritivo quando bundle ausente, o risco de falha silenciosa está mitigado.

#### Task 5: Revisar analyzeUrlForSections
- **Prova:** Integração com IA tem timeout, tratamento de erro e sem SSRF
- **Done-when:**
  - [ ] Confirmar AbortSignal timeout de 90s está implementado corretamente
  - [ ] Verificar se `url` passada pelo usuário é validada antes de ser fetched (SSRF risk: acesso a IPs internos?)
  - [ ] Confirmar que JSON parse com fallback (strip markdown backticks) não passa dados malformados adiante
  - [ ] Verificar que `normalizeSections` garante presença de `hero` + `footer` sempre
  - [ ] Checar se API key do OpenRouter está em env var (não hardcoded)
- **Verificar:** `grep -n "timeout\|AbortSignal\|OPENROUTER\|process.env\|affiliateUrl" backend/src/services/v2/analyzeUrlForSections.js`
- **Balizador:** Se a URL do usuário passa por validação de domínio ou pelo menos não acessa `localhost`/IPs privados, o risco de SSRF é mitigado.

#### Task 6: Revisar adminPresellsV2Controller
- **Prova:** Lógica de negócio está na camada certa e erros são tratados
- **Done-when:**
  - [ ] Avaliar `extractAffiliateUrl` no controller — é domain logic, deve estar no service
  - [ ] Verificar comportamento quando `rendered_html` fica NULL (create falha parcialmente)
  - [ ] Confirmar que `updateV2` não sobrescreve `affiliateUrl` silenciosamente sem o usuário saber
  - [ ] Checar tratamento de `PresellV2SlugTakenError` → response 409 com body útil
- **Verificar:** Ler `backend/src/controllers/adminPresellsV2Controller.js` completo
- **Balizador:** Se `extractAffiliateUrl` for proposta de mover para service e o comportamento de update estiver documentado na API, está no caminho certo.

#### Task 7: Revisar routes + publicController + createApp
- **Prova:** Todas rotas admin têm auth/CSRF e rotas públicas têm proteções adequadas
- **Done-when:**
  - [ ] Confirmar que `requireApiAuth` + `verifyApiCsrf` estão em todas as rotas de escrita admin
  - [ ] Verificar que `getPublicPresellV2` retorna 404 quando presell não existe (não 200 vazio)
  - [ ] Confirmar que `rendered_html` NULL retorna 503 ou 404 (não 200 com body vazio)
  - [ ] Verificar que async job cleanup (TTL 5 min) não vaza memória em produção
  - [ ] Confirmar que `/api/admin/presells-v2/analyze-url` tem rate limiting
- **Verificar:** `grep -n "requireApiAuth\|verifyApiCsrf\|rendered_html\|jobTtl\|rate" backend/src/routes/apiAdminPresellsV2*.js backend/src/controllers/publicController.js`
- **Balizador:** Se todas as rotas de escrita passam pelos middlewares de auth, a camada de segurança está fechada.

---
**Checkpoint Fase 2:** Findings de backend documentados. Prosseguir para frontend.

---

### Fase 3: Frontend — Pages, Sections, Components e API Client
> Entrega: componentes validados quanto a tamanho, lógica e consistência com o backend

#### Task 8: Revisar PresellsV2NewPage (violação de AD)
- **Prova:** Arquivo está acima de 150 linhas e precisa ser dividido
- **Done-when:**
  - [ ] Confirmar que o arquivo tem 344 linhas (AD-5 é violado)
  - [ ] Identificar as três fases internas: `FormPhase` (URL input), `AnalyzingPhase` (polling), `PreviewPhase` (slug + sections)
  - [ ] Propor split em componentes: `NewPresellForm`, `AnalyzingPanel`, `PreviewAndSave` — cada um < 150 linhas
  - [ ] Verificar se `ERROR_MESSAGES` hardcoded no frontend está em sync com `errorCode` do backend (mapear)
- **Verificar:** `wc -l frontend/src/features/presells-v2/pages/PresellsV2NewPage.tsx`
- **Balizador:** Se a proposta de split resultar em 3 componentes menores, cada um < 150 linhas, a violação de AD está endereçada.

#### Task 9: Revisar Editors (FaqEditor, TestimonialsEditor, FooterEditor, HeroEditor)
- **Prova:** Código duplicado entre editors é identificado e proposta de abstração é válida
- **Done-when:**
  - [ ] Listar campos e lógica idêntica entre FaqEditor, TestimonialsEditor e FooterEditor
  - [ ] Verificar que `patchSection` genérico funciona corretamente para cada tipo (sem edge cases)
  - [ ] Avaliar HeroEditor — color picker + input text em sync correto?
  - [ ] Confirmar que cada editor está abaixo de 150 linhas (todos OK segundo análise prévia)
  - [ ] Propor extração de `ListEditor` genérico (add/remove/list pattern) se duplicação > 50%
- **Verificar:** Ler os 4 editors e comparar estrutura
- **Balizador:** Se os 3 list-editors (FAQ/Testimonials/Footer) têm > 60% de código idêntico, a extração de `ListEditor` é justificada.

#### Task 10: Revisar presells-v2-api.ts + admin-routes + route
- **Prova:** API client é type-safe e rotas frontend estão corretas
- **Done-when:**
  - [ ] Verificar `payload as unknown as Record<string, unknown>` — casting duplo é necessário ou há alternativa type-safe?
  - [ ] Confirmar que todos os endpoints do backend têm correspondente no api client
  - [ ] Verificar que `admin-routes.tsx` adiciona a rota `/presells-v2` com lazy loading correto
  - [ ] Confirmar que `presells-v2.route.tsx` define rotas aninhadas corretamente
- **Verificar:** `grep -n "as unknown\|as Record\|fetch\|endpoint" frontend/src/features/presells-v2/lib/presells-v2-api.ts`
- **Balizador:** Se o casting duplo tem comentário explicando o motivo ou é substituído por type guard, está resolvido.

#### Task 11: Revisar Section components (Registry, Sections, SectionsPreview)
- **Prova:** Registry pattern é correto e keys do React são estáveis
- **Done-when:**
  - [ ] Verificar `sections/index.ts` — import side-effects estão todos presentes?
  - [ ] Confirmar que `registry.ts` não tem seções registradas duplicadas
  - [ ] Verificar key em `SectionsPreview` — `${section.type}-${index}` é instável; propor `${section.order}-${section.type}`
  - [ ] Confirmar que `types.ts` define discriminated union corretamente para todos os tipos
  - [ ] Verificar que novos tipos de seção podem ser adicionados sem alterar código existente
- **Verificar:** Ler `sections/index.ts`, `registry.ts`, `SectionsPreview.tsx`, `types.ts`
- **Balizador:** Se adicionar um novo tipo de seção requer apenas: (1) criar arquivo, (2) registrar em index.ts — sem alterar patchSection ou EditPage — o pattern é extensível.

---
**Checkpoint Fase 3:** Todos os findings documentados. Consolidar relatório final.

---

### Fase 4: Consolidação — Relatório e Priorização
> Entrega: documento de findings priorizados por severidade, pronto para PR comments

#### Task 12: Consolidar findings e propor ações
- **Prova:** Todos os findings das fases 1-3 têm severidade e ação definidas
- **Done-when:**
  - [ ] Agrupar findings em: **Blocker** (deve corrigir antes do merge) | **Major** (deve corrigir antes ou em follow-up imediato) | **Minor** (nice-to-have)
  - [ ] Blockers esperados: (a) PresellsV2NewPage > 150 linhas, (b) isUniqueSlugError string matching, (c) rendered_html NULL retorna 200
  - [ ] Majors esperados: (a) extractAffiliateUrl no controller, (b) SSRF em analyze-url, (c) ERROR_MESSAGES sem sync
  - [ ] Minors esperados: (a) key instável em SectionsPreview, (b) casting duplo em api.ts, (c) ListEditor genérico
  - [ ] Para cada Blocker, escrever PR comment com localização exata (arquivo:linha) e fix sugerido
- **Verificar:** Relatório contém pelo menos 1 Blocker, 3 Majors, 3 Minors
- **Balizador:** Se o autor do PR pode resolver todos os Blockers em < 2h, o escopo de revisão está calibrado.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Bundle esbuild ausente quebra o backend silenciosamente | Média | Alto | Task 4 — verificar require com try/catch |
| SSRF via analyze-url (acesso a IPs internos) | Baixa | Alto | Task 5 — validar URL antes de fetch |
| rendered_html NULL retorna 200 OK vazio para usuário final | Média | Médio | Task 7 — corrigir publicController |
| PresellsV2NewPage viola AD de 150 linhas | Alta (confirmado) | Médio | Task 8 — propor split obrigatório |
| ERROR_MESSAGES desincronizados causam mensagens erradas para o usuário | Baixa | Baixo | Task 10 — mapear e sincronizar |

## 8. Perguntas em aberto

- [ ] O dual-accept de `affiliateUrl`/`affiliate_url` no Zod schema é intencional (compatibilidade legada) ou acidente?
- [ ] A mudança silenciosa de `affiliateUrl` ao editar hero CTA é comportamento documentado ou bug?
- [ ] Existe rate limiting no endpoint `analyze-url`? (cloud infra ou código?)
- [ ] O bundle `sections.bundle.js` é gerado no CI antes do start do backend?
