'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

function makeSessionStore() {
  return class {
    on() {}

    get(sid, cb) { cb(null, null); }

    set(sid, session, cb) { if (cb) cb(null); }

    destroy(sid, cb) { if (cb) cb(null); }
  };
}

function makeTempDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-test-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

const noop = (req, res, next) => next();

/**
 * Build a test app with auth bypassed and uploadDir overridden.
 * Pass null for uploadDirOverride to skip uploadService mock (uses real).
 * Pass false for bypassAuth to use real auth middleware (returns 401).
 */
function makeApp({ uploadDir: uploadDirOverride, bypassAuth = true } = {}) {
  jest.resetModules();

  if (bypassAuth) {
    jest.doMock('../middleware/auth', () => ({
      requireAuth: noop,
      requireApiAuth: noop,
      verifyAdminPassword: jest.fn(() => true),
    }));
  } else {
    jest.dontMock('../middleware/auth');
  }

  jest.doMock('../db/migrations', () => ({ migrate: jest.fn() }));
  jest.doMock('../db/sessionStore', () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock('../services/presellService', () => ({ getPublishedPresell: jest.fn(() => null) }));
  jest.doMock('../services/analyticsService', () => ({
    getOrCreateSession: jest.fn(() => ({ params: {} })),
    recordEventWithSession: jest.fn(),
    resolveRedirect: jest.fn(() => ({ redirectUrl: 'https://example.com' })),
  }));
  // Always mock apiPoc to avoid puppeteer ESM issue in tests
  jest.doMock('../routes/apiPoc', () => {
    const express = require('express');
    return express.Router();
  });

  // Mock getEnv to avoid missing env var errors in tests
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

  if (uploadDirOverride !== undefined) {
    jest.doMock('../services/uploadService', () => ({
      uploadDir: uploadDirOverride,
      upload: { fields: () => noop, single: () => noop, array: () => noop },
      uploadMultiple: noop,
      registerUpload: jest.fn(),
      deleteUpload: jest.fn(),
    }));
  }

  const createApp = require('../bootstrap/createApp');
  return createApp();
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Test 1: non-existent dir returns empty images ─────────────────────────────

describe('GET /api/admin/media — non-existent dir', () => {
  test('returns { images: [] } when uploadDir does not exist', async () => {
    const app = makeApp({ uploadDir: '/nonexistent/path/that/does/not/exist' });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ images: [] });
  });
});

// ── Test 2: empty dir returns empty images ────────────────────────────────────

describe('GET /api/admin/media — empty dir', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-empty-'));
  });

  afterAll(() => {
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch {}
  });

  test('returns { images: [] } for empty dir', async () => {
    const app = makeApp({ uploadDir: tmpDir });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ images: [] });
  });
});

// ── Test 3: filters non-image files ───────────────────────────────────────────

describe('GET /api/admin/media — filters non-image files', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = makeTempDir({
      'image.jpg': 'fake jpg',
      'document.pdf': 'fake pdf',
      'photo.png': 'fake png',
      'data.txt': 'fake txt',
      'video.mp4': 'fake mp4',
      'icon.webp': 'fake webp',
    });
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  test('only returns image files (.jpg, .png, .webp, .gif, .jpeg)', async () => {
    const app = makeApp({ uploadDir: tmpDir });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(200);
    const filenames = res.body.images.map(i => i.filename);
    expect(filenames).toContain('image.jpg');
    expect(filenames).toContain('photo.png');
    expect(filenames).toContain('icon.webp');
    expect(filenames).not.toContain('document.pdf');
    expect(filenames).not.toContain('data.txt');
    expect(filenames).not.toContain('video.mp4');
    expect(res.body.images.length).toBe(3);
  });
});

// ── Test 4: sorted newest first ───────────────────────────────────────────────

describe('GET /api/admin/media — sorted newest first', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-sort-'));
    const files = ['old.jpg', 'newer.png', 'newest.webp'];
    for (let i = 0; i < files.length; i++) {
      const fpath = path.join(tmpDir, files[i]);
      fs.writeFileSync(fpath, 'x');
      const t = new Date(2024, 0, i + 1); // Jan 1, 2, 3 ascending
      fs.utimesSync(fpath, t, t);
    }
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  test('images sorted by createdAt descending', async () => {
    const app = makeApp({ uploadDir: tmpDir });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(200);
    const dates = res.body.images.map(i => new Date(i.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });
});

// ── Test 5: response shape ────────────────────────────────────────────────────

describe('GET /api/admin/media — response shape', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = makeTempDir({ 'test.jpg': 'fake' });
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  test('each image has url, filename, size, createdAt', async () => {
    const app = makeApp({ uploadDir: tmpDir });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
    const img = res.body.images[0];
    expect(img).toHaveProperty('url', '/media/test.jpg');
    expect(img).toHaveProperty('filename', 'test.jpg');
    expect(img).toHaveProperty('size');
    expect(typeof img.size).toBe('number');
    expect(img).toHaveProperty('createdAt');
    expect(() => new Date(img.createdAt)).not.toThrow();
  });
});

// ── Test 6: requires auth (no mock) ──────────────────────────────────────────

describe('GET /api/admin/media — auth required', () => {
  test('returns 401 without session', async () => {
    const app = makeApp({ bypassAuth: false });
    const res = await request(app).get('/api/admin/media');
    expect(res.status).toBe(401);
  });
});
