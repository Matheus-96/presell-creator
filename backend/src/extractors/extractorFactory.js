/**
 * @module extractorFactory
 * Factory que instancia o extractor de página configurado via env.
 */

const { getEnv } = require("../config/env");
const FetchExtractor = require("./FetchExtractor");
const { PuppeteerExtractor } = require("./PuppeteerExtractor");

/**
 * Retorna uma instância do extractor de página configurado em `PAGE_EXTRACTOR`.
 *
 * Valores aceitos:
 *  - `"fetch"` (padrão) — extractor leve via HTTP sem Chromium
 *  - `"puppeteer"` — extractor completo com Chromium headless, screenshot mobile
 *    e extração de cores computadas, CSS variables e stylesheets inline
 *
 * @returns {import('./IPageExtractor').IPageExtractor}
 * @throws {Error} se `PAGE_EXTRACTOR` contiver um valor desconhecido
 */
function createExtractor() {
  const { pageExtractor } = getEnv();

  switch (pageExtractor) {
    case "fetch":
      return new FetchExtractor();

    case "puppeteer":
      return new PuppeteerExtractor();

    default:
      throw new Error(
        `Valor desconhecido para PAGE_EXTRACTOR: "${pageExtractor}". Use "fetch" ou "puppeteer".`
      );
  }
}

module.exports = { createExtractor };
