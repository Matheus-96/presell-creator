'use strict';

const FRIENDLY_MESSAGES = {
  site_unreachable: 'Erro ao consultar o site informado',
  image_extraction_failed: 'Erro ao obter imagens do site',
  ai_error: 'Erro no processamento de IA',
  timeout: 'A análise demorou mais que o esperado. Tente novamente.',
  unknown: 'Não foi possível concluir a análise. Tente novamente.',
};

/**
 * Maps an internal error code string to a semantic frontend error code.
 *
 * @param {string|undefined} errCode - The error code from the thrown error (err.code)
 * @returns {keyof FRIENDLY_MESSAGES}
 */
function mapToErrorCode(errCode) {
  if (errCode === 'SITE_UNREACHABLE') return 'site_unreachable';
  if (errCode === 'IMAGE_EXTRACTION_FAILED') return 'image_extraction_failed';
  if (errCode === 'AI_TIMEOUT') return 'timeout';
  if (typeof errCode === 'string' && errCode.startsWith('AI_')) return 'ai_error';
  return 'unknown';
}

module.exports = { mapToErrorCode, FRIENDLY_MESSAGES };
