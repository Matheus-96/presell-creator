# Presell Template Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable presell template models in the admin while preserving shared fields when switching templates.

**Architecture:** Add a template registry as the source of truth, keep global presell fields in columns, and store per-template customization in `settings_json`. Public rendering receives parsed settings and each EJS template reads only the settings it understands.

**Tech Stack:** Node.js, Express, EJS, native SQLite through the existing service layer, plain CSS.

---

## File Structure

- Create `src/services/presellTemplates.js`: template registry, labels, defaults, field metadata, settings parsing and normalization.
- Modify `src/services/presellService.js`: derive `allowedTemplates` from registry and persist normalized `settings_json`.
- Modify `src/routes/admin.js`: pass template definitions/settings to the form and preview.
- Modify `src/routes/public.js`: pass parsed settings to public renders and fall back safely.
- Modify `src/views/admin/form.ejs`: render friendly template labels and the `Opcoes do modelo` settings section.
- Create `src/views/presell/official-simple.ejs`: simple official-site bridge model.
- Create `src/views/presell/offer-modal.ejs`: dimmed background with offer modal model.
- Create `src/views/presell/device-frame.ejs`: browser/device frame model.
- Create `src/views/presell/app-ad.ejs`: white in-app ad style model.
- Modify `src/public/styles.css`: scoped styles for the admin settings section and new public models.

## Parallel Work Contract

Workers must not edit files outside their ownership.

- Worker A owns service and route integration.
- Worker B owns new public EJS templates only.
- Worker C owns CSS only.
- Controller owns final admin form integration if Worker A returns before Worker B/C, or reviews/merges all outputs.

Shared setting keys are fixed by this contract:

- `official-simple`: `badge_text`, `trust_badges`, `accent_color`, `show_arrows`
- `offer-modal`: `discount_text`, `scarcity_text`, `rating`, `stars_text`, `modal_cta_text_override`, `overlay_strength`
- `device-frame`: `frame_type`, `top_bar_text`, `footer_left_text`, `footer_right_text`, `offer_note`
- `app-ad`: `label_text`, `microcopy`, `disclaimer`, `layout_density`, `button_style`

### Task 1: Registry And Service Integration

**Files:**
- Create: `src/services/presellTemplates.js`
- Modify: `src/services/presellService.js`
- Modify: `src/routes/admin.js`
- Modify: `src/routes/public.js`

- [ ] **Step 1: Add template registry**

Create `src/services/presellTemplates.js` with template definitions for the four existing models and four new models. Export `templateRegistry`, `templateDefinitions`, `allowedTemplates`, `getTemplateDefinition`, `getDefaultSettings`, `parseSettingsJson`, `normalizeSettings`, and `parsePresellSettings`.

- [ ] **Step 2: Update presell service**

Import `allowedTemplates` and `normalizeSettings`. In `savePresell`, fetch the existing presell before normalization when `input.id` exists and pass it into `normalizePresellInput`. Store `settings_json` from `normalizeSettings(template, input.settings || {}, existingSettings)`.

- [ ] **Step 3: Update admin route data**

Import `templateDefinitions`, `parsePresellSettings`, and `getTemplateDefinition`. Pass `templateDefinitions`, `selectedTemplate`, and parsed `settings` to `admin/form` for new, edit, and validation error renders. Pass `settings` to preview renders.

- [ ] **Step 4: Update public route data**

Import `parsePresellSettings` and `getTemplateDefinition`. Use a defensive template ID for `res.render` so bad database data falls back to `advertorial`. Pass `settings` to public templates.

- [ ] **Step 5: Verify syntax**

Run: `node --check src/services/presellTemplates.js`, `node --check src/services/presellService.js`, `node --check src/routes/admin.js`, and `node --check src/routes/public.js`.

Expected: each command exits successfully without syntax errors.

### Task 2: Public Template Markup

**Files:**
- Create: `src/views/presell/official-simple.ejs`
- Create: `src/views/presell/offer-modal.ejs`
- Create: `src/views/presell/device-frame.ejs`
- Create: `src/views/presell/app-ad.ejs`

- [ ] **Step 1: Add official simple template**

Create a complete EJS document that uses `presell.headline`, `presell.subtitle`, `presell.body`, `presell.cta_text`, `settings.badge_text`, `settings.trust_badges`, `settings.accent_color`, and `settings.show_arrows`.

- [ ] **Step 2: Add offer modal template**

Create a complete EJS document with a dimmed background image when `presell.image_path` exists, central offer modal, `settings.discount_text`, `settings.scarcity_text`, `settings.rating`, `settings.stars_text`, and CTA text using `settings.modal_cta_text_override || presell.cta_text`.

- [ ] **Step 3: Add device frame template**

Create a complete EJS document with a browser/device frame, optional product image, headline, offer note, CTA, footer texts, and bullets.

- [ ] **Step 4: Add app ad template**

Create a complete EJS document with a white background, optional small image, label, headline/subtitle/body, microcopy, CTA, and disclaimer.

- [ ] **Step 5: Verify EJS files exist and are complete**

Run: `Get-ChildItem src\views\presell\*.ejs | Select-Object Name,Length`.

Expected: the four new files exist with non-zero length.

### Task 3: CSS For New Models

**Files:**
- Modify: `src/public/styles.css`

- [ ] **Step 1: Add admin setting section styles**

Add styles for `.settings-panel`, `.template-help`, `.checkbox-row`, and small helper text so template-specific controls match the current admin UI.

- [ ] **Step 2: Add public styles for new models**

Add scoped styles for `.official-simple-*`, `.offer-modal-*`, `.device-frame-*`, and `.app-ad-*`. Keep selectors isolated to avoid changing existing templates.

- [ ] **Step 3: Add responsive behavior**

Extend the existing media query so the new layouts remain readable under `760px`.

- [ ] **Step 4: Verify CSS contains all scopes**

Run: `Select-String -Path src\public\styles.css -Pattern "official-simple|offer-modal|device-frame|app-ad|settings-panel"`.

Expected: matches for all five scopes.

### Task 4: Admin Form Integration

**Files:**
- Modify: `src/views/admin/form.ejs`

- [ ] **Step 1: Update template select**

Render `templateDefinitions` with friendly labels and descriptions instead of raw template IDs.

- [ ] **Step 2: Add settings section**

Render `Opcoes do modelo` after the image field. Iterate over `selectedTemplate.fields` and render `input`, `textarea`, `select`, or checkbox controls using names like `settings[badge_text]`.

- [ ] **Step 3: Preserve existing settings values**

For each field, render `settings[field.name]` when present and fall back to `field.defaultValue`. Checkbox fields should submit `"true"` when checked and include a hidden `"false"` fallback.

- [ ] **Step 4: Verify markup dependencies**

Run: `Select-String -Path src\views\admin\form.ejs -Pattern "templateDefinitions|selectedTemplate|settings\\["`.

Expected: matches for registry-driven template select and settings fields.

### Task 5: End-To-End Verification

**Files:**
- No code ownership. Verification only.

- [ ] **Step 1: Run syntax checks**

Run: `node --check` for every modified `.js` file.

- [ ] **Step 2: Start server**

Run: `npm start`.

Expected: server prints `Presell server running at http://localhost:3000`.

- [ ] **Step 3: Manual browser checks**

Open `/admin`, create or edit a presell, switch templates, and verify global fields remain visible. Preview all four new templates.

- [ ] **Step 4: Redirect check**

For a published presell, open `/p/:slug`, click the CTA, and confirm `/go/:slug` redirects to the affiliate URL.
