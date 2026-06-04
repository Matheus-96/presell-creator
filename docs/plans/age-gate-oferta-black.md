# Plano: Age Gate — Oferta Black

> **Status:** Rascunho
> **Criado em:** 2026-06-04
> **Origem:** Conversa em 2026-06-04

## 1. O que estamos construindo

Modal de verificação de idade no template `oferta-black` que bloqueia a renderização do conteúdo da página até o usuário confirmar que tem 18 anos ou mais. O objetivo é evitar que o Google indexe ou penalize a página por exibir conteúdo adulto diretamente sem gate. O fetch da presell acontece normalmente — o que fica bloqueado é a renderização do conteúdo. Todos os textos do modal são configuráveis no editor da presell.

## 2. Fora do escopo

- Outros templates além de `oferta-black`
- Persistência da confirmação de idade entre sessões
- Botão de recusa (apenas botão de confirmação)
- Age gate no preview da área de admin

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | O gate é implementado dentro do template `oferta-black.tsx` | O objetivo é bloquear renderização, não o fetch. O template já tem acesso às settings (textos configuráveis) após o fetch. Não há necessidade de endpoint separado | `PresellPage.tsx` não precisa de alteração; o template controla o estado de confirmação |
| AD-2 | Os campos do age gate são adicionados ao registry do template `oferta-black` (backend) | Segue o padrão existente de configuração por template; editor da presell auto-gera os campos a partir do registry | Textos configuráveis aparecem no editor automaticamente; nenhuma API nova necessária |

## 4. Requisitos

- RF-1: Quando `age_gate_enabled: true`, o modal é renderizado antes de qualquer conteúdo da presell.
- RF-2: O conteúdo da presell só é renderizado após o usuário clicar no botão de confirmação.
- RF-3: Os textos do modal (título, descrição, texto do botão) são campos configuráveis no editor da presell.
- RF-4: O gate pode ser desabilitado (`age_gate_enabled: false` — padrão); nesse caso o template carrega normalmente.
- RF-5: Apenas um botão de ação (afirmativo). Sem botão de recusa.

## 5. Critérios de Aceite Globais

- [ ] Com `age_gate_enabled: true`, nenhum conteúdo da oferta é visível antes do clique.
- [ ] Após clicar no botão de confirmação, o conteúdo é revelado normalmente.
- [ ] Com `age_gate_enabled: false` (default), a presell carrega sem gate.
- [ ] Textos customizados no editor aparecem corretamente no modal.
- [ ] Build sem erros TypeScript.

## 6. Tasks

### Fase 1: Age Gate End-to-End
> Entrega: gate funciona e visualmente integrado — campo no editor → modal aparece → conteúdo revelado após confirmação

#### Task 1: Backend — campos do age gate no registry de `oferta-black`
- **Prova:** garante que os campos aparecem no editor e são normalizados/retornados nas settings
- **Done-when:**
  - [ ] Campos adicionados ao registry de `oferta-black`:
    - `age_gate_enabled` (checkbox, default `false`, label "Ativar verificação de idade")
    - `age_gate_title` (text, default "Verificação de Idade", maxLength 60)
    - `age_gate_description` (textarea, default "Este conteúdo é destinado exclusivamente a maiores de 18 anos.")
    - `age_gate_confirm_text` (text, default "Declaro que possuo mais de 18 anos", maxLength 80)
  - [ ] Campos aparecem no editor da presell (auto-gerado pelo registry)
  - [ ] Valores salvos e retornados em `presell.settings` pelo endpoint público
- **Verificar:** abrir editor de uma presell `oferta-black` e confirmar que os campos aparecem na seção de configurações
- **Balizador:** Se os 4 campos aparecem no editor e salvam, está correto.

#### Task 2: Frontend — gate overlay em `oferta-black.tsx`
- **Prova:** valida que a renderização do conteúdo está condicionada ao estado de confirmação
- **Done-when:**
  - [ ] Estado `const [ageConfirmed, setAgeConfirmed] = useState(false)` no componente
  - [ ] Se `settings.age_gate_enabled && !ageConfirmed`: renderiza apenas o modal de gate (tela cheia), nada do conteúdo da oferta
  - [ ] Modal exibe `age_gate_title`, `age_gate_description` e botão com `age_gate_confirm_text` vindos das settings
  - [ ] Ao clicar no botão: `setAgeConfirmed(true)` → conteúdo da oferta renderiza normalmente
  - [ ] Se `!age_gate_enabled`: flow normal, sem gate
  - [ ] Modal estilizado no tema dark/dourado do template (fundo `#1a1a1a`, borda dourada sutil, botão com estilo CTA dourado)
  - [ ] Layout responsivo e centralizado em mobile (375px) e desktop
- **Verificar:** abrir presell `oferta-black` com gate habilitado; inspecionar DOM e confirmar que headline/preço/CTA não estão no HTML antes do clique
- **Balizador:** Se o DOM antes do clique contém apenas o modal (sem headline, preço ou affiliateUrl expostos), está correto.

---
**Checkpoint Fase 1:** build limpo + verificação manual (modal aparece → clique → conteúdo revelado) + todos os critérios de aceite globais atendidos.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Googlebot renderiza JS e vê conteúdo mesmo com gate | Baixa | Médio | Conteúdo não está no DOM antes do clique — depende de estado React; bots que não executam JS não verão nada |
| Settings não normalizadas retornam `undefined` para textos | Baixa | Baixo | Adicionar fallback inline nos textos do modal: `settings.age_gate_title ?? 'Verificação de Idade'` |
