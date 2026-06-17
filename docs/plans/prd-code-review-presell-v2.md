# PRD: Code Review Estruturado — PR feat/presell-v2

## Problem Statement

O PR `feat/presell-v2` implementa um subsistema completo e novo de Presells V2, incluindo:
- Tabela de banco de dados com schema flexível JSON
- CRUD admin com autenticação e CSRF
- Análise de URL via IA com async job pattern e timeout
- Renderização SSR via esbuild + require dinamicamente
- Editor frontend com seções reutilizáveis (hero, FAQ, testimonials, footer)
- API client type-safe e rotas aninhadas no React

Essa mudança toca camadas críticas: banco de dados, segurança (auth/CSRF/SSRF), renderização server-side, e o contrato de API admin-frontend. Antes do merge, precisa-se validar correctude, segurança e aderência à arquitetura. A revisão manual estruturada é necessária porque testes unitários não cobrem decisões de arquitetura, integração de camadas, ou cenários de falha em produção.

## Solution

Executar uma revisão de código estruturada em 4 fases, com 12 tasks rastreadas, cada uma validando uma camada ou componente crítico:

- **Fase 1 (Fundação)**: DB, migrations, schema Zod e contracts validam-se mutuamente
- **Fase 2 (Backend)**: serviços, controllers e rotas implementam lógica correta, segura e com tratamento de erro
- **Fase 3 (Frontend)**: componentes respeitam restrições arquiteturais, são reutilizáveis e type-safe
- **Fase 4 (Consolidação)**: findings agrupam-se por severidade, propostas de fix, e priorização de ações

Ao fim, um conjunto de PR comments bloqueador, major e minor, permitindo ao autor corrigir antes do merge (ou documentar decisões intencionais).

## User Stories

1. Como revisor, quero validar que a migration 013 e o testSchema definem as mesmas colunas e tipos, para que o banco de dados seja consistente entre testes e produção.

2. Como revisor, quero confirmar que todas as queries no repository usam prepared statements (db.prepare), para que não haja risco de SQL injection.

3. Como revisor, quero avaliar se o erro de slug duplicado é detectado por `error.code === 'SQLITE_CONSTRAINT_UNIQUE'` (não por string matching), para que a detecção seja robusta.

4. Como revisor, quero verificar se o schema Zod aceita ambos `affiliateUrl` e `affiliate_url` intencionalmente ou se é confusão, para que o contrato seja claro.

5. Como revisor, quero confirmar que `parseSections` com fallback `[]` não mascara dados corrompidos silenciosamente, para que erros de validação sejam rastreáveis.

6. Como revisor, quero verificar que o sectionsRenderer carrega o bundle esbuild com try/catch descritivo, para que ausência de arquivo não quebre silenciosamente.

7. Como revisor, quero confirmar que a URL do usuário em `analyzeUrlForSections` é validada antes de fetch (SSRF check), para que não haja acesso a IPs internos ou localhost.

8. Como revisor, quero verificar que o timeout de 90s com AbortSignal está implementado corretamente, para que chamadas IA não travem o backend.

9. Como revisor, quero avaliar se `extractAffiliateUrl` está no service layer (não no controller), para que domain logic seja centralizada.

10. Como revisor, quero confirmar que `rendered_html` NULL retorna 503 (não 200 vazio), para que o cliente saiba que a presell não está pronta.

11. Como revisor, quero verificar que todas rotas admin têm `requireApiAuth` + `verifyApiCsrf`, para que não haja exposição de vulnerabilidades de segurança.

12. Como revisor, quero confirmar que `PresellsV2NewPage` é dividido em componentes < 150 linhas (AD do projeto), para que a arquitetura de componentes seja mantida.

13. Como revisor, quero mapear `ERROR_MESSAGES` do frontend com `errorCode` do backend, para que mensagens de erro sejam precisas e sincronizadas.

14. Como revisor, quero verificar se há rate limiting no endpoint `analyze-url`, para que não haja abuso de chamadas IA.

15. Como revisor, quero confirmar que duplicação entre FaqEditor, TestimonialsEditor e FooterEditor é documentada ou refatorada, para que código duplicado não cresça sem controle.

16. Como revisor, quero validar que React keys em `SectionsPreview` são estáveis (não `${section.type}-${index}`), para que re-renders não causem perda de estado.

17. Como revisor, quero confirmar que novos tipos de seção podem ser adicionados sem alterar `patchSection` ou `EditPage`, para que o pattern seja extensível.

18. Como revisor, quero verificar que o casting duplo `as unknown as Record<string, unknown>` tem comentário ou é substituído por type guard, para que type-safety seja mantido.

## Implementation Decisions

**AD-1: Renderização SSR via esbuild bundle**
- O Presell V2 é HTML estático servido por rota pública (`GET /public/presells/:slug`)
- O pipeline é: seções em memória → esbuild (build-time) → arquivo `.bundle.js` → require dinâmico no Node → renderToStaticMarkup
- Consequência: build step obrigatório antes de iniciar backend; ausência de bundle quebra silenciosamente sem try/catch

**AD-2: Async job pattern para analyze-url**
- Chamada IA pode levar 30–90s, então backend retorna job ID e frontend faz polling em `GET /api/admin/jobs/:jobId`
- Job tem TTL 5 min para evitar memory leak
- Erro: sem rate limiting documentado; timeout pode não estar implementado

