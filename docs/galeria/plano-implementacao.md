# Plano de Implementação: Galeria de Imagens Melhorada com Exclusão

> PRD de referência: [prd-galeria-imagens.md](./prd-galeria-imagens.md) | [Issue #159](https://github.com/Matheus-96/presell-creator/issues/159)

## Overview

Ampliar o `MediaPicker` para um modal de quase tela cheia com miniaturas maiores, e adicionar exclusão de imagens com lixeira no hover e modal de confirmação que lista as presells afetadas. O backend precisa de uma nova rota `DELETE` e uma query que encontra presells por caminho de imagem.

## Decisões Arquiteturais

- A rota de exclusão usa `?check=true` para pré-verificar uso sem deletar, evitando dois endpoints separados
- O `apiClient.delete()` já envia CSRF automaticamente para métodos `DELETE` — nenhuma lógica extra no frontend
- Não há nulificação das presells afetadas — responsabilidade consciente do administrador
- Hover state por item é local ao componente `MediaPicker` (sem lib externa de tooltip/overlay)

## Grafo de Dependências

```
presellRepository (getSlugsByImagePath)
        │
        └── apiMedia.js (DELETE /api/admin/media/:filename)
                │
                └── media-api.ts (checkMediaUsage + deleteMediaImage)
                        │
                        └── MediaPicker.tsx (modal maior + lixeira + confirm modal)
```

---

## Fase 1: Backend

### Tarefa 1: Query de presells por imagem em `presellRepository`

**Descrição:** Adicionar função `getSlugsByImagePath(filename)` que retorna os slugs de todas as presells que referenciam aquele arquivo em `image_path` ou `background_image_path`.

**Critérios de aceitação:**
- [ ] Retorna array de strings com os slugs encontrados
- [ ] Busca com `LIKE %filename%` para cobrir o prefixo `/media/`
- [ ] Retorna array vazio quando nenhuma presell usa a imagem

**Verificação:**
- [ ] Teste manual via Node REPL ou script: inserir presell com `image_path = '/media/test.jpg'`, chamar `getSlugsByImagePath('test.jpg')`, receber o slug correto

**Dependências:** Nenhuma

**Arquivos:**
- `backend/src/repositories/presellRepository.js`

**Tamanho:** XS

---

### Tarefa 2: Rota `DELETE /api/admin/media/:filename`

**Descrição:** Adicionar handler na rota de mídia que recebe o nome do arquivo, usa `getSlugsByImagePath` para verificar uso, e dependendo do query param age diferente: `?check=true` só retorna `{ usedBy }` sem deletar; sem o param, deleta via `deleteUpload()`.

**Critérios de aceitação:**
- [ ] `DELETE /api/admin/media/foo.jpg?check=true` retorna `{ usedBy: ['slug-1'] }` sem deletar o arquivo
- [ ] `DELETE /api/admin/media/foo.jpg` deleta o arquivo e retorna `{ success: true }`
- [ ] Arquivo inexistente retorna 404
- [ ] Rota requer `requireApiAuth` e `verifyApiCsrf`

**Verificação:**
- [ ] Build do backend sem erros: `npm run dev` no `backend/`
- [ ] Teste manual com curl autenticado (usar skill `backend-curl`)

**Dependências:** Tarefa 1

**Arquivos:**
- `backend/src/routes/apiMedia.js`

**Tamanho:** S

---

### Checkpoint — Fase 1

- [ ] Backend inicia sem erros
- [ ] `GET /api/admin/media` continua funcionando
- [ ] `DELETE /api/admin/media/:filename?check=true` retorna slugs corretos
- [ ] `DELETE /api/admin/media/:filename` deleta o arquivo do disco

---

## Fase 2: Frontend — API Client

### Tarefa 3: Funções de cliente em `media-api.ts`

**Descrição:** Adicionar `checkMediaUsage(filename)` e `deleteMediaImage(filename)` ao módulo de API de mídia, seguindo o padrão do `listMediaImages` existente.

**Critérios de aceitação:**
- [ ] `checkMediaUsage(filename)` faz `GET DELETE /admin/media/:filename?check=true` e retorna `{ usedBy: string[] }`
- [ ] `deleteMediaImage(filename)` faz `DELETE /admin/media/:filename` e resolve sem body relevante
- [ ] Ambas usam `apiClient.delete()` que já injeta CSRF automaticamente

**Verificação:**
- [ ] Build do frontend sem erros de tipo: `npm run build` em `frontend/`

**Dependências:** Tarefa 2

**Arquivos:**
- `frontend/src/features/presells/api/media-api.ts`

**Tamanho:** XS

---

## Fase 3: Frontend — UI

### Tarefa 4: Modal ampliado e miniaturas maiores

**Descrição:** Alterar as dimensões do modal da galeria de `maxWidth: 720 / maxHeight: 80vh` para `width: 90vw / height: 90vh` sem `maxWidth`. Aumentar o grid de `minmax(140px, 1fr)` para `minmax(200px, 1fr)` e a altura das imagens de `100px` para `160px`.

**Critérios de aceitação:**
- [ ] Modal ocupa ~90% da viewport em largura e altura
- [ ] Miniaturas têm pelo menos 200px de largura mínima e 160px de altura
- [ ] Scroll interno da grade continua funcionando
- [ ] Imagem selecionada ainda aparece com borda de destaque
- [ ] Botões de upload e fechar permanecem acessíveis no cabeçalho

**Verificação:**
- [ ] Abrir o editor de uma presell, clicar em "Selecionar imagem", confirmar dimensões visuais

**Dependências:** Nenhuma (independente das fases 1 e 2)

**Arquivos:**
- `frontend/src/features/presells/components/MediaPicker.tsx`

**Tamanho:** XS

---

### Tarefa 5: Lixeira no hover e estado de exclusão

**Descrição:** Adicionar estado `hoveredImage: string | null` no `MediaPicker`. Cada miniatura vira um container `position: relative`; ao entrar com o mouse (`onMouseEnter/Leave`) seta o estado. Quando `hoveredImage === img.filename`, renderiza um botão de lixeira posicionado absolutamente no canto superior direito da miniatura. Clicar na lixeira chama `handleDeleteClick(img)` que chama `checkMediaUsage` e armazena o resultado em estado local.

**Critérios de aceitação:**
- [ ] Lixeira só aparece quando o mouse está sobre a miniatura
- [ ] Clicar na lixeira não seleciona a imagem (propagação bloqueada com `e.stopPropagation()`)
- [ ] Enquanto `checkMediaUsage` carrega, lixeira mostra estado de loading (desabilitada)
- [ ] Após retorno de `checkMediaUsage`, abre o modal de confirmação

**Verificação:**
- [ ] Hover sobre miniatura exibe lixeira; remover mouse esconde lixeira
- [ ] Clicar na lixeira não fecha o modal nem seleciona a imagem

**Dependências:** Tarefas 3 e 4

**Arquivos:**
- `frontend/src/features/presells/components/MediaPicker.tsx`

**Tamanho:** S

---

### Tarefa 6: Modal de confirmação de exclusão

**Descrição:** Adicionar estado `confirmDelete: { image: MediaImage; usedBy: string[] } | null`. Quando preenchido, renderiza um modal sobreposto ao modal de galeria (z-index superior) com: nome do arquivo, lista de slugs afetados (ou "Nenhuma presell usa esta imagem"), botão "Cancelar" e botão "Excluir mesmo assim". Confirmar chama `deleteMediaImage` e remove a imagem do estado local; cancelar limpa `confirmDelete`.

**Critérios de aceitação:**
- [ ] Modal de confirmação aparece sobre a galeria
- [ ] Lista os slugs afetados ou mensagem de "sem uso"
- [ ] "Cancelar" fecha o modal sem excluir
- [ ] "Excluir mesmo assim" chama a API, remove a imagem da lista e fecha o modal
- [ ] Se a imagem excluída era a selecionada atualmente, o campo de imagem da presell não é alterado automaticamente (responsabilidade do admin)
- [ ] Erros de rede são capturados e exibem mensagem de erro no modal

**Verificação:**
- [ ] Excluir imagem sem uso: confirmação simples, imagem some da grade
- [ ] Excluir imagem em uso: modal lista slugs, confirmar remove imagem da grade

**Dependências:** Tarefa 5

**Arquivos:**
- `frontend/src/features/presells/components/MediaPicker.tsx`

**Tamanho:** M

---

### Checkpoint — Fase 3

- [ ] Build do frontend sem erros: `npm run build` em `frontend/`
- [ ] Fluxo completo funciona: abrir galeria → hover → lixeira → confirmação → exclusão → imagem some
- [ ] Upload de imagem continua funcionando
- [ ] Seleção de imagem continua funcionando
- [ ] Modal ocupa 90vw × 90vh

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| `deleteUpload()` usa `fs.promises.rm()` — falha silenciosa se arquivo não existir | Baixo | Checar existência antes ou tratar a exceção na rota |
| Hover state com `onMouseEnter/Leave` pode ser instável em elementos sobrepostos (lixeira sobre miniatura) | Médio | Usar `onMouseEnter/Leave` no container pai, não na imagem |
| Dois modais empilhados (galeria + confirmação) podem ter conflito de z-index | Baixo | Modal de confirmação com z-index explicitamente superior (ex: 60 vs 50) |

## Ordem de Implementação Recomendada

```
Tarefa 1 (repo query)
    → Tarefa 2 (rota DELETE)
        → Tarefa 3 (api client)
            → Tarefa 4 (modal maior)   ← pode ser feita em paralelo com T3
                → Tarefa 5 (hover + lixeira)
                    → Tarefa 6 (modal confirmação)
```

Tarefas 3 e 4 são independentes entre si — podem ser feitas em paralelo.
