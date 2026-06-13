'use strict';

const request = require('supertest');

const noop = (req, res, next) => next();

function makeJobsRepositoryMock() {
  const jobs = new Map();

  return {
    createJob(id, sessionId, expiresAt) {
      jobs.set(id, {
        id,
        session_id: sessionId,
        status: 'extracting',
        message: 'Abrindo a página…',
        result: null,
        error: null,
        error_code: null,
        created_at: Date.now(),
        expires_at: expiresAt,
      });
    },
    getJob(id) { return jobs.get(id) ?? null; },
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
    deleteJob(id) { jobs.delete(id); },
    cleanupExpiredJobs() {},
    _jobs: jobs,
  };
}

const FIXED_SESSION_ID = 'v2-test-session-fixed';

function makeApp({ extractorFactory, analyzeUrlForSectionsService } = {}) {
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

  jest.doMock('../repositories/jobsRepository', () => makeJobsRepositoryMock());

  jest.doMock('../extractors/extractorFactory', () =>
    extractorFactory ?? {
      createExtractor: () => ({
        extract: jest.fn().mockResolvedValue({
          title: 'Produto Premium',
          metaDescription: 'A melhor solução do mercado',
          text: 'Conteúdo da página de produto',
          colors: ['#000', '#fff'],
          cssVars: {},
          imageUrls: [],
        }),
      }),
    }
  );

  jest.doMock('../services/v2/analyzeUrlForSections', () =>
    analyzeUrlForSectionsService ?? {
      analyzeUrlForSections: jest.fn().mockResolvedValue({
        sections: [
          {
            type: 'hero',
            order: 0,
            props: {
              headline: 'Headline',
              subtitle: 'Sub',
              ctaText: 'Comprar',
              ctaUrl: 'https://affiliate.example.com',
              imageUrl: null,
              bgColor: '#fff'
            }
          },
          {
            type: 'faq',
            order: 1,
            props: { title: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] }
          },
          {
            type: 'testimonials',
            order: 2,
            props: {
              title: 'Depoimentos',
              items: [{ name: 'Ana', role: 'Cliente', text: 'Adorei', avatarUrl: null }]
            }
          },
          {
            type: 'footer',
            order: 3,
            props: { legalText: 'Legal', links: [{ label: 'Termos', url: '/termos' }] }
          }
        ]
      })
    }
  );

  const express = require('express');
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.sessionID = FIXED_SESSION_ID;
    next();
  });

  const analyzeRouter = require('../routes/apiAdminPresellsV2AnalyzeUrl');
  app.use('/', analyzeRouter);

  return app;
}

async function runJobToCompletion(app, payload = {
  url: 'https://example.com',
  affiliateUrl: 'https://affiliate.example.com'
}) {
  const postRes = await request(app).post('/').send(payload);
  if (postRes.status !== 202) {
    throw new Error(`POST failed: ${postRes.status} ${JSON.stringify(postRes.body)}`);
  }
  const { jobId } = postRes.body;

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 50));
    const pollRes = await request(app).get(`/${jobId}`);
    const body = pollRes.body;
    if (body.status === 'done' || body.status === 'failed') return body;
  }
  throw new Error('Job never reached terminal state');
}

// ── POST validation ────────────────────────────────────────────────────────

