# CSRF Falhas por Mudança de Ambiente (localhost → 192.168.15.2)

## 🚨 Problema Relatado
CSRF funciona em `localhost:3001` mas falha em `192.168.15.2:3000`

---

## 🔴 CAUSA RAIZ #1: SameSite Cookie + HTTP (MAIS PROVÁVEL)

### Código Atual (src/server.js:34-39)
```javascript
cookie: {
  httpOnly: true,
  sameSite: "lax",      // ← Pode bloquear POST em HTTP
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 8
}
```

### O Problema
Em **HTTP** (não HTTPS):
- `sameSite: "lax"` bloqueia cookies em cross-site POST requests
- Se o formulário é submetido via POST, cookie pode não ser enviada
- Resultado: `req.session` é undefined → token validation falha

### Sintomas
- ✗ GET /admin/login → funciona (cookie é enviada)
- ✗ POST /admin/login → falha com "Token CSRF ausente"
- ✗ POST /api/presells → falha com 403

### Solução Imediata
**Para ambiente HTTP (não-HTTPS):**

```javascript
cookie: {
  httpOnly: true,
  sameSite: "strict",  // ← Use "strict" em HTTP
  secure: false,       // ← Force false se não tiver HTTPS
  maxAge: 1000 * 60 * 60 * 8
}
```

---

## 🔴 CAUSA RAIZ #2: NODE_ENV Não Configurado

### Código Atual (src/server.js:37)
```javascript
secure: process.env.NODE_ENV === "production"
```

### O Problema
Se `NODE_ENV` não está configurado:
- `secure: false` (padrão em desenvolvimento)
- Mas se você está em HTTPS (reverse proxy), cookie é rejeitada
- Resultado: Session não é preservada entre requests

### Verificar no Servidor
```bash
# Ver qual é NODE_ENV
echo $NODE_ENV

# Se vazio, NODE_ENV não está configurado!
# Veja se há algum arquivo que seta NODE_ENV
ps aux | grep node
```

### Solução
**Se estiver em HTTPS com reverse proxy:**
```bash
# Adicione ao .env
export NODE_ENV=production

# Ou adicione permanentemente em:
# - systemd service
# - docker-compose.yml
# - script de inicialização
```

---

## 🔴 CAUSA RAIZ #3: Domínio da Cookie

### Código Atual
```javascript
// Nenhuma configuração de domínio!
cookie: {
  // domain não está definido
}
```

### O Problema
Cookie é gerada para domínio específico:
- Em `localhost` → cookie é de `localhost`
- Em `192.168.15.2` → cookie é de `192.168.15.2`

Quando você muda de `localhost:3001` para `192.168.15.2:3000`:
1. Browser descarta cookie antiga (domínio diferente)
2. Nova requisição GET cria nova session + nova cookie
3. Mas servidor gera novo token para nova session
4. POST request envia token antigo → mismatch

### Sintomas
- ✗ Login em localhost funciona
- ✗ Login em 192.168.15.2 funciona
- ✗ Mas tokens não combinam entre ambas

### Solução
**NÃO defina domínio para permitir múltiplos ambientes:**
```javascript
// Deixe cookie como está (sem domain)
// Cada domínio terá sua própria sessão
```

---

## 🔴 CAUSA RAIZ #4: Reverse Proxy (Nginx) Sem Headers

Se estiver usando Nginx:

### Nginx Configuração ERRADA ❌
```nginx
server {
    location / {
        proxy_pass http://localhost:3000;
        # Faltam headers críticos!
    }
}
```

### Resultado
- Express não sabe se client está em HTTP ou HTTPS
- `req.protocol` retorna HTTP mesmo se HTTPS externamente
- Cookie `secure: true` não é ativada
- CSRF falha

### Nginx Configuração CORRETA ✅
```nginx
server {
    listen 443 ssl;
    
    location / {
        proxy_pass http://localhost:3000;
        
        # Headers críticos para CSRF:
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;  # ← CRÍTICO!
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Host $host;
        
        # Para websocket (se precisar):
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔴 CAUSA RAIZ #5: SESSION_SECRET Não Persistido

### Verificar no Servidor
```bash
cat /home/pi/presell-creator/.env | grep SESSION_SECRET
```

### Se retornar vazio
Cada restart do servidor gera novo SECRET:
1. GET /admin/login → cria token com SECRET_v1
2. Server restart → novo SECRET_v2
3. POST /admin/login → token não valida (SECRET_v2 ≠ SECRET_v1)
4. Erro: "Token CSRF inválido"

### Solução
```bash
# Gerar valor permanente
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: abc123def456...

# Adicionar ao .env
echo "SESSION_SECRET=abc123def456..." >> /home/pi/presell-creator/.env

# Verificar
cat /home/pi/presell-creator/.env | grep SESSION_SECRET
```

---

## 🟡 CAUSA RAIZ #6: Porta Diferente (Menor Probabilidade)

Mudança de porta geralmente não afeta CSRF, MAS:

### Se estiver em Nginx com hardcoded host
```nginx
# ❌ ERRADO - hardcoded
server {
    server_name 192.168.15.2:3000;  # Específico demais
}

