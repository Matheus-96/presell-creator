# Presell Server

Aplicacao server-side em Node.js para criar, publicar e medir paginas de presell para afiliados.

> Estado atual: a runtime Express foi relocada para `backend/`. A raiz continua operando por compatibilidade via `src/server.js`, enquanto `src/` segue como snapshot do monolito ate a limpeza do split.

## Stack

- Node.js 22.5+ ou 24+
- Express
- EJS
- SQLite nativo do Node (`node:sqlite`)
- Upload local em `storage/uploads`

## Instalacao local

```bash
npm install
cp .env.example .env
npm run hash-password -- "sua-senha"
```

Copie o hash gerado para `ADMIN_PASSWORD_HASH` no `.env`.

```bash
npm start
```

Acesse `http://localhost:3000/admin`.

## Fluxo de desenvolvimento atual

### Modo padrao: monolito na raiz

Use estes comandos quando quiser trabalhar no app que segue valendo hoje:

- `npm install` — instala dependencias da raiz, `backend/` e `frontend/`
- `npm start` — sobe o monolito atual
- `npm run dev` — monolito com watch
- `npm run lint` — lint do codigo JS atual
- `npm run build` — no-op seguro, pois o monolito ainda nao exige build

### Modo split: backend + frontend em workspaces

Use estes comandos para desenvolver a futura separacao sem mover o monolito:

- `npm run dev:split` — sobe `backend/` + `frontend/` em paralelo
- `npm run start:split` — sobe `backend/` + frontend em preview de producao
- `npm run lint:split` — lint dos workspaces
- `npm run build:split` — build do frontend e no-op seguro no backend
- o build do frontend le `ADMIN_FRONTEND_PATH` e `VITE_LEGACY_ADMIN_URL` do `.env` raiz

Portas padrao nesse modo:

- monolito raiz: `http://localhost:3000` via `.env.example`
- backend workspace: `http://localhost:3002/health` (ou `BACKEND_PORT`)
- frontend Vite dev: `http://localhost:5173/admin-app/` por padrao
- frontend preview: `http://localhost:4173/admin-app/` por padrao

## Layout preparado para workspaces

