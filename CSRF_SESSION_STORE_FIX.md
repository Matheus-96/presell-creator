# CSRF Session Store Fix - APLICAR JÁ

## ✅ O Que Foi Corrigido

**Raiz do problema:** Sessions não estavam sendo persistidas entre requisições
- GET /login criava session
- POST /login criava NOVA session (diferente)
- Token CSRF mudava, validação falhava

**Solução:** Adicionado `SimpleMemoryStore` explícito ao express-session

---

## 🚀 Aplicar No Seu Servidor (192.168.15.2)

### Passo 1: Atualizar código
```bash
cd /home/pi/presell-creator
git pull origin master
```

Verifique que o código foi atualizado:
```bash
grep -A5 "class SimpleMemoryStore" src/server.js
# Deve mostrar a classe SimpleMemoryStore
```

### Passo 2: Reiniciar servidor
```bash
# Matar processo antigo
pkill -f "node src/server.js"
ps aux | grep node  # Verificar que não há mais processos

# Reiniciar
npm start
# OU se usar PM2:
pm2 restart presell-creator
```

### Passo 3: Testar
1. Abrir navegador: `http://192.168.15.2:3000/admin/login`
2. Fazer login com `admin` / `admin123`
3. **Esperado:** Login funciona (302 redirect para dashboard)
4. **Não esperado:** 403 CSRF error

---

## 🔍 Checklist de Verificação

- [ ] `git pull` executado
- [ ] `grep SimpleMemoryStore src/server.js` mostra classe
- [ ] Processo Node antigo foi morto
- [ ] `npm start` rodando
- [ ] Consegue acessar dashboard sem CSRF error
- [ ] Pode criar/editar presells
- [ ] Preview funciona

---

## 📊 Como Saber Se Funcionou

### ✅ Sucesso
```
GET /admin/login → Recebe cookie + CSRF token
POST /admin/login → Usa MESMO token, login sucede
Sessão persiste entre páginas
```

### ❌ Ainda Falhando
Se ainda receber "Token CSRF inválido":
```bash
# Verificar logs
tail -f /home/pi/presell-creator/server.log

# Deve mostrar:
# Session created: sessionID = "abc123"
# Session persisted in store
# Posterior request carrega MESMO sessionID
```

---

## Se Ainda Não Funcionar

Execute este script de diagnóstico:

```bash
cat > /tmp/test-session.js << 'EOF'
const http = require('http');

async function testCSRF() {
  // Step 1: GET login (receber CSRF token)
  const getCookie = await fetch('http://192.168.15.2:3000/admin/login')
    .then(r => r.headers.get('set-cookie'));
  
  const getToken = getCookie.match(/presell.sid=([^;]+)/)?.[1];
  console.log('✅ Session Cookie:', getToken);
  
  // Step 2: POST login (usar token)
  const postReq = await fetch('http://192.168.15.2:3000/admin/login', {
    method: 'POST',
    headers: { 'Cookie': `presell.sid=${getToken}` },
    body: new URLSearchParams({
      username: 'admin',
      password: 'admin123',
      _csrf: 'test-token'
    })
  });
  
  console.log('POST Status:', postReq.status);
  if (postReq.status === 403) {
    console.log('❌ CSRF still failing');
  } else {
    console.log('✅ CSRF working!');
  }
}

testCSRF();
EOF

node /tmp/test-session.js
```

---

## 📞 Se Precisar de Ajuda

Envie o output de:
```bash
grep "saveUninitialized" src/server.js
# Deve mostrar: saveUninitialized: true

grep -A3 "store:" src/server.js  
# Deve mostrar: store: new SimpleMemoryStore()

npm start 2>&1 | head -20
# Primeiras linhas de execução
```

---

## 🎯 Próximos Passos

Depois que CSRF estiver funcionando:
1. Testar todas as rotas do admin
2. Testar preview functionality
3. Considerar fazer backup de sessions (Redis)
4. Documentar deployment para produção

