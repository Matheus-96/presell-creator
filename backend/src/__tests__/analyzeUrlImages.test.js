'use strict';

// ── Cycle 1: buildExtractedImages pure function ───────────────────────────────

describe('buildExtractedImages', () => {
  let buildExtractedImages;

  beforeEach(() => {
    jest.resetModules();
    ({ buildExtractedImages } = require('../poc/analyzeUrlImages'));
  });

  test('returns empty array when imageUrls is empty and no backgroundImageUrl', () => {
    const result = buildExtractedImages({ imageUrls: [] });
    expect(result).toEqual([]);
  });

  test('returns objects with { url, type } shape', () => {
    const result = buildExtractedImages({ imageUrls: ['https://example.com/img.jpg'] });
    expect(result[0]).toHaveProperty('url');
    expect(result[0]).toHaveProperty('type');
  });

  test('first image gets type "hero", rest get "generic"', () => {
    const result = buildExtractedImages({
      imageUrls: [
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
        'https://example.com/c.jpg',
      ],
    });
    expect(result[0]).toEqual({ url: 'https://example.com/a.jpg', type: 'hero' });
    expect(result[1]).toEqual({ url: 'https://example.com/b.jpg', type: 'generic' });
    expect(result[2]).toEqual({ url: 'https://example.com/c.jpg', type: 'generic' });
  });

  test('if pageData.backgroundImageUrl exists, it is included with type "background"', () => {
    const result = buildExtractedImages({
      imageUrls: ['https://example.com/a.jpg'],
      backgroundImageUrl: 'https://example.com/bg.jpg',
    });

    const bgEntry = result.find(e => e.type === 'background');
    expect(bgEntry).toBeDefined();
    expect(bgEntry.url).toBe('https://example.com/bg.jpg');
  });

  test('backgroundImageUrl entry does not duplicate an existing imageUrls entry', () => {
    const url = 'https://example.com/a.jpg';
    const result = buildExtractedImages({
      imageUrls: [url],
      backgroundImageUrl: url,
    });

    const bgEntries = result.filter(e => e.url === url);
    // Should appear only once (as background, taking precedence)
    expect(bgEntries.length).toBe(1);
    expect(bgEntries[0].type).toBe('background');
  });

  test('returns empty array when imageUrls is missing', () => {
    const result = buildExtractedImages({});
    expect(result).toEqual([]);
  });

  test('backgroundImageUrl alone (no imageUrls) returns single background entry', () => {
    const result = buildExtractedImages({
      imageUrls: [],
      backgroundImageUrl: 'https://example.com/bg.jpg',
    });
    expect(result).toEqual([{ url: 'https://example.com/bg.jpg', type: 'background' }]);
  });
});

// ── Cycle 2: processJob skips downloading, includes extractedImages ───────────

describe('processJob — skips downloading, includes extractedImages', () => {
  let downloadAndHostImagesMock;
  let extractAndHostBackgroundImageMock;
  let analyzeUrlForFormMock;
  let updateJobMock;
  let processJob;

  const fakePageData = {
    title: 'Test Product',
    metaDescription: 'A product',
    ogImage: null,
    imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    text: 'Some text',
    colors: [],
    cssVars: {},
    inlineStyles: '',
    screenshot: null,
  };

  beforeEach(() => {
    jest.resetModules();

    downloadAndHostImagesMock = jest.fn().mockResolvedValue(['/media/a.jpg']);
    extractAndHostBackgroundImageMock = jest.fn().mockResolvedValue({
      hostedUrl: '/media/bg.jpg',
      base64: 'data:...',
    });
    analyzeUrlForFormMock = jest.fn().mockResolvedValue({
      templateId: 'simple',
      headline: 'Test',
      subtitle: '',
      body: '',
      bullets: [],
      ctaText: 'Buy',
      heroImageUrl: null,
      theme: null,
      settings: {},
    });
    updateJobMock = jest.fn();

    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: downloadAndHostImagesMock,
    }));
    jest.doMock('../poc/backgroundImageService', () => ({
      extractAndHostBackgroundImage: extractAndHostBackgroundImageMock,
    }));
    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: analyzeUrlForFormMock,
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn(() => ({
        extract: jest.fn().mockResolvedValue(fakePageData),
      })),
    }));
    jest.doMock('../repositories/jobsRepository', () => ({
      createJob: jest.fn(),
      getJob: jest.fn(() => null),
      getActiveJobBySession: jest.fn(() => null),
      updateJob: updateJobMock,
      deleteJob: jest.fn(),
    }));
    jest.doMock('../middleware/csrf', () => ({
      attachCsrf: (req, res, next) => next(),
    }));
    jest.doMock('../middleware/auth', () => ({
      requireApiAuth: (req, res, next) => next(),
    }));

    // Require the route after mocks are in place — processJob is exported for testing
    ({ processJob } = require('../routes/apiAnalyzeUrl'));
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('downloadAndHostImages is NOT called during processJob', async () => {
    await processJob('job-1', 'https://example.com', '');
    expect(downloadAndHostImagesMock).not.toHaveBeenCalled();
  });

  test('extractAndHostBackgroundImage is NOT called during processJob', async () => {
    await processJob('job-1', 'https://example.com', '');
    expect(extractAndHostBackgroundImageMock).not.toHaveBeenCalled();
  });

  test('job result contains extractedImages array', async () => {
    await processJob('job-1', 'https://example.com', '');

    const doneCall = updateJobMock.mock.calls.find(
      ([, updates]) => updates.status === 'done'
    );
    expect(doneCall).toBeDefined();

    const result = JSON.parse(doneCall[1].result);
    expect(result).toHaveProperty('extractedImages');
    expect(Array.isArray(result.extractedImages)).toBe(true);
  });

  test('extractedImages contains entries from pageData.imageUrls', async () => {
    await processJob('job-1', 'https://example.com', '');

    const doneCall = updateJobMock.mock.calls.find(
      ([, updates]) => updates.status === 'done'
    );
    const result = JSON.parse(doneCall[1].result);
    const urls = result.extractedImages.map(e => e.url);
    expect(urls).toContain('https://example.com/img1.jpg');
    expect(urls).toContain('https://example.com/img2.jpg');
  });

  test('analyzeUrlForForm is called with empty arrays (no hosted images)', async () => {
    await processJob('job-1', 'https://example.com', '');
    expect(analyzeUrlForFormMock).toHaveBeenCalledWith(
      expect.any(Object),
      [],
      null,
      expect.any(String),
      expect.any(String)
    );
  });
});

