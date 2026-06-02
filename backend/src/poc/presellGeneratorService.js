'use strict';

/**
 * @module presellGeneratorService
 * Chama OpenRouter (google/gemini-2.5-flash-lite) para gerar um array de blocos de presell
 * a partir de dados extraídos de uma página via IPageExtractor.
 */

const { getEnv } = require('../config/env');

const SYSTEM_PROMPT = `Você é um especialista em copywriting e design de presell pages de alta conversão.

Sua tarefa é analisar os dados de uma página de produto e gerar uma presell page persuasiva no formato JSON.

Use as cores extraídas, CSS variables e estilos inline para manter a identidade visual da marca.
Analise o screenshot (quando presente) para entender o produto visualmente.
Design mobile-first: fontes legíveis, botões grandes, espaçamento generoso.

Retorne EXCLUSIVAMENTE um objeto JSON válido com a estrutura abaixo — sem markdown, sem blocos de código, sem explicações.

SCHEMA:
{
  "rootProps": {
    "backgroundColor": "#hex",
    "gradient": "linear-gradient(...)",
    "backgroundImage": "url",
    "blur": 0,
    "opacity": 1
  },
  "blocks": [
    { "type": "hero", "headline": "...", "subtitle": "...", "imageUrl": "...", "textColor": "#hex", "backgroundColor": "#hex" },
    { "type": "title", "text": "...", "level": 2, "textColor": "#hex", "align": "center" },
    { "type": "paragraph", "text": "...", "textColor": "#hex", "align": "left", "fontSize": "md" },
    { "type": "list", "items": ["..."], "icon": "✓", "textColor": "#hex" },
    { "type": "button", "text": "...", "url": "https://...", "backgroundColor": "#hex", "textColor": "#hex", "size": "lg", "align": "center" },
    { "type": "image", "src": "...", "alt": "...", "borderRadius": "12px", "maxWidth": "320px", "align": "center" },
    { "type": "divider", "color": "#hex", "spacing": "24px" },
    { "type": "countdown", "variant": "block", "minutes": 15, "label": "Oferta expira em:", "textColor": "#hex", "backgroundColor": "#hex" },
    { "type": "countdown", "variant": "banner", "minutes": 15, "label": "Oferta expira em:", "textColor": "#hex", "backgroundColor": "#hex" },
    { "type": "column_layout", "gap": "16px", "children": [ ...máx 2 blocos não-column_layout... ] }
  ]
}

REGRAS:
- "column_layout" aceita no máximo 2 filhos e NÃO pode ser filho de outro "column_layout"
- Todos os campos opcionais podem ser omitidos
- "level" em "title" deve ser 1, 2 ou 3
- "fontSize" em "paragraph" deve ser "sm", "md" ou "lg"
- "size" em "button" deve ser "sm", "md" ou "lg"
- "variant" em "countdown" deve ser "block" (padrão, centralizado) ou "banner" (faixa full-width horizontal)
- "align" deve ser "left", "center" ou "right"
- Cores sempre em formato hexadecimal (#rrggbb ou #rgb)
- O JSON deve ser válido — sem vírgulas finais, sem comentários

EXEMPLO DE PRESELL COMPLETA:
{
  "rootProps": {
    "backgroundColor": "#0a0a1a",
    "gradient": "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)"
  },
  "blocks": [
    {
      "type": "hero",
      "headline": "Descubra o Segredo Que Médicos Não Querem Que Você Saiba",
      "subtitle": "O método natural que está ajudando milhares de brasileiros a recuperar a energia perdida",
      "imageUrl": "https://exemplo.com/produto.jpg",
      "textColor": "#ffffff",
      "backgroundColor": "#1a0a2e"
    },
    {
      "type": "paragraph",
      "text": "Se você se sente cansado, sem disposição e com a memória falhando, você não está sozinho. Mas existe uma solução simples que a indústria farmacêutica tenta esconder...",
      "textColor": "#e0e0e0",
      "align": "center",
      "fontSize": "md"
    },
    {
      "type": "title",
      "text": "Por que você ainda sofre com isso?",
      "level": 2,
      "textColor": "#ff9f43",
      "align": "center"
    },
    {
      "type": "list",
      "items": [
        "Remédios caros com efeitos colaterais perigosos",
        "Tratamentos que mascaram os sintomas sem curar a causa",
        "Médicos que prescrevem sem investigar a raiz do problema"
      ],
      "icon": "✗",
      "textColor": "#ff6b6b"
    },
    {
      "type": "divider",
      "color": "#ff9f43",
      "spacing": "32px"
    },
    {
      "type": "title",
      "text": "A solução que realmente funciona",
      "level": 2,
      "textColor": "#ff9f43",
      "align": "center"
    },
    {
      "type": "column_layout",
      "gap": "24px",
      "children": [
        {
          "type": "image",
          "src": "https://exemplo.com/antes.jpg",
          "alt": "Antes",
          "borderRadius": "12px",
          "maxWidth": "100%",
          "align": "center"
        },
        {
          "type": "paragraph",
          "text": "Com o Método Vitalidade Plus, você vai recuperar a energia, o foco e a disposição em apenas 30 dias — ou seu dinheiro de volta.",
          "textColor": "#ffffff",
          "align": "left",
          "fontSize": "md"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        "Fórmula 100% natural sem contraindicações",
        "Aprovado por especialistas em medicina integrativa",
        "Mais de 50.000 clientes satisfeitos",
        "Garantia total de 30 dias"
      ],
      "icon": "✓",
      "textColor": "#2ed573"
    },
    {
      "type": "countdown",
      "minutes": 15,
      "label": "Oferta especial expira em:",
      "textColor": "#ffffff",
      "backgroundColor": "#c0392b"
    },
    {
      "type": "button",
      "text": "QUERO RECUPERAR MINHA ENERGIA AGORA",
      "url": "https://exemplo.com/comprar",
      "backgroundColor": "#ff9f43",
      "textColor": "#0a0a1a",
      "size": "lg",
      "align": "center"
    },
    {
      "type": "paragraph",
      "text": "Compra 100% segura • Frete grátis • Garantia de 30 dias",
      "textColor": "#888888",
      "align": "center",
      "fontSize": "sm"
    }
  ]
}`;

