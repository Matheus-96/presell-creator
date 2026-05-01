# 🚀 CSRF - Configurações Para Ir Para Produção (192.168.15.2:3000)

## 🎯 Seu Cenário
- **Desenvolvimento:** localhost:3001 ✅ CSRF funciona
- **Staging:** 192.168.15.2:3000 ❌ CSRF falha (será corrigido)
- **Produção:** example.com com HTTPS (próximo passo)

---

## ⚡ AÇÃO IMEDIATA: 10 Minutos

### Passo 1: Atualizar Código
```bash
cd /home/pi/presell-creator
git pull origin master
```

**O que muda:**
- ✅ Novo código detecta HTTP vs HTTPS automaticamente
- ✅ SameSite cookie adapta-se ao ambiente
- ✅ Suporte a reverse proxy (nginx/apache)
- ✅ Diagnósticos melhores

### Passo 2: Configurar .env (CRÍTICO!)
```bash
# Verificar se SESSION_SECRET existe
grep SESSION_SECRET .env

# Se NÃO retornar nada, adicionar:
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# Também adicionar NODE_ENV para HTTP
echo "NODE_ENV=development" >> .env

# Verificar resultado
cat .env | grep -E "SESSION_SECRET|NODE_ENV|PORT"
```

**Esperado:**
```
SESSION_SECRET=<seu-valor-aleatório-de-64-caracteres>
NODE_ENV=development
PORT=3000
```

### Passo 3: Restartar Servidor
```bash
# Parar
ps aux | grep "node src/server.js"  # Pega o PID
kill <PID>

# Aguardar
sleep 2

# Iniciar
cd /home/pi/presell-creator && npm start
```

**Esperado no console:**
```
Presell server running at http://localhost:3000
```

### Passo 4: Testar CSRF
```bash
node scripts/check-session.js
```

**Esperado:**
```
✅ Session configuration looks good!
```

### Passo 5: Testar Login
1. Abra navegador: http://192.168.15.2:3000/admin/login
2. Username: `admin`
3. Password: `admin123` (ou sua senha)
4. Esperado: Redireciona para `/admin` (NÃO erro CSRF)

**Pronto!** CSRF deve estar funcionando.

---

## 🔒 Configurações Para PRODUÇÃO (Depois)

Se você vai usar HTTPS com Let's Encrypt:

### .env para Produção
```bash
SESSION_SECRET=<valor-diferente-da-dev>
NODE_ENV=production
TRUST_PROXY=true
FORCE_HTTPS=true
PORT=3000
```

### Nginx com HTTPS
```nginx
server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        
        # Headers críticos para CSRF:
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$host$request_uri;
}
```

---

## 📋 PORQUE CSRF FALHA E COMO ESTÁ CORRIGIDO

### Problema 1: SESSION_SECRET Não Configurado
```
❌ ANTES:
GET /admin/login  → server.js gerado token com SECRET_v1
restart server    → NODE recarrega, SECRET_v1 apagado
POST /admin/login → server.js valida com novo SECRET_v2
Resultado: Token mismatch → 403

✅ DEPOIS:
SESSION_SECRET persistido em .env
Ambas requisições usam mesmo SECRET
Token sempre válida
```

### Problema 2: SameSite Cookie Bloqueia POST
```
❌ ANTES:
GET  /admin/login  → Browser recebe cookie (OK)
POST /admin/login  → Browser bloqueia cookie (SameSite=lax em HTTP)
                      Server não recebe session → erro

✅ DEPOIS:
Se NODE_ENV=development → sameSite: "strict"
Funciona em HTTP sem problema
Se NODE_ENV=production  → sameSite: "lax"
Funciona em HTTPS com melhor UX
```

### Problema 3: Reverse Proxy Sem Headers
```
❌ ANTES:
nginx →(HTTPS)→ Express vê HTTP (req.protocol="http")
Express rejeita secure=true em HTTP
Cookie não enviada

✅ DEPOIS:
app.set('trust proxy', 1) ativado
Express lê X-Forwarded-Proto header
Entende que client está em HTTPS mesmo se local é HTTP
```

---

## 🧪 Verificação: Está Funcionando?

### Teste 1: Verificar Session Secret
```bash
node scripts/check-session.js
# Deve retornar: ✅ Session configuration looks good!
```

### Teste 2: Verificar Variáveis
```bash
cat .env | grep -E "SESSION_SECRET|NODE_ENV|TRUST_PROXY|FORCE_HTTPS|PORT"
# Deve mostrar todos configurados
```

### Teste 3: Verificar Processo
```bash
ps aux | grep "node src/server.js"
# Deve mostrar processo rodando
```

### Teste 4: Testar Com Curl
```bash
# Obter token CSRF
curl -s http://192.168.15.2:3000/admin/login | grep 'name="_csrf"'
# Deve retornar: name="_csrf" value="..."

# Tentar login
curl -s -X POST http://192.168.15.2:3000/admin/login \
  -d "username=admin&password=admin123&_csrf=<token-acima>" \
  -c /tmp/cookies.txt
# Se retornar redirect (302), funcionou!
```

### Teste 5: DevTools Navegador
1. F12 → Application → Cookies
2. Procure `presell.sid`
3. Verifique:
   - ✅ Existe em GET /admin/login
   - ✅ Presente em POST /admin/login
   - ✅ Mesmo valor em ambas

