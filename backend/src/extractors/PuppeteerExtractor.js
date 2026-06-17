/**
 * @module PuppeteerExtractor
 * Extractor primário que usa Chromium headless via Puppeteer.
 * Tira screenshot mobile e extrai identidade visual completa:
 * cores computadas, CSS variables e stylesheets inline.
 */

// puppeteer é importado de forma tardia dentro de extract() — é um módulo ESM
// pesado e seu require no topo quebra o carregamento sob jest (que não parseia
// o ESM). Carregar sob demanda evita arrastá-lo só por requerer este módulo.

/** @typedef {import('./IPageExtractor').PageData} PageData */

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
const GOTO_TIMEOUT_MS = 45000;

/**
 * Seletores inspecionados para extração de cores via getComputedStyle.
 * Ordem: elementos mais abrangentes primeiro, depois específicos.
 */
const COLOR_SELECTORS = [
  'body',
  'h1',
  'header',
  '[class*="hero"]',
  '[class*="banner"]',
  'button',
  'a[class*="btn"]',
  'a[class*="cta"]',
];

/**
 * Substrings de nomes de CSS variables considerados relevantes para identidade visual.
 */
const CSS_VAR_KEYWORDS = [
  'primary',
  'brand',
  'accent',
  'color',
  'bg',
  'background',
  'text',
  'cta',
];

/**
 * Implementação do extractor de página usando Puppeteer (Chromium headless).
 * Executa JavaScript da página e captura screenshot em viewport mobile.
 *
 * @implements {import('./IPageExtractor').IPageExtractor}
 */
class PuppeteerExtractor {
  /**
   * Extrai dados de uma página a partir de sua URL.
   *
   * @param {string} url - URL completa da página
   * @returns {Promise<PageData>}
   * @throws {Error} se o Puppeteer falhar (timeout, navegação, etc.)
   */
  async extract(url) {
    // eslint-disable-next-line global-require
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--disable-dev-shm-usage',  // usa /tmp em vez de /dev/shm (crítico em Docker com pouca memória)
        '--disable-gpu',
        '--disable-extensions',
        '--no-zygote',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport(MOBILE_VIEWPORT);
      await page.setUserAgent(MOBILE_USER_AGENT);
      // 'load' aguarda todos os recursos (scripts, imagens) sem exigir rede ociosa.
      // 'networkidle2' falha em páginas com analytics/WebSocket contínuos.
      await page.goto(url, { waitUntil: 'load', timeout: GOTO_TIMEOUT_MS });

      const screenshot = await page.screenshot({ fullPage: true, type: 'png' });

      const data = await page.evaluate(
        ({ colorSelectors, cssVarKeywords }) => {
          // ----------------------------------------------------------------
          // Helpers (executam no contexto do browser)
          // ----------------------------------------------------------------

          /**
           * Converte rgb(r, g, b) / rgba(r, g, b, a) para #rrggbb.
           * Retorna null se a cor for transparente ou não conversível.
           *
           * @param {string} value
           * @returns {string|null}
           */
          function rgbToHex(value) {
            if (!value) return null;
            const v = value.trim().toLowerCase();

            if (v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return null;

            const m = v.match(
              /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/
            );
            if (!m) return null;

            const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
            if (alpha === 0) return null;

            const r = parseInt(m[1], 10);
            const g = parseInt(m[2], 10);
            const b = parseInt(m[3], 10);

            const hex =
              '#' +
              r.toString(16).padStart(2, '0') +
              g.toString(16).padStart(2, '0') +
              b.toString(16).padStart(2, '0');

            // Filtrar preto puro (#000000) — geralmente padrão do browser, não identidade
            if (hex === '#000000') return null;

            return hex;
          }

          // ----------------------------------------------------------------
          // title, metaDescription, ogImage, text
          // ----------------------------------------------------------------

          const title = document.title;

          const metaDescriptionEl =
            document.querySelector('meta[name="description"]') ||
            document.querySelector('meta[property="og:description"]');
          const metaDescription = metaDescriptionEl
            ? metaDescriptionEl.content ?? ''
            : '';

          const ogImageEl = document.querySelector('meta[property="og:image"]');
          const ogImage = ogImageEl ? ogImageEl.content ?? null : null;

          // ----------------------------------------------------------------
          // pageImages — imagens relevantes da página (por área renderizada)
          // ----------------------------------------------------------------

          const pageImageCandidates = [];
          for (const img of document.querySelectorAll('img')) {
            const src = img.currentSrc || img.src;
            if (!src || src.startsWith('data:') || !src.startsWith('http')) continue;
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if (w < 100 || h < 100) continue;
            pageImageCandidates.push({ src, area: w * h });
          }
          pageImageCandidates.sort((a, b) => b.area - a.area);
          const pageImageUrls = pageImageCandidates.slice(0, 8).map((p) => p.src);

          const imageUrlSet = new Set();
          if (ogImage) imageUrlSet.add(ogImage);
          for (const u of pageImageUrls) imageUrlSet.add(u);
          const imageUrls = Array.from(imageUrlSet);

          const text = document.body.innerText
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000);

          // ----------------------------------------------------------------
          // colors — cores via getComputedStyle
          // ----------------------------------------------------------------

          const colorSet = new Set();

          for (const selector of colorSelectors) {
            let elements;
            try {
              elements = document.querySelectorAll(selector);
            } catch {
              continue;
            }

            for (const el of elements) {
              const style = getComputedStyle(el);
              const bg = rgbToHex(style.backgroundColor);
              const fg = rgbToHex(style.color);
              if (bg) colorSet.add(bg);
              if (fg) colorSet.add(fg);
            }
          }

          const colors = Array.from(colorSet);

          // ----------------------------------------------------------------
          // cssVars — CSS custom properties relevantes do :root
          // ----------------------------------------------------------------

          const rootStyle = getComputedStyle(document.documentElement);
          const allProps = [...rootStyle];
          const cssVars = {};

          for (const prop of allProps) {
            if (!prop.startsWith('--')) continue;

            const propLower = prop.toLowerCase();
            const isRelevant = cssVarKeywords.some((kw) =>
              propLower.includes(kw));
            if (!isRelevant) continue;

            const value = rootStyle.getPropertyValue(prop).trim();
            if (value) cssVars[prop] = value;
          }

          // ----------------------------------------------------------------
          // inlineStyles — conteúdo das tags <style>
          // ----------------------------------------------------------------

          const inlineStyles = [...document.querySelectorAll('style')]
            .map((s) => s.textContent)
            .join('\n')
            .slice(0, 5000);

          return {
            title,
            metaDescription,
            ogImage,
            imageUrls,
            text,
            colors,
            cssVars,
            inlineStyles,
          };
        },
        { colorSelectors: COLOR_SELECTORS, cssVarKeywords: CSS_VAR_KEYWORDS }
      );

      return { screenshot, ...data };
    } finally {
      await browser.close();
    }
  }
}

module.exports = { PuppeteerExtractor };