**AD-3: sections_json como JSON blob (sem schema em DB)**
- Flexibilidade para adicionar tipos de seção sem migration
- Validação delegada ao Zod no backend
- Risco: dados corrompidos no JSON passam silenciosamente se fallback `[]` não valida

**AD-4: patchSection genérico com TypeScript discriminated union**
- Type-safe em tempo de compilação
- Casting interno necessário (`as SectionOfType<T>`)
- Risco: casting pode mascarar erros de tipo em runtime

**AD-5: Componentes frontend < 150 linhas (AD do projeto)**
- Manutenibilidade e reuso
- Violação: `PresellsV2NewPage.tsx` tem 344 linhas
- Blocker obrigatório antes do merge

**Dual-accept de affiliateUrl/affiliate_url**
- Schema Zod aceita ambos os nomes de campo
- Intenção desconhecida: compatibilidade legada ou acidente?
- Deve ser clarificado antes do merge

**Error handling para PresellV2SlugTakenError**
- Detecção via `error.code === 'SQLITE_CONSTRAINT_UNIQUE'` é mais robusta que string matching
- Response 409 com body útil esperado
- Risco: string matching é frágil e quebra se mensagem muda

## Testing Decisions

Um test é bom se valida comportamento externo, não detalhes de implementação. As verificações são por inspeção de código (sem executar testes unitários):

**Seam de integração (alto)**: cada task localiza o código relevante e verifica se o comportamento esperado existe ou se há gap.
- Task 1: migration 013 vs testSchema — são idênticas?
- Task 2: queries — passam por db.prepare() ou usam concatenação?
- Task 3: schema Zod — mapeia 1:1 com colunas da tabela?
- Tasks 4–11: lógica, segurança, tratamento de erro — estão presentes?
- Task 12: tamanho de arquivo — PresellsV2NewPage > 150?

**Seam de consolidação (médio)**: findings agrupam-se nas severidades esperadas, com severity e localização (arquivo:linha).
- Blockers esperados: (a) PresellsV2NewPage > 150, (b) error.code vs string matching, (c) rendered_html NULL retorna 200
- Majors esperados: (a) extractAffiliateUrl no controller, (b) SSRF sem validação, (c) ERROR_MESSAGES desincronizados
- Minors esperados: (a) key instável em React, (b) casting duplo sem comentário, (c) ListEditor genérico viável

**Antes do merge**, o autor resolve todos os Blockers. Majors podem ser filed como follow-up imediato. Minors podem esperar por próximo refactor.

## Out of Scope

- Revisão de cobertura de testes unitários (`__tests__/`, `.test.tsx`, `.test.js`)
- Análise de arquivo `.sandcastle/` (configuração de prompt)
- Refactoring além do necessário para aceitar o PR
- Validação de performance ou load testing

## Further Notes

### Riscos Mapeados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Bundle esbuild ausente quebra backend silenciosamente | Média | Alto | Task 4 — adicionar try/catch descritivo |
| SSRF via analyze-url (acesso a IPs internos/localhost) | Baixa | Alto | Task 5 — validar URL antes de fetch |
| rendered_html NULL retorna 200 OK vazio | Média | Médio | Task 7 — corrigir publicController para 503 |
| PresellsV2NewPage viola AD de 150 linhas | Alta ✓ | Médio | Task 8 — split obrigatório, 3 componentes |
| ERROR_MESSAGES desincronizados causam msg errada | Baixa | Baixo | Task 10 — mapear frontend ↔ backend |

### Perguntas em Aberto

1. Dual-accept de `affiliateUrl`/`affiliate_url` é intencional (compatibilidade legada) ou acidente?
2. Mudança silenciosa de `affiliateUrl` ao editar hero CTA — é comportamento documentado ou bug?
3. Rate limiting em `/api/admin/presells-v2/analyze-url` — está em código ou em cloud infra?
4. Bundle `sections.bundle.js` é gerado no CI antes de start do backend?

### Checkpoints de Fase

- **Checkpoint Fase 1**: Findings documentados para DB/Repository/Contracts. Prosseguir para backend lógica.
- **Checkpoint Fase 2**: Findings de backend documentados. Prosseguir para frontend.
- **Checkpoint Fase 3**: Todos os findings documentados. Consolidar relatório final.
- **Checkpoint Fase 4**: Findings priorizados por severidade, pronto para PR comments.

### Critérios de Aceite Global

- [ ] Nenhum arquivo frontend ultrapassa 150 linhas após ajustes
- [ ] Detecção de slug duplicado usa `error.code` (não string matching)
- [ ] `rendered_html` NULL retorna 503, não 200 vazio
- [ ] `ERROR_MESSAGES` frontend em sync com `errorCode` backend
- [ ] `extractAffiliateUrl` está no service layer (não no controller)
- [ ] Build do bundle (`scripts/build-sections.js`) documentado no README/setup
- [ ] Todos os pontos de segurança revisados (rate limiting, SSRF, XSS, CSRF)
- [ ] Dual-accept de `affiliateUrl`/`affiliate_url` clarificado (legado ou acidente?)

### Estrutura de Tasks Executáveis

Cada task tem:
- **Prova**: o que valida se a task está completa
- **Done-when**: checklist de verificações específicas
- **Verificar**: comandos ou arquivos a examinar
- **Balizador**: sinal claro de sucesso ou gap

Esse design permite que um revisor execute cada task de forma independente e documente findings com precisão (arquivo:linha).

