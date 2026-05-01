# Guia de Implementação: Corrigindo CSRF na Produção

## ⚠️ Situação Atual

Você está recebendo o erro:
```
CSRF validation failed: received: 'cf6ab1ec...', expected: 'b9ea9ac6...'
Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
```

**Causa:** `SESSION_SECRET` não está configurado no `.env` do servidor.

---

## 🔧 Solução Rápida (5 minutos)

### 1. Gerar a chave SESSION_SECRET

```bash
# Execute este comando DENTRO do servidor
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output exemplo:**
```
310ff2b4a7a579c323bc93fdfb2b7653202616d9c00799d3a1a7ce9e4437048c
```

### 2. Adicionar ao arquivo `.env` do servidor

```bash
# No servidor, abra/crie o arquivo .env
nano /home/pi/presell-creator/.env
```

**Adicione esta linha no final:**
```bash
SESSION_SECRET=310ff2b4a7a579c323bc93fdfb2b7653202616d9c00799d3a1a7ce9e4437048c
```

*(Use o valor gerado no passo 1, não copie o exemplo)*

### 3. Reiniciar o servidor

```bash
# Matar processo antigo
pkill -f "node src/server.js"

# Aguardar 2 segundos
sleep 2

# Reiniciar
cd /home/pi/presell-creator && npm start
```

---

## ✅ Verificar se Funcionou

```bash
# Testar se SESSION_SECRET está configurado
node scripts/check-session.js
```

**Deve retornar:**
```
✅ Session configuration looks good!
```

---

## 🧪 Teste Manual

Tente fazer login e criar/editar um presell no admin:

1. Acesse `http://seu-servidor:3001/admin/login`
2. Faça login com credenciais admin
3. Tente criar um novo presell (ou editar existente)
4. Se funcionar sem erros → ✅ CSRF está corrigido!

**Sinais de sucesso:**
- ✅ Login funciona
- ✅ Forms submetem sem erro 500
- ✅ Preview carrega
- ✅ Nenhuma mensagem "Token CSRF"

---

## 🔒 Configurações de Segurança Adicionais

Se você está em **produção**, adicione também:

### 1. HTTPS (obrigatório)

CSRF com `secure: true` na cookie **requer HTTPS**. Se estiver usando:
- **Nginx com SSL**: OK
- **Reverse proxy com HTTP**: Adicione header ao nginx:

```nginx
# No seu nginx.conf
server {
    listen 443 ssl;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
    }
}
```

### 2. NODE_ENV em Produção

```bash
# Edite o script de inicialização ou systemd
export NODE_ENV=production
npm start
```

Isso ativa automaticamente:
- ✅ Secure flag nas cookies (HTTPS only)
- ✅ SameSite protection
- ✅ Cache headers otimizados

### 3. Verificar Variáveis Necessárias

```bash
# Seu .env deve ter:
SESSION_SECRET=<valor gerado>
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<hash>
NODE_ENV=production
PORT=3001
```

---

## 🚨 Se Ainda Não Funcionar

### Debug Step 1: Verificar .env foi carregado

```bash
cd /home/pi/presell-creator
node -e "require('dotenv').config(); console.log('SESSION_SECRET:', !!process.env.SESSION_SECRET)"
```

Deve retornar: `SESSION_SECRET: true`

### Debug Step 2: Ver logs do servidor

```bash
# Reinicie o servidor e monitore logs
npm start
```

Procure por:
- `CSRF validation failed` → Log de token mismatch
- `Session configuration looks good` → SESSION_SECRET está funcionando

### Debug Step 3: Testar token no navegador

1. Abra DevTools → Network tab
2. Faça login
3. Procure por um POST request
4. Verifique se está enviando `_csrf` no body

---

## 📋 Checklist Pós-Implementação

- [ ] `SESSION_SECRET` adicionado ao `.env`
- [ ] Servidor reiniciado
- [ ] `node scripts/check-session.js` retorna sucesso
- [ ] Login funciona sem erros
- [ ] Form de presell pode ser salvo
- [ ] Preview carrega sem "Token CSRF"
- [ ] Nenhum erro "ERR_HTTP_HEADERS_SENT" nos logs

---

## 📞 Se Precisar Reverter

Se algo der errado, você pode:

```bash
# Remover SESSION_SECRET do .env
nano /home/pi/presell-creator/.env
# Delete a linha SESSION_SECRET=...

# Reiniciar
pkill -f "node src/server.js"
sleep 2
npm start
```

---

## 💾 Dados sobre o Servidor

Colete essas informações se precisar de suporte:

```bash
# Colha informações do ambiente
echo "=== Environment ==="
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"
echo "SESSION_SECRET exists: $(grep SESSION_SECRET /home/pi/presell-creator/.env | wc -l)"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo ""
echo "=== Check CSRF middleware ==="
node /home/pi/presell-creator/scripts/check-session.js
```

---

## 📚 Referências

Se quiser entender mais:
- Ver `CSRF_FIXES_SUMMARY.md` para detalhes técnicos
- Ver `CSRF_PRODUCTION_GUIDE.md` para troubleshooting avançado
- Ver `src/middleware/csrf.js` para ver exatamente como funciona

---

**Status:** ✅ Pronto para produção após adicionar SESSION_SECRET
