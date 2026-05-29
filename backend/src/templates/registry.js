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
      {
        id: "urgent-offer",
        name: "Oferta urgente",
        description: "Presell mobile-first com contador regressivo, preço com desconto e CTA fixo na base.",
        fields: [
          {
            name: "top_bar_text",
            label: "Texto da barra superior",
            type: "text",
            defaultValue: "OFERTA OFICIAL",
            helpText: "Deixe vazio para ocultar a barra.",
            previewSelector: ".urgent-offer-top-bar"
          },
          {
            name: "countdown_minutes",
            label: "Duração do timer (minutos)",
            type: "range",
            defaultValue: 0,
            min: 0,
            max: 120,
            step: 5,
            helpText: "0 = sem timer. O contador reinicia a cada visita.",
            previewSelector: ".urgent-offer-countdown"
          },
          {
            name: "original_price",
            label: "Preço original (riscado)",
            type: "text",
            defaultValue: "",
            helpText: "Ex: R$ 297. Deixe vazio para não exibir.",
            previewSelector: ".urgent-offer-original-price"
          },
          {
            name: "current_price",
            label: "Preço atual",
            type: "text",
            defaultValue: "",
            helpText: "Ex: R$ 147. Deixe vazio para não exibir.",
            previewSelector: ".urgent-offer-current-price"
          },
          {
            name: "scarcity_text",
            label: "Texto de escassez",
            type: "text",
            defaultValue: "",
            helpText: "Ex: Restam apenas 7 unidades. Deixe vazio para ocultar.",
            previewSelector: ".urgent-offer-scarcity"
          },
          {
            name: "disclaimer",
            label: "Aviso legal",
            type: "textarea",
            defaultValue: "",
            helpText: "Texto pequeno no rodapé. Deixe vazio para ocultar.",
            previewSelector: ".urgent-offer-disclaimer"
          }
        ],
        aiInstructions: `Você irá preencher um template de presell do tipo "Oferta Urgente".

## Objetivo
Presell mobile-first com urgência visual: barra de oferta oficial, contador regressivo, imagem do produto, preço com desconto, escassez de estoque e botão CTA fixo na base da tela. Ideal para produtos físicos ou digitais com oferta por tempo limitado.

## Estrutura visual (de cima para baixo)
1. Barra superior colorida com texto da oferta
2. Contador regressivo (horas / min / seg)
3. Imagem do produto
4. Título principal (headline)
5. Subtítulo (subtitle)
6. Preço original riscado → preço atual em destaque
7. Texto de escassez com ponto laranja
8. Lista de benefícios (bullets)
9. Botão CTA fixo na base da tela
10. Aviso legal (disclaimer)

## Campos do presell

**headline** — Título principal. Comunica a transformação ou benefício central em 1–2 linhas. Use números, resultados ou nomes do público-alvo quando possível.
Exemplo: "O método natural que já conquistou milhares de brasileiros"

**subtitle** — Complementa o headline com contexto ou prova social. 2–3 linhas. Linguagem simples e direta.
Exemplo: "Uma fórmula simples, de uso diário, desenvolvida para apoiar seus resultados de forma segura e sem complicação."

**ctaText** — Texto do botão de ação fixo na base da tela. Voz imperativa. Pode incluir "→" no final para indicar direcionamento.
Exemplo: "IR PARA O SITE OFICIAL →"

**bullets** — Lista de 3–5 benefícios ou diferenciais curtos. Cada item: 1 linha, começa com verbo ou substantivo forte. Deixe vazio para ocultar a seção.
Exemplo: ["Fórmula 100% natural", "Resultado visível em 30 dias", "Frete grátis para todo o Brasil"]

## Configurações (settings)

**top_bar_text** — Texto da barra superior colorida. Curto, em maiúsculas. Omita ou deixe vazio para ocultar a barra.
Exemplo: "OFERTA OFICIAL"

**countdown_minutes** — Duração em minutos do timer evergreen — reinicia a cada visita. Use 0 para ocultar o contador. Recomendado: entre 20 e 60 minutos.
Exemplo: 30

**original_price** — Preço original exibido com riscado. Formato livre. Omita para não exibir.
Exemplo: "R$ 297"

**current_price** — Preço atual em destaque com a cor do CTA. Formato livre. Omita para não exibir.
Exemplo: "R$ 147"

**scarcity_text** — Texto de escassez exibido com ponto laranja abaixo do preço. Cria urgência de estoque ou condição. Omita para ocultar.
Exemplo: "Restam apenas 7 unidades nesta condição"

**disclaimer** — Aviso legal exibido no rodapé em texto pequeno e centralizado. Omita para ocultar.
Exemplo: "Este conteúdo tem caráter promocional. Resultados podem variar de pessoa para pessoa. Consulte um profissional de saúde."

## Modelo de resposta JSON

Responda exclusivamente com um JSON válido neste formato:

\`\`\`json
{
  "headline": "...",
  "subtitle": "...",
  "ctaText": "...",
  "bullets": ["...", "...", "..."],
  "settings": {
    "top_bar_text": "...",
    "countdown_minutes": 30,
    "original_price": "...",
    "current_price": "...",
    "scarcity_text": "...",
    "disclaimer": "..."
  }
}
\`\`\``
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
