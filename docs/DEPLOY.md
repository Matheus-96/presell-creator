# Deploy em Self-Hosted com Cloudflare Tunnels

Guia passo a passo para hospedar o Presell Creator na sua própria máquina usando lighttpd, PM2, GitHub Actions (self-hosted runner) e Cloudflare Tunnels.

---

## Arquitetura

```
Internet
   │
   ▼
Cloudflare Tunnel
   │
   ▼
lighttpd (porta 80/443)
   ├── Arquivos estáticos → /var/www/html/admin-app/  (React SPA)
   └── Proxy reverso →  Node.js backend (porta 3002)
         /api/*
         /go/*
         /media/*
         /health
         /static/*
         /p/*
```

**Por que assim?**

- O lighttpd serve os assets do frontend (JS/CSS/imagens) diretamente — sem passar pelo Node.
- O Node backend lida apenas com lógica dinâmica (API, presells, sessões).
- O Cloudflare Tunnel expõe o lighttpd sem abrir portas no roteador.
- O PM2 mantém o Node rodando e reinicia em caso de crash.

---

## Pré-requisitos

```bash
# Node >= 22.5 (necessário para node:sqlite nativo)
node --version

# PM2
npm install -g pm2

# lighttpd
sudo apt install lighttpd

# rsync (usado pelo deploy.sh)
sudo apt install rsync

# GitHub CLI (para criar o runner)
# https://cli.github.com/
```

---

## 1. Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/presell-creator.git /home/<usuario>/presell-creator
cd /home/<usuario>/presell-creator
```

---

## 2. Configurar o `.env`

Crie o arquivo `.env` na raiz do repositório:

```env
# Servidor
NODE_ENV=production
BACKEND_PORT=3002

# Admin
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<hash gerado com npm run hash-password>
ADMIN_FRONTEND_PATH=/admin-app

# Sessão
SESSION_SECRET=<string longa e aleatória>
SESSION_COOKIE_SECURE=auto
SESSION_COOKIE_SAME_SITE=lax

# Proxy — obrigatório porque o lighttpd está à frente
TRUST_PROXY=1

# IA
OPENROUTER_API_KEY=<sua chave>
```

Gerar o hash da senha:
```bash
npm run hash-password -- "sua-senha-aqui"
```

---

## 3. Configurar o lighttpd

### 3.1 Habilitar módulos necessários

```bash
sudo lighttpd-enable-mod proxy
sudo lighttpd-enable-mod rewrite
```

Ou adicione manualmente em `/etc/lighttpd/lighttpd.conf`:

```
server.modules += (
  "mod_proxy",
  "mod_rewrite",
  "mod_staticfile"
)
```

### 3.2 Criar o arquivo de configuração do site

Crie `/etc/lighttpd/conf-available/10-presell.conf`:

```lighttpd
# Docroot onde o frontend buildado será copiado (desativado pois isso ja é config padrão)
# server.document-root = "/var/www/html"

# Rotas que vão para o backend Node.js
$HTTP["url"] =~ "^/(api|go|media|health|static|p)(/|$)" {
    proxy.server = ( "" => (( "host" => "127.0.0.1", "port" => 3002 )) )
    proxy.forwarded = (
        "for"   => 1,
        "proto" => 1,
        "host"  => 1
    )
}

# SPA fallback para /admin-app/* — entrega o index.html para rotas client-side
$HTTP["url"] =~ "^/admin-app/(?!.*\.[a-z]{2,4}$)" {
    url.rewrite-once = ( "^(/admin-app/).*" => "$1index.html" )
}
```

Ative e reinicie:
```bash
sudo ln -s /etc/lighttpd/conf-available/10-presell.conf /etc/lighttpd/conf-enabled/
sudo systemctl restart lighttpd
```

### 3.3 Criar o diretório do frontend

```bash
sudo mkdir -p /var/www/html/admin-app
sudo chown -R $USER:www-data /var/www/html/admin-app
```

---

## 4. Primeiro deploy manual

Execute o script de deploy uma vez para validar tudo antes de automatizar:

```bash
REPO_DIR=/home/victor/projetos/presell-creator \
DEPLOY_BRANCH=master \
PM2_APP_NAME=presell-backend \
BACKEND_ENTRY=backend/src/server.js \
ADMIN_FRONTEND_PATH=/admin-app \
LIGHTTPD_DOCROOT=/var/www/html \
  bash scripts/deploy.sh
