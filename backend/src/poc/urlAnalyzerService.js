'use strict';

const { getEnv } = require('../config/env');
const { listTemplateManifests } = require('../templates/registry');

function getLanguageInstructions(language) {
  const instructions = {
    'pt-BR': {
      role: 'Você é um especialista em copywriting e design de presell pages de alta conversão.',
      task: 'Sua tarefa é analisar os dados de uma página de produto e preencher automaticamente um formulário de presell.',
      should: [
        'Escolher o template mais adequado dentre os disponíveis (com base no tipo de produto, visual da página e screenshot)',
        'Gerar o conteúdo persuasivo em português brasileiro',
        'Extrair o tema de cores da identidade visual do site',
        'Preencher os campos específicos do template escolhido'
      ],
      tone: 'Use um tom persuasivo e envolvente apropriado para o mercado brasileiro.',
      responseFormat: 'Retorne EXCLUSIVAMENTE um objeto JSON válido — sem markdown, sem blocos de código, sem explicações.',
      rules: [
        '"templateId" deve ser exatamente um dos IDs listados acima',
        '"bullets" deve ser um array de strings (máximo 6 itens)',
        '"heroImageUrl" deve ser uma das URLs de imagem fornecidas (ou null se nenhuma for adequada)',
        '"theme.primary" é a cor principal da marca (botões, CTAs, destaques)',
        '"theme.secondary" é a cor de suporte (títulos, ícones)',
        '"theme.background" é o fundo geral da presell',
        '"theme.surface" é o fundo de cards/seções internas (pode ter transparência)',
        '"theme.textColor" é a cor principal do texto',
        'Todas as cores em formato rgba() — suporta transparência no canal alpha (0.0 a 1.0)',
        '"settings" deve conter apenas os campos do template escolhido',
        'Campos de "settings" do tipo "range" devem ser números dentro do min/max especificado',
        'O JSON deve ser válido — sem vírgulas finais, sem comentários',
        'Todo o conteúdo em português brasileiro'
      ],
    },
    'en-US': {
      role: 'You are an expert in high-converting presell page copywriting and design.',
      task: 'Your task is to analyze product page data and automatically populate a presell form.',
      should: [
        'Choose the most suitable template among the available ones (based on product type, page design, and screenshot)',
        'Generate persuasive content in English (US)',
        'Extract the color theme from the brand identity',
        'Fill in the specific fields for the chosen template'
      ],
      tone: 'Use an engaging and persuasive tone appropriate for the US market.',
      responseFormat: 'Return EXCLUSIVELY a valid JSON object — no markdown, no code blocks, no explanations.',
      rules: [
        '"templateId" must be exactly one of the listed IDs above',
        '"bullets" must be an array of strings (maximum 6 items)',
        '"heroImageUrl" must be one of the provided image URLs (or null if none are suitable)',
        '"theme.primary" is the brand\'s main color (buttons, CTAs, highlights)',
        '"theme.secondary" is the support color (titles, icons)',
        '"theme.background" is the presell\'s general background',
        '"theme.surface" is the background for cards/internal sections (may have transparency)',
        '"theme.textColor" is the main text color',
        'All colors in rgba() format — supports transparency in the alpha channel (0.0 to 1.0)',
        '"settings" must contain only the fields of the chosen template',
        'Template "settings" fields of type "range" must be numbers within the min/max specified',
        'JSON must be valid — no trailing commas, no comments',
        'All content in English (US)'
      ],
    },
    'es': {
      role: 'Eres un experto en copywriting y diseño de páginas presell de alta conversión.',
      task: 'Tu tarea es analizar datos de una página de producto y completar automáticamente un formulario de presell.',
      should: [
        'Elegir la plantilla más adecuada entre las disponibles (según el tipo de producto, diseño de la página y captura de pantalla)',
        'Generar contenido persuasivo en español',
        'Extraer el tema de color de la identidad de marca',
        'Completar los campos específicos de la plantilla elegida'
      ],
      tone: 'Usa un tono persuasivo y atractivo apropiado para el mercado hispanohablante.',
      responseFormat: 'Devuelve EXCLUSIVAMENTE un objeto JSON válido — sin markdown, sin bloques de código, sin explicaciones.',
      rules: [
        '"templateId" debe ser exactamente uno de los IDs listados anteriormente',
        '"bullets" debe ser un array de strings (máximo 6 elementos)',
        '"heroImageUrl" debe ser una de las URLs de imagen proporcionadas (o null si ninguna es adecuada)',
        '"theme.primary" es el color principal de la marca (botones, CTAs, destacados)',
        '"theme.secondary" es el color de apoyo (títulos, iconos)',
        '"theme.background" es el fondo general del presell',
        '"theme.surface" es el fondo de tarjetas/secciones internas (puede tener transparencia)',
        '"theme.textColor" es el color principal del texto',
        'Todos los colores en formato rgba() — admite transparencia en el canal alfa (0.0 a 1.0)',
        '"settings" debe contener solo los campos de la plantilla elegida',
        'Los campos "settings" del tipo "rango" deben ser números dentro del min/max especificado',
        'El JSON debe ser válido — sin comas finales, sin comentarios',
        'Todo el contenido en español'
      ],
    },
    'fr': {
      role: 'Vous êtes un expert en rédaction et conception de pages presell hautement convertissantes.',
      task: 'Votre tâche est d\'analyser les données d\'une page produit et de remplir automatiquement un formulaire presell.',
      should: [
        'Choisir le modèle le plus approprié parmi ceux disponibles (en fonction du type de produit, de la conception de la page et de la capture d\'écran)',
        'Générer du contenu persuasif en français',
        'Extraire le thème des couleurs de l\'identité de marque',
        'Remplir les champs spécifiques du modèle choisi'
      ],
      tone: 'Utilisez un ton persuasif et engageant approprié au marché français.',
      responseFormat: 'Retournez EXCLUSIVEMENT un objet JSON valide — pas de markdown, pas de blocs de code, pas d\'explications.',
      rules: [
        '"templateId" doit être exactement l\'un des IDs listés ci-dessus',
        '"bullets" doit être un tableau de chaînes (maximum 6 éléments)',
        '"heroImageUrl" doit être l\'une des URL d\'image fournies (ou null si aucune n\'est appropriée)',
        '"theme.primary" est la couleur principale de la marque (boutons, CTAs, surbrillances)',
        '"theme.secondary" est la couleur de support (titres, icônes)',
        '"theme.background" est l\'arrière-plan général du presell',
        '"theme.surface" est l\'arrière-plan des cartes/sections internes (peut avoir de la transparence)',
        '"theme.textColor" est la couleur principale du texte',
        'Toutes les couleurs au format rgba() — support de la transparence dans le canal alpha (0.0 à 1.0)',
        '"settings" ne doit contenir que les champs du modèle choisi',
        'Les champs "settings" du type "plage" doivent être des nombres dans la plage min/max spécifiée',
        'Le JSON doit être valide — pas de virgules finales, pas de commentaires',
        'Tout le contenu en français'
      ],
    },
  };
  return instructions[language] || instructions['pt-BR'];
}

