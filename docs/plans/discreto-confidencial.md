# Plano: Template Discreto Confidencial

> **Status:** Rascunho
> **Criado em:** 2026-06-03
> **Origem:** Conversa em 2026-06-03 + design `assets/discreto_confidencial.png`

## 1. O que estamos construindo

Template de presell page mobile-first com visual dark, focado em produtos que precisam transmitir discrição (suplementos, saúde íntima, etc.). A identidade visual gira em torno de confiança silenciosa: fundo escuro, imagem do produto em destaque, três trust badges configuráveis com emoji, e CTA âmbar fixo no fundo.

## 2. Fora do escopo

- Variante light do template
- Contador regressivo / urgência (existe no urgent-offer)
- Seção de preço/desconto

## 3. Decisões Arquiteturais

| # | Decisão | Rationale | Consequência |
|---|---------|-----------|--------------|
| AD-1 | `imageUrl` é obrigatório — sem placeholder funcional | O design é centrado na foto do produto; sem ela o template perde sentido visual | Se `imageUrl` for null, exibe container vazio (responsabilidade do admin configurar) |
| AD-2 | Badges configuradas via textarea `badges`, uma por linha no formato `"emoji TEXTO"` | Segue padrão de `bonus_items` e `bonus_items` já estabelecido no projeto; evita campo array/JSON | Parsing via `split('\n').filter(Boolean)`; linhas vazias ignoradas |
| AD-3 | Dark theme como padrão hardcoded no componente (fallbacks das cores) | O template faz sentido apenas no visual escuro; background claro quebraria a identidade | Usuário pode sobrescrever via `presell.theme`, mas os defaults já entregam o visual esperado |

## 4. Requisitos

- RF-1: O sistema deve exibir o template na lista de templates do admin (`GET /api/admin/templates`)
- RF-2: O sistema deve renderizar o nome da marca no topo com ícone de cadeado
- RF-3: O sistema deve exibir um badge/pill superior com texto configurável
- RF-4: O sistema deve preencher a área de produto com `imageUrl` (cover fill)
- RF-5: O sistema deve exibir headline, subtítulo e os trust badges configuráveis
- RF-6: O sistema deve fixar o botão CTA no fundo da viewport
- RF-7: O sistema deve exibir disclaimer opcional abaixo dos badges
- RNF-1: Visual consistente com os outros templates dark — usar variáveis CSS `--p-*`

## 5. Critérios de Aceite Globais

- [ ] Template aparece na lista do admin com nome "Discreto Confidencial"
- [ ] Todos os campos configuráveis (brand_name, top_bar_text, badges, disclaimer) são editáveis pelo admin e refletem no render
- [ ] Badges parseadas corretamente (emoji separado do texto, linhas vazias ignoradas)
- [ ] CTA fixo no fundo não sobrepõe conteúdo (padding-bottom compensado)
- [ ] Build sem erros TypeScript, testes passando

## 6. Tasks

### Fase 1: Tracer Bullet — Template registrado e renderizável E2E
> Entrega: admin vê o template no dropdown, cria um presell e a página pública renderiza o design completo

#### Task 1: Backend — Registry entry com fields e aiInstructions

- **Prova:** template entra no catálogo do admin sem quebrar os outros
- **Done-when:**
  - [ ] Entrada `discreto-confidencial` adicionada em `backend/src/templates/registry.js`
  - [ ] Fields definidos: `brand_name` (text), `top_bar_text` (text), `badges` (textarea), `disclaimer` (textarea), `font_pair` (select, reusar `FONT_PAIR_FIELD`)
  - [ ] `aiInstructions` preenchido (ver seção abaixo)
  - [ ] `GET /api/admin/templates` retorna o template na lista (verificar via curl autenticado)
- **Verificar:** `curl -b <cookie> http://localhost:3001/api/admin/templates | jq '.items[].id'`
- **Balizador:** Se `"discreto-confidencial"` aparecer no output do curl, está no caminho certo.

---

**`aiInstructions` a incluir no registry:**