```

Variáveis disponíveis no `scripts/deploy.sh`:

| Variável | Padrão | Descrição |
|---|---|---|
| `REPO_DIR` | `/home/pi/presell-creator` | Caminho do repositório |
| `DEPLOY_BRANCH` | `feat/refactor` | Branch a ser deployada |
| `PM2_APP_NAME` | `presell-backend` | Nome do processo no PM2 |
| `BACKEND_ENTRY` | `backend/src/server.js` | Entrypoint do backend |
| `ADMIN_FRONTEND_PATH` | `/admin-app` | Path do admin no lighttpd |
| `LIGHTTPD_DOCROOT` | `/var/www/html` | Docroot do lighttpd |
| `LIGHTTPD_OWNER` | _(vazio)_ | Owner dos arquivos copiados (ex: `www-data:www-data`) |
| `BACKEND_PORT` | `3002` | Porta do backend |

---

## 5. Configurar o Cloudflare Tunnel

Se ainda não configurou:

```bash
# Instalar o cloudflared
curl -L https://github.com/cloudflare/cloudflare-warp/releases/latest | ...
# Siga a documentação oficial: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

cloudflared tunnel login
cloudflared tunnel create presell-creator
```

Crie `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /home/<usuario>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: seu-dominio.com
    service: http://localhost:80   # lighttpd
  - service: http_status:404
```

Inicie como serviço:
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 6. Automatizar deploy com GitHub Actions (self-hosted runner)

### 6.1 Instalar o runner

No GitHub: **Settings → Actions → Runners → New self-hosted runner**

Selecione Linux e siga os comandos gerados (algo como):

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <url-gerada-pelo-github>
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/<usuario>/presell-creator --token <token-gerado>
sudo ./svc.sh install
sudo ./svc.sh start
```

O runner agora fica escutando como serviço — é reiniciado automaticamente com a máquina.

### 6.2 Permissão sudo sem senha para o deploy

O script usa `sudo` para copiar arquivos e ajustar ownership. Libere apenas o necessário:

```bash
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/rsync, /bin/mkdir, /bin/chown, /bin/find, /bin/cp, /bin/rm" \
  | sudo tee /etc/sudoers.d/presell-deploy
```

### 6.3 Criar o workflow

Crie `.github/workflows/deploy.yml` no repositório:

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: self-hosted
    timeout-minutes: 15

    steps:
      - name: Executar deploy
        env:
          REPO_DIR: /home/<usuario>/presell-creator
          DEPLOY_BRANCH: master
          PM2_APP_NAME: presell-backend
          BACKEND_ENTRY: backend/src/server.js
          ADMIN_FRONTEND_PATH: /admin-app
          LIGHTTPD_DOCROOT: /var/www/html
        run: bash $REPO_DIR/scripts/deploy.sh
```

> **Importante:** substitua `<usuario>` pelo seu usuário real na máquina.

A partir daqui, todo `git push` para `master` dispara o deploy automaticamente, com log visível em **GitHub → Actions**.

---

## 7. PM2 sobreviver a reinicializações

```bash
pm2 startup
# Execute o comando que o PM2 imprimir (com sudo)
pm2 save
```

---

## Fluxo completo após configurado

```
git push origin master
       │
       ▼
GitHub Actions detecta o push
       │
       ▼
Runner (na sua máquina) executa scripts/deploy.sh
  1. git pull --ff-only
  2. npm install
  3. npm run build:frontend
  4. rsync frontend/dist/ → /var/www/html/admin-app/
  5. pm2 restart presell-backend
  6. curl /health (healthcheck)
       │
       ▼
Deploy concluído (~30–60s)
```

---

## Troubleshooting

**Sessão não persiste / cookie não funciona**
- Verifique `TRUST_PROXY=1` no `.env` (obrigatório com lighttpd na frente)
- Se usar HTTPS no Cloudflare, `SESSION_COOKIE_SECURE=auto` já resolve

**Frontend carrega mas API retorna 502**
- O backend não está rodando: `pm2 status` e `pm2 logs presell-backend`
- Porta errada no lighttpd: verifique se `BACKEND_PORT` no `.env` bate com o proxy no lighttpd

**Rota do admin retorna 404 ao recarregar a página**
- O rewrite do lighttpd para SPA não está ativo: revise a seção `url.rewrite-once` do config

**Deploy falha no runner**
- Veja o log em GitHub → Actions → workflow run
- Teste manual: rode `scripts/deploy.sh` com as variáveis na mão para isolar o erro
