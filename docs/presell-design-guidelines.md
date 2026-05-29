# Presell Design Guidelines

Padrões de design para todos os templates de presell. Cada novo template deve seguir estas regras. Os tokens CSS estão definidos em `frontend/src/styles/global.css` (prefixo `--p-`).

---

## Princípios

1. **Mobile-first** — estilos base otimizados para 375–430px; desktop é enhancement
2. **O CTA é o único ponto de cor** — a presell usa paleta neutra; o botão é o único elemento colorido
3. **1 CTA por página** — nunca mais de um botão primary na mesma presell
4. **Tokens, não valores brutos** — sempre usar `var(--p-*)` em vez de hex ou px fixo

---

## Cores

A presell usa paleta neutra. A cor do CTA é configurável pelo usuário.

| Token | Valor | Uso |
|---|---|---|
| `--p-bg` | `#f9fafb` | Fundo da página |
| `--p-panel` | `#ffffff` | Cards e painéis |
| `--p-text` | `#111827` | Texto principal |
| `--p-muted` | `#6b7280` | Eyebrow, microcopy, textos secundários |
| `--p-line` | `#e5e7eb` | Bordas |
| `--p-danger` | `#dc2626` | Urgência, escassez |

### Presets de CTA

Aplicar via `style` inline no elemento raiz do template ou diretamente no botão:

```tsx
<button style={{ backgroundColor: ctaColor }} ...>
```

| Token | Valor | Nome |
|---|---|---|
| `--p-cta-green` | `#16a34a` | Verde (padrão) |
| `--p-cta-orange` | `#ea580c` | Laranja |
| `--p-cta-red` | `#dc2626` | Vermelho |
| `--p-cta-blue` | `#2563eb` | Azul |
| `--p-cta-yellow` | `#ca8a04` | Amarelo |

O campo `settings.cta_color` armazena o hex escolhido pelo usuário. Se ausente, usar `var(--p-cta-green)`.

---

## Tipografia

Mobile-first. Todos os tamanhos base são para mobile; `clamp()` escala até desktop.

| Nível | Size | Weight | Line-height | Letter-spacing | Cor |
|---|---|---|---|---|---|
| **Eyebrow** | `--p-eyebrow-size` (11px) | 600 | 1.4 | +0.1em | `--p-muted` |
| **H1** | `--p-h1-size` (clamp 24→44px) | 800 | 1.15 | -0.02em | `--p-text` |
| **Subtítulo** | `--p-subtitle-size` (clamp 16→20px) | 600 | 1.4 | 0 | `--p-text` |
| **Body / Bullets** | `--p-body-size` (16px) | 400 | 1.6 | 0 | `--p-text` |
| **CTA Button** | `--p-cta-text-size` (clamp 17→18px) | 700 | 1.3 | 0 | branco |
| **Microcopy** | `--p-micro-size` (12px) | 400 | 1.4 | +0.05em | `--p-muted` |

### Regras

- **Eyebrow** sempre em `text-transform: uppercase`
- **H1** é o elemento de maior peso visual — nunca usar `font-weight` menor que 700
- **Subtítulo** usa `font-weight: 600` para parecer mais pesado visualmente que o body mesmo sendo menor
- Body mínimo em **16px** — abaixo disso causa cansaço em mobile

---

## Espaçamento

Base 4px. Todos os valores são múltiplos de 4.

| Token | Valor | Uso típico |
|---|---|---|
| `--p-space-1` | 4px | Gap mínimo, separadores internos |
| `--p-space-2` | 8px | Gap entre ícone e texto |
| `--p-space-3` | 12px | Gap entre bullets |
| `--p-space-4` | 16px | Padding interno de cards (mobile) |
| `--p-space-5` | 20px | Gap entre elementos do card |
| `--p-space-6` | 24px | Padding interno de cards (desktop) |
| `--p-space-8` | 32px | Espaço entre seções |
| `--p-space-10` | 40px | Padding vertical de seções grandes |
| `--p-space-12` | 48px | Margem entre blocos principais |

---

## Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--p-radius-sm` | 6px | Badges, tags, eyebrow, inputs |
| `--p-radius-md` | 12px | Cards, modais, painéis |
| `--p-radius-lg` | 20px | Cards fullscreen, wrappers de imagem |
| `--p-radius-full` | 9999px | Pills, botões completamente arredondados |

---

## Sombras