/**
 * Constrói a mensagem do usuário para o modelo.
 * Usa conteúdo multimodal quando screenshot está disponível.
 *
 * @param {import('../extractors/IPageExtractor').PageData} pageData
 * @param {string[]} hostedImageUrls - URLs absolutas hospedadas localmente
 * @returns {string|Array}
 */
function buildUserMessage(pageData, hostedImageUrls = []) {
  const imageSection = hostedImageUrls.length > 0
    ? `\nImagens do produto disponíveis (use estas URLs exatas nos blocos image/hero — não invente outras):\n${hostedImageUrls.join('\n')}`
    : '';

  const textContent = [
    `Título: ${pageData.title}`,
    `Descrição: ${pageData.metaDescription}`,
    `Texto: ${pageData.text}`,
    `Cores: ${pageData.colors.join(', ')}`,
    `CSS Vars: ${JSON.stringify(pageData.cssVars)}`,
    `Styles: ${pageData.inlineStyles}`,
    imageSection,
  ].filter(Boolean).join('\n');

  if (pageData.screenshot) {
    return [
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${pageData.screenshot.toString('base64')}`
        }
      },
      {
        type: 'text',
        text: textContent
      }
    ];
  }

  return textContent;
}

/**
 * Gera o array de blocos de uma presell a partir de dados de página extraídos.
 *
 * @param {import('../extractors/IPageExtractor').PageData} pageData
 * @returns {Promise<{ blocks: import('./blockSchema').Block[], rootProps: import('./blockSchema').RootProps, rawJson: string }>}
 * @throws {Error} se a chamada à API falhar ou a resposta for inválida
 */
async function generatePresellBlocks(pageData, hostedImageUrls = []) {
  const { openRouterApiKey } = getEnv();

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://presell-creator.local'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(pageData, hostedImageUrls) }
        ]
      }),
      signal: AbortSignal.timeout(90_000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const timeoutErr = new Error('OpenRouter request timed out after 90s');
      timeoutErr.code = 'AI_TIMEOUT';
      throw timeoutErr;
    }
    const networkErr = new Error(`Failed to reach OpenRouter: ${err.message}`);
    networkErr.code = 'AI_NETWORK_ERROR';
    throw networkErr;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const apiErr = new Error(
      `OpenRouter returned HTTP ${response.status}: ${body.slice(0, 200)}`
    );
    apiErr.code = 'AI_API_ERROR';
    apiErr.status = response.status;
    throw apiErr;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    const parseErr = new Error('OpenRouter response is not valid JSON');
    parseErr.code = 'AI_INVALID_RESPONSE';
    throw parseErr;
  }

  const rawJson = data?.choices?.[0]?.message?.content;
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    const emptyErr = new Error('OpenRouter returned an empty response');
    emptyErr.code = 'AI_EMPTY_RESPONSE';
    throw emptyErr;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson.trim());
  } catch (err) {
    // Some models wrap JSON in markdown code fences — try to strip them
    const stripped = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    try {
      parsed = JSON.parse(stripped.trim());
    } catch {
      const jsonErr = new Error(
        `AI response is not valid JSON: ${rawJson.slice(0, 200)}`
      );
      jsonErr.code = 'AI_INVALID_JSON';
      throw jsonErr;
    }
  }

  if (!Array.isArray(parsed?.blocks)) {
    const schemaErr = new Error(
      'AI response missing required "blocks" array'
    );
    schemaErr.code = 'AI_INVALID_SCHEMA';
    throw schemaErr;
  }

  return {
    blocks: parsed.blocks,
    rootProps: parsed.rootProps || {},
    rawJson: rawJson.trim()
  };
}

module.exports = { generatePresellBlocks };
