# PRD: SSR — Renderização server-side de presells via HTML estático

> Issue: https://github.com/Matheus-96/presell-creator/issues/160

## Problem Statement

Presells publicados no sistema são renderizados inteiramente no cliente (CSR) via React SPA. Quando o Google analisa a página `/p/:slug` para aprovação de anúncio, o crawler encontra apenas um `index.html` vazio — sem conteúdo real. Isso impede a aprovação de anúncios que apontam para presells criados na plataforma.

## Solution

Gerar um HTML estático completo para cada presell no momento em que ele é salvo. O Express passa a servir esse HTML diretamente ao acessar `/p/:slug`, garantindo que qualquer crawler (incluindo o Google Ads) encontre o conteúdo real da página já no HTML inicial.

O conteúdo visual (headline, imagem, CTA, corpo) fica no HTML estático. Partes dinâmicas que dependem do visitante (tracking parameters, analytics events, Google Pixel) permanecem como JavaScript inline mínimo, invisível ao crawler.

## User Stories

1. Como anunciante, quero que meu presell publicado seja aprovado pelo Google Ads, para que eu possa veicular campanhas apontando para ele.
2. Como anunciante, quero que o conteúdo do meu presell seja indexável por crawlers, para melhorar a qualidade percebida da landing page pelo Google.
3. Como anunciante, quero que o tracking de afiliado continue funcionando normalmente após a mudança para SSR, para não perder comissões.
4. Como anunciante, quero que o Google Pixel continue disparando na visita ao presell, para que minhas campanhas continuem otimizando corretamente.
5. Como anunciante, quero que ao editar e salvar um presell o HTML público seja atualizado automaticamente, sem precisar republicar manualmente.
6. Como anunciante, quero que os presells já publicados antes da mudança também passem a ser servidos com SSR, sem precisar reeditá-los.
7. Como anunciante, quero que o título da aba do browser e as meta tags OG reflitam o conteúdo do presell, para melhor compartilhamento social e qualidade de anúncio.
8. Como anunciante, quero que o tempo de carregamento do presell seja rápido, para não prejudicar a aprovação nem a conversão.
9. Como desenvolvedor, quero que ao adicionar um novo template React ele seja automaticamente suportado na geração de HTML estático, sem esforço extra de integração.
10. Como desenvolvedor, quero que o bundle de templates seja gerado durante o build/deploy e não em runtime, para que a geração de HTML seja rápida e previsível.
11. Como desenvolvedor, quero que a geração de HTML falhe silenciosamente (com log de erro) sem quebrar o save do presell, para que o usuário não perca dados por falha de renderização.
12. Como desenvolvedor, quero um script de migração que gere o HTML para todos os presells `published` existentes no momento do deploy, para que a transição seja automática e sem intervenção manual.

## Implementation Decisions

### Schema — nova coluna na tabela `presells`

Adicionar coluna `rendered_html TEXT DEFAULT NULL` à tabela `presells` via migration. Valor `NULL` indica que o HTML ainda não foi gerado (presells legados antes do deploy).

### Bundle de templates — compilação em build time

Os templates React (`.tsx`) do frontend são compilados via **esbuild** para um bundle CommonJS/ESM independente (`templates.bundle.js`) durante o processo de build/deploy. O bundle é importado pelo backend em runtime para chamar `renderToStaticMarkup`. Isso separa a compilação TypeScript/JSX (build time) da execução (runtime), sem overhead de transpilação em produção.

O bundle expõe uma função `renderTemplate(templateId, presellData)` que retorna a string HTML do componente renderizado.

### Geração de HTML — serviço isolado no backend

Criar um serviço `presellRenderer` no backend responsável por:

1. Importar o `templates.bundle.js`
2. Chamar `renderToStaticMarkup(<Template presell={data} />)`
3. Montar o documento HTML completo com `<head>` e `<body>`
4. Retornar a string HTML final

O serviço tem interface simples: `renderPresellHtml(presell): string`.

### Documento HTML gerado — estrutura

O HTML gerado inclui:

