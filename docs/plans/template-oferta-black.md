# Plano: Template "Oferta Black"

> **Status:** Rascunho
> **Criado em:** 2026-06-03
> **Origem:** Conversa em 2026-06-03 — referência visual `assets/oferta_black.png`

## 1. O que estamos construindo

Um novo template de presell com estética "dark premium": fundo quase-preto, acentos dourados, contador regressivo com persistência por visitante via localStorage, área de foto do produto, preço riscado + preço de venda em destaque, e botão CTA dourado largo. O template segue exatamente o layout do wireframe em `assets/oferta_black.png`.

## 2. Fora do escopo

- Animações de entrada (fade-in, slide)
- Variantes de cor diferentes do esquema black/gold
- Integração com timer serverless (o countdown é client-side com localStorage)

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | ID do template: `oferta-black` | Convenção kebab-case do projeto | Nome do arquivo TSX e chave no registry seguem o mesmo slug |
| AD-2 | Countdown client-side com localStorage | Evita estado server, mantém "stickiness" por visitante sem infraestrutura adicional | A chave no localStorage é `presell-cd-{slug}` — expiração calculada na primeira visita |
| AD-3 | Cores do template derivam do `theme` do presell | Consistência com os outros templates — admin define a paleta no formulário | Default do tema black/gold: `background:#0d0d0d`, `primary:#c9a227`, `textColor:#ffffff` |
| AD-4 | `original_price` e `sale_price` são campos de texto livre | Permite "R$ 347", "US$ 47", "€99" sem lógica de currency | Validação de formato é responsabilidade do criador do presell |
| AD-5 | Label "OFERTA OFICIAL" é texto fixo; estilização via `theme.primary` | Usuário controla a cor pelo tema, não por campo avulso — reduz proliferação de campos triviais | Para mudar o texto é necessário um novo template |
| AD-6 | `backgroundImageUrl` é suportado com overlay escuro configurável | Consistência com `offer-modal`; overlay permite legibilidade sobre qualquer foto | Força do overlay controlada por campo `overlay_strength` (range 0–0.9) |
| AD-7 | Disclaimer do rodapé é campo `textarea` editável | Admin precisa ajustar o aviso legal por nicho/produto | Campo com valor default padrão para não deixar presell sem disclaimer |

## 4. Requisitos

- RF-1: O sistema deve exibir o template "Oferta Black" na lista de templates do admin
- RF-2: O sistema deve renderizar o countdown regressivo que persiste entre recargas via localStorage
- RF-3: O sistema deve exibir preço original riscado e preço de venda lado a lado
- RF-4: O sistema deve exibir a foto do produto (campo `imageUrl` do presell) na área reservada
- RF-4b: O sistema deve suportar `backgroundImageUrl` como fundo da página com overlay escuro sobre ele
- RF-5: O sistema deve renderizar o botão CTA que redireciona para `affiliateUrl` com tracking
- RNF-1: O template deve ser responsivo e renderizar corretamente em viewport de 375px (mobile-first)
- RNF-2: Adicionar o template não deve quebrar build do frontend nem do backend

## 5. Critérios de Aceite Globais

- [ ] Template aparece na lista de templates no admin ao criar/editar um presell
- [ ] Presell com template `oferta-black` publicado renderiza em `/p/:slug` sem erro
- [ ] Countdown exibe HH:MM:SS e decrementa em tempo real
- [ ] Recarregar a página não reinicia o countdown (localStorage persiste)
- [ ] Foto do produto aparece quando `imageUrl` está preenchido; área de placeholder quando não
- [ ] Preço original aparece riscado ao lado do preço de venda
- [ ] Botão CTA navega para `affiliateUrl`
- [ ] Build frontend e backend sem erros (`npm run build:frontend`, `npm run build:backend`)

## 6. Tasks

### Fase 1: Tracer Bullet → Template Selecionável e Renderizável

> Entrega: template `oferta-black` aparece na lista do admin, pode ser selecionado, e um presell com ele abre em `/p/:slug` sem crash (conteúdo mínimo: headline + botão CTA).

#### Task 1: Registro no backend + componente skeleton

- **Prova:** valida que registry backend + componente frontend + rota pública se conectam corretamente para o novo template
- **Done-when:**
  - [ ] Entrada `oferta-black` adicionada em `backend/src/templates/registry.js` com `id`, `name`, `description` e ao menos 1 campo (`sale_price`)
  - [ ] Arquivo `frontend/src/features/presells/templates/oferta-black.tsx` criado com componente mínimo que renderiza `<div>{presell.headline}</div>` e chama `registerTemplate('oferta-black', OfertaBlack)`
  - [ ] Import adicionado em `frontend/src/features/presells/templates/index.ts`
  - [ ] Template aparece na lista em `/admin/presells/novo` ou `/admin/presells/:id/edit`
  - [ ] Presell com template `oferta-black` abre em `/p/:slug` sem erro de console
