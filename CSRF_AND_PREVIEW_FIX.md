# Fix: CSRF Token Failures & Preview Loading Issues

**Data:** May 1, 2026  
**Status:** ✅ CORRIGIDO E TESTADO

---

## 🔴 Problemas Resolvidos

### Problema 1: Preview Fica em "Carregando..."
- **Sintoma:** Preview pane não mostra conteúdo, fica em loop de carregamento
- **Causa:** Para `/presells/new`, não há ID na URL → JavaScript não consegue extrair ID → API não é chamada
- **Solução:** ✅ Criada nova rota `/admin/api/presells/preview` (sem ID) para presells novos

### Problema 2: Token CSRF Falhando com Frequência
- **Sintoma:** 403 "Token CSRF invalido" ao fazer POST em formulários
- **Causa:** Middleware `verifyCsrf` buscava token apenas em `req.body._csrf` (não em headers ou JSON body)
- **Solução:** ✅ Middleware atualizado para aceitar CSRF em múltiplas locais

---

## ✅ Mudanças Realizadas

### 1. **src/middleware/csrf.js** (Atualizado)
```javascript
// ANTES: Procurava token apenas em req.body._csrf
// DEPOIS: Procura em múltiplas locais
const token = 
  (req.body && req.body._csrf) ||           // Form POST
  req.headers['x-csrf-token'] ||            // AJAX header
  req.headers['x-csrftoken'] ||             // Alternativa
  (req.body && req.body.csrfToken);         // JSON body
```

**Benefício:** AJAX requests (form-preview.js) agora funcionam com CSRF token no header

### 2. **src/public/js/form-preview.js** (Atualizado)
```javascript
// ANTES: Não incluía CSRF token, não suportava presells novo
// DEPOIS: 
// 1. Suporta tanto /presells/new quanto /presells/:id/edit
// 2. Extrai CSRF token do form e envia no header X-CSRF-Token
// 3. Usa endpoint correto baseado na URL
```

**Mudanças específicas:**
- `updatePreview()` agora chama:
  - `/admin/api/presells/:id/preview` para presells EXISTENTES
  - `/admin/api/presells/preview` para presells NOVOS
- Extrai CSRF token: `document.querySelector('input[name="_csrf"]').value`
- Envia via header: `'X-CSRF-Token': csrfToken`

### 3. **src/routes/admin.js** (Atualizado)
```javascript
// NOVA ROTA: POST /admin/api/presells/preview
// Para presells novos (sem ID na URL)
router.post("/api/presells/preview", requireAuth, (req, res) => {
  // Valida CSRF
  // Renderiza presell vazio com dados do form
});

// ROTA EXISTENTE ATUALIZADA: POST /admin/api/presells/:id/preview
// Agora inclui validação CSRF explícita
router.post("/api/presells/:id/preview", requireAuth, (req, res) => {
  // Valida CSRF
  // Renderiza presell existente com dados do form
});
```

**Validação CSRF em ambas:**
```javascript
const csrfToken = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
if (!csrfToken || csrfToken !== req.session.csrfToken) {
  return res.status(403).json({ error: "Token CSRF invalido." });
}
```

---

## 🧪 Testes Realizados

### ✅ Test 1: Form Novo (presells/new)
```
GET /admin/presells/new
✅ Página carrega
✅ Preview pane visível
✅ form-preview.js está incluído
```

### ✅ Test 2: Form Editar (presells/1/edit)
```
GET /admin/presells/1/edit
✅ Página carrega
✅ Preview pane visível
✅ Dados pré-preenchidos
```

### ✅ Test 3: API Preview - Novo Presell
```
POST /admin/api/presells/preview
Headers: X-CSRF-Token: <valid_token>
Body: {title, template, headline}
✅ Status 200
✅ Retorna HTML renderizado
```

### ✅ Test 4: API Preview - Presell Existente
```
POST /admin/api/presells/1/preview
Headers: X-CSRF-Token: <valid_token>
Body: {title, template, headline}
✅ Status 200
✅ Retorna HTML renderizado
```

### ✅ Test 5: CSRF Validation
```
POST /admin/api/presells/preview
Com CSRF válido no header
✅ Status 200 (aceito)

POST /admin/api/presells/preview
Com CSRF inválido no header
✅ Status 403 (rejeitado)

POST /admin/api/presells/preview
Sem CSRF token
✅ Status 403 (rejeitado)
```

---

## 🚀 Como Usar

### Para Desenvolvedores:
1. O código já está corrigido
2. Basta reiniciar o servidor: `npm start`
3. Preview funcionará em `/presells/new` e `/presells/1/edit`

### Para Usuários:
1. Acesse `/admin/presells/new` para criar novo presell
2. A pane de preview à direita carregará e atualizará em tempo real
3. Acesse `/admin/presells/1/edit` para editar presell existente
4. Preview também funcionará neste caso

---

## 📊 Arquitetura

```
Form (form.ejs)
    ↓
JavaScript Listener (form-preview.js)
    ↓ onChange event
Extrai CSRF token do input[name="_csrf"]
    ↓
POST /admin/api/presells/preview ou :id/preview
Headers: X-CSRF-Token
Body: {title, template, ...}
    ↓
Server valida CSRF no middleware
    ↓ (válido)
Renderiza template com dados
    ↓
Retorna HTML
    ↓
JavaScript atualiza preview-pane
```

---

## ⚠️ Notas Importantes

1. **CSRF Token é obrigatório:**
   - Todas as rotas POST em `/admin/api/*` validam CSRF
   - Token enviado via header `X-CSRF-Token`
   - Segurança contra CSRF attacks mantida

2. **Preview não salva:**
   - Endpoint `/admin/api/presells/preview` apenas renderiza
   - NÃO salva dados no banco
   - Dados são salvos apenas ao clicar "Salvar"

3. **Funciona para novo E existente:**
   - `/presells/new` → Renderiza presell vazio
   - `/presells/1/edit` → Renderiza presell com dados existentes

4. **Sem Breaking Changes:**
   - Todas as funcionalidades antigas continuam funcionando
   - Apenas adicionou suporte para novo presell e melhorou CSRF

---

## 📈 Próximos Passos

- [x] Fix CSRF token failures
- [x] Fix preview loading (novo presell)
- [x] Adicionar validação CSRF nas rotas
- [x] Testar ambos os cenários
- [ ] Deploy para produção
- [ ] Monitor CSRF errors em produção

---

**Versão:** 1.0  
**Status:** ✅ PRONTO PARA PRODUÇÃO
