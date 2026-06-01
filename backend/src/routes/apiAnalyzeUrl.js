'use strict';

const crypto = require('crypto');
const express = require('express');
const { requireApiAuth } = require('../middleware/auth');
const { attachCsrf } = require('../middleware/csrf');
const { buildApiError } = require('../contracts/shared');
const { createExtractor } = require('../extractors/extractorFactory');
const { downloadAndHostImages } = require('../poc/pocAssetService');
const { extractAndHostBackgroundImage } = require('../poc/backgroundImageService');
const { analyzeUrlForForm } = require('../poc/urlAnalyzerService');
const {
  createJob,
  getJob,
  getActiveJobBySession,
  updateJob,
  deleteJob
} = require('../repositories/jobsRepository');

const JOB_TTL_MS = 5 * 60 * 1000; // 5 minutes

const router = express.Router();
router.use(attachCsrf);
router.use(requireApiAuth);

// POST / — enqueue a new analysis job
router.post('/', async (req, res) => {
  const { url } = req.body;

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

  processJob(jobId, parsedUrl.href, userInstructions).catch((err) => {
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
      error: job.error
    });
  }

  return res.json({
    status: job.status,
    message: job.message
  });
});

async function processJob(jobId, url, userInstructions) {
  try {
    updateJob(jobId, { status: 'extracting', message: 'Abrindo a página com o browser…' });

    const extractor = createExtractor();
    const pageData = await extractor.extract(url);

    if (
      pageData.title === 'Presell nao encontrada' ||
      pageData.text?.includes('Esta presell nao esta publicada ou nao existe')
    ) {
      updateJob(jobId, {
        status: 'failed',
        message: 'A URL informada não está acessível. Verifique se o produto está publicado e tente novamente.',
        error: 'A URL informada não está acessível. Verifique se o produto está publicado e tente novamente.'
      });
      return;
    }

    updateJob(jobId, { status: 'downloading', message: 'Baixando imagens do produto…' });

    const hostedImageUrls = await downloadAndHostImages(pageData.imageUrls ?? [], url);
    const backgroundImage = await extractAndHostBackgroundImage(pageData, url);

    updateJob(jobId, { status: 'analyzing', message: 'Consultando a IA…' });

    const result = await analyzeUrlForForm(pageData, hostedImageUrls, backgroundImage, userInstructions);

    updateJob(jobId, {
      status: 'done',
      message: 'Concluído!',
      result: JSON.stringify(result)
    });
  } catch (err) {
    const code = err.code || 'UNKNOWN_ERROR';
    const message = code === 'AI_TIMEOUT'
      ? 'A IA demorou demais para responder. Tente novamente.'
      : err.message;

    updateJob(jobId, { status: 'failed', message, error: message });
  }
}

module.exports = router;
