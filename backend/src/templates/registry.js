const { normalizeTemplateManifest } = require("../contracts/templateManifest");

const templateRegistry = Object.freeze(
  Object.fromEntries(
    [
      {
        id: "offer-modal",
        name: "Oferta com modal",
        description: "Oferta central em modal sobre fundo com destaque promocional.",
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
      {
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
      {
        id: "app-ad",
        name: "Anuncio in-app",
        description: "Anuncio simples, claro e centralizado para fluxo dentro de app.",
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
      {
        id: "app-ad-fullscreen",
        name: "Anuncio in-app com fundo",
        description: "Anuncio in-app com imagem de fundo e efeito vidro fosco (glass blur).",
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
    ].map((definition) => [definition.id, normalizeTemplateManifest(definition)])
  )
);

const templateManifestList = Object.freeze(Object.values(templateRegistry));

function getTemplateManifest(templateId) {
  const firstId = templateManifestList[0].id;
  return templateRegistry[templateId] || templateRegistry[firstId];
}

function listTemplateManifests() {
  return templateManifestList;
}

function listTemplateIds() {
  return templateManifestList.map((manifest) => manifest.id);
}

module.exports = {
  templateRegistry,
  getTemplateManifest,
  listTemplateManifests,
  listTemplateIds
};
