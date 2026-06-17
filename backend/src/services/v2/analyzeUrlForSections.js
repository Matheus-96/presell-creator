'use strict';

const { getEnv } = require('../../config/env');

const SECTION_TYPES = ['hero', 'faq', 'testimonials', 'footer', 'product-highlight'];

function buildSystemPrompt() {
  return `Você é um especialista em copywriting de presell pages baseadas em seções.

Sua tarefa é analisar os dados de uma página de produto e gerar as seções de presell mais adequadas.

## Formato de resposta

Retorne EXCLUSIVAMENTE um objeto JSON válido — sem markdown, sem blocos de código, sem explicações.

SCHEMA (exemplo com todas as seções possíveis):
{
  "sections": [
    {
      "type": "hero",
      "order": 0,
      "props": {
        "variant": "centered",
        "headline": "Título principal persuasivo (máx 70 caracteres)",
        "subtitle": "Subtítulo complementar (máx 130 caracteres)",
        "ctaText": "Texto do botão (máx 35 caracteres)",
        "ctaUrl": "",
        "imageUrl": null,
        "imagePosition": "right",
        "bgColor": "#ffffff"
      }
    },
    {
      "type": "product-highlight",
      "order": 1,
      "props": {
        "variant": "single-product",
        "imageUrl": null,
        "name": "Nome do produto",
        "description": "Descrição curta e persuasiva",
        "originalPrice": "R$ 197,00",
        "price": "R$ 97,00",
        "discountBadge": "-50%",
        "ctaText": "Comprar agora",
        "ctaUrl": ""
      }
    },
    {
      "type": "product-highlight",
      "order": 1,
      "props": {
        "variant": "benefits-list",
        "title": "Por que escolher este produto?",
        "items": [
          { "icon": "✅", "text": "Benefício principal do produto" }
        ]
      }
    },
    {
      "type": "faq",
      "order": 2,
      "props": {
        "title": "Título da seção de FAQ",
        "items": [
          { "question": "Pergunta?", "answer": "Resposta clara e direta." }
        ]
      }
    },
    {
      "type": "testimonials",
      "order": 3,
      "props": {
        "title": "Título da seção de depoimentos",
        "items": [
          {
            "name": "Nome do cliente",
            "role": "Cargo ou contexto",
            "text": "Depoimento autêntico e persuasivo",
            "avatarUrl": null
          }
        ]
      }
    },
    {
      "type": "footer",
      "order": 4,
      "props": {
        "legalText": "Texto legal curto e obrigatório",
        "links": [
          { "label": "Termos", "url": "#" }
        ]
      }
    }
  ]
}

## Catálogo de seções e variantes

### hero (obrigatório — sempre a primeira seção)
- **centered** (padrão): layout centralizado com texto + imagem lateral. Melhor para ofertas genéricas ou quando não há imagem forte do produto. Não requer imagem.
- **split**: layout dividido em duas colunas (texto + imagem). Use quando a oferta tem uma imagem de produto forte e o texto precisa de destaque visual ao lado. Requer campo "imagePosition" ("left" ou "right").
- **background-image**: texto sobre imagem de fundo com overlay escuro. Ideal para ofertas aspiracionais ou lifestyle. Não requer imageUrl no JSON (o usuário configurará a imagem manualmente).

### product-highlight (opcional)
- **single-product**: destaque de um produto com imagem, nome, descrição, preços (de/por), badge de desconto e CTA. Use quando a oferta é focada em um único produto com preço claro.
- **benefits-list**: lista de benefícios com ícones emoji e textos curtos. Use quando a oferta é mais sobre características/benefícios do que sobre preço, ou quando não há imagem do produto.

### faq (opcional)
Perguntas e respostas sobre o produto. Inclua quando o produto tem dúvidas comuns ou objeções que precisam ser respondidas.

### testimonials (opcional)
Depoimentos de clientes. Inclua quando o produto tem forte apelo social ou quando depoimentos ajudam a construir credibilidade.

### footer (obrigatório — sempre a última seção)
Texto legal e links.

REGRAS:
- "hero" e "footer" são obrigatórios e devem sempre estar presentes
- "faq", "testimonials" e "product-highlight" são opcionais — inclua-os apenas se a análise do produto indicar que agregam valor real à presell
- O array "sections" pode ter entre 2 e 6 itens, sempre começando por hero e terminando por footer
- Cada item deve ter os campos "type", "order" e "props"
- Os valores de "order" devem ser sequenciais a partir de 0, na ordem em que as seções aparecem
- O campo "variant" é obrigatório em "hero" e "product-highlight"
- "imageUrl" no hero deve ser sempre null (o usuário configura manualmente)
- "avatarUrl" em cada item de testimonials deve ser sempre null
- "ctaUrl" no hero e product-highlight pode ser deixado vazio ("") — o servidor preencherá com o link de afiliado
- "faq.items" (quando incluído): entre 3 e 6 perguntas/respostas relevantes ao produto
- "testimonials.items" (quando incluído): entre 2 e 4 depoimentos persuasivos com nomes plausíveis
- "product-highlight.items" (benefits-list): entre 3 e 6 benefícios com emojis variados
- "footer.links": entre 1 e 4 links (Termos, Privacidade, Contato, etc.)
- Gere TODO o conteúdo em português brasileiro
- O JSON deve ser válido — sem vírgulas finais, sem comentários, sem aspas curvas`;
}

