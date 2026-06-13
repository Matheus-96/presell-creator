'use strict';

const crypto = require('crypto');
const express = require('express');
const { requireApiAuth } = require('../middleware/auth');
const { attachCsrf } = require('../middleware/csrf');
const { buildApiError } = require('../contracts/shared');
const { createExtractor } = require('../extractors/extractorFactory');
const { analyzeUrlForSections } = require('../services/v2/analyzeUrlForSections');
const { mapToErrorCode, FRIENDLY_MESSAGES } = require('../poc/analyzeUrlErrors');
const {
  createJob,
  getJob,
  updateJob,
  deleteJob,
} = require('../repositories/jobsRepository');

const JOB_TTL_MS = 5 * 60 * 1000;

const router = express.Router();
router.use(attachCsrf);
router.use(requireApiAuth);

function validateHttpUrl(value) {
  try {
    const parsed = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

router.post('/', async (req, res) => {
  const { url, affiliateUrl } = req.body || {};

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json(buildApiError('MISSING_URL', 'O campo "url" é obrigatório.'));
  }

  const parsedUrl = validateHttpUrl(url);
  if (!parsedUrl) {
    return res.status(400).json(buildApiError(
      'INVALID_URL',
      'URL inválida. Forneça uma URL completa com http:// ou https://.'
    ));
  }

  if (!affiliateUrl || typeof affiliateUrl !== 'string' || !affiliateUrl.trim()) {
    return res.status(400).json(buildApiError(
      'MISSING_AFFILIATE_URL',
      'O campo "affiliateUrl" é obrigatório.'
    ));
  }

  const parsedAffiliateUrl = validateHttpUrl(affiliateUrl);
  if (!parsedAffiliateUrl) {
    return res.status(400).json(buildApiError(
      'INVALID_AFFILIATE_URL',
      'affiliateUrl inválido. Forneça uma URL completa com http:// ou https://.'
    ));
  }

  const jobId = crypto.randomUUID();
  createJob(jobId, req.sessionID, Date.now() + JOB_TTL_MS);

  processJob(jobId, parsedUrl, parsedAffiliateUrl).catch((err) => {
    console.error(`[presells-v2 analyze-url] Unhandled error in processJob ${jobId}:`, err);
  });

  return res.status(202).json({ jobId });
});

router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job || job.expires_at <= Date.now()) {
    return res.status(404).json(buildApiError('job_not_found', 'Job não encontrado ou expirado.'));
  }

  const isTerminal = job.status === 'done' || job.status === 'failed';
  if (isTerminal) {
    deleteJob(jobId);

    if (job.status === 'done') {
      return res.json({
        status: job.status,
        message: job.message,
        result: JSON.parse(job.result),
      });
    }

    return res.json({
      status: job.status,
      message: job.message,
      error: job.error,
      errorCode: job.error_code,
    });
  }

  return res.json({
    status: job.status,
    message: job.message,
  });
});

async function processJob(jobId, url, affiliateUrl) {
  try {
    updateJob(jobId, { status: 'extracting', message: 'Abrindo a página…' });

    let pageData;
    try {
      const extractor = createExtractor();
      pageData = await extractor.extract(url);
    } catch (err) {
      const siteErr = new Error(err.message);
      siteErr.code = 'SITE_UNREACHABLE';
      throw siteErr;
    }

    updateJob(jobId, { status: 'analyzing', message: 'Consultando a IA…' });

    const result = await analyzeUrlForSections(pageData, affiliateUrl);

    const sections = Array.isArray(result?.sections) ? result.sections : [];
    const normalizedSections = sections.map((section) => {
      if (section?.type === 'hero') {
        return { ...section, props: { ...section.props, ctaUrl: affiliateUrl } };
      }
      return section;
    });

    updateJob(jobId, {
      status: 'done',
      message: 'Concluído!',
      result: JSON.stringify({ sections: normalizedSections }),
    });
  } catch (err) {
    const errorCode = mapToErrorCode(err.code);
    const message = FRIENDLY_MESSAGES[errorCode];

    updateJob(jobId, {
      status: 'failed',
      message,
      error: message,
      error_code: errorCode,
    });
  }
}

module.exports = router;
module.exports.processJob = processJob;
