# Testing Guide: UI/UX Improvements & Google Ads Integration

## Pre-Testing Setup

```bash
cd /home/victor/projetos/presell-creator
npm install
npm start
# Server runs on http://localhost:3000
```

---

## Test Suite 1: Live Preview Feature

### Test 1.1: Form Split-Screen Display
**Steps:**
1. Open browser → http://localhost:3000/admin
2. Login (admin / password)
3. Click "Nova presell" or click "Editar" on existing presell
4. **Expected:** Two columns visible:
   - Left: Form fields (slug, template, headline, body, bullets, CTA, URL, pixel ID)
   - Right: Preview pane with "Carregando preview..." text

**Validation:**
- [ ] Form is 50% width on desktop
- [ ] Preview is 50% width on desktop
- [ ] Layout stacks vertically on mobile (< 768px)

### Test 1.2: Real-Time Preview Updates
**Steps:**
1. From form page (1.1), type in "Headline" field
2. **Expected:** Preview pane updates within 300ms with new headline
3. Type in other fields (subtitle, body, CTA text)
4. **Expected:** Each change appears in preview pane

**Validation:**
- [ ] Headline updates in preview
- [ ] Subtitle updates in preview
- [ ] Body text updates in preview
- [ ] CTA text updates in preview
- [ ] Changes don't save to database until form submitted

### Test 1.3: Template Switch in Preview
**Steps:**
1. On form page, change "Template" dropdown
2. Select different template (e.g., quiz, official-simple)
3. **Expected:** Preview pane re-renders with new template

**Validation:**
- [ ] All 8 templates render correctly in preview
- [ ] Preview shows correct template layout
- [ ] No errors in browser console

### Test 1.4: Preview on Mobile
**Steps:**
1. Open form page on mobile (or resize to < 768px)
2. **Expected:** Layout changes to vertical stack
   - Form on top (full width)
   - Preview below (full width)
   - Preview height: 400px

**Validation:**
- [ ] Form fields visible
- [ ] Preview visible below form
- [ ] No horizontal scroll
- [ ] All buttons clickable

---

## Test Suite 2: Google Ads Pixel

### Test 2.1: Pixel Field Appears
**Steps:**
1. Open form (new or edit presell)
2. Scroll to field "Google Ads Pixel (opcional)"
3. **Expected:** Text input field with placeholder "999999999999"
4. Help text: "ID do seu Google Ads Pixel para rastreamento de conversões"

**Validation:**
- [ ] Field is labeled correctly
- [ ] Field is optional (no required attribute)
- [ ] Placeholder is visible

### Test 2.2: Pixel Saved to Database
**Steps:**
1. Fill "Google Ads Pixel ID" with value: `123456789`
2. Fill other required fields (slug, headline, CTA, affiliate URL)
3. Click "Salvar"
4. **Expected:** Form saves successfully
5. Edit presell again
6. **Expected:** Pixel ID field still shows `123456789`

**Validation:**
- [ ] Value persists after save
- [ ] No errors on save
- [ ] No errors on re-edit

### Test 2.3: Pixel Injected in Published Presell
**Steps:**
1. Create presell with Pixel ID: `123456789`
2. Set status to "Publicado"
3. Click "Abrir" (or visit `/p/slug-name`)
4. Right-click → "Inspect" or "View Page Source"
5. Search for "gtag" or "123456789"
6. **Expected:** Google Tag Manager script found:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=123456789"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '123456789');
</script>
```

**Validation:**
- [ ] Script tag found in page source
- [ ] Correct Pixel ID in script
- [ ] No console errors

### Test 2.4: No Pixel When Not Set
**Steps:**
1. Create presell WITHOUT Pixel ID
2. Publish presell
3. View page source
4. **Expected:** No gtag script found

**Validation:**
- [ ] No "gtag" in page source
- [ ] No "googletagmanager" in page source

---

## Test Suite 3: gclid Tracking

### Test 3.1: gclid Capture from URL
**Steps:**
1. Visit presell with gclid: `http://localhost:3000/p/test-slug?gclid=ABC123XYZ789&utm_source=google`
2. **Expected:** Page loads normally
3. Open browser DevTools → Network tab
4. Check session cookie is set (presell.sid)

**Validation:**
- [ ] Page loads without errors
- [ ] No 404s or 500s
- [ ] Session cookie present

### Test 3.2: gclid Stored in Analytics
**Steps:**
1. From Test 3.1, stay on presell page for 2-3 seconds
2. Click CTA button (redirect)
3. Open browser DevTools → Network
4. Check the redirect request
5. **Expected:** gclid is in redirect URL

**Validation:**
- [ ] Redirect URL contains `gclid=ABC123XYZ789`
- [ ] gclid is NOT duplicated
- [ ] UTM params also preserved

### Test 3.3: Analytics Dashboard Shows gclid
**Steps:**
1. Go to /admin (dashboard)
2. Look for "Ultimos eventos" section
3. Check event list
4. **Expected:** Recent events include gclid in tracking data

**Validation:**
- [ ] Events table shows events
- [ ] Recent events section populated
- [ ] No console errors

### Test 3.4: Multiple gclid Values
**Steps:**
1. Visit presell with `?gclid=FIRST123`
2. Go back, visit same presell with `?gclid=SECOND456`
3. Go back, visit with `?gclid=THIRD789`
4. Click CTA from last visit
5. **Expected:** Redirect uses `THIRD789`

**Validation:**
- [ ] Each gclid tracked independently
- [ ] Latest gclid used in redirect
- [ ] All 3 sessions can be queried in DB

---

## Test Suite 4: Integration & Edge Cases

