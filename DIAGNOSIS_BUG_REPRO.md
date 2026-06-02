# Bug Reproduction & Diagnosis

## Summary

Two distinct bugs found in the presell wizard:

1. **Language parameter never reaches the AI** — hardcoded to Portuguese
2. **Retry after error leaves stale job in localStorage** — causes looping behavior

---

## BUG #1: Language Not Respected

### Symptom
- User selects "English (US)" in ConfigStep
- AI analysis always returns Portuguese results
- Language selection is ignored

### Root Causes (3 failure points)

**Failure Point 1: Frontend API call**
- File: `frontend/src/features/presells/lib/presells-api.ts`
- Lines: 42-52
- Problem: `startAnalyzeUrl(url, userInstructions)` doesn't accept `language` parameter
- The frontend **collects** language in ConfigStep (line 25) but **never sends** it to the backend
- Language is stored in wizard state but discarded when calling the API

**Failure Point 2: Backend route handler**
- File: `backend/src/routes/apiAnalyzeUrl.js`
- Line: 33
- Problem: Only destructures `{ url }` from request body
- Backend **never reads** the language field even if it were sent

**Failure Point 3: System prompt**
- File: `backend/src/poc/urlAnalyzerService.js`
- Lines: 6-86
- Problem: `buildSystemPrompt(hasBackgroundImage)` has NO language parameter
- Line 39 hardcodes: "Gerar o conteúdo persuasivo em português brasileiro"
- Prompt is 100% Portuguese, zero logic to switch languages

### Data Flow (showing the gap)
```
ConfigStep.tsx:25
  language = "en-US"
  ↓
ConfigStep.tsx:37
  onStartAnalysis({ url, language, prompt }, jobId)
  ↓
PresellWizardPage.tsx:64
  startAnalysis(config, jobId)  ← config has language
  ↓
useWizardState.ts:71
  localStorage.setItem(STORAGE_KEY, { jobId, config, timestamp })  ← config saved with language
  ↓
PresellWizardPage.tsx:36
  startAnalyzeUrl(url, prompt)  ← ❌ LANGUAGE NOT PASSED
  ↓
presells-api.ts:47
  POST /admin/presells/analyze-url
  body: { url, userInstructions }  ← ❌ NO LANGUAGE FIELD
  ↓
apiAnalyzeUrl.js:33
  const { url } = req.body  ← ❌ LANGUAGE NOT EXTRACTED
  ↓
urlAnalyzerService.js:148
  await analyzeUrlForForm(pageData, [], null, userInstructions)  ← ❌ NO LANGUAGE PARAM
  ↓
urlAnalyzerService.js:145
  buildSystemPrompt(!!backgroundImage?.hostedUrl)  ← ❌ LANGUAGE NOT PASSED
  → Always outputs Portuguese (hardcoded line 39)
```

### Test Case for Bug #1

```javascript
// Frontend test (frontend/src/features/presells/lib/presells-api.ts)
test('startAnalyzeUrl should send language parameter', async () => {
  const result = await startAnalyzeUrl('https://example.com', undefined, 'en-US');
  
  // Mock would show:
  // POST /admin/presells/analyze-url
  // body: { url: 'https://example.com', language: 'en-US' }
})

// Backend integration test (backend/src/routes/__tests__/apiAnalyzeUrl.test.js)
test('analyzeUrlForForm receives language parameter', async () => {
  const result = await analyzeUrlForForm(pageData, [], null, 'user instructions', 'en-US');
  
  // buildSystemPrompt should be called with language parameter
  // System prompt should instruct in English, not Portuguese
})
```

---

## BUG #2: Retry Loop on AI Error

### Symptom
- When AI analysis fails (e.g., network error), error toast appears
- User clicks "Tentar novamente" (Retry)
- App navigates back to config, but state is broken
- Clicking submit again gets stuck or loops
- Workaround: Reset entire presell creation

### Root Causes (2 failure points)

**Failure Point 1: No cleanup on retry**
- File: `frontend/src/features/presells/wizard/PresellWizardPage.tsx`
- Line: 148
- Problem: `onRetry={() => navigate('/presells/new')}` navigates away without clearing storage
- Old job data + UUID stays in localStorage
- TTL is 5 minutes per storage, job TTL on backend is also 5 minutes

**Failure Point 2: Storage restore doesn't validate job state**
- File: `frontend/src/features/presells/wizard/useWizardState.ts`
- Lines: 59-68
- Problem: `useEffect` unconditionally restores from localStorage on mount
- Doesn't check if the stored job is in a "failed" state
- If user quickly retries within 5 minutes, the effect re-enters "analyzing" step
- React Query cache still has old query data

