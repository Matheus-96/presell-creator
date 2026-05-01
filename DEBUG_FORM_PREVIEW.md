# Debug: Form Preview 404 Error

**Problema Reportado:** form-preview.js está retornando 404 no console do browser

---

## 🔍 Diagnóstico

### Possíveis Causas:

1. **Servidor rodando com código antigo**
   - Servidor antigo não tem as rotas `/admin/api/presells/preview`
   - JavaScript antigo tenta chamar rota que não existe

2. **Navegador com cache**
   - Browser está usando JavaScript antigo em cache
   - HTML antigo em cache

3. **Presellid extraído errado**
   - Para `/presells/new`: presellId = null
   - JavaScript antigo saia cedo com `if (!presellId) return;`

---

## ✅ Verificações e Soluções

### Solução 1: Reiniciar Servidor
```bash
# 1. Parar servidor atual
# Ctrl + C no terminal onde npm start está rodando

# 2. Limpar cache (opcional)
rm -rf src/views/**/*.ejs.tmp

# 3. Reiniciar
npm start
```

### Solução 2: Limpar Cache do Browser
```
1. Abrir DevTools (F12)
2. Ir até Application → Storage
3. Clear Site Data
4. Ou Ctrl+Shift+Delete para limpar todo cache
5. F5 para recarregar página
```

### Solução 3: Verificar Console do Browser
```javascript
// Abrir F12 → Console
// Digitar:
window.formPreview

// Deve retornar:
// {updatePreview: ƒ, getFormData: ƒ, getPresellId: ƒ}

// Se undefined, form-preview.js não foi carregado
// Se erro, há syntax error no arquivo
```

### Solução 4: Testar Manualmente
```javascript
// No console do browser em /admin/presells/new:

// 1. Verificar que form-preview está carregado
window.formPreview
// Deve retornar objeto

// 2. Verificar presellId
window.formPreview.getPresellId()
// Para /presells/new: null
// Para /presells/1/edit: "1"

// 3. Verificar formData
window.formPreview.getFormData()
// Deve retornar objeto com form fields

// 4. Testar preview manual
await window.formPreview.updatePreview()
// Deve chamar API e atualizar preview
```

---

## 📝 Mudanças Realizadas

### Mudança 1: form-preview.js
**Antes:** 
- `if (!presellId) return;` - Saia cedo para novo presell
- Não incluía CSRF token
- Só funcionava para presells existentes

**Depois:**
- Remove `if (!presellId) return;`
- Detecta presellId (null para novo)
- Escolhe endpoint correto:
  - `/admin/api/presells/:id/preview` (presell existente)
  - `/admin/api/presells/preview` (presell novo)
- Extrai e inclui CSRF token no header

### Mudança 2: middleware/csrf.js
**Antes:**
- Aceita token apenas em `req.body._csrf`

**Depois:**
- Aceita em múltiplas locais:
  - `req.body._csrf` (form POST)
  - `req.headers['x-csrf-token']` (AJAX header)
  - `req.headers['x-csrftoken']` (alt)
  - `req.body.csrfToken` (JSON)

### Mudança 3: routes/admin.js
**Antes:**
- Rota `/admin/api/presells/:id/preview` para existentes

**Depois:**
- NOVA: `/admin/api/presells/preview` para novos
- ATUALIZADA: `/admin/api/presells/:id/preview` com CSRF validation
- Ambas com validação CSRF explícita

---

## 🧪 Testes de Diagnóstico

### Teste 1: Verificar Rotas Existem
```bash
curl -X POST http://localhost:3001/admin/api/presells/preview \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: test" \
  -d '{"title":"Test"}'

# Deve retornar:
# 403 "Token CSRF invalido" (CSRF wrong, mas route exists!)
# Não 404 (route NOT found)
```

### Teste 2: Com CSRF Válido
```bash
# Primeiro fazer login para obter CSRF válido
# Depois:
curl -b cookies.txt -X POST http://localhost:3001/admin/api/presells/preview \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $VALID_CSRF" \
  -d '{"title":"Test","template":"simple"}'

# Deve retornar 200 + HTML
```

### Teste 3: Console do Browser
```javascript
// Em /admin/presells/new, F12 Console
fetch('/admin/api/presells/preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.querySelector('input[name="_csrf"]').value
  },
  body: JSON.stringify({title: 'Test', template: 'simple'})
})
.then(r => r.text())
.then(console.log)

# Deve retornar HTML (200)
# Se 404, servidor não tem rota nova
# Se 403, CSRF inválido
```

---

## ✨ Resumo do Fix

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Preview novo presell** | ❌ Não funciona | ✅ Funciona |
| **Preview existente** | ✅ Funciona | ✅ Funciona (melhor) |
| **CSRF em AJAX** | ❌ Falha | ✅ No header |
| **Middleware CSRF** | Rigoroso (body only) | Flexível (múltiplas) |
| **Segurança** | ✅ Mantida | ✅ Melhorada |

---

## 📋 Próximas Ações

1. **Reiniciar servidor:** `npm start`
2. **Limpar cache browser:** Ctrl+Shift+Delete
3. **Testar form novo:** Acessar `/admin/presells/new`
4. **Verificar preview:** Preview deve carregar e atualizar ao digitar
5. **Verificar console:** F12 → Console → Não deve ter 404s

---

**Última atualização:** May 1, 2026  
**Status:** ✅ Código corrigido, aguardando reinicialização do servidor
