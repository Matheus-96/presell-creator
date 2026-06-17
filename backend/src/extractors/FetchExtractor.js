/**
 * @module FetchExtractor
 * Extractor leve que usa `fetch` nativo do Node 22 + node-html-parser.
 * Não requer Chromium. Não executa JavaScript da página.
 */

const { parse } = require("node-html-parser");

/** @typedef {import('./IPageExtractor').PageData} PageData */

const USER_AGENT = "Mozilla/5.0 (compatible; PresellBot/1.0)";
const MAX_TEXT_LENGTH = 3000;
const MAX_INLINE_STYLES_LENGTH = 5000;
const FETCH_TIMEOUT_MS = 15000;

/**
 * Normaliza espaços em branco: colapsa múltiplos espaços/quebras de linha em um espaço único.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Converte um valor de cor CSS para hex quando possível.
 * Suporta: hex (#rgb, #rrggbb), rgb(), rgba() e named color "transparent".
 *
 * @param {string} value - valor de cor CSS
 * @returns {string|null} string hex ou null se não conversível / transparente
 */
function toHex(value) {
  if (!value) return null;

  const v = value.trim().toLowerCase();

  if (v === "transparent" || v === "none" || v === "inherit" || v === "initial" || v === "currentcolor") {
    return null;
  }

  // Já é hex
  const hexMatch = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    return `#${hex}`;
  }

  // rgb(r, g, b) ou rgba(r, g, b, a)
  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgbMatch) {
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (alpha === 0) return null; // totalmente transparente

    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Extrai valores de `color` e `background-color` de um atributo style inline.
 *
 * @param {string} styleAttr - conteúdo do atributo style
 * @returns {string[]} valores de cor encontrados (pode conter duplicatas)
 */
function extractColorsFromStyle(styleAttr) {
  const colors = [];
  const colorPropRe = /(?:^|;)\s*(?:background-)?color\s*:\s*([^;]+)/gi;
  const matches = styleAttr.matchAll(colorPropRe);
  for (const match of matches) {
    const hex = toHex(match[1]);
    if (hex) colors.push(hex);
  }
  return colors;
}

/**
 * Implementação leve do extractor de página usando fetch nativo.
 * Não requer Chromium; não executa JavaScript da página alvo.
 *
 * @implements {import('./IPageExtractor').IPageExtractor}
 */
class FetchExtractor {
  /**
   * Extrai dados de uma página a partir de sua URL.
   *
   * @param {string} url - URL completa da página
   * @returns {Promise<PageData>}
   * @throws {Error} se o fetch falhar (timeout, 4xx, 5xx)
   */
  async extract(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao buscar página: HTTP ${response.status} ${response.statusText} — ${url}`
        );
      }

      html = await response.text();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(`Timeout ao buscar página (${FETCH_TIMEOUT_MS}ms) — ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    return this._parseHtml(html);
  }

  /**
   * Faz o parse do HTML e extrai todos os campos de PageData.
   *
   * @private
   * @param {string} html
   * @returns {PageData}
   */
  _parseHtml(html) {
    const root = parse(html, {
      lowerCaseTagName: true,
      comment: false,
      blockTextElements: {
        script: false,
        noscript: false,
        style: true,
        pre: true
      }
    });

    const title = this._extractTitle(root);
    const metaDescription = this._extractMetaDescription(root);
    const ogImage = this._extractOgImage(root);
    const text = this._extractText(root);
    const colors = this._extractColors(root);
    const inlineStyles = this._extractInlineStyles(root);

    return {
      screenshot: null,
      title,
      text,
      metaDescription,
      ogImage,
      colors,
      cssVars: {},
      inlineStyles
    };
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string}
   */
  _extractTitle(root) {
    const titleEl = root.querySelector("title");
    return titleEl ? normalizeWhitespace(titleEl.text) : "";
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string}
   */
  _extractMetaDescription(root) {
    const byName = root.querySelector('meta[name="description"]');
    if (byName) {
      return (byName.getAttribute("content") || "").trim();
    }

    const byOg = root.querySelector('meta[property="og:description"]');
    if (byOg) {
      return (byOg.getAttribute("content") || "").trim();
    }

    return "";
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string|null}
   */
  _extractOgImage(root) {
    const el = root.querySelector('meta[property="og:image"]');
    if (!el) return null;
    const content = (el.getAttribute("content") || "").trim();
    return content || null;
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string}
   */
  _extractText(root) {
    // Remove script e style antes de extrair texto
    const body = root.querySelector("body") || root;
    const clone = parse(body.toString());

    for (const tag of clone.querySelectorAll("script, style, noscript")) {
      tag.remove();
    }

    const rawText = normalizeWhitespace(clone.text);
    return rawText.slice(0, MAX_TEXT_LENGTH);
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string[]}
   */
  _extractColors(root) {
    const colorSet = new Set();

    // Cores de atributos style inline
    for (const el of root.querySelectorAll("[style]")) {
      const styleAttr = el.getAttribute("style") || "";
      for (const hex of extractColorsFromStyle(styleAttr)) {
        colorSet.add(hex);
      }
    }

    // theme-color
    const themeColorEl = root.querySelector('meta[name="theme-color"]');
    if (themeColorEl) {
      const hex = toHex(themeColorEl.getAttribute("content") || "");
      if (hex) colorSet.add(hex);
    }

    return Array.from(colorSet);
  }

  /**
   * @private
   * @param {import('node-html-parser').HTMLElement} root
   * @returns {string}
   */
  _extractInlineStyles(root) {
    const parts = [];
    for (const styleEl of root.querySelectorAll("style")) {
      parts.push(styleEl.text);
    }
    return parts.join("\n").slice(0, MAX_INLINE_STYLES_LENGTH);
  }
}

module.exports = FetchExtractor;
