'use strict';

/**
 * @module routes/apiPoc
 * Rotas POC para geração de presell via IA a partir de uma URL.
 * Montadas em /api/admin/poc pelo createApp.
 */

const express = require('express');
const { requireApiAuth } = require('../middleware/auth');
const { attachCsrf } = require('../middleware/csrf');
const { createExtractor } = require('../extractors/extractorFactory');
const { generatePresellBlocks } = require('../poc/presellGeneratorService');

const router = express.Router();

router.use(attachCsrf);
router.use(requireApiAuth);

/**
 * POST /api/admin/poc/generate
 *
 * Body: { url: string }
 * Response 200: { blocks, rootProps, rawJson }
 * Response 400: { error: string, code: string }  — URL inválida
 * Response 502: { error: string, code: string }  — falha na IA
 * Response 504: { error: string, code: string }  — timeout
 */
router.post('/generate', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({
      error: 'O campo "url" é obrigatório.',
      code: 'MISSING_URL'
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Protocolo inválido');
    }
  } catch {
    return res.status(400).json({
      error: 'URL inválida. Forneça uma URL completa com protocolo http:// ou https://.',
      code: 'INVALID_URL'
    });
  }

  try {
    const extractor = createExtractor();
    const pageData = await extractor.extract(parsedUrl.href);
    const result = await generatePresellBlocks(pageData);

    return res.json({
      blocks: result.blocks,
      rootProps: result.rootProps,
      rawJson: result.rawJson
    });
  } catch (err) {
    const code = err.code || 'UNKNOWN_ERROR';

    if (code === 'AI_TIMEOUT') {
      return res.status(504).json({
        error: 'A IA demorou demais para responder. Tente novamente.',
        code
      });
    }

    if (
      code === 'AI_API_ERROR' ||
      code === 'AI_NETWORK_ERROR' ||
      code === 'AI_INVALID_RESPONSE' ||
      code === 'AI_EMPTY_RESPONSE' ||
      code === 'AI_INVALID_JSON' ||
      code === 'AI_INVALID_SCHEMA'
    ) {
      return res.status(502).json({
        error: err.message,
        code
      });
    }

    // Extractor errors or unknown errors
    return res.status(502).json({
      error: `Falha ao processar a URL: ${err.message}`,
      code: 'EXTRACTION_ERROR'
    });
  }
});

module.exports = router;
