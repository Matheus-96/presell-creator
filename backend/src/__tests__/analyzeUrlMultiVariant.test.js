'use strict';

const request = require('supertest');

const noop = (req, res, next) => next();

function makeSessionStore() {
  return class {
    constructor() { this._store = {}; }
    on() {}
    get(sid, cb) { cb(null, this._store[sid] || null); }
    set(sid, session, cb) { this._store[sid] = session; if (cb) cb(null); }
    destroy(sid, cb) { delete this._store[sid]; if (cb) cb(null); }
  };
}

/**
 * Build an in-memory job store so tests don't need real SQLite.
 * Returns the store object AND the mock factory function.
 */
function makeInMemoryJobsRepository() {
  const jobs = new Map();

  return {
    createJob: jest.fn((id, sessionId, expiresAt) => {
      jobs.set(id, { id, session_id: sessionId, status: 'extracting', message: '', result: null, error: null, expires_at: expiresAt });
    }),
    getJob: jest.fn((id) => jobs.get(id) ?? null),
    getActiveJobBySession: jest.fn((sessionId) => {
      for (const job of jobs.values()) {
        if (job.session_id === sessionId && job.expires_at > Date.now()) return job;
      }
      return null;
    }),
    updateJob: jest.fn((id, fields) => {
      const job = jobs.get(id);
      if (!job) return;
      Object.assign(job, fields);
    }),
    deleteJob: jest.fn((id) => {
      jobs.delete(id);
    }),
    cleanupExpiredJobs: jest.fn(),
    _jobs: jobs, // expose for assertions
  };
}