describe('POST /analyze-url — validation', () => {
  test('returns 202 with jobId when url and affiliateUrl are valid', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: 'https://example.com/product',
      affiliateUrl: 'https://affiliate.example.com/track?id=1'
    });
    expect(res.status).toBe(202);
    expect(typeof res.body.jobId).toBe('string');
    expect(res.body.jobId.length).toBeGreaterThan(0);
  });

  test('returns 400 when url is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      affiliateUrl: 'https://affiliate.example.com'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_URL');
  });

  test('returns 400 when url is empty string', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: '   ',
      affiliateUrl: 'https://affiliate.example.com'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_URL');
  });

  test('returns 400 when url is not http/https', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: 'ftp://example.com',
      affiliateUrl: 'https://affiliate.example.com'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  test('returns 400 when url is malformed', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: 'not a url',
      affiliateUrl: 'https://affiliate.example.com'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  test('returns 400 when affiliateUrl is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: 'https://example.com'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_AFFILIATE_URL');
  });

  test('returns 400 when affiliateUrl is malformed', async () => {
    const app = makeApp();
    const res = await request(app).post('/').send({
      url: 'https://example.com',
      affiliateUrl: 'not a url'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AFFILIATE_URL');
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────

describe('processJob — happy path', () => {
  test('done result.sections is an array of 4 sections in correct order', async () => {
    const app = makeApp();
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('done');
    expect(Array.isArray(body.result?.sections)).toBe(true);
    expect(body.result.sections).toHaveLength(4);
    expect(body.result.sections[0].type).toBe('hero');
    expect(body.result.sections[1].type).toBe('faq');
    expect(body.result.sections[2].type).toBe('testimonials');
    expect(body.result.sections[3].type).toBe('footer');
  });

  test('each section has type, order and props with text fields', async () => {
    const app = makeApp();
    const body = await runJobToCompletion(app);

    for (const section of body.result.sections) {
      expect(typeof section.type).toBe('string');
      expect(typeof section.order).toBe('number');
      expect(section.props).toBeTruthy();
      expect(typeof section.props).toBe('object');
    }
    expect(body.result.sections[0].props.headline).toBeTruthy();
    expect(body.result.sections[1].props.title).toBeTruthy();
    expect(body.result.sections[2].props.title).toBeTruthy();
    expect(body.result.sections[3].props.legalText).toBeTruthy();
  });

  test('imageUrl and avatarUrl are null in result sections', async () => {
    const app = makeApp();
    const body = await runJobToCompletion(app);

    const hero = body.result.sections.find(s => s.type === 'hero');
    expect(hero.props.imageUrl).toBeNull();

    const testimonials = body.result.sections.find(s => s.type === 'testimonials');
    for (const item of testimonials.props.items) {
      expect(item.avatarUrl).toBeNull();
    }
  });

  test('hero.ctaUrl matches the affiliateUrl provided in the request', async () => {
    const affiliateUrl = 'https://my-affiliate.example.com/track?id=42';
    // Stub service: return a hero with a different ctaUrl to verify the route overrides it.
    const analyzeUrlForSectionsService = {
      analyzeUrlForSections: jest.fn().mockResolvedValue({
        sections: [
          {
            type: 'hero',
            order: 0,
            props: {
              headline: 'H',
              subtitle: 'S',
              ctaText: 'CTA',
              ctaUrl: 'https://wrong.example.com',
              imageUrl: null,
              bgColor: '#fff'
            }
          },
          { type: 'faq', order: 1, props: { title: 'FAQ', items: [] } },
          { type: 'testimonials', order: 2, props: { title: 'T', items: [] } },
          { type: 'footer', order: 3, props: { legalText: 'L', links: [] } }
        ]
      })
    };

    const app = makeApp({ analyzeUrlForSectionsService });
    const body = await runJobToCompletion(app, {
      url: 'https://example.com',
      affiliateUrl
    });

    const hero = body.result.sections.find(s => s.type === 'hero');
    expect(hero.props.ctaUrl).toBe(affiliateUrl);
  });
});

// ── Error scenarios ────────────────────────────────────────────────────────

describe('processJob — error scenarios', () => {
  test('extractor throwing → status failed with errorCode site_unreachable', async () => {
    const extractorFactory = {
      createExtractor: () => ({
        extract: jest.fn().mockRejectedValue(new Error('Connection refused')),
      }),
    };
    const app = makeApp({ extractorFactory });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('site_unreachable');
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  test('AI service throwing → status failed with errorCode ai_error', async () => {
    const aiError = new Error('Bad response');
    aiError.code = 'AI_API_ERROR';
    const analyzeUrlForSectionsService = {
      analyzeUrlForSections: jest.fn().mockRejectedValue(aiError)
    };
    const app = makeApp({ analyzeUrlForSectionsService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('ai_error');
  });

  test('AI timeout → status failed with errorCode timeout', async () => {
    const aiError = new Error('Timed out');
    aiError.code = 'AI_TIMEOUT';
    const analyzeUrlForSectionsService = {
      analyzeUrlForSections: jest.fn().mockRejectedValue(aiError)
    };
    const app = makeApp({ analyzeUrlForSectionsService });
    const body = await runJobToCompletion(app);

    expect(body.status).toBe('failed');
    expect(body.errorCode).toBe('timeout');
  });
});

// ── GET /:jobId ────────────────────────────────────────────────────────────

describe('GET /:jobId', () => {
  test('returns 404 when jobId is unknown', async () => {
    const app = makeApp();
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});