**`<head>`:**
- `<meta charset="UTF-8">` e `<meta name="viewport">`
- `<title>` derivado do campo `title` do presell
- `<meta name="description">` derivado do `subtitle`
- Open Graph: `og:title`, `og:description`, `og:image` (usando `imageUrl`), `og:type`
- `<link rel="canonical" href="/p/{slug}">`
- `<link rel="stylesheet" href="/assets/presell.css">` (rota estável, sem hash)

**`<body>`:**
- HTML gerado pelo `renderToStaticMarkup` do template React
- Script inline mínimo para: captura de tracking params da URL, disparo do Google Pixel (se configurado), registro de eventos de analytics (`page_view`, clique no CTA), redirecionamento do CTA com params de tracking

### CSS — rota estável sem hash

O Vite gera o CSS com hash no nome do arquivo (ex: `index-abc123.css`). Para o HTML estático referenciar um CSS sem quebrar a cada build, servir o CSS compilado do frontend em uma rota fixa `/assets/presell.css` no Express. O backend mantém essa rota apontando para o arquivo CSS mais recente do build do frontend.

### Trigger de geração — em todo save

O serviço `presellRenderer` é chamado dentro de `presellService` ao final de todo `updatePresell()`. Se a renderização falhar, loga o erro e continua sem lançar exceção (o save do presell não é afetado).

### Rota `/p/:slug` — nova lógica de serving

A rota `/p/:slug` deixa de encaminhar para o handler da SPA. Passa a:
1. Buscar o presell pelo slug (somente `published`)
2. Se `rendered_html` existir: responder com `Content-Type: text/html` e o HTML armazenado
3. Se `rendered_html` for `NULL` (fallback para presells legados não migrados): servir o `index.html` da SPA como hoje

### Script de migração

Script executado no deploy após as migrações de schema. Busca todos os presells com `status = 'published'` e `rendered_html IS NULL`, gera o HTML para cada um e salva no banco. Execução idempotente: só processa presells sem HTML gerado.

### Componentes React — compatibilidade com SSR

Os templates React devem evitar APIs de browser (`window`, `document`, `localStorage`) no render direto. Referências a essas APIs existentes nos componentes devem ser movidas para `useEffect` (que não executa no `renderToStaticMarkup`).

## Testing Decisions

**O que faz um bom teste aqui:** testar o comportamento externo observável — o HTML produzido contém os campos corretos, a rota serve HTML real, o script inline tem o conteúdo esperado. Não testar detalhes de implementação como qual função interna foi chamada.

**Módulos a testar:**

- **`presellRenderer` (serviço):** dado um objeto presell com dados conhecidos, o HTML retornado deve conter o headline, o slug no canonical, a meta description correta, e a tag do Google Pixel quando configurado. Testar também o comportamento quando o templateId não existe.

- **Rota `GET /p/:slug`:** com presell `published` e `rendered_html` populado, deve responder 200 com `Content-Type: text/html` e o HTML armazenado. Com presell `draft`, deve responder 404. Com slug inexistente, deve responder 404.

- **Script de migração:** dado um banco com presells `published` sem `rendered_html`, após executar o script todos devem ter `rendered_html` não-nulo.

**Prior art:** ver testes de integração existentes em `backend/` para padrão de setup/teardown de banco SQLite em memória.

## Out of Scope

- Invalidação de cache CDN ao atualizar presell (não há CDN configurado)
- SSR para o painel admin (permanece SPA)
- Geração de HTML para presells com status `draft`
- Sitemap ou indexação automática dos presells no Google Search
- Suporte a múltiplos idiomas no HTML gerado
- Preview de SSR no editor de presell

## Further Notes

- O Google Ads exige que o conteúdo da landing page seja "visível sem JavaScript". O HTML estático satisfaz esse requisito mesmo com o script inline de tracking, pois o conteúdo principal (headline, imagem, corpo) está no HTML.
- O `renderToStaticMarkup` não inclui os atributos `data-reactroot` nem os marcadores de hidratação do React — ideal para HTML puramente estático sem planos de hidratação no cliente.
- Se no futuro for necessário suporte a hidratação client-side (para interatividade mais rica), `renderToStaticMarkup` pode ser substituído por `renderToString` com bundle de hidratação, sem mudanças na arquitetura geral.
