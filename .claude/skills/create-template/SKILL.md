---
name: create-template
description: Step-by-step guide for creating a new presell page template in this project. Use when adding a new template, cloning an existing one, or understanding how templates are registered and rendered.
---

# Create Template

Templates are React components rendered entirely client-side. EJS is not used for presell pages.

## Checklist

- [ ] 1. Create the component file
- [ ] 2. Add to the barrel export
- [ ] 3. Register the manifest entry (fields + aiInstructions)

---

### 1. Create the component

**File**: `frontend/src/features/presells/templates/<id>.tsx`

```tsx
import { registerTemplate } from '@/features/presells/templateRegistry'
import type { PresellPublicData } from '@/features/presells/types'

function MyTemplate({ presell }: { presell: PresellPublicData }) {
  const { headline, subtitle, ctaText, bullets, settings, theme, affiliateUrl, imageUrl, backgroundImageUrl } = presell

  // Every visual decision must read from settings, theme, or presell fields — never hardcode.
  const primaryColor = theme?.primary ?? 'rgba(99, 102, 241, 1)'
  const myOption = (settings?.my_option as string) ?? 'default'

  return (
    <div style={{ background: theme?.background }}>
      {/* template markup */}
    </div>
  )
}

registerTemplate('<id>', MyTemplate)
```

**Rules for the component:**

- The component receives `{ presell: PresellPublicData }` as its only prop.
- Call `registerTemplate('<id>', Component)` at the bottom — this is how `PresellPage.tsx` finds the template at runtime via `getTemplate(templateId)`.
- **Every visual aspect that can vary must be driven by a field.** Colors, spacing, typography, visibility toggles, text strings, layout modes — all must be configurable. No hardcoded design tokens that are not also exposed as a field.
- Read settings with explicit type casts: `(settings?.field_name as string) ?? 'fallback'`.
- Apply `theme` colors using inline styles or CSS custom properties so the AI-generated theme takes effect.
- Use CSS class names prefixed with the template id (e.g. `.my-template-headline`) so `previewSelector` fields work correctly.

---

### 2. Add to the barrel

**File**: `frontend/src/features/presells/templates/index.ts`

```ts
export * from './<id>'
```

---

### 3. Add the manifest entry

**File**: `backend/src/templates/registry.js`

Every template entry **must** have five top-level keys: `id`, `name`, `description`, `fields`, and `aiInstructions`.

```js
{
  id: '<id>',
  name: 'My Template',
  description: 'Short description shown in the admin UI.',
  fields: [
    // Every configurable aspect of the template must have a corresponding field here.
    // Fields drive both the admin settings form and the AI prompt.
    {
      name: 'my_text_field',
      label: 'Label shown in admin',
      type: 'text',            // text | textarea | select | checkbox | color | range
      defaultValue: 'Default value',
      maxLength: 40,           // for text/textarea
      helpText: 'Hint shown below the input.',
      previewSelector: '.my-template-my-text-field'  // CSS selector for live preview
    },
    {
      name: 'my_select_field',
      label: 'Select label',
      type: 'select',
      defaultValue: 'option_a',
      options: [
        { value: 'option_a', label: 'Option A' },
        { value: 'option_b', label: 'Option B' },
      ]
    },
    {
      name: 'my_range_field',
      label: 'Intensity',
      type: 'range',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05
    },
    FONT_PAIR_FIELD  // always include unless there is a strong reason not to
  ],
  aiInstructions: `...`  // see section below
}
```

**Field rules:**
- Every `settings.*` key read in the component must have a corresponding field in `fields`.
- Every field in `fields` must be consumed by the component — orphan fields confuse the AI.
- Use `helpText` to explain the field's effect, especially for toggles and ranges.
- Use `previewSelector` for any field that has a direct visible counterpart in the markup.

---

### 4. Write the `aiInstructions` (mandatory)

`aiInstructions` is the prompt that tells the AI model how to fill this template when analyzing a product URL. **Every template must have it.** Without it, the AI cannot populate the template correctly and will ignore it.

The prompt must follow this exact structure:

