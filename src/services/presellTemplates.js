const templateRegistry = {
  advertorial: {
    id: "advertorial",
    name: "Advertorial",
    description: "Modelo em formato de artigo com narrativa, beneficios e CTA.",
    fields: []
  },
  review: {
    id: "review",
    name: "Review",
    description: "Analise com resumo, beneficios principais e chamada para acao.",
    fields: []
  },
  problem: {
    id: "problem",
    name: "Problema e solucao",
    description: "Apresenta uma dor clara e posiciona a oferta como solucao.",
    fields: []
  },
  quiz: {
    id: "quiz",
    name: "Quiz",
    description: "Tela simples de decisao usando os beneficios como opcoes.",
    fields: []
  },
  "official-simple": {
    id: "official-simple",
    name: "Oficial simples",
    description: "Bridge page direta com card branco, selos de confianca e CTA forte.",
    fields: [
      {
        name: "badge_text",
        label: "Selo superior",
        type: "text",
        defaultValue: "Oferta oficial"
      },
      {
        name: "trust_badges",
        label: "Selos de confianca",
        type: "textarea",
        defaultValue: "Compra segura\nSatisfacao garantida\nPrivacidade protegida",
        helpText: "Um selo por linha."
      },
      {
        name: "accent_color",
        label: "Cor de destaque",
        type: "color",
        defaultValue: "#0f766e"
      },
      {
        name: "show_arrows",
        label: "Mostrar setas no CTA",
        type: "checkbox",
        defaultValue: true
      }
    ]
  },
  "offer-modal": {
    id: "offer-modal",
    name: "Oferta com modal",
    description: "Oferta central em modal sobre fundo com destaque promocional.",
    fields: [
      {
        name: "discount_text",
        label: "Texto de desconto",
        type: "text",
        defaultValue: "Up to 43% OFF"
      },
      {
        name: "scarcity_text",
        label: "Texto de escassez",
        type: "text",
        defaultValue: "Oferta por tempo limitado"
      },
      {
        name: "rating",
        label: "Nota",
        type: "text",
        defaultValue: "9.0"
      },
      {
        name: "stars_text",
        label: "Texto das estrelas",
        type: "text",
        defaultValue: "5 estrelas"
      },
      {
        name: "modal_cta_text_override",
        label: "CTA do modal",
        type: "text",
        defaultValue: ""
      },
      {
        name: "overlay_strength",
        label: "Forca do overlay",
        type: "range",
        defaultValue: 0.65,
        min: 0,
        max: 0.9,
        step: 0.05
      }
    ]
  },
  "device-frame": {
    id: "device-frame",
    name: "Moldura de dispositivo",
    description: "Mostra a oferta dentro de uma moldura de navegador ou aparelho.",
    fields: [
      {
        name: "frame_type",
        label: "Tipo de moldura",
        type: "select",
        defaultValue: "browser",
        options: [
          { value: "browser", label: "Navegador" },
          { value: "phone", label: "Celular" },
          { value: "laptop", label: "Laptop" }
        ]
      },
      {
        name: "top_bar_text",
        label: "Texto da barra superior",
        type: "text",
        defaultValue: "official-site.com"
      },
      {
        name: "footer_left_text",
        label: "Texto do rodape esquerdo",
        type: "text",
        defaultValue: "Termos"
      },
      {
        name: "footer_right_text",
        label: "Texto do rodape direito",
        type: "text",
        defaultValue: "Privacidade"
      },
      {
        name: "offer_note",
        label: "Nota da oferta",
        type: "textarea",
        defaultValue: "Verifique a disponibilidade no site oficial."
      }
    ]
  },
  "app-ad": {
    id: "app-ad",
    name: "Anuncio in-app",
    description: "Anuncio simples, claro e centralizado para fluxo dentro de app.",
    fields: [
      {
        name: "label_text",
        label: "Rotulo",
        type: "text",
        defaultValue: "Publicidade"
      },
      {
        name: "microcopy",
        label: "Microcopy",
        type: "text",
        defaultValue: "Toque para continuar no site oficial."
      },
      {
        name: "disclaimer",
        label: "Aviso",
        type: "textarea",
        defaultValue: "Voce sera redirecionado para uma pagina externa."
      },
      {
        name: "layout_density",
        label: "Densidade",
        type: "select",
        defaultValue: "comfortable",
        options: [
          { value: "compact", label: "Compacta" },
          { value: "comfortable", label: "Confortavel" },
          { value: "spacious", label: "Espacosa" }
        ]
      },
      {
        name: "button_style",
        label: "Estilo do botao",
        type: "select",
        defaultValue: "solid",
        options: [
          { value: "solid", label: "Solido" },
          { value: "outline", label: "Contorno" },
          { value: "soft", label: "Suave" }
        ]
      }
    ]
  }
};

const templateDefinitions = Object.values(templateRegistry);
const allowedTemplates = templateDefinitions.map((template) => template.id);

function getTemplateDefinition(templateId) {
  return templateRegistry[templateId] || templateRegistry.advertorial;
}

function getDefaultSettings(templateId) {
  return getTemplateDefinition(templateId).fields.reduce((defaults, field) => {
    defaults[field.name] = field.defaultValue;
    return defaults;
  }, {});
}

function parseSettingsJson(settingsJson) {
  if (!settingsJson) return {};
  if (typeof settingsJson === "object" && !Array.isArray(settingsJson)) {
    return { ...settingsJson };
  }

  try {
    const parsed = JSON.parse(settingsJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function normalizeSettings(templateId, inputSettings = {}, existingSettings = {}) {
  const definition = getTemplateDefinition(templateId);
  const existing = parseSettingsJson(existingSettings);
  const posted = parseSettingsJson(inputSettings);
  const settings = {
    ...getDefaultSettings(definition.id),
    ...existing,
    ...posted
  };

  definition.fields.forEach((field) => {
    settings[field.name] = normalizeFieldValue(field, settings[field.name]);
  });

  return settings;
}

function parsePresellSettings(presell) {
  if (!presell) return getDefaultSettings("advertorial");
  return normalizeSettings(
    presell.template,
    {},
    parseSettingsJson(presell.settings_json)
  );
}

function normalizeFieldValue(field, value) {
  if (field.type === "checkbox") {
    if (Array.isArray(value)) {
      return value.some((item) => item === true || item === "true" || item === "on");
    }
    return value === true || value === "true" || value === "on" || value === "1";
  }

  if (field.type === "select") {
    const selected = String(value ?? field.defaultValue ?? "");
    const options = Array.isArray(field.options) ? field.options : [];
    return options.some((option) => option.value === selected)
      ? selected
      : field.defaultValue;
  }

  if (field.type === "range") {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return field.defaultValue;
    const min = Number.isFinite(Number(field.min)) ? Number(field.min) : numericValue;
    const max = Number.isFinite(Number(field.max)) ? Number(field.max) : numericValue;
    return Math.min(Math.max(numericValue, min), max);
  }

  return String(value ?? field.defaultValue ?? "").trim();
}

module.exports = {
  templateRegistry,
  templateDefinitions,
  allowedTemplates,
  getTemplateDefinition,
  getDefaultSettings,
  parseSettingsJson,
  normalizeSettings,
  parsePresellSettings
};
