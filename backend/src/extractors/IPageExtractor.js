/**
 * @typedef {Object} PageData
 * @property {Buffer|null} screenshot        - null se o extractor não suportar capturas de tela
 * @property {string} title                  - conteúdo da tag <title>
 * @property {string} text                   - texto visível principal (máx 3000 chars)
 * @property {string} metaDescription        - meta description ou og:description
 * @property {string|null} ogImage           - URL da og:image, null se ausente
 * @property {string[]} colors               - cores em hex extraídas da página (deduplicadas)
 * @property {Record<string, string>} cssVars - CSS custom properties do :root — {} se não suportar
 * @property {string} inlineStyles           - conteúdo das tags <style> — "" se não suportar
 */

/**
 * Interface para extractors de página.
 *
 * Todos os extractors devem implementar o método `extract(url)` e retornar
 * um objeto que satisfaça o typedef {@link PageData}.
 *
 * @interface IPageExtractor
 */

/**
 * Extrai dados de uma página a partir de sua URL.
 *
 * @function
 * @name IPageExtractor#extract
 * @param {string} url - URL da página a ser extraída
 * @returns {Promise<PageData>} dados extraídos da página
 */

module.exports = {};
