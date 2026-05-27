# Refactor Frontend — Épicos

Decisões arquiteturais tomadas em sessão de planejamento (2026-05-27).

## Stack Adotada

| Decisão | Escolha |
|---|---|
| State management | TanStack Query (server state) + custom hooks (UI state) |
| Navegação presells | Lista (`/presells`) + edição (`/presells/:id/edit`) separadas |
| Estilo admin | Tailwind CSS + shadcn/ui |
| Estilo presell público | Tailwind puro (flexibilidade de design) |
| Formulários | React Hook Form + Zod |
| Testes | Vitest (unit) + Playwright (integração) |
| TypeScript | `strict: true` completo |
| Camada de API | `api-client.ts` compartilhado + `<feature>-api.ts` por feature |
| Notificações | Sonner (toasts) para ações + RHF inline para validação |
| Admin legado EJS | Removido completamente |

---

## Epic 1 — Foundation ✅ CONCLUÍDO (2026-05-27)

Issues: [#1](https://github.com/Matheus-96/presell-creator/issues/1) · [#2](https://github.com/Matheus-96/presell-creator/issues/2) | PRs: [#3](https://github.com/Matheus-96/presell-creator/pull/3) · [#4](https://github.com/Matheus-96/presell-creator/pull/4)

- [x] Ativar `strict: true` no `tsconfig.app.json` (zero erros no código existente)
- [x] Instalar e configurar Tailwind CSS via `@tailwindcss/vite`
- [x] Instalar e configurar shadcn/ui (`components.json` + `Button` + `cn()` utility)
- [x] Instalar Sonner e adicionar `<Toaster>` no `AppProviders`
- [x] Instalar TanStack Query e adicionar `QueryClientProvider`
- [x] Instalar React Hook Form + Zod
- [x] Instalar e configurar Vitest (jsdom + `passWithNoTests`)
- [x] Instalar e configurar Playwright (aponta para `localhost:5173`)

---

## Epic 2 — Camada de API & Segurança

Eliminar duplicação, centralizar HTTP e garantir auth em toda mutação.

### Decisões arquiteturais (2026-05-27)

| Decisão | Escolha |
|---|---|
| Injeção de CSRF | Token store global (`csrf-store.ts`: `getCsrfToken`/`setCsrfToken`) |
| Header CSRF | `x-csrf-token` hardcoded no `api-client.ts` — não lê mais do contrato |
| Quem atualiza o store | `AuthProvider` chama `setCsrfToken` após cada session check bem-sucedido |
| CSRF retry em `csrf_invalid` | Removido — 401 (`auth_required`) já cobre expiração de sessão |
| Fetch do contrato (`/admin/contracts`) | Removido do frontend — endpoint existe no backend, mas não é consumido |
| Tipos | Feature-owned: `AdminSession`/`LoginPayload` em `auth-api.ts`, presell types em `features/presells/types.ts` |
| Assinaturas das funções de mutação | `contract` e `csrfToken` removidos dos parâmetros — injeção automática via store |
| `PresellsPage.tsx` no Epic 2 | Atualizado para remover threading de CSRF (god component permanece, apenas limpeza de params) |

### Tasks

- [ ] Criar `src/lib/api/csrf-store.ts` (`getCsrfToken` / `setCsrfToken`)
- [ ] Refatorar `api-client.ts`: injeta `x-csrf-token` automaticamente em POST/PUT/PATCH/DELETE via store; dispara `invalidateQueries(['session'])` no 401 via store de queryClient
- [ ] Criar `features/auth/auth-api.ts` (getSession, createSession, deleteSession) com tipos `AdminSession` e `LoginPayload`
- [ ] Migrar `AuthProvider` para React Query: `useQuery(['session'])` + `useMutation` para login/logout; `AuthProvider` chama `setCsrfToken` após session bem-sucedida; remove `useReducer`, `executeSessionMutation` e event listener manual
- [ ] Atualizar `RequireAuth`: spinner simples no loading; event listener `ADMIN_AUTH_REQUIRED_EVENT` chama `queryClient.invalidateQueries(['session'])` direto no componente
- [ ] Limpar `features/presells/lib/presells-api.ts`: remover parâmetros `contract`/`csrfToken`, remover `fetchWorkspaceBootstrap`
- [ ] Criar `features/templates/lib/templates-api.ts`
- [ ] Criar `features/analytics/lib/analytics-api.ts`
- [ ] Atualizar `PresellsPage.tsx`: remover threading de `contract` e `csrfToken` nas chamadas de mutação
- [ ] Remover `lib/api/admin-api.ts`

---

## Epic 3 — Auth Feature

Nota: `AuthProvider` (migration para React Query) e `RequireAuth` (spinner + invalidateQueries) são cobertos pelo **Epic 2.2 (issue #6)**. Este épico foca no toast de sessão expirada e na refatoração da `LoginPage`.

### Decisões arquiteturais (2026-05-27)

| Decisão | Escolha |
|---|---|
| Estilo da LoginPage | shadcn/ui — `Card`, `Input`, `Label`, `Button` |
| Form state | React Hook Form + Zod (schema: username required, password required) |
| Feedback de erro de login | Toast Sonner (`toast.error(...)`) — remove `StatusBanner` da LoginPage |
| Toast de sessão expirada | `toast.warning("Sua sessão expirou...")` no event handler do `RequireAuth`, antes do redirect |
| Botão "Refresh session" | Removido — sem UX real, artefato de dev |
| Heading | "Presell Creator" — remove "React admin shell" genérico |
| Link do legacy admin | Removido na LoginPage (antecipa Epic 4) |

### Tasks

- [ ] Reescrever `LoginPage.tsx` com shadcn/ui (`Card`, `Input`, `Label`, `Button`)
- [ ] Migrar form para React Hook Form + Zod (schema: username + password required)
- [ ] Substituir `StatusBanner` por `toast.error()` no erro de login
- [ ] Adicionar `toast.warning("Sua sessão expirou. Faça login novamente.")` no `RequireAuth` antes de invalidar a query
- [ ] Remover botão "Refresh session"
- [ ] Substituir heading "React admin shell" por "Presell Creator"
- [ ] Remover link e condicional do legacy admin da LoginPage

---

## Epic 4 — Remoção do Admin EJS

Cortar o legado do backend.

- [ ] Remover views EJS (`backend/src/views/` — pasta `admin/`)
- [ ] Remover rotas EJS (`backend/src/routes/admin.js`)
- [ ] Remover controllers EJS legacy
- [ ] Setar `ADMIN_FRONTEND_PATH=/admin` como padrão
- [ ] Remover `LEGACY_ADMIN_PATH` do código e da documentação
- [ ] Atualizar Vite proxy para `/admin`

---

## Epic 5 — Dashboard Page

Simplificar de página complexa para painel de visão geral.

- [ ] Redesenhar com shadcn/ui: 3 stat cards (total, publicadas, rascunhos)
- [ ] Tabela simples de presells recentes com link para edição
- [ ] Links de navegação para Templates e Settings
- [ ] Remover dados desnecessários (analytics complexos ficam para fase futura)
- [ ] Migrar fetch para React Query

---

## Epic 6 — Presells: Página de Lista

Extrair o sidebar de lista do god component para rota própria.

- [ ] Criar rota `/presells` com `PresellsListPage`
- [ ] Cards de presell com status, template, data
- [ ] Filtros: status, template, busca por texto
- [ ] Ações por card: editar, duplicar, excluir (com Dialog de confirmação shadcn)
- [ ] Toast Sonner para delete/duplicate
- [ ] Migrar fetch para React Query

---

## Epic 7 — Presells: Página de Edição

Quebrar o `PresellsPage.tsx` de 1.125 linhas.

- [ ] Criar rota `/presells/:id/edit` com `PresellEditPage`
- [ ] Layout Google Ads: `ResizablePanelGroup` — form à esquerda, preview à direita
- [ ] Substituir form state manual por React Hook Form + Zod schema
- [ ] Criar `usePresellEditor` hook (orquestra RHF + React Query mutation)
- [ ] Migrar `TemplateSettingsFields` para RHF controller
- [ ] Preview debounced isolado em `usePresellPreview` hook
- [ ] Toast Sonner para save/publish/error
- [ ] Dirty tracking via RHF `formState.isDirty` (elimina snapshot manual)

---

## Epic 8 — Templates & Settings Pages

Limpeza das páginas menores.

- [ ] `TemplatesPage`: migrar fetch para React Query, aplicar shadcn/ui
- [ ] `SettingsPage`: migrar form para React Hook Form + Zod, toast para save
- [ ] Remover `MigrationNotice` após Epic 4 concluído

---

## Epic 9 — Testes

Rede de segurança antes de considerar o refactor concluído.

- [ ] Vitest: testes unitários para `presell-editor.ts` (buildPresellPayload, normalizeFieldValue, etc.)
- [ ] Vitest: testes para Zod schemas (validação de campos obrigatórios, tipos)
- [ ] Playwright: fluxo login → logout
- [ ] Playwright: fluxo criar presell → preencher → publicar → visualizar URL pública
- [ ] Playwright: fluxo editar → alterar campo → salvar → confirmar persistência

---

## Fases Futuras (fora deste refactor)

- **Analytics de visitante**: tempo na presell, tempo de carregamento, pageviews. Backend já tem `analyticsRepository.js` como base.