// ── Cycle 3: POST /download-images endpoint ───────────────────────────────────

describe('POST /download-images', () => {
  let downloadAndHostImagesMock;
  let extractAndHostBackgroundImageMock;

  beforeEach(() => {
    jest.resetModules();

    downloadAndHostImagesMock = jest.fn().mockResolvedValue(['/media/hero.jpg']);
    extractAndHostBackgroundImageMock = jest.fn().mockResolvedValue({
      hostedUrl: '/media/bg.jpg',
      base64: 'data:image/jpeg;base64,...',
    });

    jest.doMock('../poc/pocAssetService', () => ({
      downloadAndHostImages: downloadAndHostImagesMock,
    }));
    jest.doMock('../poc/backgroundImageService', () => ({
      extractAndHostBackgroundImage: extractAndHostBackgroundImageMock,
    }));
    jest.doMock('../poc/urlAnalyzerService', () => ({
      analyzeUrlForForm: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../extractors/extractorFactory', () => ({
      createExtractor: jest.fn(),
    }));
    jest.doMock('../repositories/jobsRepository', () => ({
      createJob: jest.fn(),
      getJob: jest.fn(() => null),
      getActiveJobBySession: jest.fn(() => null),
      updateJob: jest.fn(),
      deleteJob: jest.fn(),
    }));
    jest.doMock('../middleware/csrf', () => ({
      attachCsrf: (req, res, next) => next(),
    }));
    jest.doMock('../middleware/auth', () => ({
      requireApiAuth: (req, res, next) => next(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  function makeApp() {
    const express = require('express');
    const router = require('../routes/apiAnalyzeUrl');
    const app = express();
    app.use(express.json());
    app.use('/', router);
    return app;
  }

  test('returns 400 when images field is missing', async () => {
    const request = require('supertest');
    const app = makeApp();
    const res = await request(app)
      .post('/download-images')
      .send({})
      .set('x-csrf-token', 'test');
    expect(res.status).toBe(400);
  });

  test('returns 400 when images is not an array', async () => {
    const request = require('supertest');
    const app = makeApp();
    const res = await request(app)
      .post('/download-images')
      .send({ images: 'not-an-array' })
      .set('x-csrf-token', 'test');
    expect(res.status).toBe(400);
  });

  test('single hero image — returns { hero: "filename.jpg" }', async () => {
    downloadAndHostImagesMock.mockResolvedValue(['/media/hero.jpg']);
    const request = require('supertest');
    const app = makeApp();

    const res = await request(app)
      .post('/download-images')
      .send({ images: [{ url: 'https://example.com/img.jpg', role: 'hero' }] })
      .set('x-csrf-token', 'test');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hero', 'hero.jpg');
  });

  test('background image — uses extractAndHostBackgroundImage and returns filename', async () => {
    extractAndHostBackgroundImageMock.mockResolvedValue({ hostedUrl: '/media/bg.jpg', base64: '' });
    const request = require('supertest');
    const app = makeApp();

    const res = await request(app)
      .post('/download-images')
      .send({ images: [{ url: 'https://example.com/bg.jpg', role: 'background' }] })
      .set('x-csrf-token', 'test');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('background', 'bg.jpg');
  });

  test('gallery images — returns { gallery: ["g1.jpg", "g2.jpg"] }', async () => {
    downloadAndHostImagesMock.mockResolvedValue(['/media/g1.jpg', '/media/g2.jpg']);
    const request = require('supertest');
    const app = makeApp();

    const res = await request(app)
      .post('/download-images')
      .send({
        images: [
          { url: 'https://example.com/g1.jpg', role: 'gallery' },
          { url: 'https://example.com/g2.jpg', role: 'gallery' },
        ],
      })
      .set('x-csrf-token', 'test');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gallery');
    expect(res.body.gallery).toEqual(expect.arrayContaining(['g1.jpg', 'g2.jpg']));
  });

  test('rejects more than 10 images with 400', async () => {
    const request = require('supertest');
    const app = makeApp();
    const images = Array.from({ length: 11 }, (_, i) => ({
      url: `https://example.com/img${i}.jpg`,
      role: 'gallery',
    }));

    const res = await request(app)
      .post('/download-images')
      .send({ images })
      .set('x-csrf-token', 'test');

    expect(res.status).toBe(400);
  });
});
