const fs = require("fs");
const path = require("path");
const { normalizeTemplateManifest } = require("../contracts/templateManifest");

function createReactStaticRenderer(templateId, options = {}) {
  const { entryName = templateId, fileName = `${entryName}.js` } = options;

  return {
    kind: "react-static",
    engine: "react",
    entry: `runtime/react/${entryName}`,
    view: `presell/${templateId}`,
    fileName
  };
}

const rawTemplateRegistry = {
  advertorial: {
    id: "advertorial",
    name: "Advertorial",
    description: "Modelo em formato de artigo com narrativa, beneficios e CTA.",
    renderer: createReactStaticRenderer("advertorial", {
      fileName: "articleBatch.js"
    }),
    fields: []
  },
  review: {
    id: "review",
    name: "Review",
    description: "Analise com resumo, beneficios principais e chamada para acao.",
    renderer: createReactStaticRenderer("review", {
      fileName: "articleBatch.js"
    }),
    fields: []
  },
  problem: {
    id: "problem",
    name: "Problema e solucao",
    description: "Apresenta uma dor clara e posiciona a oferta como solucao.",
    renderer: createReactStaticRenderer("problem", {
      fileName: "articleBatch.js"
    }),
    fields: []
  },
  quiz: {
    id: "quiz",
    name: "Quiz",
    description: "Tela simples de decisao usando os beneficios como opcoes.",
    renderer: createReactStaticRenderer("quiz", {
      fileName: "articleBatch.js"
    }),
    fields: []
  },
  "official-simple": {
    id: "official-simple",
    name: "Oficial simples",
    description: "Bridge page direta com card branco, selos de confianca e CTA forte.",
    renderer: createReactStaticRenderer("official-simple", {
      fileName: "officialSimple.js"
    }),
    fields: [
      {
        name: "badge_text",
        label: "Selo superior",
        type: "text",
        defaultValue: "Oferta oficial",
        previewSelector: ".official-simple-badge"
      },
      {
        name: "trust_badges",
        label: "Selos de confianca",
        type: "textarea",
        defaultValue: "Compra segura\nSatisfacao garantida\nPrivacidade protegida",
        helpText: "Um selo por linha.",
        previewSelector: ".official-simple-trust-list"
      },
      {
        name: "accent_color",
        label: "Cor de destaque",
        type: "color",
        defaultValue: "#0f766e",
        previewSelector: ".official-simple-cta"
      },
      {
        name: "show_arrows",
        label: "Mostrar setas no CTA",
        type: "checkbox",
        defaultValue: true,
        previewSelector: ".official-simple-cta"
      }
    ]
  },
  "offer-modal": {
    id: "offer-modal",
    name: "Oferta com modal",
    description: "Oferta central em modal sobre fundo com destaque promocional.",
    renderer: createReactStaticRenderer("offer-modal", {
      fileName: "offerModal.js"
    }),
    fields: [
      {
        name: "discount_text",
        label: "Texto de desconto",
        type: "text",
        defaultValue: "Up to 43% OFF",
        previewSelector: ".offer-modal-discount"
      },
      {
        name: "scarcity_text",
        label: "Texto de escassez",
        type: "text",
        defaultValue: "Oferta por tempo limitado",
        previewSelector: ".offer-modal-scarcity"
      },
      {
        name: "rating",
        label: "Nota",
        type: "text",
        defaultValue: "9.0",
        previewSelector: ".offer-modal-rating-value"
      },
      {
        name: "stars_text",
        label: "Texto das estrelas",
        type: "text",
        defaultValue: "5 estrelas",
        previewSelector: ".offer-modal-rating"
      },
      {
        name: "modal_cta_text_override",
        label: "CTA do modal",
        type: "text",
        defaultValue: "",
        previewSelector: ".offer-modal-cta"
      },
      {
        name: "overlay_strength",
        label: "Forca do overlay",
        type: "range",
        defaultValue: 0.65,
        min: 0,
        max: 0.9,
        step: 0.05,
        previewSelector: ".offer-modal-overlay"
      }
    ]
  },
  "device-frame": {
    id: "device-frame",
    name: "Moldura de dispositivo",
    description: "Mostra a oferta dentro de uma moldura de navegador ou aparelho.",
    renderer: {
      kind: "react-static",
      engine: "react",
      entry: "runtime/react/device-frame",
      view: "presell/device-frame",
      fileName: "deviceFrame.js"
    },
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
        ],
        previewSelector: ".device-frame-window"
      },
      {
        name: "top_bar_text",
        label: "Texto da barra superior",
        type: "text",
        defaultValue: "official-site.com",
        previewSelector: ".device-frame-top-bar"
      },
      {
        name: "footer_left_text",
        label: "Texto do rodape esquerdo",
        type: "text",
        defaultValue: "Termos",
        previewSelector: ".device-frame-footer"
      },
      {
        name: "footer_right_text",
        label: "Texto do rodape direito",
        type: "text",
        defaultValue: "Privacidade",
        previewSelector: ".device-frame-footer"
      },
      {
        name: "offer_note",
        label: "Nota da oferta",
        type: "textarea",
        defaultValue: "Verifique a disponibilidade no site oficial.",
        previewSelector: ".device-frame-offer-note"
      }
    ]
  },
  "app-ad": {
    id: "app-ad",
    name: "Anuncio in-app",
    description: "Anuncio simples, claro e centralizado para fluxo dentro de app.",
    renderer: {
      kind: "react-static",
      engine: "react",
      entry: "runtime/react/app-ad",
      view: "presell/app-ad",
      fileName: "appAd.js"
    },
    fields: [
      {
        name: "label_text",
        label: "Rotulo",
        type: "text",
        defaultValue: "Publicidade",
        previewSelector: ".app-ad-label"
      },
      {
        name: "microcopy",
        label: "Microcopy",
        type: "text",
        defaultValue: "Toque para continuar no site oficial.",
        previewSelector: ".app-ad-microcopy"
      },
      {
        name: "disclaimer",
        label: "Aviso",
        type: "textarea",
        defaultValue: "Voce sera redirecionado para uma pagina externa.",
        previewSelector: ".app-ad-disclaimer"
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
        ],
        previewSelector: ".app-ad-shell"
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
        ],
        previewSelector: ".app-ad-cta"
      }
    ]
  },
  "app-ad-fullscreen": {
    id: "app-ad-fullscreen",
    name: "Anuncio in-app com fundo",
    description: "Anuncio in-app com imagem de fundo e efeito vidro fosco (glass blur).",
    renderer: {
      kind: "react-static",
      engine: "react",
      entry: "runtime/react/app-ad-fullscreen",
      view: "presell/app-ad-fullscreen",
      fileName: "appAdFullscreen.js"
    },
    fields: [
      {
        name: "label_text",
        label: "Rotulo",
        type: "text",
        defaultValue: "Anuncio",
        previewSelector: ".app-ad-label"
      },
      {
        name: "microcopy",
        label: "Microcopy",
        type: "text",
        defaultValue: "Toque para continuar no site oficial.",
        previewSelector: ".app-ad-microcopy"
      },
      {
        name: "disclaimer",
        label: "Aviso",
        type: "textarea",
        defaultValue: "Voce sera redirecionado para uma pagina externa.",
        previewSelector: ".app-ad-disclaimer"
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
        ],
        previewSelector: ".app-ad-fullscreen-shell"
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
        ],
        previewSelector: ".app-ad-cta"
      }
    ]
  }
};

