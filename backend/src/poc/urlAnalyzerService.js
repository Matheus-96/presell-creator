'use strict';

const { getEnv } = require('../config/env');
const { listTemplateManifests } = require('../templates/registry');

function buildSystemPrompt(hasBackgroundImage = false) {
  const templates = listTemplateManifests();

  const templatesCatalog = templates.map(t => {
    const fieldsDesc = t.fields.map(f => {
      let desc = `  - "${f.name}" (${f.type}): ${f.label}`;
      if (f.helpText) desc += ` — ${f.helpText}`;
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        desc += ` [padrão: ${JSON.stringify(f.defaultValue)}]`;
      }
      if (f.options?.length) {
        desc += ` [opções: ${f.options.map(o => o.value).join(', ')}]`;
      }
      if (f.type === 'range') {
        desc += ` [min: ${f.min}, max: ${f.max}, step: ${f.step}]`;
      }
      return desc;
    }).join('\n');

    const instructions = t.aiInstructions ? `\nInstruções de uso:\n${t.aiInstructions}` : '';
    return `### Template: "${t.id}"\nNome: ${t.name}\nDescrição: ${t.description}\nCampos específicos:\n${fieldsDesc}${instructions}`;
  }).join('\n\n');

  const backgroundHint = hasBackgroundImage
    ? '\n\n## Imagem de fundo disponível\nUma imagem de fundo (background image) foi extraída da página de destino e está disponível no conteúdo da mensagem. Priorize os templates "offer-modal" ou "app-ad-fullscreen" pois ambos tiram proveito de imagem de fundo imersiva. Use o campo "backgroundImage" com a URL fornecida quando o template escolhido suportar imagem de fundo.'
    : '';

  return `Você é um especialista em copywriting e design de presell pages de alta conversão.

Sua tarefa é analisar os dados de uma página de produto e preencher automaticamente um formulário de presell.

Você deve:
1. Escolher o template mais adequado dentre os disponíveis (com base no tipo de produto, visual da página e screenshot)
2. Gerar o conteúdo persuasivo em português brasileiro
3. Extrair o tema de cores da identidade visual do site
4. Preencher os campos específicos do template escolhido

## Templates disponíveis

${templatesCatalog}
${backgroundHint}

## Formato de resposta

Retorne EXCLUSIVAMENTE um objeto JSON válido — sem markdown, sem blocos de código, sem explicações.

SCHEMA:
{
  "templateId": "id-do-template-escolhido",
  "headline": "Título principal persuasivo",
  "subtitle": "Subtítulo complementar (pode ser vazio)",
  "body": "Texto do corpo — narrativa persuasiva de 2-4 parágrafos separados por \\n\\n",
  "bullets": ["Benefício 1", "Benefício 2", "Benefício 3"],
  "ctaText": "Texto do botão de ação",
  "heroImageUrl": "/media/filename.jpg ou null",
  "theme": {
    "primary": "rgba(r, g, b, 1)",
    "secondary": "rgba(r, g, b, 1)",
    "background": "rgba(r, g, b, 1)",
    "surface": "rgba(r, g, b, 0.95)",
    "textColor": "rgba(r, g, b, 1)"
  },
  "settings": {
    "campo_do_template": "valor"
  }
}

REGRAS:
- "templateId" deve ser exatamente um dos IDs listados acima
- "bullets" deve ser um array de strings (máximo 6 itens)
- "heroImageUrl" deve ser uma das URLs de imagem fornecidas (ou null se nenhuma for adequada)
- "theme.primary" é a cor principal da marca (botões, CTAs, destaques)
- "theme.secondary" é a cor de suporte (títulos, ícones)
- "theme.background" é o fundo geral da presell
- "theme.surface" é o fundo de cards/seções internas (pode ter transparência)
- "theme.textColor" é a cor principal do texto
- Todas as cores em formato rgba() — suporta transparência no canal alpha (0.0 a 1.0)
- "settings" deve conter apenas os campos do template escolhido
- Campos de "settings" do tipo "range" devem ser números dentro do min/max especificado
- O JSON deve ser válido — sem vírgulas finais, sem comentários
- Todo o conteúdo em português brasileiro`;
}

