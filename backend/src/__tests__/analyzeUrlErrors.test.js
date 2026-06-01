'use strict';

// ── Cycle 1: mapToErrorCode pure function ─────────────────────────────────────

describe('mapToErrorCode', () => {
  let mapToErrorCode;

  beforeAll(() => {
    ({ mapToErrorCode } = require('../poc/analyzeUrlErrors'));
  });

  test("'SITE_UNREACHABLE' → 'site_unreachable'", () => {
    expect(mapToErrorCode('SITE_UNREACHABLE')).toBe('site_unreachable');
  });

  test("'IMAGE_EXTRACTION_FAILED' → 'image_extraction_failed'", () => {
    expect(mapToErrorCode('IMAGE_EXTRACTION_FAILED')).toBe('image_extraction_failed');
  });

  test("'AI_TIMEOUT' → 'timeout'", () => {
    expect(mapToErrorCode('AI_TIMEOUT')).toBe('timeout');
  });

  test("'AI_NETWORK_ERROR' → 'ai_error'", () => {
    expect(mapToErrorCode('AI_NETWORK_ERROR')).toBe('ai_error');
  });

  test("'AI_API_ERROR' → 'ai_error'", () => {
    expect(mapToErrorCode('AI_API_ERROR')).toBe('ai_error');
  });

  test("'AI_EMPTY_RESPONSE' → 'ai_error'", () => {
    expect(mapToErrorCode('AI_EMPTY_RESPONSE')).toBe('ai_error');
  });

  test("'AI_INVALID_JSON' → 'ai_error'", () => {
    expect(mapToErrorCode('AI_INVALID_JSON')).toBe('ai_error');
  });

  test("'AI_INVALID_SCHEMA' → 'ai_error'", () => {
    expect(mapToErrorCode('AI_INVALID_SCHEMA')).toBe('ai_error');
  });

  test('undefined → unknown', () => {
    expect(mapToErrorCode(undefined)).toBe('unknown');
  });

  test("'RANDOM' → 'unknown'", () => {
    expect(mapToErrorCode('RANDOM')).toBe('unknown');
  });
});

// ── Cycle 2: processJob wraps phases with correct error codes ─────────────────

const request = require('supertest');

const noop = (req, res, next) => next();

/**
 * Create an in-memory jobs store that mimics jobsRepository.
 * Returns both the mock module and the store map so tests can inspect state.
 */
function makeJobsRepositoryMock() {
  const jobs = new Map();

  return {
    createJob(id, sessionId, expiresAt) {
      jobs.set(id, {
        id,
        session_id: sessionId,
        status: 'extracting',
        message: 'Abrindo a página com o browser…',
        result: null,
        error: null,
        error_code: null,
        created_at: Date.now(),
        expires_at: expiresAt,
      });
    },
    getJob(id) {
      return jobs.get(id) ?? null;
    },
    getActiveJobBySession(sessionId) {
      const now = Date.now();
      for (const job of jobs.values()) {
        if (job.session_id === sessionId && job.expires_at > now) return job;
      }
      return null;
    },
    updateJob(id, fields = {}) {
      const job = jobs.get(id);
      if (!job) return;
      Object.assign(job, fields);
    },
    deleteJob(id) {
      jobs.delete(id);
    },
    cleanupExpiredJobs() {},
    _jobs: jobs,
  };
}

const FIXED_SESSION_ID = 'test-session-id-fixed';

/**
 * Build a minimal express app with just the analyze-url router.
 * Uses a stub session middleware that provides a fixed sessionID so that
 * the POST job creator and GET poller share the same session without
 * needing real express-session cookie handling.
 */
function makeApp({ extractorFactory, pocAssetService, backgroundImageService, urlAnalyzerService } = {}) {
  jest.resetModules();

  // Stub auth and CSRF
  jest.doMock('../middleware/auth', () => ({
    requireAuth: noop,
    requireApiAuth: noop,
    verifyAdminPassword: jest.fn(() => true),
  }));
  jest.doMock('../middleware/csrf', () => ({
    attachCsrf: noop,
    verifyApiCsrf: noop,
  }));

  // In-memory jobs store — avoids real SQLite DB in tests
  jest.doMock('../repositories/jobsRepository', () => makeJobsRepositoryMock());

  // Avoid uploadRepository hitting real DB (backgroundImageService imports it)
  jest.doMock('../repositories/uploadRepository', () => ({
    createUpload: jest.fn(),
    getUpload: jest.fn(() => null),
    listUploads: jest.fn(() => []),
    deleteUpload: jest.fn(),
  }));

  // Default mocks for poc services (overridable by caller)
  jest.doMock('../extractors/extractorFactory', () =>
    extractorFactory ?? {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({ title: 'Default', text: '', imageUrls: [] }),
      }),
    }
  );
  jest.doMock('../poc/pocAssetService', () =>
    pocAssetService ?? { downloadAndHostImages: jest.fn().mockResolvedValue([]) }
  );
  jest.doMock('../poc/backgroundImageService', () =>
    backgroundImageService ?? { extractAndHostBackgroundImage: jest.fn().mockResolvedValue(null) }
  );
  jest.doMock('../poc/urlAnalyzerService', () =>
    urlAnalyzerService ?? { analyzeUrlForForm: jest.fn().mockResolvedValue({ title: 'result' }) }
  );

  const express = require('express');
  const app = express();
  app.use(express.json());

  // Stub session middleware: always give the same sessionID so POST and GET share a session
  app.use((req, _res, next) => {
    req.sessionID = FIXED_SESSION_ID;
    next();
  });

  const analyzeUrlRouter = require('../routes/apiAnalyzeUrl');
  app.use('/', analyzeUrlRouter);

  return app;
}

