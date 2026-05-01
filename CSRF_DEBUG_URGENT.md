# 🔴 URGENT: CSRF Ainda Falhando - Diagnóstico Requerido

## O Problema

O erro **segue o mesmo padrão**:
- Frontend envia: `c94bf30c...` (sempre igual)
- Backend espera: `71e85e14...`, `44db8876...`, etc (sempre diferente)
- SessionId: `CqxdAgIv`, `_2Q0IXvU`, etc (muda cada vez)

**Isto significa:** O fix NÃO foi aplicado ainda no seu servidor.

---

## 🔍 Por Que Isto Acontece

**Cenário 1:** Git pull não foi feito
```bash
git log --oneline -1
# Se mostra commit antigo, você não fez pull
```

**Cenário 2:** Git pull foi feito mas servidor não reiniciou
```bash
ps aux | grep "node src"
# Se roda, ainda tem processo antigo rodando
```

**Cenário 3:** Servidor reiniciou mas salvou .gitignore em node_modules
```bash
ls -la src/server.js
# Verificar timestamp
```

---

## ✅ CHECKLIST: Execute No Seu Servidor

Execute **EXATAMENTE** estes comandos no servidor 192.168.15.2:

### Passo 1: Verificar Git
```bash
cd /home/pi/presell-creator
git status
git log --oneline -3
```

**Esperado:** Deve mostrar commit `450907a` ou mais recente

Se não mostrar:
```bash
git fetch origin
git pull origin master
```

### Passo 2: Verificar Arquivo

```bash
grep -B 2 -A 2 "saveUninitialized" src/server.js
```

**Esperado:**
```javascript
saveUninitialized: true,
```

Se mostrar `false`, o pull não funcionou ou foi feito em outro diretório.

### Passo 3: Matar Processo Antigo

```bash
ps aux | grep "node src"
# Anote o PID (número na 2ª coluna)

kill <PID>
# Exemplo: kill 12345

sleep 2

# Verificar que morreu
ps aux | grep "node src"
```

Esperado: Nenhum processo

### Passo 4: Restartar

```bash
cd /home/pi/presell-creator
npm start
```

Esperado:
```
Presell server running at http://localhost:3000
```

### Passo 5: Testar Login

```bash
curl -s -X POST http://192.168.15.2:3000/admin/login \
  -d "username=admin&password=admin123&_csrf=test" \
  2>&1 | grep -i "csrf"
```

**Se não retornar nada:** ✅ CSRF foi validado (sem erro CSRF)
**Se retornar "inválido":** Ainda há problema

---

## 📋 Informações Para Debug

Se ainda não funcionar após seguir acima, compartilhe:

```bash
# 1. Git status
git log --oneline -3

# 2. Conteúdo do arquivo
grep "saveUninitialized" src/server.js

# 3. Qual é a porta
grep PORT .env

# 4. Qual é o NODE_ENV
echo $NODE_ENV

# 5. Processo rodando
ps aux | grep "node"

# 6. Teste direto
curl -v http://192.168.15.2:3000/admin/login 2>&1 | grep -i "set-cookie"
# Esperado: set-cookie header presente
```

---

## 🚨 Se Estiver Diferente

Se você está usando:
- `/root/presell-creator` em vez de `/home/pi/presell-creator`
- Porta `3001` em vez de `3000`
- Outro diretório

**Avise-me!** Isso muda tudo.

---

## ⚡ Quick Fix Se Souber SSH

Se você consegue SSH:

```bash
ssh user@192.168.15.2

cd /home/pi/presell-creator

# Ver git log
git log --oneline -1

# Se não for "450907a", fazer pull
git pull origin master

# Matar servidor antigo
ps aux | grep "node src/server.js" | grep -v grep | awk '{print $2}' | xargs kill -9

# Aguardar
sleep 2

# Verificar saveUninitialized
grep "saveUninitialized" src/server.js

# Restartar
npm start

# Em outro terminal, testar
curl http://192.168.15.2:3000/admin/login
```

---

## 📞 Próximo Passo

Quando executar o checklist acima, compartilhe:

1. Output de `git log --oneline -3`
2. Output de `grep "saveUninitialized" src/server.js`
3. Output de `ps aux | grep "node"`
4. Qual é o diretório exato (/home/pi? /root? outro?)
5. Qual é a porta exata (3000? 3001? outra?)

Com essas informações, consigo diagnosticar em 2 minutos.

---

## 💡 Problema Provável

99% dos casos:
- Você está em `/home/pi/presell-creator`
- Rodou `git pull` mas em diretório errado
- Servidor ainda está rodando código antigo
- Precisa fazer `kill <PID>` e `npm start` novamente

Faça isso agora e report!