function buildSystemPrompt(hasBackgroundImage = false, language = 'pt-BR') {
  const templates = listTemplateManifests();
  const langInfo = getLanguageInstructions(language);

  const templatesCatalog = templates.map(t => {
    const fieldsDesc = t.fields.map(f => {
      let desc = `  - "${f.name}" (${f.type}): ${f.label}`;
      if (f.helpText) desc += ` — ${f.helpText}`;
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        desc += ` [default: ${JSON.stringify(f.defaultValue)}]`;
      }
      if (f.options?.length) {
        desc += ` [options: ${f.options.map(o => o.value).join(', ')}]`;
      }
      if (f.type === 'range') {
        desc += ` [min: ${f.min}, max: ${f.max}, step: ${f.step}]`;
      }
      return desc;
    }).join('\n');

    const instructions = t.aiInstructions ? `\nUsage instructions:\n${t.aiInstructions}` : '';
    return `### Template: "${t.id}"\nName: ${t.name}\nDescription: ${t.description}\nSpecific fields:\n${fieldsDesc}${instructions}`;
  }).join('\n\n');

  const backgroundHint = hasBackgroundImage
    ? '\n\n## Background Image Available\nA background image has been extracted from the destination page and is available in the message content. Prioritize the "offer-modal" or "app-ad-fullscreen" templates as both take advantage of immersive background images. Use the "backgroundImage" field with the provided URL when the chosen template supports background images.'
    : '';

  const shouldList = langInfo.should.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const rulesList = langInfo.rules.map((r, i) => `- ${r}`).join('\n');

  return `${langInfo.role}

${langInfo.task}

${langInfo.should.length > 0 ? 'You should:\n' + shouldList : ''}

${langInfo.tone}

## Available Templates

${templatesCatalog}
${backgroundHint}

## Response Format

${langInfo.responseFormat}

SCHEMA:
{
  "templateId": "template-id-chosen",
  "headline": "Persuasive main title",
  "subtitle": "Complementary subtitle (may be empty)",
  "body": "Body text — persuasive narrative of 2-4 paragraphs separated by \\n\\n",
  "bullets": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "ctaText": "Call-to-action button text",
  "heroImageUrl": "/media/filename.jpg or null",
  "theme": {
    "primary": "rgba(r, g, b, 1)",
    "secondary": "rgba(r, g, b, 1)",
    "background": "rgba(r, g, b, 1)",
    "surface": "rgba(r, g, b, 0.95)",
    "textColor": "rgba(r, g, b, 1)"
  },
  "settings": {
    "template_field": "value"
  }
}

RULES:
${rulesList}`;
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