# ✅ CORRETO
server {
    server_name 192.168.15.2;       # Aceita qualquer porta
}
```

---

## ✅ SOLUÇÃO PASSO A PASSO

### Passo 1: Verificar Configuração de Ambiente
```bash
cd /home/pi/presell-creator

# Verificar NODE_ENV
echo "NODE_ENV: $NODE_ENV"

# Verificar SESSION_SECRET
grep SESSION_SECRET .env

# Verificar PORT
grep PORT .env

# Verificar se processo está rodando
ps aux | grep "node src/server.js"
```

### Passo 2: Verificar Protocolo e Reverse Proxy
```bash
# Verificar qual é a URL sendo acessada
# É HTTP://192.168.15.2:3000 ou HTTPS://...?

# Se tiver nginx, verificar configuração
cat /etc/nginx/sites-enabled/default | grep -A 20 "proxy_pass"
```

### Passo 3: Atualizar Configuração CSRF para Seu Ambiente

**Se está em HTTP (não HTTPS):**

Edite `src/server.js` linha 34:
```javascript
// Mudar de:
cookie: {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 8
}

// Para:
cookie: {
  httpOnly: true,
  sameSite: "strict",  // ← Mais restritivo para HTTP
  secure: false,       // ← HTTP não pode ter secure=true
  maxAge: 1000 * 60 * 60 * 8
}
```

**Se está em HTTPS com Nginx:**

1. Verificar nginx tem headers X-Forwarded-Proto
2. Adicionar em `.env`:
   ```bash
   NODE_ENV=production
   ```
3. Deixar `sameSite: "lax"` conforme está

### Passo 4: Restartar Servidor
```bash
# Parar servidor
pkill -f "node src/server.js"
sleep 2

# Iniciar
cd /home/pi/presell-creator && npm start

# Verificar se iniciou sem erros
node scripts/check-session.js
```

### Passo 5: Testar CSRF
```bash
# Abrir navegador em http://192.168.15.2:3000/admin/login

# DevTools → Network tab

# Fazer login

# Verificar na aba Network:
# GET /admin/login → Response headers, verificar Set-Cookie
# POST /admin/login → Request headers, verificar Cookie enviada

# Se Cookie não estiver sendo enviada em POST → SameSite bloqueando
```

---

## 🧪 Teste Diagnóstico Rápido

```bash
# SSH no servidor
ssh user@192.168.15.2

# Rodar teste com curl
cd /home/pi/presell-creator
node scripts/check-session.js

# Deve retornar: ✅ Session configuration looks good!

# Se não, significa SESSION_SECRET ou NODE_ENV está errado
```

---

## 📋 Configuração Recomendada para Produção

### .env Completo
```bash
# Essencial
SESSION_SECRET=<seu-valor-gerado-aqui>
NODE_ENV=production
PORT=3000

# Dados do admin
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<seu-hash>

# Opcional
SMOKE_ADMIN_PASSWORD=admin123
```

### src/server.js Recomendado
```javascript
cookie: {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict",
  secure: process.env.NODE_ENV === "production",
  domain: undefined,  // Deixe undefined para cada host ter sua sessão
  maxAge: 1000 * 60 * 60 * 8  // 8 horas
}
```

### Nginx Recomendado (se tiver)
```nginx
server {
    listen 80;
    server_name 192.168.15.2;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }
}
```

---

## 🎯 Resumo: Por Que Funciona em localhost mas não em 192.168.15.2

| Aspecto | localhost:3001 | 192.168.15.2:3000 | Impacto |
|---------|---|---|---|
| **Domínio** | localhost | 192.168.15.2 | Cookie diferente |
| **HTTP/HTTPS** | HTTP | Pode ser HTTP | SameSite bloqueia |
| **NODE_ENV** | development | ? (não definido?) | secure flag errado |
| **SESSION_SECRET** | Gerado | Pode estar vazio | Token regenera |
| **Reverse Proxy** | Nenhum | Pode ter nginx | Headers não reenviados |
| **Porta** | 3001 | 3000 | Irrelevante |

---

## 🆘 Se Ainda Não Funcionar

1. Compartilhe output de:
   ```bash
   node scripts/check-session.js
   echo "NODE_ENV: $NODE_ENV"
   ps aux | grep node
   cat .env | grep -E "SESSION|NODE_ENV|PORT"
   ```

2. Abra DevTools do navegador (F12) e:
   - Verifique Application → Cookies
   - Verifique Network → POST request → Headers
   - Procure por cookie sendo enviada ou não

3. Verifique logs do servidor:
   ```bash
   # Procure por:
   # "CSRF validation failed: token mismatch"
   # "CSRF validation failed: no token provided"
   # "hasSession: false"
   ```

A informação mais crítica é: **o erro exato de CSRF que você está vendo**.