```text
.
|-- backend/
|-- frontend/
`-- src/
```

- `src/server.js` continua sendo o entrypoint compativel da raiz, mas delega para a runtime em `backend/`.
- `backend/` agora hospeda a runtime Express relocada com rotas, middleware, servicos, banco, views e assets.
- `frontend/` expõe um scaffold Vite com `dev`, `start`, `build` e `lint`.
- Scripts `start`, `dev`, `lint` e `build` da raiz continuam preservando o fluxo do monolito.
- Scripts `*:backend`, `*:frontend` e `*:split` deixam o fluxo de separacao explicito sem migrar o codigo atual.

## Contratos da futura API admin

- Os contratos canônicos do backend ficam em `backend/src/contracts/`.
- O manifesto agregador vive em `backend/src/contracts/adminApiContract.js`.
- Endpoints aditivos já expostos para o frontend futuro:
  - `GET /api/admin/contracts`
  - `GET /api/admin/session`
  - `POST /api/admin/session`
  - `DELETE /api/admin/session`
  - `GET /api/admin/templates`
  - `GET /api/admin/presells`
  - `GET /api/admin/presells/:id`
  - `GET /api/admin/analytics`
  - `GET /api/admin/analytics/summary`
  - `GET /api/admin/analytics/presells/:id`
- Contratos públicos para tracking do frontend split:
  - `GET /api/public/contracts`
  - `POST /api/public/presells/:slug/events`
  - `POST /api/public/presells/:slug/redirect`
- `GET /api/admin/session` tambem faz o bootstrap da sessao/cookie e devolve o token CSRF para o cliente React.
- O endpoint legado `GET /api/admin/summary` continua preservado por compatibilidade.

### Executando cada workspace separadamente

Da raiz do repositorio:

- `npm run dev:backend`
- `npm run start:backend`
- `npm run lint:backend`
- `npm run build:backend`
- `npm run dev:frontend`
- `npm run start:frontend`
- `npm run lint:frontend`
- `npm run build:frontend`

Ou, se preferir, rode `npm run <script> --workspace backend` / `frontend`.

## Variaveis de ambiente

- `PORT`: porta interna da aplicacao.
- `BACKEND_PORT`: porta opcional para `npm run start:backend` / `dev:backend`.
- `APP_URL`: URL publica base.
- `ADMIN_FRONTEND_PATH`: caminho em que o backend serve `frontend/dist`. Padrao: `/admin-app`. Para cutover real, use `/admin`.
- `LEGACY_ADMIN_PATH`: caminho do admin SSR legado. Padrao: `/admin`. Para rollback simples apos cutover, mova-o para `/admin-legacy`.
- `VITE_LEGACY_ADMIN_URL`: caminho mostrado pelo React para abrir o admin legado. Quando houver cutover, ajuste para o mesmo valor de `LEGACY_ADMIN_PATH`.
- `SESSION_SECRET`: segredo longo para cookies de sessao.
- `TRUST_PROXY`: quantos proxies confiar (`1`, `2`, `loopback`, etc). Em `production`, o app passa a confiar no primeiro proxy por padrao para persistir cookies seguros atras de Nginx/Render/Heroku-like setups.
- `SESSION_COOKIE_SECURE`: `false`, `true` ou `auto`. O padrao vira `auto` em `production`, preservando `false` no localhost.
- `SESSION_COOKIE_SAME_SITE`: `lax` por padrao. Use `none` apenas com HTTPS, pois isso forca cookie `Secure`.
- `FORCE_HTTPS`: override legado para forcar cookie `Secure` em qualquer ambiente.
- `ADMIN_USER`: usuario fixo do painel.
- `ADMIN_PASSWORD_HASH`: hash `scrypt` gerado pelo script.
- `NODE_ENV`: use `production` no servidor.

## Deploy auto-hospedado

1. Instale Node.js 24 no servidor.
2. Clone o repositorio Git.
3. Crie `.env` a partir de `.env.example`.
4. Rode `npm install`.
5. Se for publicar o React admin pelo backend, rode `npm run build:split`.
6. Opcionalmente reduza o footprint com `npm prune --omit=dev` apos o build.
7. Inicie com PM2:

```bash
pm2 start src/server.js --name presell-server
pm2 save
```

8. Configure Nginx como reverse proxy para a porta definida em `PORT`.
9. Em deploys atras de proxy HTTPS, defina ao menos `NODE_ENV=production` e mantenha `TRUST_PROXY=1` (ou ajuste para o numero correto de hops) para que o cookie de sessao seguro sobreviva fora do localhost.

### Modos de cutover recomendados

1. **Modo seguro / coexistencia**
   - `ADMIN_FRONTEND_PATH=/admin-app`
   - `LEGACY_ADMIN_PATH=/admin`
   - resultado: o admin legado continua em `/admin` e o React admin fica validavel em `/admin-app`

2. **Modo cutover para React**
   - `ADMIN_FRONTEND_PATH=/admin`
   - `LEGACY_ADMIN_PATH=/admin-legacy`
   - `VITE_LEGACY_ADMIN_URL=/admin-legacy`
   - resultado: a raiz e os links padrao passam a cair no React admin, mas o SSR legado continua disponivel para rollback imediato

Exemplo:

```nginx
server {
  server_name seu-dominio.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Backup do SQLite

O banco fica em `storage/database.sqlite`. Faca backup desse arquivo e dos arquivos `storage/database.sqlite-wal` e `storage/database.sqlite-shm` quando existirem.

Exemplo simples com cron:

```bash
mkdir -p ~/presell-backups
cp storage/database.sqlite* ~/presell-backups/
```

## Validacao manual

- Login bloqueia credenciais invalidas.
- `/admin` exige sessao.
- Presell pode ser criada, editada, publicada e despublicada.
- Upload aceita imagens JPG, PNG, WEBP e GIF.
- `/p/:slug` abre apenas paginas publicadas.
- `/go/:slug` registra clique e redireciona.
- `gclid`, `gbraid`, `wbraid` e UTMs sao preservados no redirect.
- Dashboard mostra views, cliques, redirects e CTR.
