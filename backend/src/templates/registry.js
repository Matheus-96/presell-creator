const { normalizeTemplateManifest } = require("../contracts/templateManifest");

const FONT_PAIR_FIELD = {
  name: "font_pair",
  label: "Tipografia",
  type: "select",
  defaultValue: "system",
  helpText: "Escolha a personalidade tipográfica da página.",
  options: [
    { value: "system", label: "Padrão do sistema" },
    { value: "modern", label: "Moderno" },
    { value: "serious", label: "Sério" },
    { value: "friendly", label: "Amigável" },
    { value: "bold", label: "Impactante" }
  ]
};

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
          },
          FONT_PAIR_FIELD
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
          },
          FONT_PAIR_FIELD
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
          },
          FONT_PAIR_FIELD
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
          },
          FONT_PAIR_FIELD
        ]
      },
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
            name: "show_bonus",
            label: "Exibir seção de bônus",
            type: "checkbox",
            defaultValue: false,
            helpText: "Mostra ou oculta a seção de bônus exclusivos."
          },
          {
            name: "bonus_title",
            label: "Título dos bônus",
            type: "text",
            defaultValue: "Bônus Exclusivos",
            helpText: "Título exibido no topo da seção de bônus."
          },
          {
            name: "bonus_items",
            label: "Itens de bônus (um por linha)",
            type: "textarea",
            defaultValue: "",
            helpText: "Cada linha vira um item na lista de bônus. Deixe vazio para não exibir."
          },
          {
            name: "show_guarantee",
            label: "Exibir seção de garantia",
            type: "checkbox",
            defaultValue: false,
            helpText: "Mostra ou oculta o bloco de garantia."
          },
          {
            name: "guarantee_title",
            label: "Título da garantia",
            type: "text",
            defaultValue: "Garantia de 30 dias",
            helpText: "Ex: Garantia de 7 dias, Satisfação garantida."
          },
          {
            name: "guarantee_text",
            label: "Texto da garantia",
            type: "textarea",
            defaultValue: "Se não ficar satisfeito, devolvemos 100% do seu dinheiro.",
            helpText: "Descrição da garantia exibida abaixo do título."
          },
          {
            name: "disclaimer",
            label: "Aviso legal",
            type: "textarea",
            defaultValue: "",
            helpText: "Texto pequeno no rodapé. Deixe vazio para ocultar.",
            previewSelector: ".urgent-offer-disclaimer"
          },
          FONT_PAIR_FIELD
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
9. Seção de bônus exclusivos (opcional)
10. Bloco de garantia (opcional)
11. Botão CTA fixo na base da tela
12. Aviso legal (disclaimer)

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

**show_bonus** — true para exibir a seção de bônus; false para ocultar (padrão). Use quando o produto oferece bônus adicionais que reforçam o valor da oferta.

**bonus_title** — Título da seção de bônus. Curto e chamativo.
Exemplo: "Bônus Exclusivos", "O Que Você Leva Hoje"

**bonus_items** — Lista de bônus, um por linha. Cada linha vira um item com ⭐ no início. Deixe vazio se show_bonus for false.
Exemplo: "E-book exclusivo de receitas\nConsultoria online gratuita\nAcesso ao grupo VIP"

**show_guarantee** — true para exibir o bloco de garantia; false para ocultar (padrão). Use para reduzir objeções e aumentar conversão, especialmente em páginas com preço mais alto.

**guarantee_title** — Título do bloco de garantia. Use o prazo da garantia.
Exemplo: "Garantia de 30 dias", "Satisfação Garantida"

**guarantee_text** — Descrição da garantia. Breve e direta ao ponto.
Exemplo: "Se não ficar satisfeito, devolvemos 100% do seu dinheiro. Sem perguntas."

**disclaimer** — Aviso legal exibido no rodapé em texto pequeno e centralizado. Omita para ocultar.
Exemplo: "Este conteúdo tem caráter promocional. Resultados podem variar de pessoa para pessoa. Consulte um profissional de saúde."