---

## 🚨 Se Ainda Não Funcionar

### Erro: "Token CSRF ausente"
```
Causa: Cookie não está sendo enviada em POST
Verificação:
  1. Abra DevTools → Network tab
  2. POST /admin/login → Request headers
  3. Procure "presell.sid" em Cookies
  4. Se não estiver → SameSite está bloqueando

Solução:
  1. Verificar NODE_ENV
  2. Check-session.js deve retornar ✅
  3. Fazer hard refresh (Ctrl+Shift+R)
```

### Erro: "Token CSRF inválido"
```
Causa: Token foi gerado em uma session, mas validado em outra
Verificação:
  1. Logs mostram "sessionTokenExists: true"?
  2. O token apresentado é diferente do esperado?

Solução:
  1. SESSION_SECRET pode ter mudado
  2. Server pode ter reiniciado entre GET e POST
  3. Browser pode estar usando cookie velho
  → Limpar cookies e tentar de novo
```

### Erro: Nenhuma mensagem, apenas falha silenciosa
```
Causa: SESSION_SECRET pode estar vazio
Verificação:
  node scripts/check-session.js
  Deve retornar: ✅ Session configuration looks good!

Se retornar erro:
  grep SESSION_SECRET .env
  Se vazio → Adicionar!
  Restart server
```

---

## 📊 Resumo: O Que Mudou

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **SESSION_SECRET** | Opcional | Obrigatório em produção |
| **NODE_ENV** | Ignorado | Adaptativo (dev/prod) |
| **SameSite** | Sempre "lax" | Inteligente (strict/lax) |
| **Reverse Proxy** | Não suportado | Suportado |
| **HTTPS** | Problemático | Automático |
| **Diagnósticos** | Genéricos | Detalhados |
| **Documentação** | Mínima | Completa |

---

## ✅ Pre-Launch Checklist

- [ ] Código atualizado (git pull)
- [ ] SESSION_SECRET configurado
- [ ] NODE_ENV=development (ou production se HTTPS)
- [ ] Server reiniciado
- [ ] check-session.js retorna ✅
- [ ] Login funciona sem erro CSRF
- [ ] DevTools mostra presell.sid sendo enviada
- [ ] Criação de presells funciona
- [ ] Preview ao vivo funciona
- [ ] Edição de presells funciona

---

## 📚 Documentação Completa

Se precisar entender melhor:

| Documento | Para Quem | Objetivo |
|-----------|-----------|----------|
| **CSRF_COMPLETE_ANALYSIS.md** | Técnico/arquiteto | Entender todos os 6 fatores |
| **CSRF_PRIVATE_IP_FIX.md** | DevOps/admin | Configurar 192.168.15.2 |
| **CSRF_ENVIRONMENT_ISSUES.md** | Debug | Problemas específicos |
| **.env.example** | Setup | Copiar configurações |
| **CSRF_PRODUCTION_GUIDE.md** | Produção | Deploy final |

---

## 🎯 Timeline Recomendado

**Hoje (Staging):**
- [ ] Git pull
- [ ] Configurar .env
- [ ] Testar login
- [ ] Testar forms

**Próxima semana (HTTPS):**
- [ ] Adicionar Let's Encrypt SSL
- [ ] Configurar Nginx
- [ ] NODE_ENV=production
- [ ] TRUST_PROXY=true

**Próximo mês (Produção):**
- [ ] Domínio final
- [ ] Backup e monitoramento
- [ ] Logs de CSRF errors
- [ ] Plan de rollback

---

## 💾 Backup Importante

Antes de fazer alterações, backup:
```bash
cp /home/pi/presell-creator/.env /home/pi/presell-creator/.env.backup
cp /home/pi/presell-creator/presell.db /home/pi/presell-creator/presell.db.backup
```

Se algo der errado:
```bash
cp /home/pi/presell-creator/.env.backup /home/pi/presell-creator/.env
git checkout src/server.js  # Revert changes
npm start
```

---

## 📞 Suporte Rápido

Se precisar de ajuda, compartilhe:

```bash
# Colha diagnostics
echo "=== NODE CSRF DEBUG ===" > /tmp/debug.txt
node scripts/check-session.js >> /tmp/debug.txt
echo "=== ENV ===" >> /tmp/debug.txt
cat .env | grep -E "SESSION|NODE_ENV|PORT|TRUST" >> /tmp/debug.txt
echo "=== PROCESS ===" >> /tmp/debug.txt
ps aux | grep node >> /tmp/debug.txt
echo "=== LOGS (quando fizer login) ===" >> /tmp/debug.txt
npm start 2>&1 | head -50 >> /tmp/debug.txt
cat /tmp/debug.txt
```

Compartilhe output de `/tmp/debug.txt` para diagnóstico.

---

## 🎉 Conclusão

O código está **pronto para produção**. Tudo que você precisa fazer é:

1. **Git pull** para pegar novo código
2. **Configurar SESSION_SECRET** em .env
3. **Restartar** o servidor
4. **Testar** login e forms

CSRF vai funcionar em todos os ambientes (HTTP, HTTPS, local, rede privada, produção).

Qualquer dúvida? Veja os guias na raiz do repositório.

🚀 **Bom deploy!**
