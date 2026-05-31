# Deploy com Docker / Portainer + Cloudflare Tunnels

Guia para hospedar o Presell Creator usando Docker Compose, Portainer e Cloudflare Tunnels.

---

## Arquitetura

```
Internet
   │
   ▼
Cloudflare Tunnel
   │
   ▼
lighttpd container (:80)              ← único ponto de entrada
   ├── /admin-app/*  → serve estáticos (frontend baked na imagem)
   └── /api/* /go/* /media/* /health /static/* /p/*
              │
              ▼  (rede interna Docker — nome de serviço "app")
         app container (:3002)        ← não exposto no host
              │
              └── Volume presell_storage → /app/storage/
                    ├── database.sqlite
                    ├── sessions.sqlite
                    └── uploads/
```

**Por que assim?**

- O `lighttpd` serve os assets estáticos do frontend diretamente (baked na imagem Docker durante o build) e proxeia o restante para o Node.
- O `app` (Node.js) não fica exposto no host — só acessível pelo `lighttpd` via rede interna Docker.
- O Cloudflare Tunnel expõe o `lighttpd` sem abrir portas no roteador.
- O Docker reinicia os containers automaticamente em caso de crash (`restart: unless-stopped`).

---

## Pré-requisitos

```bash
# Docker Engine >= 24
docker --version

# Docker Compose v2
docker compose version

# Adicionar o usuário do runner ao grupo docker (evita sudo no runner)
sudo usermod -aG docker $USER
# Reinicie a sessão depois
```

---

## 1. Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/presell-creator.git /home/<usuario>/presell-creator
cd /home/<usuario>/presell-creator
```

---

## 2. Configurar o `.env`

```bash
cp .env.example .env
```

Variáveis obrigatórias:

```env
NODE_ENV=production
BACKEND_PORT=3002

ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<hash gerado abaixo>
ADMIN_FRONTEND_PATH=/admin-app

SESSION_SECRET=<string longa e aleatória>
SESSION_COOKIE_SECURE=auto
SESSION_COOKIE_SAME_SITE=lax

# lighttpd está na frente do Node dentro do stack Docker
TRUST_PROXY=1

OPENROUTER_API_KEY=<sua chave>
```

Gerar o hash da senha (sem Node na máquina host):

```bash
docker run --rm node:22-slim node -e \
  "const {scryptSync,randomBytes}=require('crypto'); \
   const s=randomBytes(16).toString('hex'); \
   const h=scryptSync('SUA_SENHA',s,32).toString('hex'); \
   console.log('scrypt:32768:8:1:'+s+':'+h)"
```

---

## 3. Primeiro deploy manual

```bash
cd /home/<usuario>/presell-creator
docker compose up -d --build
```

Verificar logs e healthcheck:

```bash
docker compose logs -f
curl http://localhost:80/health
```

Para automatizar a partir daqui vá para a seção [GitHub Actions](#5-automatizar-deploy-com-github-actions-self-hosted-runner).

---

## 4. Configurar o Cloudflare Tunnel

### Opção A — cloudflared no mesmo stack Docker (recomendado com Portainer)

Descomente o serviço `cloudflared` no `docker-compose.yaml` e adicione ao `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=<token gerado em one.dash.cloudflare.com → Networks → Tunnels>
```

O tunnel aponta internamente para `http://lighttpd:80` — nenhuma porta precisa ser exposta no host.

### Opção B — cloudflared no host

Deixe o serviço `cloudflared` comentado no compose. Instale e configure no host:

```bash
cloudflared tunnel login
cloudflared tunnel create presell-creator
```

Crie `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /home/<usuario>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: seu-dominio.com
    service: http://localhost:80   # porta do lighttpd exposta no host
  - service: http_status:404
```

Inicie como serviço:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## 5. Automatizar deploy com GitHub Actions (self-hosted runner)

### 5.1 Instalar o runner

No GitHub: **Settings → Actions → Runners → New self-hosted runner**

