'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { requireApiAuth } = require('../middleware/auth');
const { attachCsrf } = require('../middleware/csrf');
const { buildApiError } = require('../contracts/shared');
const { createExtractor } = require('../extractors/extractorFactory');
const { downloadAndHostImages } = require('../poc/pocAssetService');
const { extractAndHostBackgroundImage } = require('../poc/backgroundImageService');
const { analyzeUrlForForm } = require('../poc/urlAnalyzerService');
const { buildExtractedImages } = require('../poc/analyzeUrlImages');
const { mapToErrorCode, FRIENDLY_MESSAGES } = require('../poc/analyzeUrlErrors');
const {
  createJob,
  getJob,
  getActiveJobBySession,
  updateJob,
  deleteJob
} = require('../repositories/jobsRepository');

const MAX_DOWNLOAD_IMAGES = 10;

const JOB_TTL_MS = 5 * 60 * 1000; // 5 minutes

const router = express.Router();
router.use(attachCsrf);
router.use(requireApiAuth);

// POST / — enqueue a new analysis job
router.post('/', async (req, res) => {
  const { url, language = 'pt-BR' } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json(buildApiError('MISSING_URL', 'O campo "url" é obrigatório.'));
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return res.status(400).json(buildApiError(
      'INVALID_URL',
      'URL inválida. Forneça uma URL completa com http:// ou https://.'
    ));
  }

  const existingJob = getActiveJobBySession(req.sessionID);
  if (existingJob) {
    return res.status(409).json(buildApiError(
      'job_in_progress',
      'Já existe uma análise em andamento.',
      { jobId: existingJob.id }
    ));
  }

  const rawInstructions = typeof req.body.userInstructions === 'string'
    ? req.body.userInstructions.trim()
    : '';
  const userInstructions = rawInstructions.slice(0, 500);

  const jobId = crypto.randomUUID();
  createJob(jobId, req.sessionID, Date.now() + JOB_TTL_MS);

  processJob(jobId, parsedUrl.href, userInstructions, language).catch((err) => {
    console.error(`[analyze-url] Unhandled error in processJob ${jobId}:`, err);
  });

  return res.status(202).json({ jobId });
});

// GET /:jobId — poll job status
router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;

  const job = getJob(jobId);

  if (!job || job.expires_at <= Date.now()) {
    return res.status(404).json(buildApiError('job_not_found', 'Job não encontrado ou expirado.'));
  }

  if (job.session_id !== req.sessionID) {
    return res.status(403).json(buildApiError('forbidden', 'Acesso negado a este job.'));
  }

  const isTerminal = job.status === 'done' || job.status === 'failed';

  if (isTerminal) {
    deleteJob(jobId);

    if (job.status === 'done') {
      return res.json({
        status: job.status,
        message: job.message,
        result: JSON.parse(job.result)
      });
    }

    return res.json({
      status: job.status,
      message: job.message,
      error: job.error,
      errorCode: job.error_code
    });
  }

  return res.json({
    status: job.status,
    message: job.message
  });
});

async function processJob(jobId, url, userInstructions, language = 'pt-BR') {
  try {
    updateJob(jobId, { status: 'extracting', message: 'Abrindo a página com o browser…' });

    let pageData;
    try {
      const extractor = createExtractor();
      pageData = await extractor.extract(url);
    } catch (err) {
      const siteErr = new Error(err.message);
      siteErr.code = 'SITE_UNREACHABLE';
      throw siteErr;
    }

    if (
      pageData.title === 'Presell nao encontrada' ||
      pageData.text?.includes('Esta presell nao esta publicada ou nao existe')
    ) {
      const errorCode = 'site_unreachable';
      updateJob(jobId, {
        status: 'failed',
        message: FRIENDLY_MESSAGES[errorCode],
        error: FRIENDLY_MESSAGES[errorCode],
        error_code: errorCode
      });
      return;
    }

    updateJob(jobId, { status: 'analyzing', message: 'Consultando a IA…' });

    // Build raw extracted images — no downloads happen here.
    const extractedImages = buildExtractedImages(pageData);

    const result = await analyzeUrlForForm(pageData, [], null, userInstructions, language);
    result.extractedImages = extractedImages;

    updateJob(jobId, {
      status: 'done',
      message: 'Concluído!',
      result: JSON.stringify(result)
    });
  } catch (err) {
    const errorCode = mapToErrorCode(err.code);
    const message = FRIENDLY_MESSAGES[errorCode];

    updateJob(jobId, { status: 'failed', message, error: message, error_code: errorCode });
  }
}

// POST /download-images — download user-selected images and return local filenames
router.post('/download-images', async (req, res) => {
  const { images } = req.body;

  if (!Array.isArray(images)) {
    return res.status(400).json(buildApiError('INVALID_IMAGES', 'O campo "images" deve ser um array.'));
  }

  if (images.length === 0) {
    return res.json({});
  }

  if (images.length > MAX_DOWNLOAD_IMAGES) {
    return res.status(400).json(buildApiError(
      'TOO_MANY_IMAGES',
      `Máximo de ${MAX_DOWNLOAD_IMAGES} imagens por requisição.`
    ));
  }

  const result = {};

  // Separate images by role
  const heroImages = images.filter(i => i.role === 'hero');
  const backgroundImages = images.filter(i => i.role === 'background');
  const galleryImages = images.filter(i => i.role === 'gallery');

  // Download hero image (first only)
  if (heroImages.length > 0) {
    const heroUrls = heroImages.map(i => i.url);
    // Use the first image URL as the page referer (best-effort)
    const referer = heroUrls[0];
    const hosted = await downloadAndHostImages(heroUrls.slice(0, 1), referer);
    if (hosted.length > 0) {
      result.hero = path.basename(hosted[0]);
    }
  }

  // Download background image
  if (backgroundImages.length > 0) {
    const bgUrl = backgroundImages[0].url;
    // Build a minimal pageData-like object so extractAndHostBackgroundImage can work
    const fakePageData = { ogImage: bgUrl, imageUrls: [] };
    const bg = await extractAndHostBackgroundImage(fakePageData, bgUrl);
    if (bg?.hostedUrl) {
      result.background = path.basename(bg.hostedUrl);
    }
  }

  // Download gallery images
  if (galleryImages.length > 0) {
    const galleryUrls = galleryImages.map(i => i.url);
    const referer = galleryUrls[0];
    const hosted = await downloadAndHostImages(galleryUrls, referer);
    result.gallery = hosted.map(u => path.basename(u));
  }

  return res.json(result);
});

module.exports = router;
module.exports.processJob = processJob;
