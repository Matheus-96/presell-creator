# CSRF Troubleshooting Guide - Produção

## ⚠️ Problema: Erro 403 "Token CSRF inválido" em produção

Se você está recebendo erros CSRF ao fazer deploy em produção, aqui estão as causas mais comuns e soluções.

---

## 🔍 Diagnóstico

### 1. **SESSION_SECRET não configurado** ⭐ CAUSA MAIS COMUM
**Sintoma:** Erro CSRF aparece após cada reinicialização do servidor

**Por quê:** Sem `SESSION_SECRET`, a sessão é cifrada com uma chave aleatória que muda a cada inicialização. O token gerado na página não corresponde ao verificado no servidor.

**Solução:**
```bash
# No seu servidor de produção, configure .env
SESSION_SECRET="seu-valor-secreto-longo-e-aleatorio"
```

Gere uma chave segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 2. **Múltiplas instâncias do servidor com sessões em memória**
**Sintoma:** Funciona na primeira requisição, falha após minutos/horas

**Por quê:** Se tem load balancer + múltiplas instâncias, cada uma tem sessões diferentes em memória. Usuário pode conectar em uma instância (recebe token), depois conectar em outra (token não existe).

**Solução A:** Use sessão compartilhada (Redis/Memcached)
```javascript
const redis = require('redis');
const RedisStore = require('connect-redis');
const client = redis.createClient();

app.use(session({
  store: new RedisStore({ client }),
  secret: process.env.SESSION_SECRET,
  // ...
}));
```

**Solução B:** Sticky sessions no load balancer (sessionid sempre vai para mesma instância)

**Solução C:** Para MVP, rode apenas 1 instância por enquanto

---

### 3. **HTTPS vs HTTP**
**Sintoma:** Funciona em HTTP local, falha em HTTPS em produção

**Por quê:** Cookie é setado como `secure: true` em produção (HTTPS). Se aplicação servir HTTP, cookie não é enviado.

**Verificar:**
```javascript
// Em src/server.js
cookie: {
  secure: process.env.NODE_ENV === "production",  // ✓ Correto
  sameSite: "lax"  // ✓ Correto
}
```

**Solução:**
- Certifique que `NODE_ENV=production` está definido
- Certifique que servidor está servindo HTTPS
- Se usar reverse proxy (nginx), configure:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

---

### 4. **Domínio diferente ou redirect**
**Sintoma:** Funciona em `exemplo.com`, falha em `www.exemplo.com`

**Por quê:** Cookie de sessão é vinculado ao domínio. Se mudar domínio entre requisições, perde a sessão.

**Solução:**
- Configure domínio explícito no cookie (opcional):
```javascript
cookie: {
  domain: '.exemplo.com',  // Funciona em subdomínios
  // ...
}
```

---

## ✅ Checklist para Deploy

- [ ] `SESSION_SECRET` configurado no `.env` de produção
- [ ] `NODE_ENV=production` definido
- [ ] HTTPS ativado no servidor (ou reverse proxy)
- [ ] Se múltiplas instâncias: Redis/Memcached configurado
- [ ] Firewall permite cookies (alguns bloqueiam 3rd-party cookies)
- [ ] Teste CSRF manualmente:
  ```bash
  curl -c cookies.txt -b cookies.txt \
    -X POST http://seu-servidor/admin/login \
    -d "username=admin&password=senha&_csrf=test" \
    # Deve retornar 403 se token inválido ✓
  ```

---

## 🛠️ Debug em Produção

Se ainda não funciona, habilite logs:

**Arquivo:** `src/middleware/csrf.js`
```javascript
console.log('DEBUG CSRF:', {
  token: token ? token.substring(0, 16) : 'none',
  sessionToken: sessionToken ? sessionToken.substring(0, 16) : 'none',
  hasSession: !!req.session,
  sessionId: req.sessionID,
  path: req.path
});
```

Depois rode:
```bash
NODE_ENV=production npm start 2>&1 | grep "DEBUG CSRF"
```

Procure por erros no console e envie para support.

---

## 🔐 Segurança

**NÃO faça isso:**
- ❌ Remover validação CSRF (expõe a roubo de dados)
- ❌ Usar `SESSION_SECRET` fraco (predictível)
- ❌ Servir em HTTP sem HTTPS

**Recomendado:**
- ✅ Use HTTPS sempre
- ✅ Atualize SESSION_SECRET periodicamente (ex: a cada 6 meses)
- ✅ Monitore logs de erro CSRF (pode indicar ataque)

---

## 📞 Suporte Rápido

Se nada funcionar:
1. Confira `.env` com `cat .env | grep SESSION`
2. Reinicie: `npm start`
3. Tente fazer login novamente
4. Verifique logs: `npm start 2>&1 | tail -20`

Qualquer erro? Envie a saída dos logs.
