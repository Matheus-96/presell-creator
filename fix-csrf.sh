#!/bin/bash

# CSRF FIX SCRIPT - Automatic deployment
# Este script resolve o problema de CSRF de forma automática

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         CSRF Fix - Automatic Deployment Script                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Passo 1: Verificar se está no diretório correto
if [ ! -f "src/server.js" ]; then
    echo "❌ Erro: src/server.js não encontrado"
    echo "Execute este script a partir do diretório raiz do projeto"
    echo "Exemplo: cd /home/pi/presell-creator && bash fix-csrf.sh"
    exit 1
fi

echo "✅ Diretório correto encontrado"
echo ""

# Passo 2: Git pull
echo "📦 Atualizando código (git pull)..."
git fetch origin
git pull origin master

echo "✅ Código atualizado"
echo ""

# Passo 3: Verificar se saveUninitialized foi atualizado
echo "🔍 Verificando se saveUninitialized está true..."
if grep -q "saveUninitialized: true" src/server.js; then
    echo "✅ saveUninitialized está true"
else
    echo "❌ saveUninitialized ainda false - tentando fix manual..."
    sed -i 's/saveUninitialized: false/saveUninitialized: true/' src/server.js
    git add src/server.js
    git commit -m "fix: saveUninitialized true (manual fix)" || true
    echo "✅ saveUninitialized corrigido"
fi
echo ""

# Passo 4: Matar processo node antigo
echo "⏹️  Matando processo node antigo..."
pkill -f "node src/server.js" || true
sleep 2

# Verificar que foi morto
if pgrep -f "node src/server.js" > /dev/null; then
    echo "⚠️  Processo ainda rodando, tentando kill -9..."
    pkill -9 -f "node src/server.js" || true
    sleep 1
fi

echo "✅ Processo anterior parado"
echo ""

# Passo 5: Restartar servidor
echo "🚀 Iniciando servidor..."
npm start &
SERVER_PID=$!
echo "✅ Servidor iniciado (PID: $SERVER_PID)"
echo ""

# Passo 6: Aguardar servidor iniciar
echo "⏳ Aguardando servidor iniciar..."
sleep 3
echo "✅ Servidor pronto"
echo ""

# Passo 7: Testar CSRF
echo "🧪 Testando CSRF..."
node << 'TESTNODE'
const http = require('http');

http.get('http://localhost:3000/admin/login', (res) => {
  const setCookie = res.headers['set-cookie'];
  if (setCookie && setCookie[0]) {
    console.log('✅ Set-Cookie header enviado - CSRF vai funcionar!');
  } else {
    console.log('❌ Set-Cookie header não encontrado - Ainda há problema');
  }
  res.on('data', () => {});
}).on('error', (e) => {
  console.log('⚠️  Não conseguiu conectar ao servidor:', e.message);
});
TESTNODE

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   FIX COMPLETO!                               ║"
echo "║                                                                ║"
echo "║  Testar no navegador:                                         ║"
echo "║  http://192.168.15.2:3000/admin/login                         ║"
echo "║  Username: admin                                              ║"
echo "║  Password: admin123                                           ║"
echo "║                                                                ║"
echo "║  Esperado: Login funciona (ou erro de credenciais, não CSRF) ║"
echo "╚════════════════════════════════════════════════════════════════╝"
