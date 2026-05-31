'use strict';

const express = require('express');
const { requireApiAuth } = require('../middleware/auth');
const { attachCsrf } = require('../middleware/csrf');
const { createExtractor } = require('../extractors/extractorFactory');
const { downloadAndHostImages } = require('../poc/pocAssetService');
const { extractAndHostBackgroundImage } = require('../poc/backgroundImageService');
const { analyzeUrlForForm } = require('../poc/urlAnalyzerService');

const router = express.Router();
router.use(attachCsrf);
router.use(requireApiAuth);

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'O campo "url" é obrigatório.', code: 'MISSING_URL' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return res.status(400).json({
      error: 'URL inválida. Forneça uma URL completa com http:// ou https://.',
      code: 'INVALID_URL',
    });
  }

  try {
    const extractor = createExtractor();
    const pageData = await extractor.extract(parsedUrl.href);

    if (
      pageData.title === 'Presell nao encontrada' ||
      pageData.text?.includes('Esta presell nao esta publicada ou nao existe')
    ) {
      return res.status(400).json({
        error: 'A URL informada não está acessível. Verifique se o produto está publicado e tente novamente.',
        code: 'PAGE_NOT_FOUND',
      });
    }

    const hostedImageUrls = await downloadAndHostImages(pageData.imageUrls ?? [], parsedUrl.href);
    const backgroundImage = await extractAndHostBackgroundImage(pageData, parsedUrl.href);
    const rawInstructions = typeof req.body.userInstructions === 'string' ? req.body.userInstructions.trim() : '';
    const userInstructions = rawInstructions.slice(0, 500);
    const result = await analyzeUrlForForm(pageData, hostedImageUrls, backgroundImage, userInstructions);

    return res.json(result);
  } catch (err) {
    const code = err.code || 'UNKNOWN_ERROR';

    if (code === 'AI_TIMEOUT') {
      return res.status(504).json({ error: 'A IA demorou demais para responder. Tente novamente.', code });
    }
    if (code.startsWith('AI_')) {
      return res.status(502).json({ error: err.message, code });
    }
    return res.status(502).json({ error: `Falha ao processar a URL: ${err.message}`, code: 'EXTRACTION_ERROR' });
  }
});

module.exports = router;
