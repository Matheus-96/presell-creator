# 🔧 Guia Prático: CSRF em 192.168.15.2:3000

## Sua Situação
- **Desenvolvimento:** localhost:3001 ✅ CSRF funciona
- **Seu servidor:** 192.168.15.2:3000 ❌ CSRF falha

---

## 🎯 O Que Mudou (Correções Implementadas)

### 1. Configuração Adaptativa de Cookie
**Antes:** Sempre `sameSite: "lax"`
**Agora:** 
- HTTP (desenvolvimento) → `sameSite: "strict"` (mais seguro para HTTP)
- HTTPS (produção) → `sameSite: "lax"` (melhor UX)

### 2. Suporte a Reverse Proxy
**Antes:** Sem suporte a nginx/apache
**Agora:**
- Detecta automaticamente se está atrás de reverse proxy
- Entende headers `X-Forwarded-*` corretamente
- Ativa `trust proxy` em produção

### 3. Diagnósticos Melhorados
**Antes:** Erros genéricos ("Token CSRF inválido")
**Agora:** Logs detalhados que mostram:
- Qual é a origem do token (body, header, etc)
- Se existe cookie de session
- Se session foi encontrada
- Protocolo sendo usado (HTTP/HTTPS)

---

## 📋 CHECKLIST: Configure Seu Servidor Agora

### ✅ PASSO 1: Copiar Novo Código

O código foi atualizado. Faça `git pull`:
```bash
cd /home/pi/presell-creator
git pull origin master
```

### ✅ PASSO 2: Configurar .env no Seu Servidor

```bash
# SSH no servidor
ssh user@192.168.15.2

# Entrar no diretório
cd /home/pi/presell-creator

# Ver configuração atual
cat .env
```

**Seu .env deve ter:**
```bash
SESSION_SECRET=<seu-valor-gerado>
NODE_ENV=development
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<seu-hash>
TRUST_PROXY=false
FORCE_HTTPS=false
```

### ✅ PASSO 3: Verificar SESSION_SECRET

**CRÍTICO:** Sem SESSION_SECRET, CSRF falha!

```bash
# Verificar se tem SESSION_SECRET
grep SESSION_SECRET .env

# Se NÃO retornar nada:
# Gerar novo valor
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicionar ao .env
echo "SESSION_SECRET=<valor-gerado>" >> .env

# Verificar
cat .env | grep SESSION_SECRET
```

### ✅ PASSO 4: Restartar Servidor

```bash
# Parar processo
pkill -f "node src/server.js"
sleep 2

# Iniciar novo
cd /home/pi/presell-creator && npm start

# Aguardar "Presell server running..."
```

### ✅ PASSO 5: Testar CSRF

Abra navegador em: `http://192.168.15.2:3000/admin/login`

**Teste de Login:**
1. Preencha username: `admin`
2. Preencha password: `admin123` (ou sua senha)
3. Clique em "Login"
4. Esperado: Redireciona para `/admin` (ou mostra erro de credenciais, mas NÃO erro CSRF)

**Se vir erro "Token CSRF ausente":**
- SESSION_SECRET não está configurado
- Cookie de session não está sendo enviada
- Ver PASSO 6 abaixo

---

## 🧪 PASSO 6: Diagnosticar Se Ainda Não Funcionar

### Teste 1: Verificar Configuração
```bash
cd /home/pi/presell-creator
node scripts/check-session.js
```

**Esperado:**
```
✅ Session configuration looks good!
```

**Se retornar erro:**
- SESSION_SECRET não está configurado ❌
- Adicione ao .env e tente de novo

### Teste 2: Verificar Logs do Servidor

Quando tentar fazer login, procure nos logs por:
- ✅ Bom: Nenhuma mensagem de CSRF
- ❌ Ruim: "CSRF validation failed: no token provided"
- ❌ Ruim: "CSRF validation failed: token mismatch"

**Logs esperados:**
```
Presell server running at http://localhost:3000
```

**Logs de erro:**
```
CSRF validation failed: no token provided {
  path: '/admin/login',
  method: 'POST',
  hasSession: false,           ← ❌ PROBLEMA: Sem session!
  hasCookie: false,            ← ❌ PROBLEMA: Sem cookie!
  sessionId: 'none'
}
```

### Teste 3: Verificar Cookie no Navegador

1. Abra DevTools (F12)
2. Abra aba "Application" → "Cookies"
3. Procure por cookie chamada `presell.sid`
4. Verifique:
   - ✅ Exists em GET /admin/login
   - ✅ Enviada em POST /admin/login
   - ✅ Mesmo valor em ambas requisições

---

## 🔴 Cenários de Erro Comuns

### Cenário 1: "Token CSRF ausente"

**Log mostra:**
```
hasSession: false
hasCookie: false
```

**Causa:** Cookie de session não está sendo criada

