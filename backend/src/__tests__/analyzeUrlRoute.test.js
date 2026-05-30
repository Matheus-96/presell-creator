'use strict';

/**
 * Tests for POST /api/admin/presells/analyze-url
 */

const request = require('supertest');

function makeSessionStore() {
  return class {
    on() {}
    get(sid, cb) { cb(null, null); }
    set(sid, session, cb) { if (cb) cb(null); }
    destroy(sid, cb) { if (cb) cb(null); }
  };
}

const VALID_RESULT = {
  templateId: 'offer-modal',
  headline: 'Test Headline',
  subtitle: '',
  body: 'Body text',
  bullets: [],
  ctaText: 'Buy Now',
  heroImageUrl: null,
  theme: null,
  settings: {},
  hostedImageUrls: [],
};

function makeApp({
  analyzeUrlForForm = jest.fn().mockResolvedValue(VALID_RESULT),
  createExtractor = jest.fn().mockReturnValue({
    extract: jest.fn().mockResolvedValue({
      title: 'Test',
      metaDescription: '',
      text: '',
      colors: [],
      cssVars: {},
      imageUrls: [],
      screenshot: null,
    }),
  }),
  downloadAndHostImages = jest.fn().mockResolvedValue([]),
} = {}) {
  jest.resetModules();

  jest.doMock('../db/migrations', () => ({ migrate: jest.fn() }));
  jest.doMock('../db/sessionStore', () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock('../repositories/uploadRepository', () => ({
    createUpload: jest.fn(),
    getUploads: jest.fn(() => []),
    getUploadByFilename: jest.fn(() => null),
  }));
  jest.doMock('../services/presellService', () => ({
    getPublishedPresell: jest.fn(() => null),
  }));
  jest.doMock('../services/analyticsService', () => ({
    getOrCreateSession: jest.fn(() => ({ params: {} })),
    recordEventWithSession: jest.fn(),
    resolveRedirect: jest.fn(() => ({ redirectUrl: 'https://example.com' })),
  }));
  jest.doMock('../poc/urlAnalyzerService', () => ({ analyzeUrlForForm }));
  jest.doMock('../extractors/extractorFactory', () => ({ createExtractor }));
  jest.doMock('../poc/pocAssetService', () => ({ downloadAndHostImages }));

  const createApp = require('../bootstrap/createApp');
  return createApp();
}

// Helper: make an authenticated request (bypass auth via session injection)
function authedPost(app, path, body) {
  // Use supertest agent to handle cookies, inject session via mock
  return request(app)
    .post(path)
    .set('x-csrf-token', 'test-csrf')
    .send(body);
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Integration: route mounted, auth enforced ─────────────────────────────

describe('POST /api/admin/presells/analyze-url', () => {
  test('returns 401 for unauthenticated request with missing url (auth runs first)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/admin/presells/analyze-url')
      .send({});

    expect(res.status).toBe(401);
  });

  // ── 2. Route is mounted — unauthenticated requests → 401 ─────────────────

  test('returns 401 for unauthenticated request (auth middleware runs first)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/admin/presells/analyze-url')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(401);
  });
});

// ── Route-level unit tests using direct handler testing ───────────────────

describe('analyzeUrl route handler logic (unit)', () => {
  // We test the handler directly by importing and calling it with mock req/res

  test('handler returns 400 for missing url', async () => {
    jest.resetModules();
    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn(),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn(),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn(),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    // Get the POST handler from router stack
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    expect(postLayer).toBeDefined();

    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MISSING_URL' })
    );
  });

  test('handler returns 400 for invalid url', async () => {
    jest.resetModules();
    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn(),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn(),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn(),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: { url: 'not-a-url' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_URL' })
    );
  });

  test('handler returns 504 for AI_TIMEOUT error', async () => {
    jest.resetModules();

    const mockExtract = jest.fn().mockResolvedValue({
      title: '', metaDescription: '', text: '', colors: [], cssVars: {}, imageUrls: [], screenshot: null,
    });
    const timeoutErr = Object.assign(new Error('timeout'), { code: 'AI_TIMEOUT' });

    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn().mockRejectedValue(timeoutErr),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn().mockReturnValue({ extract: mockExtract }),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: { url: 'https://example.com' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AI_TIMEOUT' })
    );
  });

  test('handler returns 502 for AI_API_ERROR', async () => {
    jest.resetModules();

    const mockExtract = jest.fn().mockResolvedValue({
      title: '', metaDescription: '', text: '', colors: [], cssVars: {}, imageUrls: [], screenshot: null,
    });
    const apiErr = Object.assign(new Error('OpenRouter returned HTTP 429'), { code: 'AI_API_ERROR' });

    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn().mockRejectedValue(apiErr),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn().mockReturnValue({ extract: mockExtract }),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: { url: 'https://example.com' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AI_API_ERROR' })
    );
  });

  test('handler returns 200 with result on success', async () => {
    jest.resetModules();

    const mockExtract = jest.fn().mockResolvedValue({
      title: 'Prod', metaDescription: '', text: '', colors: [], cssVars: {}, imageUrls: ['https://ex.com/img.jpg'], screenshot: null,
    });

    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn().mockResolvedValue(VALID_RESULT),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn().mockReturnValue({ extract: mockExtract }),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn().mockResolvedValue(['/media/img.jpg']),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: { url: 'https://example.com' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(VALID_RESULT);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('handler returns 502 EXTRACTION_ERROR for non-AI errors', async () => {
    jest.resetModules();

    const extractErr = new Error('Puppeteer crashed');

    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn(),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn().mockReturnValue({
        extract: jest.fn().mockRejectedValue(extractErr),
      }),
    }));
    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: jest.fn(),
    }));

    const router = require('../routes/apiAnalyzeUrl');
    const postLayer = router.stack.find(
      (l) => l.route && l.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

    const req = { body: { url: 'https://example.com' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EXTRACTION_ERROR' })
    );
  });
});
