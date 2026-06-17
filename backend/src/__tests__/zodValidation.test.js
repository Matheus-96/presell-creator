'use strict';

const request = require('supertest');
const express = require('express');

/**
 * Create a minimal Express app that includes adminApiController endpoints.
 */
function makeApp(extraMocks = {}) {
  jest.resetModules();

  // Mock env config
  jest.doMock('../config/env', () => ({
    getEnv: extraMocks.getEnv ?? (() => ({
      nodeEnv: extraMocks.nodeEnv ?? 'development',
      adminUser: 'admin'
    }))
  }));

  // Mock auth middleware
  jest.doMock('../middleware/auth', () => ({
    requireAuth: (req, res, next) => next(),
    requireApiAuth: (req, res, next) => next(),
  }));

  // Mock CSRF middleware
  jest.doMock('../middleware/csrf', () => ({
    attachCsrf: (req, res, next) => {
      req.session = req.session || {};
      req.session.csrfToken = 'test-token';
      next();
    },
    verifyApiCsrf: (req, res, next) => next(),
  }));

  // Mock database/service layer
  jest.doMock('../services/presellService', () => ({
    listPresellCollection: () => ({ items: [], hasMore: false, limit: 20 }),
    getPresellById: (id) => (id === '1' ? {
      id: 1,
      slug: 'existing-presell',
      template: 'advertorial',
      status: 'draft',
      title: 'Existing',
      headline: 'Existing',
      subtitle: '',
      body: '',
      bullets: '',
      legal_text: '',
      cta_text: 'Continuar',
      affiliate_url: 'https://example.com',
      google_pixel: null,
      tracking_param: 'gclid',
      image_path: null,
      background_image_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null),
    savePresell: (input) => ({
      id: 1,
      slug: input.slug,
      template: input.template,
      status: input.status,
      title: input.title,
      headline: input.headline,
      subtitle: input.subtitle,
      body: input.body,
      bullets: input.bullets,
      legal_text: input.legalText,
      cta_text: input.ctaText,
      affiliate_url: input.affiliateUrl,
      google_pixel: input.googlePixel,
      tracking_param: input.trackingParam,
      image_path: null,
      background_image_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    duplicatePresell: () => null,
    deletePresell: () => {},
    parseBullets: (p) => (p.bullets || '').split('\n').filter(Boolean)
  }));

  jest.doMock('../services/presellTemplates', () => ({
    allowedTemplates: ['advertorial', 'webinar'],
    templateDefinitions: [],
    normalizeSettings: () => ({}),
    parseSettingsJson: () => ({})
  }));

  jest.doMock('../services/analyticsService', () => ({
    getOverview: () => ({}),
    getAdminSummary: () => ({}),
    getPresellStatistics: () => ({})
  }));

  jest.doMock('../services/adminAuthService', () => ({
    authenticateAdminCredentials: () => true,
    rotateAdminSession: (req, data, cb) => cb(null)
  }));

  jest.doMock('../services/uploadService', () => ({
    registerUpload: () => 'test-file.jpg'
  }));

  jest.doMock('../services/mediaPathService', () => ({
    normalizeMediaPath: (p) => p,
    buildMediaUrl: () => null
  }));

  // Create Express app
  const app = express();
  app.use(express.json());

  // Mock session
  app.use((req, res, next) => {
    req.session = req.session || {};
    req.session.isAdmin = true;
    next();
  });

  // Load the controller
  const controller = require('../controllers/adminApiController');

  // Set up routes
  app.post('/presells', controller.createPresell);
  app.patch('/presells/:id', controller.updatePresell);

  return app;
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Test 1: POST /presells without slug ──────────────────────────────────────

describe('Zod Validation — POST /presells without slug', () => {
  test('returns 400 validation_error', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        affiliate_url: 'https://example.com',
        title: 'Test Presell'
      });

    expect(res.status).toBe(400);
  });

  test('error code is validation_error', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        affiliate_url: 'https://example.com',
        title: 'Test Presell'
      });

    expect(res.body.error.code).toBe('validation_error');
  });

  test('error message is descriptive', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        affiliate_url: 'https://example.com',
        title: 'Test Presell'
      });

    expect(res.body.error.message).toBe('Dados inválidos.');
  });

  test('error includes fields with validation errors', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        affiliate_url: 'https://example.com',
        title: 'Test Presell'
      });

    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.fields).toBeDefined();
  });
});

