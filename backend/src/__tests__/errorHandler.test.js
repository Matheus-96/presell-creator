'use strict';

const request = require('supertest');
const express = require('express');

const noop = (req, res, next) => next();

/**
 * Create a minimal Express app that includes the errorHandler middleware.
 */
function makeApp(extraMocks = {}) {
  jest.resetModules();

  // Mock env config — allows controlling NODE_ENV in tests
  jest.doMock('../config/env', () => ({
    getEnv: extraMocks.getEnv ?? (() => ({
      nodeEnv: extraMocks.nodeEnv ?? 'development'
    }))
  }));

  // Mock other middlewares that might be in the app
  jest.doMock('../middleware/auth', () => ({
    requireAuth: noop,
    requireApiAuth: noop,
  }));
  jest.doMock('../middleware/csrf', () => ({
    attachCsrf: noop,
    verifyApiCsrf: noop,
  }));

  const app = express();
  app.use(express.json());

  // Route that throws an unhandled error
  app.get('/unhandled-error', (req, res, next) => {
    const err = new Error('Something went wrong');
    err.stack = 'Error: Something went wrong\n    at ...\n    at ...';
    next(err);
  });

  // Route that throws error with specific status
  app.get('/custom-status-error', (req, res, next) => {
    const err = new Error('Not found');
    err.status = 404;
    next(err);
  });

  // Route that throws error with statusCode property
  app.get('/custom-statuscode-error', (req, res, next) => {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    next(err);
  });

  // Load the errorHandler middleware
  const errorHandler = require('../middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Test 1: Unhandled error returns 500 with JSON structure ──────────────────

describe('errorHandler — unhandled error', () => {
  test('returns 500 status code', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    expect(res.status).toBe(500);
  });

  test('returns JSON with error.code === "internal_error"', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    expect(res.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'internal_error',
          message: 'Erro interno no servidor.'
        })
      })
    );
  });

  test('includes error.message', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    expect(res.body.error.message).toBe('Erro interno no servidor.');
  });

  test('in development, includes error.details.stack', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.stack).toBeDefined();
    expect(typeof res.body.error.details.stack).toBe('string');
  });

  test('in production, does NOT include error.details.stack', async () => {
    const app = makeApp({ nodeEnv: 'production' });
    const res = await request(app).get('/unhandled-error');

    // Either no details field, or details is empty
    const hasStackInProd = res.body.error.details?.stack !== undefined;
    expect(hasStackInProd).toBe(false);
  });
});

// ── Test 2: Errors with specific status are preserved ───────────────────────

describe('errorHandler — error with custom status (404)', () => {
  test('preserves error.status when set', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/custom-status-error');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('internal_error');
  });
});

describe('errorHandler — error with custom statusCode (401)', () => {
  test('preserves error.statusCode when set', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/custom-statuscode-error');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('internal_error');
  });
});

// ── Test 3: Response is valid JSON ────────────────────────────────────────

describe('errorHandler — response format', () => {
  test('response has Content-Type: application/json', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('response body is valid JSON and parseable', async () => {
    const app = makeApp({ nodeEnv: 'development' });
    const res = await request(app).get('/unhandled-error');

    // supertest already parses JSON, so just check structure
    expect(res.body).toEqual(expect.any(Object));
    expect(res.body.error).toEqual(expect.any(Object));
  });
});