**font_pair** — Escolha o par tipográfico que melhor combina com o nicho e o tom do produto.
- "system" — padrão neutro, sem carregamento externo. Use quando não houver preferência.
- "modern" — Inter em tudo. Ideal para produtos de tecnologia, finanças, SaaS, cursos profissionais.
- "serious" — Merriweather + Lato. Ideal para saúde, medicina, jurídico, e-books técnicos, finanças conservadoras.
- "friendly" — Poppins + Nunito. Ideal para bem-estar, emagrecimento, alimentação saudável, produtos femininos, autoajuda.
- "bold" — Montserrat + Open Sans. Ideal para fitness, esportes, produtos masculinos, ofertas agressivas de preço.

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
    "show_bonus": false,
    "bonus_title": "Bônus Exclusivos",
    "bonus_items": "",
    "show_guarantee": false,
    "guarantee_title": "Garantia de 30 dias",
    "guarantee_text": "Se não ficar satisfeito, devolvemos 100% do seu dinheiro.",
    "disclaimer": "...",
    "font_pair": "friendly"
  }
}
\`\`\``
      },
      {
        id: "clean-authority",
        name: "Autoridade limpa",
        description: "Layout mobile-first centrado em autoridade e confiança, sem elementos de urgência. Ideal para saúde, suplementos, produtos naturais e cursos de bem-estar.",
        fields: [
          {
            name: "label_text",
            label: "Rótulo superior",
            type: "text",
            defaultValue: "OFERTA OFICIAL",
            helpText: "Texto exibido acima da imagem em destaque. Ex: PRODUTO OFICIAL, FÓRMULA EXCLUSIVA.",
            previewSelector: ".clean-authority-label"
          },
          {
            name: "show_rating",
            label: "Exibir avaliação em estrelas",
            type: "checkbox",
            defaultValue: true,
            helpText: "Mostra ou oculta as 5 estrelas de avaliação.",
            previewSelector: ".clean-authority-rating"
          },
          {
            name: "rating_count",
            label: "Texto complementar da avaliação",
            type: "text",
            defaultValue: "+5.000 avaliações",
            helpText: "Texto exibido ao lado das estrelas. Ex: +5.000 avaliações, Mais de 10 mil clientes.",
            previewSelector: ".clean-authority-rating-count"
          },
          {
            name: "show_bonus",
            label: "Exibir seção de bônus",
            type: "checkbox",
            defaultValue: false,
            helpText: "Mostra ou oculta a seção de bônus exclusivos."
          },
          {
            name: "bonus_title",
            label: "Título dos bônus",
            type: "text",
            defaultValue: "Bônus Exclusivos",
            helpText: "Título exibido no topo da seção de bônus."
          },
          {
            name: "bonus_items",
            label: "Itens de bônus (um por linha)",
            type: "textarea",
            defaultValue: "",
            helpText: "Cada linha vira um item na lista de bônus. Deixe vazio para não exibir."
          },
          {
            name: "show_guarantee",
            label: "Exibir seção de garantia",
            type: "checkbox",
            defaultValue: false,
            helpText: "Mostra ou oculta o bloco de garantia."
          },
          {
            name: "guarantee_title",
            label: "Título da garantia",
            type: "text",
            defaultValue: "Garantia de 30 dias",
            helpText: "Ex: Garantia de 7 dias, Satisfação garantida."
          },
          {
            name: "guarantee_text",
            label: "Texto da garantia",
            type: "textarea",
            defaultValue: "Se não ficar satisfeito, devolvemos 100% do seu dinheiro.",
            helpText: "Descrição da garantia exibida abaixo do título."
          },
          {
            name: "disclaimer",
            label: "Aviso legal",
            type: "textarea",
            defaultValue: "",
            helpText: "Texto pequeno no rodapé. Deixe vazio para ocultar.",
            previewSelector: ".clean-authority-disclaimer"
          }
        ],
        aiInstructions: `Você irá preencher um template de presell do tipo "Autoridade Limpa" (clean-authority).

## Objetivo
Presell mobile-first focado em autoridade e confiança — SEM urgência. Não use "tempo limitado", contadores regressivos, escassez de estoque ou linguagem de pressão. O tom deve transmitir credibilidade, segurança e resultado. Ideal para saúde, suplementos, produtos naturais e cursos de bem-estar.

## Estrutura visual (de cima para baixo)
1. Rótulo superior em destaque (ex: "PRODUTO OFICIAL")
2. Imagem circular do produto (ou placeholder)
3. Avaliação em estrelas (★★★★★) com contagem de avaliações
4. Título principal (headline)
5. Subtítulo descritivo
6. Seção de bônus exclusivos (opcional)
7. Bloco de garantia (opcional)
8. Botão CTA em largura total
9. Aviso legal no rodapé

## Campos do presell

**headline** — Título principal. Enfatize resultado ou transformação de forma clara e positiva. Evite linguagem de urgência ou escassez.
Exemplo: "Recupere sua energia em 30 dias", "O suplemento que mais de 50 mil brasileiros confiam"

**subtitle** — Descreve o produto e seu diferencial com linguagem serena e informativa. 2–3 linhas.
Exemplo: "Uma fórmula exclusiva, desenvolvida com ingredientes naturais selecionados para apoiar seu bem-estar de forma segura e eficaz."

**ctaText** — Texto do botão de ação. Voz imperativa, sem urgência. Pode incluir "→".
Exemplo: "CONHECER O PRODUTO OFICIAL →", "ACESSAR O SITE OFICIAL →"

**bullets** — Não é exibido neste template. Pode ser omitido ou deixado vazio.

## Configurações (settings)

**label_text** — Rótulo curto exibido acima da imagem em letras maiúsculas. Deve reforçar autoridade ou exclusividade, não urgência.
Exemplo: "PRODUTO OFICIAL", "FÓRMULA EXCLUSIVA", "SITE OFICIAL"

**show_rating** — true para exibir as 5 estrelas; false para ocultar. Recomendado: true para produtos com boa prova social.

**rating_count** — Texto de prova social exibido ao lado das estrelas. Use números críveis e condizentes com o nicho.
Exemplo: "+5.000 avaliações", "Mais de 10 mil clientes satisfeitos", "+8.500 avaliações verificadas"

**show_bonus** — true para exibir a seção de bônus; false para ocultar (padrão). Use quando o produto oferece materiais complementares ou benefícios adicionais que reforçam o valor percebido, sem criar urgência.

**bonus_title** — Título da seção de bônus. Mantenha o tom tranquilo e informativo.
Exemplo: "Bônus Exclusivos", "O Que Você Recebe"

**bonus_items** — Lista de bônus, um por linha. Cada linha vira um item com ⭐ no início. Deixe vazio se show_bonus for false.
Exemplo: "E-book com guia de uso\nSuportevia WhatsApp por 30 dias\nAcesso à comunidade exclusiva"

**show_guarantee** — true para exibir o bloco de garantia; false para ocultar (padrão). Recomendado para produtos com ticket médio ou alto — reforça confiança sem criar urgência.

**guarantee_title** — Título do bloco de garantia. Use o prazo da garantia do produto.
Exemplo: "Garantia de 30 dias", "Satisfação Garantida"

**guarantee_text** — Descrição da garantia. Tom sereno e seguro, sem pressão.
Exemplo: "Se não ficar satisfeito com os resultados, basta entrar em contato em até 30 dias para receber o reembolso integral."

**disclaimer** — Aviso legal no rodapé em texto pequeno e discreto. Adapte ao tipo de produto:
- Suplementos: mencione consulta a profissional de saúde e variação de resultados
- Cursos: mencione que resultados dependem de dedicação e esforço do aluno
- Produtos naturais: mencione que não substitui tratamento médico
Omita se não for necessário para o nicho.

## Cores e tom visual

Escolha cores que transmitam confiança e saúde:
- Azuis (confiança, profissionalismo): #2563eb, #0ea5e9, #1d4ed8
- Verdes (saúde, bem-estar, natureza): #16a34a, #15803d, #059669
- Neutros escuros (elegância, seriedade): #1e293b, #334155

Evite vermelho intenso ou laranja — associados à urgência.

## Modelo de resposta JSON

Responda exclusivamente com um JSON válido neste formato:

\`\`\`json
{
  "headline": "...",
  "subtitle": "...",
  "ctaText": "...",
  "bullets": [],
  "settings": {
    "label_text": "...",
    "show_rating": true,
    "rating_count": "...",
    "show_bonus": false,
    "bonus_title": "Bônus Exclusivos",
    "bonus_items": "",
    "show_guarantee": false,
    "guarantee_title": "Garantia de 30 dias",
    "guarantee_text": "Se não ficar satisfeito, devolvemos 100% do seu dinheiro.",
    "disclaimer": "..."
  },
  "theme": {
    "primary": "#2563eb",
    "secondary": "#1e293b",
    "background": "#ffffff",
    "surface": "#f8fafc",
    "textColor": "#0f172a"
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