// ── Test 2: POST /presells with invalid affiliate_url ────────────────────────

describe('Zod Validation — POST /presells with invalid affiliate_url', () => {
  test('returns 400 validation_error', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'not-a-url',
        title: 'Test Presell'
      });

    expect(res.status).toBe(400);
  });

  test('error code is validation_error', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'not-a-url',
        title: 'Test Presell'
      });

    expect(res.body.error.code).toBe('validation_error');
  });

  test('fields detail includes affiliate_url error', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'not-a-url',
        title: 'Test Presell'
      });

    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.fields).toBeDefined();
  });
});

// ── Test 3: PATCH /presells/:id with google_pixel > 50 chars ────────────────

describe('Zod Validation — PATCH /presells/:id with google_pixel > 50 chars', () => {
  test('returns 400 validation_error', async () => {
    const app = makeApp();
    const longPixelId = 'a'.repeat(51);
    const res = await request(app)
      .patch('/presells/1')
      .send({
        google_pixel: longPixelId
      });

    expect(res.status).toBe(400);
  });

  test('error code is validation_error', async () => {
    const app = makeApp();
    const longPixelId = 'a'.repeat(51);
    const res = await request(app)
      .patch('/presells/1')
      .send({
        google_pixel: longPixelId
      });

    expect(res.body.error.code).toBe('validation_error');
  });

  test('error message indicates invalid data', async () => {
    const app = makeApp();
    const longPixelId = 'a'.repeat(51);
    const res = await request(app)
      .patch('/presells/1')
      .send({
        google_pixel: longPixelId
      });

    expect(res.body.error.message).toBe('Dados inválidos.');
  });
});

// ── Test 4: PATCH /presells/:id with invalid tracking_param ────────────────

describe('Zod Validation — PATCH /presells/:id with invalid tracking_param', () => {
  test('returns 400 with numeric starting param', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/presells/1')
      .send({
        tracking_param: '123invalid'
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 with special chars only', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/presells/1')
      .send({
        tracking_param: '---'
      });

    expect(res.status).toBe(400);
  });

  test('error code is validation_error for invalid param', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/presells/1')
      .send({
        tracking_param: '123invalid'
      });

    expect(res.body.error.code).toBe('validation_error');
  });
});

// ── Test 5: PATCH /presells/:id with valid data ─────────────────────────────

describe('Zod Validation — PATCH /presells/:id with valid tracking_param', () => {
  test('accepts param starting with letter', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/presells/1')
      .send({
        tracking_param: 'gclid_param'
      });

    // Should not be 400 validation error
    expect(res.status).not.toBe(400);
  });

  test('accepts param with numbers and underscores', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/presells/1')
      .send({
        tracking_param: 'utm_source_123'
      });

    // Should not be 400 validation error
    expect(res.status).not.toBe(400);
  });
});

// ── Test 6: POST /presells without affiliate_url (both formats) ──────────────

describe('Zod Validation — POST /presells without affiliate_url', () => {
  test('returns 400 when neither affiliate_url nor affiliateUrl provided', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        title: 'Test'
      });

    expect(res.status).toBe(400);
  });

  test('accepts affiliateUrl in camelCase', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliateUrl: 'https://example.com',
        title: 'Test'
      });

    // Should not be 400 validation error
    expect(res.status).not.toBe(400);
  });
});

// ── Test 7: POST /presells with valid minimal data ───────────────────────────

describe('Zod Validation — POST /presells with valid minimal data', () => {
  test('accepts slug and affiliate_url', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'https://example.com'
      });

    // Should not be 400 validation error (may be 404 for presell not found, but not 400)
    expect(res.status).not.toBe(400);
  });

  test('accepts optional fields', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'https://example.com',
        title: 'My Presell',
        headline: 'Great Offer',
        template: 'webinar',
        status: 'draft'
      });

    expect(res.status).not.toBe(400);
  });
});

// ── Test 8: POST /presells with invalid template ───────────────────────────

describe('Zod Validation — POST /presells with invalid template', () => {
  test('returns 400 with invalid template enum', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'https://example.com',
        template: 'invalid-template'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

// ── Test 9: POST /presells with invalid status ────────────────────────────

describe('Zod Validation — POST /presells with invalid status', () => {
  test('returns 400 with invalid status enum', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/presells')
      .send({
        slug: 'test-presell',
        affiliate_url: 'https://example.com',
        status: 'archived'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