function buildUserContent(pageData) {
  const parts = [
    `Título da página: ${pageData?.title || ''}`,
    `Descrição: ${pageData?.metaDescription || ''}`,
    `Texto da página: ${pageData?.text || ''}`,
  ];
  if (Array.isArray(pageData?.colors) && pageData.colors.length > 0) {
    parts.push(`Cores identificadas: ${pageData.colors.join(', ')}`);
  }
  return parts.filter(Boolean).join('\n');
}

function coerceProps(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function coerceItems(value) {
  return Array.isArray(value) ? value : [];
}

const HERO_VARIANTS = ['centered', 'split', 'background-image'];
const PRODUCT_HIGHLIGHT_VARIANTS = ['single-product', 'benefits-list'];

function buildHeroSection(rawSection, affiliateUrl) {
  const props = coerceProps(rawSection?.props);
  const variant = HERO_VARIANTS.includes(props.variant) ? props.variant : 'centered';
  return {
    type: 'hero',
    props: {
      variant,
      headline: String(props.headline || ''),
      subtitle: String(props.subtitle || ''),
      ctaText: String(props.ctaText || 'Quero saber mais'),
      ctaUrl: affiliateUrl,
      imageUrl: null,
      imagePosition: props.imagePosition === 'left' ? 'left' : 'right',
      bgColor: typeof props.bgColor === 'string' ? props.bgColor : '#ffffff',
    },
  };
}

function buildFaqSection(rawSection) {
  const props = coerceProps(rawSection.props);
  return {
    type: 'faq',
    props: {
      title: String(props.title || 'Perguntas frequentes'),
      items: coerceItems(props.items).map((item) => ({
        question: String(item?.question || ''),
        answer: String(item?.answer || ''),
      })),
    },
  };
}

function buildTestimonialsSection(rawSection) {
  const props = coerceProps(rawSection.props);
  return {
    type: 'testimonials',
    props: {
      title: String(props.title || 'Depoimentos'),
      items: coerceItems(props.items).map((item) => ({
        name: String(item?.name || ''),
        role: String(item?.role || ''),
        text: String(item?.text || ''),
        avatarUrl: null,
      })),
    },
  };
}

function buildFooterSection(rawSection) {
  const props = coerceProps(rawSection?.props);
  return {
    type: 'footer',
    props: {
      legalText: String(props.legalText || ''),
      links: coerceItems(props.links).map((link) => ({
        label: String(link?.label || ''),
        url: String(link?.url || '#'),
      })),
    },
  };
}

function buildProductHighlightSection(rawSection, affiliateUrl) {
  const props = coerceProps(rawSection.props);
  const variant = PRODUCT_HIGHLIGHT_VARIANTS.includes(props.variant) ? props.variant : 'single-product';

  if (variant === 'benefits-list') {
    return {
      type: 'product-highlight',
      props: {
        variant: 'benefits-list',
        title: String(props.title || ''),
        items: coerceItems(props.items).map((item) => ({
          icon: String(item?.icon || '✅'),
          text: String(item?.text || ''),
        })),
      },
    };
  }

  return {
    type: 'product-highlight',
    props: {
      variant: 'single-product',
      imageUrl: null,
      name: String(props.name || ''),
      description: String(props.description || ''),
      originalPrice: String(props.originalPrice || ''),
      price: String(props.price || ''),
      discountBadge: String(props.discountBadge || ''),
      ctaText: String(props.ctaText || 'Comprar agora'),
      ctaUrl: affiliateUrl,
    },
  };
}

function normalizeSections(rawSections, affiliateUrl) {
  const byType = new Map();
  if (Array.isArray(rawSections)) {
    for (const section of rawSections) {
      if (section && SECTION_TYPES.includes(section.type)) {
        byType.set(section.type, section);
      }
    }
  }

  const sections = [buildHeroSection(byType.get('hero'), affiliateUrl)];

  if (byType.has('product-highlight')) {
    sections.push(buildProductHighlightSection(byType.get('product-highlight'), affiliateUrl));
  }
  if (byType.has('faq')) {
    sections.push(buildFaqSection(byType.get('faq')));
  }
  if (byType.has('testimonials')) {
    sections.push(buildTestimonialsSection(byType.get('testimonials')));
  }

  sections.push(buildFooterSection(byType.get('footer')));

  return sections.map((section, index) => ({ ...section, order: index }));
}

async function analyzeUrlForSections(pageData, affiliateUrl) {
  const { openRouterApiKey } = getEnv();

  if (!affiliateUrl || typeof affiliateUrl !== 'string') {
    const e = new Error('affiliateUrl is required for analyzeUrlForSections');
    e.code = 'MISSING_AFFILIATE_URL';
    throw e;
  }

  const userContent = buildUserContent(pageData);

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://presell-creator.local',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const e = new Error('OpenRouter request timed out after 90s');
      e.code = 'AI_TIMEOUT';
      throw e;
    }
    const e = new Error(`Failed to reach OpenRouter: ${err.message}`);
    e.code = 'AI_NETWORK_ERROR';
    throw e;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const e = new Error(`OpenRouter returned HTTP ${response.status}: ${body.slice(0, 200)}`);
    e.code = 'AI_API_ERROR';
    throw e;
  }

  const data = await response.json().catch(() => null);
  const rawJson = data?.choices?.[0]?.message?.content;

  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    const e = new Error('OpenRouter returned an empty response');
    e.code = 'AI_EMPTY_RESPONSE';
    throw e;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson.trim());
  } catch {
    const stripped = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    try {
      parsed = JSON.parse(stripped.trim());
    } catch {
      const e = new Error(`AI response is not valid JSON: ${rawJson.slice(0, 200)}`);
      e.code = 'AI_INVALID_JSON';
      throw e;
    }
  }

  if (!parsed || !Array.isArray(parsed.sections)) {
    const e = new Error('AI response is missing the "sections" array');
    e.code = 'AI_INVALID_SCHEMA';
    throw e;
  }

  return {
    sections: normalizeSections(parsed.sections, affiliateUrl),
  };
}

module.exports = {
  analyzeUrlForSections,
  normalizeSections,
  buildSystemPrompt,
  SECTION_TYPES,
};