async function analyzeUrlForForm(pageData, hostedImageUrls = [], backgroundImage = null, userInstructions = '') {
  const { openRouterApiKey } = getEnv();

  const imageSection = hostedImageUrls.length > 0
    ? `\nImagens do produto disponíveis (use uma dessas URLs em "heroImageUrl" se for adequada — não invente outras):\n${hostedImageUrls.join('\n')}`
    : '\n(Nenhuma imagem disponível — defina "heroImageUrl" como null)';

  const backgroundImageSection = backgroundImage?.hostedUrl
    ? `\nImagem de fundo extraída da página (use esta URL no campo "backgroundImage" do template quando aplicável): ${backgroundImage.hostedUrl}`
    : '';

  const pageContent = [
    `Título da página: ${pageData.title}`,
    `Descrição: ${pageData.metaDescription}`,
    `Texto da página: ${pageData.text}`,
    `Cores identificadas: ${pageData.colors.join(', ')}`,
    `CSS Variables de cor: ${JSON.stringify(pageData.cssVars)}`,
    imageSection,
    backgroundImageSection,
  ].filter(Boolean).join('\n');

  const textContent = userInstructions
    ? `Instruções específicas do usuário: ${userInstructions}\n\n${pageContent}`
    : pageContent;

  const imageParts = [];
  if (pageData.screenshot) {
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${pageData.screenshot.toString('base64')}` }
    });
  }
  if (backgroundImage?.base64) {
    imageParts.push({
      type: 'image_url',
      image_url: { url: backgroundImage.base64 }
    });
  }

  const userContent = imageParts.length > 0
    ? [...imageParts, { type: 'text', text: textContent }]
    : textContent;

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://presell-creator.local',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.6,
        messages: [
          { role: 'system', content: buildSystemPrompt(!!backgroundImage?.hostedUrl) },
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

  const validTemplateIds = listTemplateManifests().map(t => t.id);
  if (!parsed?.templateId || !validTemplateIds.includes(parsed.templateId)) {
    const e = new Error(`AI returned invalid templateId: ${parsed?.templateId}`);
    e.code = 'AI_INVALID_SCHEMA';
    throw e;
  }

  return {
    templateId: parsed.templateId,
    headline: parsed.headline ?? '',
    subtitle: parsed.subtitle ?? '',
    body: parsed.body ?? '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    ctaText: parsed.ctaText ?? 'Continuar',
    heroImageUrl: parsed.heroImageUrl ?? null,
    theme: parsed.theme ?? null,
    settings: parsed.settings ?? {},
    hostedImageUrls,
    backgroundImageUrl: backgroundImage?.hostedUrl ?? null,
  };
}

function buildMultiVariantSystemPrompt() {
  const templates = listTemplateManifests();

  const templatesCatalog = templates.map(t => {
    const fieldsDesc = t.fields.map(f => {
      let desc = `  - "${f.name}" (${f.type}): ${f.label}`;
      if (f.helpText) desc += ` — ${f.helpText}`;
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        desc += ` [padrão: ${JSON.stringify(f.defaultValue)}]`;
      }
      if (f.options?.length) {
        desc += ` [opções: ${f.options.map(o => o.value).join(', ')}]`;
      }
      if (f.type === 'range') {
        desc += ` [min: ${f.min}, max: ${f.max}, step: ${f.step}]`;
      }
      return desc;
    }).join('\n');

    const instructions = t.aiInstructions ? `\nInstruções de uso:\n${t.aiInstructions}` : '';
    return `### Template: "${t.id}"\nNome: ${t.name}\nDescrição: ${t.description}\nCampos específicos:\n${fieldsDesc}${instructions}`;
  }).join('\n\n');

  return `Você é um especialista em copywriting e design de presell pages de alta conversão.

Sua tarefa é analisar os dados de uma página de produto e gerar 3 variantes de presell, cada uma com um ângulo de persuasão diferente.

Os 3 ângulos obrigatórios são:
1. **urgência** (angle: "urgency") — cria senso de urgência, escassez ou prazo limite
2. **autoridade** (angle: "authority") — destaca credenciais, expertise e provas científicas
3. **prova social** (angle: "social-proof") — enfatiza depoimentos, número de clientes e resultados comprovados

Para cada variante você deve:
1. Escolher o template mais adequado para aquele ângulo específico
2. Gerar conteúdo persuasivo em português brasileiro alinhado ao ângulo
3. Extrair o tema de cores da identidade visual do site
4. Preencher os campos específicos do template escolhido

## Templates disponíveis

${templatesCatalog}

## Formato de resposta

Retorne EXCLUSIVAMENTE um objeto JSON válido — sem markdown, sem blocos de código, sem explicações.

SCHEMA:
{
  "variants": [
    {
      "angle": "urgency",
      "templateId": "id-do-template-escolhido",
      "headline": "Título principal persuasivo com urgência",
      "subtitle": "Subtítulo complementar (pode ser vazio)",
      "body": "Texto do corpo — narrativa persuasiva de 2-4 parágrafos separados por \\n\\n",
      "bullets": ["Benefício 1", "Benefício 2", "Benefício 3"],
      "ctaText": "Texto do botão de ação",
      "heroImageUrl": "/media/filename.jpg ou null",
      "theme": {
        "primary": "rgba(r, g, b, 1)",
        "secondary": "rgba(r, g, b, 1)",
        "background": "rgba(r, g, b, 1)",
        "surface": "rgba(r, g, b, 0.95)",
        "textColor": "rgba(r, g, b, 1)"
      },
      "settings": {
        "campo_do_template": "valor"
      }
    },
    {
      "angle": "authority",
      ...
    },
    {
      "angle": "social-proof",
      ...
    }
  ]
}

REGRAS:
- "variants" deve conter exatamente 3 objetos, um para cada ângulo: "urgency", "authority", "social-proof"
- "templateId" deve ser exatamente um dos IDs listados acima (pode ser o mesmo em variantes diferentes)
- "bullets" deve ser um array de strings (máximo 6 itens)
- "heroImageUrl" deve ser uma das URLs de imagem fornecidas (ou null se nenhuma for adequada)
- "theme.primary" é a cor principal da marca (botões, CTAs, destaques)
- "theme.secondary" é a cor de suporte (títulos, ícones)
- "theme.background" é o fundo geral da presell
- "theme.surface" é o fundo de cards/seções internas (pode ter transparência)
- "theme.textColor" é a cor principal do texto
- Todas as cores em formato rgba() — suporta transparência no canal alpha (0.0 a 1.0)
- "settings" deve conter apenas os campos do template escolhido
- O JSON deve ser válido — sem vírgulas finais, sem comentários
- Todo o conteúdo em português brasileiro`;
}