Selecione Linux e siga os comandos gerados:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <url-gerada-pelo-github>
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/<usuario>/presell-creator --token <token-gerado>
sudo ./svc.sh install
sudo ./svc.sh start
```

O runner fica escutando como serviço e é reiniciado automaticamente com a máquina.

### 5.2 Permissão Docker sem sudo

O `deploy-docker.sh` chama `docker compose` diretamente. Certifique-se que o usuário do runner está no grupo `docker`:

```bash
sudo usermod -aG docker <usuario-do-runner>
```

O workflow `.github/workflows/deploy.yml` já está configurado e não precisa ser criado manualmente.

---

## 6. Deploy via Portainer (Stack)

1. **Stacks → Add stack → Repository** (aponte para o repositório) **ou Upload** do `docker-compose.yaml`
2. Em **Environment variables**, cole o conteúdo do `.env` ou use **Load variables from .env file**
3. Clique em **Deploy the stack**

O volume `presell_storage` é criado automaticamente e persiste entre atualizações.

**Atualizar após um push:**

O GitHub Actions faz isso automaticamente. Para atualizar manualmente via Portainer: **Stacks → presell-creator → Editor → Update the stack**.

---

## Fluxo completo após configurado

```
git push origin master
       │
       ▼
GitHub Actions detecta o push
       │
       ▼
Runner (na sua máquina) executa scripts/deploy-docker.sh
  1. git pull --ff-only
  2. docker compose up -d --build --remove-orphans
  3. curl http://localhost:80/health (healthcheck)
       │
       ▼
Deploy concluído (~2–5 min no primeiro build, ~1 min com cache)
```

---

## Build-args para customizar o frontend

Se precisar de um `ADMIN_FRONTEND_PATH` diferente de `/admin-app`, passe o build-arg — o valor precisa bater no `docker-compose.yaml` e no `.env`:

```bash
docker compose build \
  --build-arg ADMIN_FRONTEND_PATH=/admin \
  --build-arg VITE_LEGACY_ADMIN_URL=/admin-legacy
```

---

## Troubleshooting

**Container não sobe / crash imediato**
- `docker compose logs app` — geralmente falta variável obrigatória no `.env`
- `docker compose logs lighttpd` — erro de configuração do lighttpd

**API retorna 502 ou 503**
- O container `app` ainda está no healthcheck: `docker compose ps` mostra `health: starting`
- `docker compose logs app` para ver o erro do Node

**Sessão não persiste / cookie não funciona**
- Confirme `TRUST_PROXY=1` no `.env` (obrigatório com lighttpd na frente)
- `SESSION_COOKIE_SECURE=auto` resolve HTTPS via Cloudflare automaticamente

**Rota do admin retorna 404 ao recarregar a página**
- O rewrite do lighttpd para SPA não está ativo: verifique `docker/lighttpd/lighttpd.conf`

**Puppeteer falha ao extrair página**
- O Dockerfile já configura `--no-sandbox` e usa Chromium do sistema; verifique se o container tem acesso à internet

**Dados perdidos após `docker compose down`**
- Use `docker compose down` **sem** `--volumes` — o flag `-v` apaga o volume `presell_storage`
- Backup: `docker cp $(docker compose ps -q app):/app/storage ./storage-backup`

**Deploy falha no runner**
- Veja o log em **GitHub → Actions → workflow run**
- Teste manual: `bash scripts/deploy-docker.sh --force` no diretório do repositório

---

## Referência de arquivos Docker

| Arquivo | Função |
|---|---|
| `Dockerfile` | Multi-stage: `builder` (Vite) → `lighttpd-static` → `app` (Node) |
| `docker-compose.yaml` | Orquestra `lighttpd` + `app` + `cloudflared` (opcional) |
| `docker/lighttpd/lighttpd.conf` | Config do lighttpd: proxy para `app:3002`, rewrite SPA |
| `scripts/deploy-docker.sh` | Script de deploy usado pelo GitHub Actions |
| `.github/workflows/deploy.yml` | Workflow que dispara o deploy no push para `master` |
