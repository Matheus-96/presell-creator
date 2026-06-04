# Plano: Pular Modal de Confirmação ao Excluir Imagem Não Utilizada

> **Status:** Rascunho
> **Criado em:** 2026-06-03
> **Origem:** Conversa em 2026-06-03

## 1. O que estamos construindo

Ao clicar em excluir uma imagem na galeria, o sistema já consulta o backend para saber quais presells usam aquela imagem. Se nenhuma presell referencia a imagem, o modal de confirmação é desnecessário — a exclusão pode acontecer imediatamente, sem interromper o fluxo do usuário.

## 2. Fora do escopo

- Qualquer alteração no backend (a rota `DELETE /admin/media/:filename?check=true` já retorna `usedBy`).
- Mudança no comportamento quando a imagem **é** usada por presells (modal continua sendo exibido).
- Adição de toast/notificação pós-exclusão (não foi pedido).

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | Lógica de bypass exclusivamente no frontend | O backend já fornece `usedBy[]`; não há necessidade de nova rota ou flag | O frontend continua responsável por decidir quando mostrar o modal |
| AD-2 | Manter a chamada `checkMediaUsage` antes de deletar | Garante que `usedBy` seja sempre verificado antes de qualquer exclusão — nunca deletar sem saber o impacto | Continua havendo um round-trip de rede; não há exclusão "instantânea" sem verificação |

## 4. Requisitos

- RF-1: Se `usedBy.length === 0`, o sistema deve excluir a imagem diretamente após `checkMediaUsage`, sem exibir o modal de confirmação.
- RF-2: Se `usedBy.length > 0`, o modal de confirmação deve ser exibido como hoje.
- RF-3: Durante a exclusão direta (sem modal), o botão de lixeira deve mostrar indicador de loading e ficar desabilitado.
- RNF-1: Nenhuma regressão no fluxo de exclusão de imagens usadas em presells.

## 5. Critérios de Aceite Globais

- [ ] Clicar em excluir uma imagem sem uso → imagem some da galeria sem abrir nenhum modal.
- [ ] Clicar em excluir uma imagem usada em ≥1 presell → modal de confirmação aparece normalmente.
- [ ] Estado de loading (spinner) visível durante o `checkMediaUsage` E durante o `deleteMediaImage` no fluxo sem modal.
- [ ] Em caso de erro na exclusão direta, mensagem de erro exibida na galeria (mesmo `error` state existente).
- [ ] Build sem erros, testes existentes continuam passando.

## 6. Tasks

### Fase 1: Implementação e Verificação

> Entrega: exclusão sem modal funcionando para imagens não utilizadas; modal preservado para imagens em uso.

#### Task 1: Alterar `handleDeleteClick` para bypass do modal quando `usedBy` está vazio

- **Arquivo:** `frontend/src/features/presells/components/MediaPicker.tsx:84`
- **Prova:** valida que a decisão modal vs. exclusão direta é tomada no lugar certo, sem duplicar lógica.
- **Done-when:**
  - [ ] Quando `usedBy.length === 0`: chama `deleteMediaImage` diretamente e remove a imagem do state, sem chamar `setConfirmDelete`.
  - [ ] Quando `usedBy.length > 0`: comportamento inalterado — `setConfirmDelete` é chamado.
  - [ ] O spinner de loading (`checkingDelete`) cobre tanto o `checkMediaUsage` quanto o `deleteMediaImage` no fluxo direto.
  - [ ] Erros na exclusão direta são capturados e exibem mensagem via `setError`.
- **Verificar:** Abrir a galeria no browser, passar o mouse sobre uma imagem não usada, clicar no lixo → sem modal, imagem desaparece.
- **Balizador:** Se a imagem some da grid sem que nenhum modal apareça, está no caminho certo.

#### Task 1T: Testes — `handleDeleteClick` com e sem imagens em uso

- **Cobre:** lógica de decisão entre exclusão direta e exibição do modal em `MediaPicker`.
- **Done-when:**
  - [ ] Caso feliz sem uso: mock `checkMediaUsage` retorna `{ usedBy: [] }` → `deleteMediaImage` é chamado, modal **não** é renderizado.
  - [ ] Caso feliz com uso: mock `checkMediaUsage` retorna `{ usedBy: ['slug-1'] }` → `deleteMediaImage` **não** é chamado, modal aparece.
  - [ ] Caso de erro na exclusão direta: mock `deleteMediaImage` rejeita → mensagem de erro aparece na UI.
- **Verificar:** `npm run test --workspace=frontend -- MediaPicker`

---

**Checkpoint Fase 1:** build limpo + testes passando + verificação manual dos dois fluxos (com e sem uso).

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Race condition se usuário clica duas vezes | Baixa | Médio | `checkingDelete` já desabilita o botão durante a verificação; estender para cobrir `deleteMediaImage` no fluxo direto (Task 1) |
| Imagem em uso excluída se `usedBy` retornar dado desatualizado | Muito baixa | Alto | Backend sempre recalcula usage na hora — não há cache nesta rota |

## 8. Perguntas em aberto

- (nenhuma)