- **Verificar:** `npm run dev` → admin → editar presell → lista de templates → selecionar "Oferta Black" → visualizar preview → abrir `/p/:slug`
- **Balizador:** Se o preview do admin mostra o texto do headline (mesmo sem estilo), as camadas se conectam.

#### Task 2: Layout visual completo

- **Prova:** implementa o design fiel ao wireframe `assets/oferta_black.png`
- **Done-when:**
  - [ ] Header fixo com "OFERTA OFICIAL" (dot dourado + texto centralizado) no topo
  - [ ] Área de foto do produto: exibe `imageUrl` se presente, mostra placeholder "FOTO DO PRODUTO" se ausente
  - [ ] Headline em caixa alta, negrito, white, fonte grande
  - [ ] Subtítulo/descrição em cinza claro abaixo do headline
  - [ ] Preço original em `original_price` riscado + preço em `sale_price` em destaque dourado/branco
  - [ ] Texto de escassez (`scarcity_text`) com bullet `•`
  - [ ] Botão CTA dourado (#c9a227) com texto em preto, largura total, com seta `→`
  - [ ] Rodapé com disclaimer fixo em cinza escuro
  - [ ] Fundo `#0d0d0d` (ou `theme.background`), acentos dourados (`theme.primary`)
  - [ ] Responsivo em 375px, sem scroll horizontal
- **Verificar:** `npm run dev` → abrir `/p/:slug` no DevTools em 375px → conferir visualmente contra o wireframe
- **Balizador:** Se o layout combina com o wireframe em mobile, o componente está correto.

#### Task 3: Countdown regressivo com localStorage

- **Prova:** valida que a lógica de timer persiste entre recargas e decrementa corretamente
- **Done-when:**
  - [ ] Countdown exibe `HH:MM:SS` e decrementa a cada segundo via `setInterval`
  - [ ] Na primeira visita, calcula `endTime = Date.now() + countdown_hours * 3600 * 1000` e persiste em `localStorage` com chave `presell-cd-{slug}`
  - [ ] Nas visitas seguintes, lê `endTime` do localStorage (não reinicia)
  - [ ] Quando `countdown_hours` é 0 ou o campo está desabilitado (`show_countdown = false`), a seção de countdown é ocultada
  - [ ] Quando o tempo zera, exibe `00:00:00` e para o timer (não exibe negativos)
  - [ ] `useEffect` limpa o intervalo no unmount para evitar memory leak
- **Verificar:** `npm run dev` → abrir `/p/:slug` → observar timer decrementar → recarregar → timer continua do ponto correto → abrir DevTools Application → LocalStorage → checar chave `presell-cd-{slug}`
- **Balizador:** Se recarregar não zera o timer, o localStorage está funcionando.

#### Task 4: Campos completos no registry backend

- **Prova:** todos os campos configuráveis do template aparecem no formulário do admin
- **Done-when:**
  - [ ] Campos em `registry.js` para `oferta-black`:
    - `countdown_label` (text, default: "A CONDIÇÃO TERMINA EM")
    - `show_countdown` (checkbox, default: true)
    - `countdown_hours` (range, min: 1, max: 72, step: 1, default: 24)
    - `original_price` (text, default: "R$ 347")
    - `sale_price` (text, default: "R$ 167")
    - `scarcity_text` (text, default: "Últimas unidades em estoque nesta condição")
    - `overlay_strength` (range, min: 0, max: 0.9, step: 0.05, default: 0.75)
    - `disclaimer` (textarea, default: "Este conteúdo tem caráter promocional. Resultados podem variar de pessoa para pessoa. Consulte um profissional de saúde. Não substitui orientação médica.")
  - [ ] Cada campo tem `previewSelector` com classe CSS correspondente no componente
  - [ ] Editar um campo no admin atualiza o preview ao vivo
- **Verificar:** admin → editar presell com template `oferta-black` → painel de configurações → todos os campos visíveis → editar "sale_price" → preview atualiza
- **Balizador:** Se o campo aparece no painel e o preview reflete a mudança, o binding está correto.

---
**Checkpoint Fase 1:** build limpo (`npm run build`) + todos os critérios de aceite globais atendidos + verificação manual do fluxo: criar presell → selecionar template → configurar campos → publicar → abrir `/p/:slug` → confirmar layout e countdown.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| localStorage bloqueado (modo incógnito ou políticas de browser) | Baixa | Baixo | Fallback silencioso: se localStorage falhar, recalcular endTime na memória (timer reinicia em cada visita) |
| `countdown_hours` como `range` no admin ter UX confusa (usuário não sabe quando o timer vai expirar) | Média | Baixo | Adicionar `previewSelector` e descrição clara no label do campo |
| Fonte/tipografia diferente dos outros templates causar inconsistência visual | Baixa | Baixo | Usar `font-pair` padrão do sistema, sem forçar Google Fonts |

## 8. Perguntas em aberto

*(todas resolvidas — ver ADs 5, 6 e 7)*