/**
 * Helper: POST to start a job (returns jobId), then poll until terminal.
 * Uses a persistent agent so the session cookie is shared between requests.
 * Returns the final GET response body.
 */
async function runJobToCompletion(app) {
  const postRes = await request(app)
    .post('/')
    .send({ url: 'https://example.com' });

  if (postRes.status !== 202) {
    throw new Error(`POST failed: ${postRes.status} ${JSON.stringify(postRes.body)}`);
  }

  const { jobId } = postRes.body;

  // Poll until terminal (done or failed) — max 30 attempts × 100ms = 3s max
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));

    const pollRes = await request(app).get(`/${jobId}`);
    const body = pollRes.body;
    if (body.status === 'done' || body.status === 'failed') {
      return body;
    }
  }

  throw new Error('Job never reached terminal state');
}

describe('processJob — extractor throws → errorCode site_unreachable', () => {
  test('failed job response contains errorCode: site_unreachable', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockRejectedValue(new Error('Connection refused')),
      }),
    };

    const app = makeApp({ extractorFactory });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('site_unreachable');
  });
});


describe('processJob — AI_TIMEOUT → errorCode timeout', () => {
  test('failed job response contains errorCode: timeout', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({
          title: 'Test page',
          text: 'Some text',
          imageUrls: [],
        }),
      }),
    };

    const pocAssetService = {
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    };

    const backgroundImageService = {
      extractAndHostBackgroundImage: jest.fn().mockResolvedValue(null),
    };

    const aiError = new Error('Request timed out');
    aiError.code = 'AI_TIMEOUT';
    const urlAnalyzerService = {
      analyzeUrlForForm: jest.fn().mockRejectedValue(aiError),
    };

    const app = makeApp({ extractorFactory, pocAssetService, backgroundImageService, urlAnalyzerService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('timeout');
  });
});

describe('processJob — AI_API_ERROR → errorCode ai_error', () => {
  test('failed job response contains errorCode: ai_error', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({
          title: 'Test page',
          text: 'Some text',
          imageUrls: [],
        }),
      }),
    };

    const pocAssetService = {
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    };

    const backgroundImageService = {
      extractAndHostBackgroundImage: jest.fn().mockResolvedValue(null),
    };

    const aiError = new Error('API returned 500');
    aiError.code = 'AI_API_ERROR';
    const urlAnalyzerService = {
      analyzeUrlForForm: jest.fn().mockRejectedValue(aiError),
    };

    const app = makeApp({ extractorFactory, pocAssetService, backgroundImageService, urlAnalyzerService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('ai_error');
  });
});

describe('processJob — unknown error → errorCode unknown', () => {
  test('failed job response contains errorCode: unknown', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({
          title: 'Test page',
          text: 'Some text',
          imageUrls: [],
        }),
      }),
    };

    const pocAssetService = {
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    };

    const backgroundImageService = {
      extractAndHostBackgroundImage: jest.fn().mockResolvedValue(null),
    };

    const unknownError = new Error('Something totally unexpected');
    const urlAnalyzerService = {
      analyzeUrlForForm: jest.fn().mockRejectedValue(unknownError),
    };

    const app = makeApp({ extractorFactory, pocAssetService, backgroundImageService, urlAnalyzerService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('unknown');
  });
});

// ── Cycle 3: GET endpoint returns errorCode ───────────────────────────────────

describe('GET /:jobId — failed job includes errorCode in response', () => {
  test('errorCode field is present when job status is failed', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockRejectedValue(new Error('Connection refused')),
      }),
    };

    const app = makeApp({ extractorFactory });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body).toHaveProperty('errorCode');
    expect(typeof body.errorCode).toBe('string');
  });

  test('message is a friendly string (no API key, no HTTP status)', async () => {
    const aiError = new Error('API returned 500 with key sk-abc123');
    aiError.code = 'AI_API_ERROR';
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({
          title: 'Test page',
          text: 'Some text',
          imageUrls: [],
        }),
      }),
    };
    const pocAssetService = {
      downloadAndHostImages: jest.fn().mockResolvedValue([]),
    };
    const backgroundImageService = {
      extractAndHostBackgroundImage: jest.fn().mockResolvedValue(null),
    };
    const urlAnalyzerService = {
      analyzeUrlForForm: jest.fn().mockRejectedValue(aiError),
    };

    const app = makeApp({ extractorFactory, pocAssetService, backgroundImageService, urlAnalyzerService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.message).toBe('Erro no processamento de IA');
    // Ensure raw error internals are not leaked
    expect(body.message).not.toMatch(/sk-/);
    expect(body.message).not.toMatch(/500/);
  });
});
