# Session Store Fix - Session Persistence

## O Que Estava Acontecendo

Seu servidor estava gerando **novo sessionID a cada requisição** porque:

```
Requisição 1 (GET /login):
  - Express cria session em memória: sessionID = "abc123"
  - Mas SEM um store explícito, não salva em lugar permanente
  - Set-Cookie é enviado? TALVEZ (depende da configuração)

Requisição 2 (POST /login):
  - Browser envia cookie: "presell.sid=abc123"
  - Express carrega session... MAS ela não existe no store
  - Express cria SESSION NOVA: sessionID = "xyz789"
  - Token CSRF muda: "fee7dfd..." vs "d09ebbbc..."
  - CSRF validation FALHA
```

## A Solução: SimpleMemoryStore

Adicionei um **session store explícito** que usa uma `Map()` para armazenar sessions em memória:

```javascript
const sessionStore = new Map();

class SimpleMemoryStore {
  get(sid, callback) {
    // Buscar session pelo ID
  }
  
  set(sid, session, callback) {
    // Salvar session na Map
  }
  
  destroy(sid, callback) {
    // Deletar session
  }
}

app.use(session({
  ...config,
  store: new SimpleMemoryStore()  // NOVO!
}));
```

Agora:
```
Requisição 1 (GET /login):
  - Express cria session: sessionID = "abc123"
  - Store.set("abc123", {...}) → Salva na Map
  - Set-Cookie enviado ao navegador

Requisição 2 (POST /login):
  - Browser envia: "presell.sid=abc123"
  - Store.get("abc123") → ENCONTRA na Map
  - Mesma session, mesmo token CSRF
  - CSRF validation ✅ PASSA
```

## Quando Usar Cada Store

### SimpleMemoryStore (Atual)
✅ **Quando usar:**
- Single-process deployments
- Pequenos servidores pessoais (Raspberry Pi, VPS)
- Desenvolvimento local
- Não há reinicializações frequentes
- Sua situação atual!

❌ **Problemas:**
- Sessions perdidas se servidor reiniciar
- Não funciona com múltiplos processos/workers
- Não funciona com load balancer

**Sua implantação**: ✅ SimpleMemoryStore é suficiente

---

### Redis Session Store (Production)
✅ **Quando usar:**
- Múltiplos servidores/processos
- Sessions devem persisti após reinicialização
- High availability required
- Grande volume de usuários

**Setup:**
```bash
npm install redis connect-redis
```

```javascript
const redis = require('redis');
const RedisStore = require('connect-redis').default;
const redisClient = redis.createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  ...config
}));
```

---

### SQLite Session Store (Alternative)
✅ **Quando usar:**
- Precisa de persistência mas sem Redis
- Medium complexity
- Backup fácil (arquivo SQLite)

**Setup:**
```bash
npm install better-sqlite3 express-session-sqlite
```

---

## Como Testar

### 1. Verificar no Localhost
```bash
npm start
# Abrir browser: http://localhost:3000/admin/login
# Fazer login - deve funcionar SEM 403 CSRF error
```

### 2. Verificar Session Store Status
```bash
# Ver quantas sessions estão armazenadas
curl http://localhost:3000/admin/debug-sessions
```

### 3. Fazer Deploy no Seu Servidor
```bash
# No seu servidor (192.168.15.2):
cd /home/pi/presell-creator
git pull origin master
npm install
pm2 restart presell-creator  # ou 'npm start'
```

### 4. Testar CSRF Fix
```bash
# No seu servidor:
# Tentar fazer login
# Deve funcionar agora!
```

---

## Diagnosticar Se Store Está Funcionando

```javascript
// Adicionar ao seu código para debug:
app.use((req, res, next) => {
  console.log(`
  SessionID: ${req.sessionID}
  Session data: ${JSON.stringify(req.session)}
  `);
  next();
});
```

Então rodar:
```
GET /admin/login → Vê sessionID e data criada
POST /admin/login → Deve ver MESMO sessionID
```

Se sessionID mudar → store não está funcionando

---

## Para o Futuro (Produção)

Quando escalar:
1. **Múltiplos processos** → Migrar para Redis
2. **Alta disponibilidade** → Migrar para Redis + sentinel
3. **Backup de sessions** → Adicionar Redis persistence

Mas por enquanto, **SimpleMemoryStore é perfeito** para seu caso de uso!

---

## Referências

- [Express Session Stores](https://github.com/expressjs/session#compatible-session-stores)
- [Connect-Redis](https://www.npmjs.com/package/connect-redis)
- [Better SQLite3](https://www.npmjs.com/package/better-sqlite3)