async function analyzeUrlForFormMultiVariant(pageData, userInstructions = '') {
  const { openRouterApiKey } = getEnv();

  const imageSection = (pageData.imageUrls?.length > 0)
    ? `\nImagens do produto disponíveis (use uma dessas URLs em "heroImageUrl" se for adequada — não invente outras):\n${pageData.imageUrls.join('\n')}`
    : '\n(Nenhuma imagem disponível — defina "heroImageUrl" como null)';

  const pageContent = [
    `Título da página: ${pageData.title}`,
    `Descrição: ${pageData.metaDescription}`,
    `Texto da página: ${pageData.text}`,
    `Cores identificadas: ${pageData.colors.join(', ')}`,
    `CSS Variables de cor: ${JSON.stringify(pageData.cssVars)}`,
    imageSection,
  ].filter(Boolean).join('\n');

  const textContent = userInstructions
    ? `Instruções específicas do usuário: ${userInstructions}\n\n${pageContent}`
    : pageContent;

  const imageParts = [];
  if (pageData.screenshot) {
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${pageData.screenshot.toString('base64')}` }
    });
  }

  const userContent = imageParts.length > 0
    ? [...imageParts, { type: 'text', text: textContent }]
    : textContent;

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://presell-creator.local',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.8,
        messages: [
          { role: 'system', content: buildMultiVariantSystemPrompt() },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const e = new Error('OpenRouter request timed out after 120s');
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

  if (!Array.isArray(parsed?.variants) || parsed.variants.length === 0) {
    const e = new Error('AI multi-variant response missing "variants" array');
    e.code = 'AI_INVALID_SCHEMA';
    throw e;
  }

  const validTemplateIds = listTemplateManifests().map(t => t.id);

  const variants = parsed.variants.map(v => ({
    angle: v.angle ?? '',
    templateId: validTemplateIds.includes(v.templateId) ? v.templateId : validTemplateIds[0],
    headline: v.headline ?? '',
    subtitle: v.subtitle ?? '',
    body: v.body ?? '',
    bullets: Array.isArray(v.bullets) ? v.bullets : [],
    ctaText: v.ctaText ?? 'Continuar',
    heroImageUrl: v.heroImageUrl ?? null,
    theme: v.theme ?? null,
    settings: v.settings ?? {},
  }));

  return { variants };
}

module.exports = { analyzeUrlForForm, buildMultiVariantSystemPrompt, analyzeUrlForFormMultiVariant };
