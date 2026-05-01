# Presell Template Models Design

## Goal

Evolve the presell admin so users can choose among reusable page models and customize each model without losing shared content when switching templates.

The core requirement is that reusable presell parameters must remain stable across template changes. These include slug, status, internal title, headline, subtitle, body, bullets, CTA text, affiliate link, and main image. Template-specific controls should be additive and stored separately.

## Current Project Context

The app is a server-side Node.js, Express, EJS, and SQLite presell manager.

Important existing files:

- `src/services/presellService.js` owns template validation, input normalization, persistence, and bullet parsing.
- `src/routes/admin.js` renders the dashboard, form, save handlers, preview, and delete routes.
- `src/routes/public.js` renders published presells and handles redirects.
- `src/views/admin/form.ejs` is the single admin edit/create form.
- `src/views/presell/*.ejs` contains one EJS file per public presell template.
- `src/public/styles.css` contains admin and public styles.
- `presells.settings_json` already exists and currently stores `{}`.

Because `settings_json` already exists, the first implementation does not need a database migration.

## Recommended Architecture

Use a template registry plus a two-layer data model:

1. Global fields remain first-class columns in `presells`.
2. Template-specific fields live inside `settings_json`.

The registry should be the source of truth for:

- template IDs used in URLs and database rows;
- user-facing names and descriptions in the admin;
- template-specific setting fields;
- default setting values;
- optional helper metadata for previews and admin grouping.

Suggested file:

- `src/services/presellTemplates.js`

The registry should export:

- `templateRegistry`
- `allowedTemplates`
- `getTemplateDefinition(templateId)`
- `getDefaultSettings(templateId)`
- `normalizeSettings(templateId, inputSettings)`
- `parsePresellSettings(presell)`

## Data Contract

Global fields must survive every template switch:

- `slug`
- `status`
- `template`
- `title`
- `headline`
- `subtitle`
- `body`
- `bullets`
- `cta_text`
- `affiliate_url`
- `image_path`

Template-specific settings are stored as JSON:

```json
{
  "badge_text": "Oferta oficial",
  "discount_text": "Up to 43% OFF",
  "rating": "9.0",
  "trust_badges": "Compra segura\nSatisfacao garantida\nPrivacidade protegida",
  "background_mode": "white",
  "countdown_enabled": false
}
```

Settings should be normalized on save by merging:

1. defaults for the selected template;
2. existing stored settings, when editing an existing presell;
3. posted form settings.

This merge order preserves reusable template-specific values where possible while allowing the current save to override visible fields.

When switching from one template to another, shared global fields must remain untouched. Settings that are not used by the new template may remain in JSON so switching back can restore prior values. Public templates should only read the keys they understand.

## Admin UX

The admin form should always show the same global section:

- Slug
- Status
- Template
- Internal title
- Headline
- Subtitle
- Body
- Bullets / benefits
- CTA text
- Affiliate link
- Main image

Below that, show a section named `Opcoes do modelo`. Its contents depend on the selected template.

The template selector should display friendly names instead of raw IDs:

- Advertorial
- Review
- Problema e solucao
- Quiz
- Oficial simples
- Oferta com modal
- Moldura de dispositivo
- Anuncio in-app

The first implementation can render template-specific controls server-side according to the currently selected template. A later enhancement can add client-side switching that reveals relevant fields immediately. Even without JavaScript, saving after changing the template should retain global values.

## Template Models

### Existing Models

`advertorial`

- Article-style presell.
- Uses headline, subtitle, image, body, bullets, CTA.

`review`

- Review and summary style.
- Uses headline, subtitle, image, body, bullets, CTA.

`problem`

- Problem and solution split layout.
- Uses headline, subtitle, image, body, bullets, CTA.

`quiz`

- Simple quiz-like decision screen.
- Uses headline, subtitle, image, body, bullets as options, CTA.

### New Models

`official-simple`

- Inspired by direct bridge pages with a white card and strong official-site CTA.
- Uses headline, subtitle/body, CTA, affiliate link, and trust badges.
- Specific settings:
  - `badge_text`
  - `trust_badges`
  - `accent_color`
  - `show_arrows`

`offer-modal`

- Inspired by a landing page dimmed behind a central offer modal.
- Uses image as the background/hero if present, headline/subtitle, CTA.
- Specific settings:
  - `discount_text`
  - `scarcity_text`
  - `rating`
  - `stars_text`
  - `modal_cta_text_override`
  - `overlay_strength`

`device-frame`

- Inspired by a page shown inside a browser, laptop, or phone frame.
- Uses headline, image, CTA, bullets, and footer links text.
- Specific settings:
  - `frame_type`
  - `top_bar_text`
  - `footer_left_text`
  - `footer_right_text`
  - `offer_note`

`app-ad`

- Very simple in-app ad style page.
- White background, concise text, centered CTA, optional small image/logo, and minimal disclaimer.
- Specific settings:
  - `label_text`
  - `microcopy`
  - `disclaimer`
  - `layout_density`
  - `button_style`

## Rendering Rules

Public routes should continue rendering `presell/${presell.template}`.

Before rendering, the route should attach parsed settings:

```js
const settings = parsePresellSettings(presell);
```

Then pass `settings` into EJS:

```js
res.render(`presell/${presell.template}`, {
  title: presell.title,
  presell,
  settings,
  bullets: parseBullets(presell),
  preview: false
});
```

Preview should use the same path and parsed settings.

If an unknown template is somehow stored, the service should fall back to `advertorial` during normalization. Rendering can also defensively fall back to `advertorial` to avoid runtime template errors.

## Implementation Plan

1. Add `src/services/presellTemplates.js`.
2. Move the allowed template list out of `presellService.js` and derive it from the registry.
3. Add safe settings parsing and normalization helpers.
4. Update `savePresell` so edits can merge existing `settings_json` with posted settings.
5. Update `emptyPresell()` in `src/routes/admin.js` to include `settings_json: '{}'`.
6. Parse settings before rendering admin forms, preview, and public pages.
7. Update `src/views/admin/form.ejs` to render friendly template labels and template-specific settings.
8. Add public EJS files:
   - `src/views/presell/official-simple.ejs`
   - `src/views/presell/offer-modal.ejs`
   - `src/views/presell/device-frame.ejs`
   - `src/views/presell/app-ad.ejs`
9. Extend `src/public/styles.css` with isolated classes for the new templates.
10. Verify create, edit, preview, publish, redirect, and template switching flows.

## Test Plan

Manual verification is acceptable for the first pass because the project does not currently include an automated test runner.

Required checks:

- Create one presell for each new template.
- Edit an existing presell and switch between at least three templates.
- Confirm global fields remain present after each switch:
  - headline
  - subtitle
  - body
  - bullets
  - CTA text
  - affiliate link
  - image
- Confirm model-specific settings save and render.
- Confirm preview works for all templates.
- Publish each template and open `/p/:slug`.
- Click CTA and confirm `/go/:slug` redirects to the affiliate link.
- Confirm query parameters from tracking are still preserved.

## Future Enhancements

- Add a visual template picker with thumbnails in the admin.
- Add client-side preview updates while editing.
- Add reusable brand/theme presets.
- Add per-template conversion metrics in the dashboard.
- Add A/B testing between templates for the same affiliate link.
