# PRD: Galeria de Imagens Melhorada com Exclusão

> GitHub Issue: [#159](https://github.com/Matheus-96/presell-creator/issues/159)

## Problem Statement

O administrador não consegue gerenciar adequadamente as imagens carregadas. O modal de seleção de imagens é pequeno (máx. 720px, 80vh) e as miniaturas são pequenas (140px mín., 100px de altura), dificultando a identificação visual das imagens. Além disso, não existe forma de excluir imagens da galeria — uma vez carregada, a imagem fica permanentemente no servidor mesmo que nunca seja usada.

## Solution

Ampliar o modal de galeria para quase tela cheia (90vw × 90vh) e aumentar as miniaturas para melhor identificação visual. Adicionar lixeira contextual (visível no hover) em cada miniatura, com fluxo de confirmação que exibe quais presells seriam afetadas antes de concluir a exclusão.

## User Stories

1. Como administrador, quero que o modal de galeria ocupe quase a tela inteira, para que eu consiga ver mais imagens ao mesmo tempo sem precisar rolar excessivamente.
2. Como administrador, quero miniaturas maiores na galeria, para que eu possa identificar visualmente as imagens com mais facilidade antes de selecioná-las.
3. Como administrador, quero ver um ícone de lixeira ao passar o mouse sobre uma miniatura, para que eu possa excluir imagens sem poluir a interface quando não estou excluindo.
4. Como administrador, quero que ao clicar na lixeira apareça um modal de confirmação antes da exclusão, para que eu não exclua imagens por acidente.
5. Como administrador, quero que o modal de confirmação liste os slugs das presells que usam a imagem, para que eu saiba o impacto da exclusão antes de confirmar.
6. Como administrador, quero poder cancelar a exclusão após ver as presells afetadas, para que eu possa reconsiderar sem causar dano.
7. Como administrador, quero que após confirmar a exclusão a imagem desapareça da galeria imediatamente, para que o estado da UI reflita a realidade do servidor.
8. Como administrador, quero que presells que referenciavam a imagem excluída continuem funcionando (mesmo com imagem quebrada), pois a decisão de excluir foi consciente e informada.
9. Como administrador, quero que o upload de novas imagens continue funcionando da mesma forma dentro do modal ampliado.
10. Como administrador, quero que a imagem selecionada no momento continue destacada no modal ampliado, para que eu saiba qual já está em uso.

## Implementation Decisions

### Módulos a modificar

**Backend — nova rota de exclusão (`DELETE /api/admin/media/:filename`)**
- Recebe o nome do arquivo como parâmetro de rota
- Consulta no banco quais presells referenciam o arquivo em `image_path` ou `background_image_path`
- Retorna `{ usedBy: string[] }` com os slugs encontrados se o cliente enviar `?check=true` (pré-verificação sem excluir)
- Com confirmação (`?force=true`), deleta o arquivo do disco via `deleteUpload()` do `uploadService`
- Requer autenticação (`requireApiAuth`) e proteção CSRF

**Backend — nova query em `presellRepository`**
- `getSlugsByImagePath(filename: string): string[]`
- `SELECT slug FROM presells WHERE image_path LIKE ? OR background_image_path LIKE ?`
- Parâmetro: `%filename%` para cobrir o prefixo `/media/`

**Frontend — `media-api.ts`**
- Nova função `checkMediaUsage(filename): Promise<{ usedBy: string[] }>`
- Nova função `deleteMediaImage(filename): Promise<void>`

**Frontend — `MediaPicker`**
- Modal expandido: `width: '90vw'`, `height: '90vh'`, sem `maxWidth`
- Miniaturas: `minmax(200px, 1fr)` no grid, altura `160px`
- Cada miniatura envolve um container `position: relative` com lixeira absoluta (`position: absolute`, canto superior direito) visível apenas no hover via estado React local por item
- Ao clicar na lixeira: chama `checkMediaUsage` → abre modal de confirmação
- Modal de confirmação: lista de slugs afetados (ou mensagem "Nenhuma presell usa esta imagem"), botões "Cancelar" e "Excluir mesmo assim"
- Ao confirmar: chama `deleteMediaImage` → remove imagem da lista local via `setImages`

### Fluxo de estado para exclusão

```
hover miniatura → mostrar lixeira
click lixeira → setDeletingImage(img) + checkMediaUsage(img.filename)
recebe { usedBy } → setConfirmModalOpen(true) com usedBy
click "Excluir mesmo assim" → deleteMediaImage(filename) → setImages(prev => prev.filter(...)) → fechar modal
click "Cancelar" → setDeletingImage(null) → fechar modal
```

### Decisões arquiteturais

- A exclusão não atualiza as presells que referenciavam a imagem — isso é intencional e comunicado ao usuário no modal de confirmação
- `gallery_images` (JSON de galeria de templates específicos) está fora de escopo desta iteração
- O endpoint de exclusão é idempotente: tentar excluir arquivo inexistente retorna 404

## Testing Decisions

- Um bom teste verifica comportamento externo observável, não detalhes de implementação (ex: testa que a rota retorna os slugs corretos, não que uma função específica foi chamada)
- **Backend:** testar a rota `DELETE /api/admin/media/:filename` — arquivo existente sem uso retorna 200, arquivo em uso com `?check=true` retorna os slugs, arquivo inexistente retorna 404
- **Backend:** testar a query `getSlugsByImagePath` — presell com `image_path` matching retorna o slug, presell sem match não retorna
- Prior art: seguir o padrão dos testes existentes em `backend/src/`

## Out of Scope

- Exclusão em lote (selecionar múltiplas imagens para excluir de uma vez)
- Nulificação automática do campo de imagem nas presells afetadas
- Verificação de uso em `gallery_images` (JSON de galeria de templates específicos)
- Renomear ou reorganizar imagens
- Paginação ou filtro/busca na galeria

## Further Notes

- O `deleteUpload()` em `uploadService` já existe e deleta do disco — apenas falta a rota e a query de verificação de uso
- A decisão de modal 90vw × 90vh foi tomada explicitamente pelo usuário após análise do modal atual (720px / 80vh)
- A lixeira no hover foi preferida sobre botão sempre visível para manter a UI limpa durante a seleção normal