function makeApp(extraMocks = {}) {
  jest.resetModules();

  jest.doMock('../middleware/auth', () => ({
    requireAuth: noop,
    requireApiAuth: noop,
    verifyAdminPassword: jest.fn(() => true),
  }));

  jest.doMock('../middleware/csrf', () => ({
    attachCsrf: noop,
    verifyApiCsrf: noop,
  }));

  jest.doMock('../db/migrations', () => ({ migrate: jest.fn() }));
  jest.doMock('../db/sessionStore', () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock('../services/presellService', () => ({ getPublishedPresell: jest.fn(() => null) }));
  jest.doMock('../services/analyticsService', () => ({
    getOrCreateSession: jest.fn(() => ({ params: {} })),
    recordEventWithSession: jest.fn(),
    resolveRedirect: jest.fn(() => ({ redirectUrl: 'https://example.com' })),
  }));

  jest.doMock('../config/env', () => ({
    getEnv: () => ({
      adminFrontendPath: '/admin',
      sessionCookieSameSite: 'lax',
      sessionCookieSecure: false,
      sessionSecret: 'test-secret',
      trustProxy: false,
      openRouterApiKey: 'test-key',
    }),
  }));

  jest.doMock('../routes/apiPoc', () => {
    const express = require('express');
    return express.Router();
  });

  // Mock uploadService to avoid DB table dependency at module load time
  jest.doMock('../services/uploadService', () => ({
    uploadDir: '/tmp/test-uploads',
    upload: { fields: () => noop, single: () => noop, array: () => noop },
    uploadMultiple: noop,
    registerUpload: jest.fn(),
    deleteUpload: jest.fn(),
  }));

  // Mock jobsRepository with in-memory store to avoid SQLite dependency
  const jobsRepo = makeInMemoryJobsRepository();
  jest.doMock('../repositories/jobsRepository', () => jobsRepo);

  // Apply any extra mocks
  if (extraMocks.urlAnalyzerService) {
    jest.doMock('../poc/urlAnalyzerService', () => extraMocks.urlAnalyzerService);
  }
  if (extraMocks.extractorFactory) {
    jest.doMock('../extractors/extractorFactory', () => extraMocks.extractorFactory);
  }
  if (extraMocks.pocAssetService) {
    jest.doMock('../poc/pocAssetService', () => extraMocks.pocAssetService);
  }
  if (extraMocks.backgroundImageService) {
    jest.doMock('../poc/backgroundImageService', () => extraMocks.backgroundImageService);
  }

  const createApp = require('../bootstrap/createApp');
  return { app: createApp(), jobsRepo };
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Cycle 1: POST /analyze-url accepts multiVariant param without error ────────

describe('POST /api/admin/presells/analyze-url — multiVariant param', () => {
  test('returns 202 when multiVariant: true is passed', async () => {
    const { app } = makeApp({
      extractorFactory: {
        createExtractor: () => ({
          extract: jest.fn(() => Promise.resolve({
            title: 'Test Product',
            metaDescription: 'Great product',
            text: 'Buy now',
            colors: ['#ff0000'],
            cssVars: {},
            imageUrls: [],
            screenshot: null,
          })),
        }),
      },
      pocAssetService: { downloadAndHostImages: jest.fn(() => Promise.resolve([])) },
      backgroundImageService: { extractAndHostBackgroundImage: jest.fn(() => Promise.resolve(null)) },
      urlAnalyzerService: {
        analyzeUrlForForm: jest.fn(() => Promise.resolve({ templateId: 'clean-authority', headline: '', subtitle: '', body: '', bullets: [], ctaText: '', heroImageUrl: null, theme: null, settings: {}, hostedImageUrls: [], backgroundImageUrl: null })),
        analyzeUrlForFormMultiVariant: jest.fn(() => Promise.resolve({ variants: [] })),
        buildMultiVariantSystemPrompt: jest.fn(() => 'prompt'),
      },
    });

    const res = await request(app)
      .post('/api/admin/presells/analyze-url')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com', multiVariant: true });

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('jobId');
  });

  test('returns 202 when multiVariant is not passed (backward compat)', async () => {
    const { app } = makeApp({
      extractorFactory: {
        createExtractor: () => ({
          extract: jest.fn(() => Promise.resolve({
            title: 'Test',
            metaDescription: '',
            text: '',
            colors: [],
            cssVars: {},
            imageUrls: [],
            screenshot: null,
          })),
        }),
      },
      pocAssetService: { downloadAndHostImages: jest.fn(() => Promise.resolve([])) },
      backgroundImageService: { extractAndHostBackgroundImage: jest.fn(() => Promise.resolve(null)) },
      urlAnalyzerService: {
        analyzeUrlForForm: jest.fn(() => Promise.resolve({ templateId: 'clean-authority', headline: '', subtitle: '', body: '', bullets: [], ctaText: '', heroImageUrl: null, theme: null, settings: {}, hostedImageUrls: [], backgroundImageUrl: null })),
        analyzeUrlForFormMultiVariant: jest.fn(),
        buildMultiVariantSystemPrompt: jest.fn(() => 'prompt'),
      },
    });

    const res = await request(app)
      .post('/api/admin/presells/analyze-url')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('jobId');
  });
});

// ── Cycle 2: buildMultiVariantSystemPrompt includes variant instructions ──────
// Note: jest.dontMock is called before each test to undo any doMock from earlier tests.

describe('buildMultiVariantSystemPrompt', () => {
  beforeEach(() => {
    jest.dontMock('../poc/urlAnalyzerService');
    jest.resetModules();
  });

  test('is exported from urlAnalyzerService', () => {
    const mod = require('../poc/urlAnalyzerService');
    expect(typeof mod.buildMultiVariantSystemPrompt).toBe('function');
  });

  test('returns a string containing "variants"', () => {
    const { buildMultiVariantSystemPrompt } = require('../poc/urlAnalyzerService');
    const prompt = buildMultiVariantSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt).toMatch(/variants/i);
  });

  test('references urgency angle (urgência or urgency)', () => {
    const { buildMultiVariantSystemPrompt } = require('../poc/urlAnalyzerService');
    const prompt = buildMultiVariantSystemPrompt();
    expect(prompt).toMatch(/urg[eê]n/i);
  });

  test('references authority angle (autoridade or authority)', () => {
    const { buildMultiVariantSystemPrompt } = require('../poc/urlAnalyzerService');
    const prompt = buildMultiVariantSystemPrompt();
    expect(prompt).toMatch(/autorid|authority/i);
  });

  test('references social-proof angle (prova social or social-proof)', () => {
    const { buildMultiVariantSystemPrompt } = require('../poc/urlAnalyzerService');
    const prompt = buildMultiVariantSystemPrompt();
    expect(prompt).toMatch(/prova social|social.?proof/i);
  });
});

// ── Cycle 3: analyzeUrlForFormMultiVariant returns 3 variants ─────────────────

describe('analyzeUrlForFormMultiVariant', () => {
  let savedApiKey;
  beforeAll(() => {
    // getEnv() requires OPENROUTER_API_KEY to be set; provide a dummy for tests
    savedApiKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });
  afterAll(() => {
    if (savedApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = savedApiKey;
    }
  });

  beforeEach(() => {
    jest.dontMock('../poc/urlAnalyzerService');
    jest.resetModules();
  });

  const mockPageData = {
    title: 'Produto Incrível',
    metaDescription: 'Compre agora',
    text: 'O melhor produto do mercado',
    colors: ['#ff0000', '#ffffff'],
    cssVars: {},
    imageUrls: ['/media/hero.jpg'],
    screenshot: null,
  };

  const mockMultiVariantResponse = {
    variants: [
      {
        angle: 'urgency',
        templateId: 'clean-authority',
        headline: 'Oferta por tempo limitado!',
        subtitle: 'Não perca essa chance',
        body: 'Compre agora antes que acabe.',
        bullets: ['Benefício 1', 'Benefício 2'],
        ctaText: 'Quero agora!',
        heroImageUrl: '/media/hero.jpg',
        theme: { primary: 'rgba(255,0,0,1)', secondary: 'rgba(0,0,0,1)', background: 'rgba(255,255,255,1)', surface: 'rgba(240,240,240,0.95)', textColor: 'rgba(0,0,0,1)' },
        settings: {},
      },
      {
        angle: 'authority',
        templateId: 'clean-authority',
        headline: 'O método comprovado por especialistas',
        subtitle: 'Ciência e resultados',
        body: 'Utilizado por profissionais no Brasil inteiro.',
        bullets: ['Resultado 1', 'Resultado 2'],
        ctaText: 'Quero saber mais',
        heroImageUrl: '/media/hero.jpg',
        theme: { primary: 'rgba(0,0,255,1)', secondary: 'rgba(0,0,0,1)', background: 'rgba(255,255,255,1)', surface: 'rgba(240,240,240,0.95)', textColor: 'rgba(0,0,0,1)' },
        settings: {},
      },
      {
        angle: 'social-proof',
        templateId: 'clean-authority',
        headline: 'Mais de 10.000 clientes satisfeitos',
        subtitle: 'Veja o que dizem sobre nós',
        body: 'Milhares de brasileiros já transformaram suas vidas.',
        bullets: ['Depoimento 1', 'Depoimento 2'],
        ctaText: 'Fazer parte disso',
        heroImageUrl: '/media/hero.jpg',
        theme: { primary: 'rgba(0,128,0,1)', secondary: 'rgba(0,0,0,1)', background: 'rgba(255,255,255,1)', surface: 'rgba(240,240,240,0.95)', textColor: 'rgba(0,0,0,1)' },
        settings: {},
      },
    ],
  };

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockMultiVariantResponse) } }],
        }),
      })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('is exported from urlAnalyzerService', () => {
    const mod = require('../poc/urlAnalyzerService');
    expect(typeof mod.analyzeUrlForFormMultiVariant).toBe('function');
  });

  test('returns { variants: [...] } with 3 items', async () => {
    const { analyzeUrlForFormMultiVariant } = require('../poc/urlAnalyzerService');
    const result = await analyzeUrlForFormMultiVariant(mockPageData, '');
    expect(result).toHaveProperty('variants');
    expect(Array.isArray(result.variants)).toBe(true);
    expect(result.variants).toHaveLength(3);
  });

  test('each variant has angle, templateId, headline', async () => {
    const { analyzeUrlForFormMultiVariant } = require('../poc/urlAnalyzerService');
    const result = await analyzeUrlForFormMultiVariant(mockPageData, '');
    for (const variant of result.variants) {
      expect(variant).toHaveProperty('angle');
      expect(variant).toHaveProperty('templateId');
      expect(variant).toHaveProperty('headline');
    }
  });

  test('angles are urgency, authority, social-proof', async () => {
    const { analyzeUrlForFormMultiVariant } = require('../poc/urlAnalyzerService');
    const result = await analyzeUrlForFormMultiVariant(mockPageData, '');
    const angles = result.variants.map(v => v.angle);
    expect(angles).toContain('urgency');
    expect(angles).toContain('authority');
    expect(angles).toContain('social-proof');
  });

  test('strips markdown fences from AI response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '```json\n' + JSON.stringify(mockMultiVariantResponse) + '\n```' } }],
        }),
      })
    );
    const { analyzeUrlForFormMultiVariant } = require('../poc/urlAnalyzerService');
    const result = await analyzeUrlForFormMultiVariant(mockPageData, '');
    expect(result.variants).toHaveLength(3);
  });

  test('throws AI_TIMEOUT on fetch timeout', async () => {
    const err = new Error('timed out');
    err.name = 'TimeoutError';
    global.fetch = jest.fn(() => Promise.reject(err));
    const { analyzeUrlForFormMultiVariant } = require('../poc/urlAnalyzerService');
    await expect(analyzeUrlForFormMultiVariant(mockPageData, '')).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  });
});