const templateRegistry = Object.fromEntries(
  Object.entries(rawTemplateRegistry).map(([id, definition]) => [
    id,
    normalizeTemplateManifest(definition)
  ])
);

function validateTemplateFile(templateId) {
  const template = templateRegistry[templateId];
  if (!template) return false;

  if (template.renderer.engine === "react") {
    const reactRendererPath = path.join(__dirname, "../runtime/react", template.renderer.fileName);
    return fs.existsSync(reactRendererPath);
  }

  const templatePath = path.join(__dirname, "../views/presell", template.renderer.fileName);
  return fs.existsSync(templatePath);
}

function addAvailability(manifest) {
  return {
    ...manifest,
    availability: {
      templateFile: validateTemplateFile(manifest.id)
    }
  };
}

function getTemplateManifest(templateId) {
  return addAvailability(templateRegistry[templateId] || templateRegistry.advertorial);
}

function listTemplateManifests(options = {}) {
  const { availableOnly = false } = options;

  return Object.values(templateRegistry)
    .map(addAvailability)
    .filter((manifest) => (availableOnly ? manifest.availability.templateFile : true));
}

function listTemplateIds(options = {}) {
  return listTemplateManifests(options).map((manifest) => manifest.id);
}

module.exports = {
  rawTemplateRegistry,
  templateRegistry,
  getTemplateManifest,
  listTemplateManifests,
  listTemplateIds,
  validateTemplateFile
};