### State Flow (showing the problem)
```
AnalyzingStep detects failure
  ↓
onRetry() called
  ↓
PresellWizardPage.tsx:148
  navigate('/presells/new')  ← ❌ NO CLEANUP
  ↓
localStorage still has:
  {
    jobId: "abc-123",           ← Still there!
    config: { url, language },  ← Still there!
    timestamp: 1234567890
  }
  ↓
ConfigStep mounted with cleared form
  ↓
useWizardState.useEffect (lines 59-68)
  ↓
loadFromStorage() returns { jobId, config }  ← ❌ Non-null!
  ↓
setState({ step: 'analyzing', jobId, config })  ← ❌ JUMPS BACK TO ANALYZING
  ↓
User is confused, state is broken
  OR
If user submits new URL while old job still exists:
  POST /admin/presells/analyze-url
  ↓
apiAnalyzeUrl.js:50
  getActiveJobBySession() finds old job
  ↓
409 Conflict: "job_in_progress"  ← Can't start new job
```

### Retry Button Problem
The retry button navigation has a secondary issue: **React Query cache**.
- AnalyzingStep uses `useQuery(queryKey: ['analyze-job', jobId])`
- When retry navigates and old job is restored, same jobId is queried
- But the QueryClient cache might still have the failed status
- New polling might skip steps because cached data shows "failed"

### Test Case for Bug #2

```javascript
// Frontend integration test
test('Retry after error should clear stale job from storage', async () => {
  // 1. Start analysis with URL
  await user.type(urlInput, 'https://example.com');
  await user.click(analyzeButton);
  
  // 2. Wait for analyzing step
  await waitFor(() => expect(screen.getByText('Analisando…')).toBeInTheDocument());
  
  // 3. Simulate error
  mockPollAnalyzeJob.mockResolvedValueOnce({
    status: 'failed',
    message: 'Erro',
    errorCode: 'ai_error'
  });
  
  // 4. Click retry
  const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
  await user.click(retryButton);
  
  // 5. Verify storage was cleared
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();  // ❌ FAILS - still has data
  
  // 6. Enter new URL
  await user.type(urlInput, 'https://different-url.com');
  
  // 7. Submit should work without 409 conflict
  // Should NOT get 409 job_in_progress error
});

test('Storage restore should not restore failed jobs', async () => {
  // Set up failed job in storage
  localStorage.setItem('presell_wizard_job', JSON.stringify({
    jobId: 'failed-job-123',
    config: { url: 'https://example.com', language: 'pt-BR', prompt: '' },
    timestamp: Date.now() - 1000
  }));
  
  // Mount component
  render(<PresellWizardPage />);
  
  // Should NOT jump to analyzing step with failed job
  // Should show ConfigStep and let user start fresh
  expect(screen.getByText('Criar presell com IA')).toBeInTheDocument();  // ❌ FAILS - jumps to analyzing
});
```

---

## Proposed Fixes

### Fix for Bug #1: Language Support (3 changes required)

**Change 1: Frontend API signature**
File: `frontend/src/features/presells/lib/presells-api.ts`
```typescript
export async function startAnalyzeUrl(
  url: string,
  userInstructions?: string,
  language: string = 'pt-BR',  // ADD THIS
): Promise<{ jobId: string }> {
  return await apiClient.post<{ jobId: string }>(`${adminApiPaths.presells}/analyze-url`, {
    body: {
      url,
      language,  // ADD THIS
      ...(userInstructions ? { userInstructions } : {}),
    },
  })
}
```

**Change 2: ConfigStep to pass language**
File: `frontend/src/features/presells/wizard/steps/ConfigStep.tsx`
Line 36:
```typescript
const { jobId } = await startAnalyzeUrl(url, prompt || undefined, language)  // ADD language
```

**Change 3: Backend to accept and use language**
File: `backend/src/routes/apiAnalyzeUrl.js`
Lines 32-62:
```javascript
router.post('/', async (req, res) => {
  const { url, language = 'pt-BR' } = req.body;  // ADD language with default
  // ... validation ...
  processJob(jobId, parsedUrl.href, userInstructions, language)  // PASS language
});

async function processJob(jobId, url, userInstructions, language = 'pt-BR') {
  // ... extraction ...
  const result = await analyzeUrlForForm(
    pageData, 
    [], 
    null, 
    userInstructions,
    language  // PASS language
  );
}
```

