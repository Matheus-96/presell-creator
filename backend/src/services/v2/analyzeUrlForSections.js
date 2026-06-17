'use strict';

const { getEnv } = require('../../config/env');

const SECTION_TYPES = ['hero', 'faq', 'testimonials', 'footer'];

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
        "headline": "Título principal persuasivo (máx 70 caracteres)",
        "subtitle": "Subtítulo complementar (máx 130 caracteres)",
        "ctaText": "Texto do botão (máx 35 caracteres)",
        "ctaUrl": "",
        "imageUrl": null,
        "bgColor": "#ffffff"
      }
    },
    {
      "type": "faq",
      "order": 1,
      "props": {
        "title": "Título da seção de FAQ",
        "items": [
          { "question": "Pergunta?", "answer": "Resposta clara e direta." }
        ]
      }
    },
    {
      "type": "testimonials",
      "order": 2,
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
      "order": 3,
      "props": {
        "legalText": "Texto legal curto e obrigatório",
        "links": [
          { "label": "Termos", "url": "#" }
        ]
      }
    }
  ]
}

REGRAS:
- "hero" e "footer" são obrigatórios e devem sempre estar presentes
- "faq" e "testimonials" são opcionais — inclua-os apenas se a análise do produto indicar que agregam valor real à presell (ex.: produtos com dúvidas comuns merecem FAQ; produtos com forte apelo social merecem depoimentos)
- O array "sections" pode ter entre 2 e 4 itens, sempre começando por hero e terminando por footer
- Cada item deve ter os campos "type", "order" e "props"
- Os valores de "order" devem ser sequenciais a partir de 0, na ordem em que as seções aparecem
- "imageUrl" no hero deve ser sempre null
- "avatarUrl" em cada item de testimonials deve ser sempre null
- "ctaUrl" no hero pode ser deixado vazio ("") — o servidor preencherá com o link de afiliado
- "faq.items" (quando incluído): entre 3 e 6 perguntas/respostas relevantes ao produto
- "testimonials.items" (quando incluído): entre 2 e 4 depoimentos persuasivos com nomes plausíveis
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

function buildHeroSection(rawSection, affiliateUrl) {
  const props = coerceProps(rawSection?.props);
  return {
    type: 'hero',
    props: {
      headline: String(props.headline || ''),
      subtitle: String(props.subtitle || ''),
      ctaText: String(props.ctaText || 'Quero saber mais'),
      ctaUrl: affiliateUrl,
      imageUrl: null,
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
  SECTION_TYPES,
};
