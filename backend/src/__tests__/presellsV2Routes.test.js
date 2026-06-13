'use strict';

const request = require('supertest');

jest.mock('../templates/sections.bundle.js', () => {
  const React = require('react');
  return {
    registry: {
      hero: ({ props }) =>
        React.createElement('section', { 'data-section': 'hero' },
          React.createElement('h1', null, props.headline),
          React.createElement('a', { href: props.ctaUrl, 'data-cta': true }, props.ctaText)
        ),
      faq: ({ props }) =>
        React.createElement('section', { 'data-section': 'faq' },
          React.createElement('h2', null, props.title)
        ),
      testimonials: ({ props }) =>
        React.createElement('section', { 'data-section': 'testimonials' },
          React.createElement('h2', null, props.title)
        ),
      footer: ({ props }) =>
        React.createElement('footer', { 'data-section': 'footer' },
          React.createElement('p', null, props.legalText)
        )
    }
  };
}, { virtual: true });

function makeSessionStore() {
  return class {
    on() {}
    get(sid, cb) { cb(null, null); }
    set(sid, session, cb) { if (cb) cb(null); }
    destroy(sid, cb) { if (cb) cb(null); }
  };
}

function makeApp() {
  jest.resetModules();
  jest.doMock('../db/migrations', () => ({ migrate: jest.fn() }));
  jest.doMock('../db/sessionStore', () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock('../middleware/auth', () => ({
    requireAuth: (req, res, next) => next(),
    requireApiAuth: (req, res, next) => next(),
  }));
  jest.doMock('../middleware/csrf', () => ({
    attachCsrf: (req, res, next) => {
      req.session = req.session || {};
      req.session.csrfToken = 'test-token';
      next();
    },
    verifyApiCsrf: (req, res, next) => next(),
  }));

  const createApp = require('../bootstrap/createApp');
  return createApp();
}

function clearPresellsV2() {
  const { db } = require('../db/connection');
  db.exec('DELETE FROM presells_v2');
}

const sampleSections = [
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
];

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── POST /api/admin/presells-v2 ────────────────────────────────────────────

describe('POST /api/admin/presells-v2', () => {
  test('creates a presell V2 and returns 201 with serialized detail', async () => {
    const app = makeApp();
    clearPresellsV2();

    const res = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'my-presell',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('my-presell');
    expect(res.body.affiliateUrl).toBe('https://affiliate.example.com');
    expect(Array.isArray(res.body.sections)).toBe(true);
    expect(res.body.sections).toHaveLength(4);
    expect(res.body.sections[0].type).toBe('hero');
    expect(typeof res.body.id).toBe('number');
  });

  test('returns 409 when slug already exists', async () => {
    const app = makeApp();
    clearPresellsV2();

    await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'taken-slug',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const res = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'taken-slug',
        affiliate_url: 'https://other.example.com',
        sections_json: sampleSections
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('slug_taken');
  });

  test('returns 400 when slug is missing', async () => {
    const app = makeApp();
    clearPresellsV2();

    const res = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

// ── GET /api/admin/presells-v2 ─────────────────────────────────────────────

describe('GET /api/admin/presells-v2', () => {
  test('returns list with id, slug and createdAt', async () => {
    const app = makeApp();
    clearPresellsV2();

    await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'listing-test',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const res = await request(app).get('/api/admin/presells-v2');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty('id');
    expect(res.body.items[0]).toHaveProperty('slug');
    expect(res.body.items[0]).toHaveProperty('createdAt');
  });
});

// ── GET /api/admin/presells-v2/:id ─────────────────────────────────────────

describe('GET /api/admin/presells-v2/:id', () => {
  test('returns detail with sections deserialized as array', async () => {
    const app = makeApp();
    clearPresellsV2();

    const created = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'detail-test',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const res = await request(app).get(`/api/admin/presells-v2/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('detail-test');
    expect(Array.isArray(res.body.sections)).toBe(true);
    expect(res.body.sections[0].type).toBe('hero');
    expect(res.body.sections[0].props.headline).toBe('Headline');
    expect(res.body.sections[1].type).toBe('faq');
  });

  test('returns 404 when id does not exist', async () => {
    const app = makeApp();
    clearPresellsV2();

    const res = await request(app).get('/api/admin/presells-v2/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('presell_v2_not_found');
  });
});

// ── DELETE /api/admin/presells-v2/:id ──────────────────────────────────────

describe('DELETE /api/admin/presells-v2/:id', () => {
  test('removes the presell V2 and returns 204', async () => {
    const app = makeApp();
    clearPresellsV2();

    const created = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'to-delete',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const del = await request(app)
      .delete(`/api/admin/presells-v2/${created.body.id}`)
      .set('x-csrf-token', 'test-token');
    expect(del.status).toBe(204);

    const followup = await request(app).get(`/api/admin/presells-v2/${created.body.id}`);
    expect(followup.status).toBe(404);
  });

  test('returns 404 when id does not exist', async () => {
    const app = makeApp();
    clearPresellsV2();
    const res = await request(app)
      .delete('/api/admin/presells-v2/999999')
      .set('x-csrf-token', 'test-token');
    expect(res.status).toBe(404);
  });
});

// ── GET /lp/:slug ─────────────────────────────────────────────────────────

describe('GET /lp/:slug', () => {
  test('returns 200 with stored rendered_html when slug exists', async () => {
    const app = makeApp();
    clearPresellsV2();

    await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'live-lp',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const res = await request(app).get('/lp/live-lp');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<!doctype html>');
    expect(res.text).toContain('https://cdn.tailwindcss.com');
    expect(res.text).toContain('Headline');
    expect(res.text).toContain('Legal');
  });

  test('returns 404 when slug does not exist', async () => {
    const app = makeApp();
    clearPresellsV2();
    const res = await request(app).get('/lp/does-not-exist');
    expect(res.status).toBe(404);
  });
});

// ── Serialization round-trip ──────────────────────────────────────────────

describe('sections_json serialization round-trip', () => {
  test('sections persist and come back as an array of objects with type/order/props', async () => {
    const app = makeApp();
    clearPresellsV2();

    const created = await request(app)
      .post('/api/admin/presells-v2')
      .set('x-csrf-token', 'test-token')
      .send({
        slug: 'roundtrip',
        affiliate_url: 'https://affiliate.example.com',
        sections_json: sampleSections
      });

    const detail = await request(app).get(`/api/admin/presells-v2/${created.body.id}`);

    expect(detail.body.sections).toEqual(sampleSections);
  });
});