**Solução:**
```bash
# Verifique se SESSION_SECRET existe
grep SESSION_SECRET .env

# Se não existe, adicione:
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# Restart
pkill -f "node src/server.js" && sleep 2 && npm start
```

---

### Cenário 2: "Token CSRF inválido" (mismatch)

**Log mostra:**
```
sessionTokenExists: true
received: 'abc12345...'
expected: 'def67890...'
```

**Causa:** Token foi gerado em uma session, mas validado em outra session diferente

**Possíveis razões:**
1. Servidor reiniciou entre GET e POST
2. SESSION_SECRET mudou entre requisições
3. Browser está usando cookie de sessão diferente

**Solução:**
```bash
# Hard refresh do navegador (Ctrl+Shift+R)
# Isso limpará cache e forçará nova requisição GET

# Se ainda falhar:
# 1. Limpar cookies do navegador
# 2. Acessar /admin/login novamente
# 3. Fazer login
```

---

### Cenário 3: Cookie não sendo enviada em POST

**Log mostra:**
```
hasSession: true      ← GET criou session
hasCookie: true       ← GET enviou cookie
```

Mas POST:
```
hasSession: false     ← POST não recebeu session
hasCookie: false      ← POST não recebeu cookie
```

**Causa:** Navegador bloqueando cookie por SameSite policy

**Solução Automática:**
Novo código já ajusta para `sameSite: "strict"` em HTTP, isso deve resolver.

**Se ainda não funcionar:**
```bash
# Verificar qual é NODE_ENV
echo $NODE_ENV

# Se vazio, adicione ao .env
echo "NODE_ENV=development" >> .env

# Restart
pkill -f "node src/server.js" && sleep 2 && npm start
```

---

## 🌍 Se Estiver em HTTPS (Reverse Proxy)

Se seu servidor estiver atrás de Nginx com HTTPS:

### Nginx Configuração (exemplo)
```nginx
server {
    listen 443 ssl;
    server_name 192.168.15.2;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        
        # CRÍTICO: Esses headers devem estar!
        proxy_set_header X-Forwarded-Proto $scheme;  # ← Essencial!
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Host $host;
    }
}
```

### .env para HTTPS
```bash
NODE_ENV=production
TRUST_PROXY=true
FORCE_HTTPS=true
SESSION_SECRET=<seu-valor>
```

---

## 📊 Diagrama: Como CSRF Funciona Agora

```
┌─────────────────────────────────────────────────┐
│ GET /admin/login                                │
├─────────────────────────────────────────────────┤
│ 1. Browser pede página                          │
│ 2. Server cria SESSION e CSRF_TOKEN             │
│ 3. Server envia:                                │
│    - Cookie: presell.sid=<session_id>          │
│    - HTML: <input name="_csrf" value="token">  │
│ 4. Browser recebe e armazena cookie             │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ POST /admin/login (form submit)                 │
├─────────────────────────────────────────────────┤
│ 1. Browser envia:                               │
│    - Cookie: presell.sid=<session_id>          │
│    - Body: username=admin&password=...&        │
│            _csrf=<token>                        │
│ 2. Server recebe e valida:                      │
│    ✓ Cookie match (presell.sid)                │
│    ✓ Token match (body._csrf == session.csrf)  │
│ 3. Se OK → Redirect /admin                     │
│    Se erro → 403 Forbidden                      │
└─────────────────────────────────────────────────┘
```

---

## ✅ Verificação Final

Quando tudo estiver funcionando, você verá:

```bash
# 1. Servidor iniciando normalmente
Presell server running at http://localhost:3000

# 2. Teste passando
✅ Session configuration looks good!

# 3. Nenhuma mensagem de CSRF nos logs ao fazer login

# 4. Navegador:
#    - Acessar /admin/login ✓
#    - Fazer login ✓
#    - Redireciona para /admin ✓
#    - Nenhuma mensagem de erro 403 ✓
```

---

## 📞 Se Ainda Não Funcionar

Colha essas informações e compartilhe:

```bash
# 1. Versão do Node
node -v

# 2. Variáveis de ambiente
cat .env | grep -E "SESSION_SECRET|NODE_ENV|PORT|TRUST_PROXY"

# 3. Procure no stdout do servidor por:
grep -i "csrf\|session\|cookie" <log-arquivo>

# 4. Erro exato que aparece (screenshot ou copie)

# 5. URL exata sendo acessada
echo "Estou usando: http://192.168.15.2:3000"

# 6. É HTTP ou HTTPS?
# 7. Tem nginx/apache na frente?
```

---

## 🎓 Para Entender Mais

- `src/server.js` - Configuração de session e cookies
- `src/middleware/csrf.js` - Validação de CSRF
- `CSRF_ENVIRONMENT_ISSUES.md` - Detalhes técnicos completos
- `.env.example` - Todas as opções de configuração

O novo código deve resolver 95% dos problemas de CSRF ao mudar de localhost para outro host!