**Change 4: Backend service to support language**
File: `backend/src/poc/urlAnalyzerService.js`
Lines 6, 89:
```javascript
function buildSystemPrompt(hasBackgroundImage = false, language = 'pt-BR') {
  const languageInstructions = {
    'pt-BR': 'Gerar o conteúdo persuasivo em português brasileiro',
    'en-US': 'Generate persuasive content in English (US)',
    'es': 'Generar contenido persuasivo en español',
    'fr': 'Générer un contenu persuasif en français',
  };
  
  const langInstruction = languageInstructions[language] || languageInstructions['pt-BR'];
  // Replace line 39 with dynamic instruction
  return `Você é um especialista em copywriting...
  
  Sua tarefa é analisar os dados de uma página de produto e preencher automaticamente um formulário de presell.
  
  Você deve:
  1. Escolher o template mais adequado...
  2. ${langInstruction}  // DYNAMIC NOW
  ...`;
}

async function analyzeUrlForForm(
  pageData, 
  hostedImageUrls = [], 
  backgroundImage = null, 
  userInstructions = '',
  language = 'pt-BR'  // ADD parameter
) {
  // ...
  messages: [
    { role: 'system', content: buildSystemPrompt(!!backgroundImage?.hostedUrl, language) },  // PASS language
    // ...
  ],
}
```

---

### Fix for Bug #2: Retry Cleanup (2 changes)

**Change 1: Clear storage on retry**
File: `frontend/src/features/presells/wizard/PresellWizardPage.tsx`
Line 148:
```typescript
const handleRetry = () => {
  localStorage.removeItem('presell_wizard_job');  // ADD THIS
  navigate('/presells/new');
}

// Then:
<AnalyzingStep
  jobId={state.jobId}
  goToImages={goToImages}
  onRetry={handleRetry}  // USE NEW FUNCTION
/>
```

**Change 2: Don't restore failed jobs**
File: `frontend/src/features/presells/wizard/useWizardState.ts`
Lines 59-68:
```typescript
useEffect(() => {
  const recovered = loadFromStorage();
  
  // Only restore if NOT recently failed
  if (recovered) {
    // NEW: Add a "failed" flag to storage to mark terminated jobs
    // Or: Only restore if job was in "analyzing" state, not "failed"
    // This prevents bouncing back into analyzing after a failure
    setState((prev) => ({
      ...prev,
      step: 'analyzing',
      jobId: recovered.jobId,
      config: recovered.config,
    }));
  }
}, []);
```

Better approach: Add `status` field to stored job:
```typescript
type StoredJob = {
  jobId: string;
  config: WizardConfig;
  status: 'active' | 'failed';  // Track if job was failed
  timestamp: number;
};

// In AnalyzingStep, when status becomes 'failed':
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  jobId,
  config,
  status: 'failed',  // Mark as failed
  timestamp: Date.now(),
}));

// In useWizardState recovery:
if (recovered && recovered.status !== 'failed') {
  // Only restore active jobs, not failed ones
  setState(...);
}
```

---

## Files to Modify

### Bug #1 (Language)
1. `frontend/src/features/presells/lib/presells-api.ts` — Add language param to startAnalyzeUrl
2. `frontend/src/features/presells/wizard/steps/ConfigStep.tsx` — Pass language to API
3. `backend/src/routes/apiAnalyzeUrl.js` — Extract language, pass to processJob
4. `backend/src/poc/urlAnalyzerService.js` — Parametrize buildSystemPrompt, accept language

### Bug #2 (Retry Loop)
1. `frontend/src/features/presells/wizard/PresellWizardPage.tsx` — Clear storage on retry
2. `frontend/src/features/presells/wizard/useWizardState.ts` — Add status tracking to stored job

---

## Verification Tests

After fixes, the following should pass:

```bash
# Bug #1 verification
npm run dev:split
# 1. Open http://localhost:5173/admin
# 2. Go to "Criar presell com IA"
# 3. Select "English (US)" from language dropdown
# 4. Paste any valid URL (e.g., https://example.com)
# 5. Click "Analisar"
# 6. Wait for analysis
# 7. ✓ Presell headline should be in English, not Portuguese

# Bug #2 verification
# 1. Trigger an AI error (edit backend code to throw error temporarily)
# 2. Wait for error toast
# 3. Click "Tentar novamente"
# 4. localStorage.getItem('presell_wizard_job') should return null
# 5. ConfigStep should be visible with cleared inputs
# 6. Submit new URL should NOT return 409 conflict
# 7. ✓ Analysis should start fresh without looping
```