```
## Quando usar este template
[When to choose this template over others. Be specific about product type, visual context, and trigger conditions. Add a bold "Priorize" line for the strongest trigger.]

## Objetivo
[One paragraph: what the page communicates and the visual strategy.]

## Estrutura visual (de cima para baixo)
[Numbered list of visual sections from top to bottom.]

## Campos do presell
[For each standard field (headline, subtitle, ctaText, bullets, body): one line label, one line guidance, one example. If a field is not shown in this template, say so explicitly.]

## Configurações (settings)
[For each field in `fields`: field name in bold, one line description, valid values or range, one or two examples. Match field names exactly to the `fields` array.]

## Modelo de resposta JSON
[Paste a complete JSON example with all settings filled in with sensible defaults. Use rgba() for theme colors.]
```

**Rules for `aiInstructions`:**

1. **Every `fields` entry must appear in `## Configurações (settings)`.** If the AI does not know a field exists, it will not populate it, and the template will render with `defaultValue` only.
2. **Every field explanation must include the full set of valid values** (for selects) or the numeric range (for ranges). Copy the options from `fields` — do not summarize.
3. **The JSON model must be complete** — it must include every settings key, and its values must be filled in (no `"..."` placeholders for settings fields).
4. **`theme` must always be present** in the JSON model with `rgba()` placeholders.
5. Describe the template's visual personality — the AI uses this to decide *which* template to pick.
6. Explain what to do when `bullets` or `body` is not displayed by this template.

**Full example:**

````js
aiInstructions: `Você irá preencher um template de presell do tipo "My Template" (my-template-id).

## Quando usar este template
Use quando:
- [condition 1]
- [condition 2]
**Priorize este template quando [strongest trigger].**

## Objetivo
[One paragraph describing the visual strategy and conversion goal.]

## Estrutura visual (de cima para baixo)
1. [Section 1]
2. [Section 2]
3. [Section 3]

## Campos do presell

**headline** — [guidance]. Exemplo: "[example]"

**subtitle** — [guidance]. Exemplo: "[example]"

**ctaText** — [guidance]. Exemplo: "[example]"

**bullets** — [Not displayed / displayed as X]. [Guidance if relevant.]

## Configurações (settings)

**my_text_field** — [what it does]. Exemplo: "[example 1]", "[example 2]"

**my_select_field** — [what it does]:
- "option_a": [explanation]
- "option_b": [explanation]

**my_range_field** — [what it does]. Valor entre 0 e 1. Use 0.3–0.5 para [scenario]; 0.7–0.9 para [scenario].

**font_pair** — Par tipográfico:
- "system" — neutro.
- "modern" — Inter. Ideal para tecnologia, finanças, SaaS.
- "serious" — Merriweather + Lato. Ideal para saúde, medicina, jurídico.
- "friendly" — Poppins + Nunito. Ideal para bem-estar, lifestyle.
- "bold" — Montserrat + Open Sans. Ideal para fitness, esportes.

## Modelo de resposta JSON

Responda exclusivamente com um JSON válido neste formato:

\`\`\`json
{
  "headline": "...",
  "subtitle": "...",
  "ctaText": "...",
  "bullets": [],
  "settings": {
    "my_text_field": "example value",
    "my_select_field": "option_a",
    "my_range_field": 0.5,
    "font_pair": "modern"
  },
  "theme": {
    "primary": "rgba(r, g, b, 1)",
    "secondary": "rgba(r, g, b, 1)",
    "background": "rgba(r, g, b, 1)",
    "surface": "rgba(r, g, b, 0.95)",
    "textColor": "rgba(r, g, b, 1)"
  }
}
\`\`\`
`
````

---

## Notes

- No backend render code needed — `PresellPage.tsx` handles rendering.
- The 404 page (`backend/src/views/presell/404.ejs`) is the only remaining EJS file; don't add new EJS templates.
- Template `id` must be unique and match across all three locations above.
- `FONT_PAIR_FIELD` is a shared constant already defined at the top of `registry.js` — reuse it instead of duplicating the field definition.
- The AI reads `aiInstructions` from every template in the registry when deciding which template to use. A weak or incomplete `aiInstructions` means the AI will rarely pick your template.