```
Você irá preencher um template de presell do tipo "Discreto Confidencial" (discreto-confidencial).

## Quando usar este template
Use quando:
- O produto requer discrição na compra (suplementos, saúde íntima, emagrecimento)
- A comunicação é sóbria, confiável e sem apelos de urgência exagerada
- O visual dark transmite seriedade e exclusividade
**Priorize este template quando o público valoriza privacidade e confiança acima de promoção.**

## Objetivo
Presell dark com foco em credibilidade discreta. A imagem do produto ocupa destaque central. Os três trust badges (embalagem discreta, compra protegida, entrega sigilosa) reforçam a proposta de privacidade. O CTA âmbar convida sem pressionar.

## Estrutura visual (de cima para baixo)
1. Nome da marca com ícone de cadeado
2. Badge superior com label da oferta
3. Imagem do produto (fill)
4. Headline e subtítulo
5. Trust badges (emoji + texto)
6. Botão CTA fixo no fundo
7. Disclaimer (opcional)

## Campos do presell

**headline** — Título principal. Foco no benefício do produto, linguagem natural e confiável. Evite urgência ou exclamações.
Exemplo: "O método natural que já conquistou milhares de brasileiros"

**subtitle** — 1–2 frases complementando o headline. Tom tranquilo, reforça facilidade de uso.
Exemplo: "Uma fórmula simples, de uso diário, desenvolvida para apoiar seus resultados de forma segura e sem complicação."

**ctaText** — Texto do CTA. Direto, sem pressão excessiva.
Exemplo: "IR PARA O SITE OFICIAL →", "ACESSAR OFERTA EXCLUSIVA →"

**bullets** — Não exibido neste template. Pode ser omitido.

## Configurações (settings)

**brand_name** — Nome da marca exibido no topo com ícone de cadeado. Use o nome do produto ou marca.
Exemplo: "NUTRAVIDA", "SUPLEMENTO X", "FORMULA PRO"

**top_bar_text** — Texto do badge/pill superior. Curto, em maiúsculas.
Exemplo: "OFERTA OFICIAL", "EXCLUSIVO", "ACESSO RESTRITO"

**badges** — Trust badges exibidos em cards abaixo do subtítulo. Uma por linha no formato "emoji TEXTO".
Exemplo:
📦 EMBALAGEM DISCRETA
🛡️ COMPRA PROTEGIDA
🚚 ENTREGA SIGILOSA

**disclaimer** — Aviso legal exibido abaixo dos badges. Opcional.
Exemplo: "Este conteúdo tem caráter promocional. Resultados podem variar de pessoa para pessoa. Consulte um profissional de saúde. Não substitui orientação médica."
```

---

#### Task 2: Frontend — Componente React + registro no index

- **Prova:** presell com `templateId: "discreto-confidencial"` renderiza o design completo na rota pública
- **Done-when:**
  - [ ] Arquivo `frontend/src/features/presells/templates/discreto-confidencial.tsx` criado
  - [ ] Import adicionado em `frontend/src/features/presells/templates/index.ts`
  - [ ] Componente renderiza: header (cadeado + brand_name), badge top_bar_text, imagem do produto (cover), headline, subtítulo, badges parsadas do textarea, CTA fixo, disclaimer
  - [ ] Dark theme como fallback (background `#111111`, surface `#1c1c1c`, textColor `#e5e5e5`, primary `#c9a84c`, secondary `#ffffff`)
  - [ ] Build TypeScript sem erros (`npm run build --workspace=frontend` ou equivalente)
  - [ ] Render visual inspecionado no browser com um presell de teste
- **Verificar:** Abrir `http://localhost:5173/p/<slug-de-teste>` no browser com um presell usando o template
- **Balizador:** Se o design reflete o `assets/discreto_confidencial.png` com os dados configurados, está correto.

---

**Checkpoint Fase 1:** build limpo + visual inspecionado no browser + todos os critérios de aceite globais atendidos.

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| CTA fixo sobrepõe conteúdo em telas pequenas | Média | Médio | Aplicar `paddingBottom` no container igual à altura do CTA (padrão `--p-cta-min-height + --p-space-8`) |
| Parsing de badges quebra com linhas extras/espaços | Baixa | Baixo | `split('\n').map(l => l.trim()).filter(Boolean)` |
| imageUrl null quebra layout | Baixa | Alto | Container com `min-height` fixo; `imageUrl` obrigatório documentado no aiInstructions |

## 8. Perguntas em aberto

- (nenhuma)
