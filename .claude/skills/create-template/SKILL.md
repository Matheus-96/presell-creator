---
name: create-template
description: Step-by-step guide for creating a new presell page template in this project. Use when adding a new template, cloning an existing one, or understanding how templates are registered and rendered.
---

# Create Template

Templates are React components rendered entirely client-side. EJS is not used for presell pages.

## Checklist

- [ ] 1. Create the component file
- [ ] 2. Add to the barrel export
- [ ] 3. Register the manifest entry

---

### 1. Create the component

**File**: `frontend/src/features/presells/templates/<id>.tsx`

```tsx
import { registerTemplate } from '@/features/presells/templateRegistry'
import type { PresellPublicData } from '@/features/presells/types'

function MyTemplate({ presell }: { presell: PresellPublicData }) {
  return (
    <div>
      {/* template markup */}
    </div>
  )
}

registerTemplate('<id>', MyTemplate)
```

- The component receives `{ presell: PresellPublicData }` as its only prop.
- Call `registerTemplate('<id>', Component)` at the bottom — this is how `PresellPage.tsx` finds the template at runtime via `getTemplate(templateId)`.

---

### 2. Add to the barrel

**File**: `frontend/src/features/presells/templates/index.ts`

```ts
export * from './<id>'
```

---

### 3. Add the manifest entry

**File**: `backend/src/templates/registry.js`

```js
{
  id: '<id>',
  name: 'My Template',
  description: 'Short description shown in the admin UI.',
  fields: [
    { name: 'headline', label: 'Headline', type: 'text', defaultValue: '' },
    { name: 'ctaUrl',   label: 'CTA URL',  type: 'url',  defaultValue: '' },
  ]
}
```

- `fields` drives the settings form in the admin UI.
- Each field: `name` (key in presell data), `label` (UI label), `type` (`text`, `url`, `textarea`, `color`, …), `defaultValue`.

---

## Notes

- No backend render code needed — `PresellPage.tsx` handles rendering.
- The 404 page (`backend/src/views/presell/404.ejs`) is the only remaining EJS file; don't add new EJS templates.
- Template `id` must be unique and match across all three locations above.
