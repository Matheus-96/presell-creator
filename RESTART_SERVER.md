# Como Reiniciar o Servidor

## Status ✅
O erro "Erro interno no servidor" foi resolvido! As mudanças foram aplicadas com sucesso.

## Como Reiniciar

O servidor atual na porta 3000 precisa ser reiniciado para carregar o novo código.

### Método 1: Terminal (Recomendado)
```bash
# 1. Parar o servidor atual (no terminal onde npm start está rodando)
# Ctrl + C

# 2. Reiniciar
npm start
```

### Método 2: Matar processo específico
```bash
# Ver qual PID está usando porta 3000
ps aux | grep "node src/server" | grep -v grep

# Matar o processo (substitua 30091 pelo PID real)
kill -9 30091

# Reiniciar
npm start
```

### Método 3: Verificar porta
```bash
# Ver que processo está usando 3000
lsof -i :3000
netstat -tlnp | grep 3000
```

## Validação Após Reinicio

Após reiniciar, teste:

```bash
# 1. Login page (com Bootstrap 5)
curl http://localhost:3000/admin/login

# 2. Form novo
curl -b cookies.txt -c cookies.txt http://localhost:3000/admin/login
# (login com usuario=admin, password=admin123)
curl -b cookies.txt http://localhost:3000/admin/presells/new

# 3. Verificar preview-pane
curl -b cookies.txt http://localhost:3000/admin/presells/new | grep "preview-pane"

# 4. Verificar google_pixel field
curl -b cookies.txt http://localhost:3000/admin/presells/new | grep "google_pixel"
```

## Todas as Funcionalidades Ativas ✅
- ✅ Bootstrap 5 UI
- ✅ Live preview (split-screen)
- ✅ Google Ads Pixel field
- ✅ gclid tracking
- ✅ Real-time form preview (form-preview.js)

---
**Ultima Atualização:** May 1, 2026
**Status:** PRONTO PARA USO