| Token | Valor | Quando usar |
|---|---|---|
| `--p-shadow-sm` | `0 2px 8px rgba(0,0,0,0.08)` | Elementos flutuantes leves |
| `--p-shadow-md` | `0 8px 24px rgba(0,0,0,0.10)` | Cards sobre fundo claro |
| `--p-shadow-lg` | `0 20px 48px rgba(0,0,0,0.18)` | Modais, cards sobre fundo escuro ou imagem |

**Regra:** nunca empilhar sombra em elemento dentro de outro que já tem sombra. Fundo escuro ou imagem → `shadow-lg`. Glassmorphism → `shadow-lg` + `backdrop-filter: blur`.

---

## Imagens

Dois papéis com regras próprias:

| Papel | Quando usar | `object-fit` | Aspect ratio recomendado |
|---|---|---|---|
| **Hero** | Imagem de fundo ou banner principal | `cover` | 16:9 ou 4:3 |
| **Product** | Imagem do produto isolado | `contain` | 1:1 ou livre |

Imagem de **fundo** sempre `cover` — preenche o espaço sem distorcer. Imagem de **produto** sempre `contain` — mostra o produto inteiro sem cortar.

---

## Botão CTA

### Regras inegociáveis

- **1 botão primary por página** — nunca dois
- Sempre posicionado **após o subtítulo ou após os bullets** — nunca antes do H1
- Sempre o **elemento visualmente mais pesado** da tela
- `min-height: var(--p-cta-min-height)` (54px) — toque confortável em mobile
- `width: 100%` em mobile; `min-width: var(--p-cta-min-width)` (280px) em desktop

### Variantes

| Variante | Visual | Quando usar |
|---|---|---|
| **Primary** (solid) | Fundo com cor do CTA, texto branco | CTA principal — único por página |
| **Secondary** (outline) | Borda com cor do CTA, texto colorido | Ação alternativa |
| **Ghost** (soft) | Fundo com 15% opacidade | Contexto escuro / glassmorphism |

---

## Largura Máxima

Cada categoria de template tem seu próprio `max-width`:

| Token | Valor | Templates |
|---|---|---|
| `--p-maxw-card` | 480px | `offer-modal`, `app-ad`, `app-ad-fullscreen` |
| `--p-maxw-layout` | 900px | `device-frame` e templates side-by-side |

---

## Usando os tokens em React (Tailwind v4)

Os tokens são CSS custom properties disponíveis globalmente. Use via `style` inline ou via Tailwind arbitrary values:

```tsx
// Inline style (direto)
<h1 style={{
  fontSize: 'var(--p-h1-size)',
  fontWeight: 'var(--p-h1-weight)',
  lineHeight: 'var(--p-h1-lh)',
  letterSpacing: 'var(--p-h1-ls)',
  color: 'var(--p-text)',
}}>
  {headline}
</h1>

// Eyebrow
<p style={{
  fontSize: 'var(--p-eyebrow-size)',
  fontWeight: 'var(--p-eyebrow-weight)',
  letterSpacing: 'var(--p-eyebrow-ls)',
  color: 'var(--p-muted)',
  textTransform: 'uppercase',
}}>
  {labelText}
</p>

// CTA com cor configurável
<button
  style={{
    backgroundColor: ctaColor ?? 'var(--p-cta-green)',
    minHeight: 'var(--p-cta-min-height)',
    fontSize: 'var(--p-cta-text-size)',
    fontWeight: 'var(--p-cta-text-weight)',
    borderRadius: 'var(--p-radius-md)',
    width: '100%',
    color: '#ffffff',
  }}
  onClick={handleCta}
>
  {ctaText}
</button>
```

---

## Checklist para novos templates

Antes de considerar um template pronto, verificar:

- [ ] Fundo e texto usam paleta neutra (`--p-bg`, `--p-text`, `--p-muted`)
- [ ] H1 usa `--p-h1-size`, `--p-h1-weight` e `--p-h1-lh`
- [ ] Eyebrow está em uppercase com `--p-eyebrow-ls` e cor `--p-muted`
- [ ] Existe exatamente 1 botão CTA primary
- [ ] CTA usa `--p-cta-min-height` (54px) e aceita cor via `settings.cta_color`
- [ ] Espaçamentos usam múltiplos de 4px (tokens `--p-space-*`)
- [ ] Border radius usa `--p-radius-sm/md/lg`
- [ ] Sombra usa o nível correto para o contexto (claro → md, escuro → lg)
- [ ] Imagem de produto usa `object-fit: contain`; imagem de fundo usa `object-fit: cover`
- [ ] `max-width` respeita a categoria do template (`--p-maxw-card` ou `--p-maxw-layout`)
- [ ] Testado em mobile 375px antes de qualquer breakpoint
