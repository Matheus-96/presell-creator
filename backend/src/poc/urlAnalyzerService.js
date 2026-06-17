'use strict';

const { getEnv } = require('../config/env');
const { listTemplateManifests } = require('../templates/registry');

function getLanguageName(language) {
  const names = {
    'pt-BR': 'português brasileiro',
    'en-US': 'English (US)',
    'es': 'Spanish',
    'fr': 'French',
  };
  return names[language] || names['pt-BR'];
}

function buildSystemPrompt(hasBackgroundImage = false, language = 'pt-BR') {
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
      if (f.maxLength) desc += ` [máx: ${f.maxLength} caracteres]`;
      if (f.maxLines) desc += ` [máx: ${f.maxLines} linhas]`;
      if (f.maxLengthPerLine) desc += ` [máx por linha: ${f.maxLengthPerLine} caracteres]`;
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
2. Gerar o conteúdo persuasivo no idioma especificado abaixo
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
  "slug": "slug-amigavel-da-url",
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
- "slug": slug editorial de 5 a 8 palavras no idioma selecionado, estilo URL de matéria/conteúdo — deve refletir o ângulo de copy do presell (curiosidade, resultado, descoberta, autoridade), não o nome do produto; apenas letras minúsculas sem acento, números e hífens (ex: "formula-natural-que-esta-acabando-com-as-dores", "medicos-revelam-segredo-para-emagrecer-sem-dieta", "how-doctors-discovered-this-joint-pain-solution")
- "headline": máximo 70 caracteres — priorize clareza e impacto (para templates de modal/card centralizado como offer-modal e app-ad-fullscreen, limite a 55 caracteres)
- "subtitle": máximo 130 caracteres — texto de suporte, sem repetir o headline (para templates de modal/card, limite a 90 caracteres)
- "ctaText": máximo 35 caracteres — deve caber em uma única linha no botão
- "bullets": máximo 5 itens; cada item com máximo 80 caracteres — comece com verbo ou substantivo forte
- "heroImageUrl" deve ser uma das URLs de imagem fornecidas (ou null se nenhuma for adequada)
- "theme.primary" é a cor principal da marca (botões, CTAs, destaques)
- "theme.secondary" é a cor de suporte (títulos, ícones)
- "theme.background" é o fundo geral da presell
- "theme.surface" é o fundo de cards/seções internas (pode ter transparência)
- "theme.textColor" é a cor principal do texto
- Todas as cores em formato rgba() — suporta transparência no canal alpha (0.0 a 1.0)
- "settings" deve conter apenas os campos do template escolhido
- Campos de "settings" do tipo "range" devem ser números dentro do min/max especificado
- Respeite os limites de caracteres indicados por [máx: N caracteres] em cada campo — o conteúdo excedente será cortado na tela mobile
- O JSON deve ser válido — sem vírgulas finais, sem comentários
- Gere EXCLUSIVAMENTE o conteúdo em ${getLanguageName(language)}`;
}

async function analyzeUrlForForm(pageData, hostedImageUrls = [], backgroundImage = null, userInstructions = '', language = 'pt-BR') {
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
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildSystemPrompt(!!backgroundImage?.hostedUrl, language) },
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
    slug: typeof parsed.slug === 'string' ? parsed.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : '',
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

module.exports = { analyzeUrlForForm };