### Test 4.1: Form + Preview + Pixel Together
**Steps:**
1. Create new presell
2. Add Pixel ID in form
3. Watch preview update as you type
4. Fill all fields and save
5. Publish presell
6. Visit published page
7. Verify pixel in source
8. Click CTA with gclid in URL
9. Verify gclid preserved in redirect

**Validation:**
- [ ] All 3 features work together
- [ ] No conflicts or errors
- [ ] Redirect includes both pixel tracking and gclid

### Test 4.2: No Pixel When Empty
**Steps:**
1. Create presell, leave Pixel ID blank
2. Save and publish
3. View source
4. **Expected:** No gtag script

**Validation:**
- [ ] Empty field doesn't inject script
- [ ] Page loads normally

### Test 4.3: Invalid gclid (Too Long)
**Steps:**
1. Visit presell with very long gclid: `?gclid=` + 200 characters
2. **Expected:** gclid truncated or rejected

**Validation:**
- [ ] No errors on page
- [ ] gclid max 100 chars enforced

### Test 4.4: Multiple Presells with Different Pixels
**Steps:**
1. Create Presell A with Pixel ID: `111111111`
2. Create Presell B with Pixel ID: `222222222`
3. Visit A's published page → source shows `111111111`
4. Visit B's published page → source shows `222222222`

**Validation:**
- [ ] Each presell has correct pixel
- [ ] No cross-contamination
- [ ] Both work independently

---

## Test Suite 5: Mobile Responsiveness

### Test 5.1: Form on Mobile
**Steps:**
1. Open form on mobile device (or DevTools 375px width)
2. Scroll through form fields
3. **Expected:** All fields visible and usable

**Validation:**
- [ ] Form stacks vertically
- [ ] Preview below form
- [ ] No horizontal scroll
- [ ] Buttons clickable
- [ ] Text readable (no tiny fonts)

### Test 5.2: Dashboard on Mobile
**Steps:**
1. Open dashboard on mobile (375px)
2. Scroll through presells table
3. Click edit presell

**Validation:**
- [ ] Table scrolls horizontally or columns adjust
- [ ] Metrics cards stack
- [ ] Edit links work
- [ ] No layout breaks

### Test 5.3: Live Preview on Mobile
**Steps:**
1. Edit presell on mobile
2. Type in form field
3. Scroll down to see preview update

**Validation:**
- [ ] Preview updates correctly on mobile
- [ ] Debounce still works (300ms)
- [ ] No errors

---

## Test Suite 6: Accessibility

### Test 6.1: Keyboard Navigation
**Steps:**
1. Open form page
2. Press Tab to navigate through fields
3. **Expected:** Focus visible on each field
4. Press Enter on buttons
5. **Expected:** Buttons respond to keyboard

**Validation:**
- [ ] Tab order is logical
- [ ] Focus visible on all fields
- [ ] Buttons work with Enter/Space
- [ ] No keyboard traps

### Test 6.2: Screen Reader Support
**Steps:**
1. Use screen reader (NVDA on Windows, VoiceOver on Mac)
2. Read form labels
3. **Expected:** Labels read correctly
4. Read button text
5. **Expected:** "Salvar", "Cancelar" etc. announced

**Validation:**
- [ ] Labels properly associated
- [ ] Button text announced
- [ ] Form structure clear
- [ ] No orphaned text

### Test 6.3: Color Contrast
**Steps:**
1. Use tool: https://webaim.org/resources/contrastchecker/
2. Check text on background colors
3. **Expected:** All text passes WCAG AA (4.5:1 for text)

**Validation:**
- [ ] Headline text vs background
- [ ] Form labels vs background
- [ ] Button text vs background
- [ ] Links vs background

---

## Test Suite 7: Performance

### Test 7.1: Form Page Load Time
**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to form page
3. **Expected:** Page loads in < 2 seconds

**Validation:**
- [ ] Page load time < 2s
- [ ] No 404s
- [ ] All resources load

### Test 7.2: Live Preview Response Time
**Steps:**
1. Open form page
2. DevTools → Network tab
3. Type in form field
4. Watch for POST to `/api/presells/:id/preview`
5. **Expected:** Response time 50-200ms

**Validation:**
- [ ] API response < 200ms
- [ ] Preview updates smoothly
- [ ] No hanging requests

### Test 7.3: Database Query Performance
**Steps:**
1. Create 100 presells (or use existing)
2. Open dashboard
3. **Expected:** Dashboard loads in < 1 second

**Validation:**
- [ ] Dashboard fast even with many presells
- [ ] Table renders quickly
- [ ] No visible lag

---

## Smoke Test (Automated)

Run existing smoke test:
```bash
npm run smoke
```

**Expected Output:**
```
✓ Admin login
✓ Create presell
✓ Presell published
✓ Public page loads
✓ Tracking works
✓ Redirect successful
```

All tests should pass.

---

## Browser Compatibility

Test on:
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest (macOS)
- [ ] Edge latest
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Expected:** All features work consistently across all browsers.

---

## Sign-Off Checklist

- [ ] All Test Suite 1 (Live Preview) tests passed
- [ ] All Test Suite 2 (Pixel) tests passed
- [ ] All Test Suite 3 (gclid) tests passed
- [ ] All Test Suite 4 (Integration) tests passed
- [ ] All Test Suite 5 (Mobile) tests passed
- [ ] All Test Suite 6 (Accessibility) tests passed
- [ ] All Test Suite 7 (Performance) tests passed
- [ ] Smoke tests passed
- [ ] No console errors
- [ ] No database errors
- [ ] Ready for production

**Tester:** _______________________  
**Date:** _______________________  
**Comments:** ___________________________________________________________
