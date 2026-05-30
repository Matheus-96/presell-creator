'use strict';

/**
 * Tests for urlAnalyzerService.analyzeUrlForForm
 * Mocks: global.fetch, ../config/env, ../templates/registry
 */

const MOCK_PAGE_DATA = {
  title: 'Test Product',
  metaDescription: 'Great product',
  text: 'Buy now and save',
  colors: ['#ff0000', '#ffffff'],
  cssVars: { '--primary': '#ff0000' },
  imageUrls: ['https://example.com/img.jpg'],
  screenshot: null,
};

const VALID_AI_RESULT = {
  templateId: 'offer-modal',
  headline: 'Amazing Product',
  subtitle: 'Best in class',
  body: 'First para.\n\nSecond para.',
  bullets: ['Benefit 1', 'Benefit 2'],
  ctaText: 'Buy Now',
  heroImageUrl: '/media/img.jpg',
  theme: {
    primary: 'rgba(255, 0, 0, 1)',
    secondary: 'rgba(0, 0, 255, 1)',
    background: 'rgba(255, 255, 255, 1)',
    surface: 'rgba(240, 240, 240, 0.95)',
    textColor: 'rgba(0, 0, 0, 1)',
  },
  settings: { discount_text: '50% OFF' },
};

function makeOkFetchResponse(body) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function makeErrorFetchResponse(status, bodyText = '') {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(bodyText),
  };
}

function makeOpenRouterResponse(content) {
  return {
    choices: [{ message: { content } }],
  };
}

function loadService() {
  return require('../poc/urlAnalyzerService');
}

beforeEach(() => {
  jest.resetModules();

  jest.doMock('../config/env', () => ({
    getEnv: () => ({ openRouterApiKey: 'test-key-abc' }),
  }));

  jest.doMock('../templates/registry', () => ({
    listTemplateManifests: () => [
      { id: 'offer-modal', name: 'Oferta com modal', description: 'desc', fields: [] },
      { id: 'urgent-offer', name: 'Oferta urgente', description: 'desc', fields: [] },
    ],
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

// ── 1. Valid JSON response → parsed and returned ───────────────────────────

test('returns parsed result for valid AI JSON', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(JSON.stringify(VALID_AI_RESULT)))
  );

  const { analyzeUrlForForm } = loadService();
  const result = await analyzeUrlForForm(MOCK_PAGE_DATA, ['/media/img.jpg']);

  expect(result.templateId).toBe('offer-modal');
  expect(result.headline).toBe('Amazing Product');
  expect(result.bullets).toEqual(['Benefit 1', 'Benefit 2']);
  expect(result.hostedImageUrls).toEqual(['/media/img.jpg']);
  expect(result.theme).toBeTruthy();
});

// ── 2. Markdown-wrapped JSON stripped ─────────────────────────────────────

test('strips markdown code fences before parsing JSON', async () => {
  const wrapped = '```json\n' + JSON.stringify(VALID_AI_RESULT) + '\n```';

  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(wrapped))
  );

  const { analyzeUrlForForm } = loadService();
  const result = await analyzeUrlForForm(MOCK_PAGE_DATA);

  expect(result.templateId).toBe('offer-modal');
});

// ── 3. Invalid templateId → throws AI_INVALID_SCHEMA ─────────────────────

test('throws AI_INVALID_SCHEMA when AI returns unknown templateId', async () => {
  const badResult = { ...VALID_AI_RESULT, templateId: 'non-existent-template' };

  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(JSON.stringify(badResult)))
  );

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_INVALID_SCHEMA',
  });
});

// ── 4. Non-JSON content → throws AI_INVALID_JSON ──────────────────────────

test('throws AI_INVALID_JSON when AI returns non-JSON text', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse('Sorry, I cannot help with that.'))
  );

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_INVALID_JSON',
  });
});

// ── 5. TimeoutError → throws AI_TIMEOUT ───────────────────────────────────

test('throws AI_TIMEOUT when fetch throws TimeoutError', async () => {
  const timeoutErr = new Error('The operation timed out.');
  timeoutErr.name = 'TimeoutError';

  global.fetch = jest.fn().mockRejectedValue(timeoutErr);

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_TIMEOUT',
  });
});

// ── 6. AbortError → throws AI_TIMEOUT ────────────────────────────────────

test('throws AI_TIMEOUT when fetch throws AbortError', async () => {
  const abortErr = new Error('aborted');
  abortErr.name = 'AbortError';

  global.fetch = jest.fn().mockRejectedValue(abortErr);

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_TIMEOUT',
  });
});

// ── 7. Non-ok HTTP response → throws AI_API_ERROR ────────────────────────

test('throws AI_API_ERROR when OpenRouter returns non-ok status', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    makeErrorFetchResponse(429, 'Rate limit exceeded')
  );

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_API_ERROR',
  });
});

// ── 8. Network error → throws AI_NETWORK_ERROR ───────────────────────────

test('throws AI_NETWORK_ERROR when fetch throws generic network error', async () => {
  const netErr = new Error('connect ECONNREFUSED');
  netErr.name = 'Error';

  global.fetch = jest.fn().mockRejectedValue(netErr);

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_NETWORK_ERROR',
  });
});

// ── 9. Empty response → throws AI_EMPTY_RESPONSE ─────────────────────────

test('throws AI_EMPTY_RESPONSE when choices content is empty', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(''))
  );

  const { analyzeUrlForForm } = loadService();

  await expect(analyzeUrlForForm(MOCK_PAGE_DATA)).rejects.toMatchObject({
    code: 'AI_EMPTY_RESPONSE',
  });
});

// ── 10. Default values for missing optional fields ────────────────────────

test('fills defaults for missing optional fields in AI response', async () => {
  const minimal = { templateId: 'offer-modal' };

  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(JSON.stringify(minimal)))
  );

  const { analyzeUrlForForm } = loadService();
  const result = await analyzeUrlForForm(MOCK_PAGE_DATA);

  expect(result.headline).toBe('');
  expect(result.subtitle).toBe('');
  expect(result.body).toBe('');
  expect(result.bullets).toEqual([]);
  expect(result.ctaText).toBe('Continuar');
  expect(result.heroImageUrl).toBeNull();
  expect(result.theme).toBeNull();
  expect(result.settings).toEqual({});
});

// ── 11. Screenshot encoded as base64 in payload ───────────────────────────

test('sends screenshot as base64 image_url when pageData.screenshot is a Buffer', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    makeOkFetchResponse(makeOpenRouterResponse(JSON.stringify(VALID_AI_RESULT)))
  );

  const { analyzeUrlForForm } = loadService();
  const pageDataWithScreenshot = {
    ...MOCK_PAGE_DATA,
    screenshot: Buffer.from('fake-png-data'),
  };

  await analyzeUrlForForm(pageDataWithScreenshot);

  const [, fetchOptions] = global.fetch.mock.calls[0];
  const body = JSON.parse(fetchOptions.body);
  const userContent = body.messages[1].content;

  expect(Array.isArray(userContent)).toBe(true);
  expect(userContent[0].type).toBe('image_url');
  expect(userContent[0].image_url.url).toMatch(/^data:image\/png;base64,/);
});