// ── Cycle 4: processJob uses multiVariant path when flag is true ──────────────

describe('processJob with multiVariant=true (integration via route)', () => {
  const mockPageData = {
    title: 'Produto Teste',
    metaDescription: 'Desc',
    text: 'Texto do produto',
    colors: ['#aabbcc'],
    cssVars: {},
    imageUrls: [],
    screenshot: null,
  };

  test('job result contains variants array when multiVariant=true', async () => {
    const analyzeUrlForFormMultiVariantMock = jest.fn(() => Promise.resolve({
      variants: [
        { angle: 'urgency', templateId: 'clean-authority', headline: 'H1', subtitle: '', body: '', bullets: [], ctaText: 'CTA', heroImageUrl: null, theme: null, settings: {} },
        { angle: 'authority', templateId: 'clean-authority', headline: 'H2', subtitle: '', body: '', bullets: [], ctaText: 'CTA', heroImageUrl: null, theme: null, settings: {} },
        { angle: 'social-proof', templateId: 'clean-authority', headline: 'H3', subtitle: '', body: '', bullets: [], ctaText: 'CTA', heroImageUrl: null, theme: null, settings: {} },
      ],
    }));

    const { app, jobsRepo } = makeApp({
      extractorFactory: {
        createExtractor: () => ({ extract: jest.fn(() => Promise.resolve(mockPageData)) }),
      },
      pocAssetService: { downloadAndHostImages: jest.fn(() => Promise.resolve([])) },
      backgroundImageService: { extractAndHostBackgroundImage: jest.fn(() => Promise.resolve(null)) },
      urlAnalyzerService: {
        analyzeUrlForForm: jest.fn(() => Promise.reject(new Error('should not be called in multiVariant mode'))),
        analyzeUrlForFormMultiVariant: analyzeUrlForFormMultiVariantMock,
        buildMultiVariantSystemPrompt: jest.fn(() => 'prompt'),
      },
    });

    const postRes = await request(app)
      .post('/api/admin/presells/analyze-url')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com', multiVariant: true });

    expect(postRes.status).toBe(202);
    const { jobId } = postRes.body;

    // Poll the in-memory job store directly instead of going through HTTP
    // (avoids session-ID mismatch between POST and GET in tests)
    let job;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 50));
      job = jobsRepo._jobs.get(jobId);
      if (job && (job.status === 'done' || job.status === 'failed')) break;
    }

    expect(job).toBeTruthy();
    expect(job.status).toBe('done');
    const result = JSON.parse(job.result);
    expect(result).toHaveProperty('variants');
    expect(result.variants).toHaveLength(3);
    expect(analyzeUrlForFormMultiVariantMock).toHaveBeenCalledTimes(1);
  });

  test('job result does NOT contain variants when multiVariant omitted', async () => {
    const singleResult = {
      templateId: 'clean-authority',
      headline: 'Single headline',
      subtitle: '',
      body: '',
      bullets: [],
      ctaText: 'Comprar',
      heroImageUrl: null,
      theme: null,
      settings: {},
      hostedImageUrls: [],
      backgroundImageUrl: null,
    };

    const { app, jobsRepo } = makeApp({
      extractorFactory: {
        createExtractor: () => ({ extract: jest.fn(() => Promise.resolve(mockPageData)) }),
      },
      pocAssetService: { downloadAndHostImages: jest.fn(() => Promise.resolve([])) },
      backgroundImageService: { extractAndHostBackgroundImage: jest.fn(() => Promise.resolve(null)) },
      urlAnalyzerService: {
        analyzeUrlForForm: jest.fn(() => Promise.resolve(singleResult)),
        analyzeUrlForFormMultiVariant: jest.fn(() => Promise.reject(new Error('should not be called in single mode'))),
        buildMultiVariantSystemPrompt: jest.fn(() => 'prompt'),
      },
    });

    const postRes = await request(app)
      .post('/api/admin/presells/analyze-url')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com' });

    expect(postRes.status).toBe(202);
    const { jobId } = postRes.body;

    // Poll the in-memory job store directly instead of going through HTTP
    let job;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 50));
      job = jobsRepo._jobs.get(jobId);
      if (job && (job.status === 'done' || job.status === 'failed')) break;
    }

    expect(job).toBeTruthy();
    expect(job.status).toBe('done');
    const result = JSON.parse(job.result);
    expect(result).not.toHaveProperty('variants');
    expect(result).toHaveProperty('templateId', 'clean-authority');
  });
});
