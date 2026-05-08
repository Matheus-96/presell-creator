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
- `BACKEND_PORT`: porta opcional para `npm run start:backend` / `dev:backend` e para o PM2 do backend; quando ausente, o backend reutiliza `PORT`.
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
5. Se for publicar o React admin, rode `npm run build:split`.
6. Opcionalmente reduza o footprint com `npm prune --omit=dev` apos o build.
7. Inicie com PM2:

```bash
pm2 start backend/src/server.js --name presell-backend
pm2 save
```

8. Configure o proxy/borda publica. Para o deploy atual no mesmo host, o stack suportado e suficiente e `lighttpd` servindo `frontend/dist` no docroot e usando `mod_proxy` para encaminhar por caminho o backend em `127.0.0.1:${BACKEND_PORT:-PORT}`; Nginx continua opcional, nao obrigatorio.
9. Em deploys atras de proxy HTTPS, defina ao menos `NODE_ENV=production` e mantenha `TRUST_PROXY=1` (ou ajuste para o numero correto de hops) para que o cookie de sessao seguro sobreviva fora do localhost.

### Topologia recomendada para um unico hostname publico

Para producao same-origin, a topologia recomendada e esta:

1. **Cloudflare Tunnel** publica o hostname externo e entrega trafego ao host.
2. **`cloudflared` -> `lighttpd`** no mesmo servidor (tipicamente `http://127.0.0.1:80`).
3. **`lighttpd`** serve o `frontend/dist` no docroot e usa `mod_proxy` apenas para os caminhos do backend.
4. **PM2** mantem o Node/Express em pe, escutando so em `127.0.0.1:${BACKEND_PORT:-PORT}`.

Isso preserva um unico dominio publico, cookies same-origin e um ponto simples de cutover entre o admin React e o admin SSR legado.

| Camada | Destino recomendado | Papel |
| --- | --- | --- |
| Cloudflare Tunnel | hostname publico -> `cloudflared` local | TLS, borda publica e acesso externo |
| `lighttpd` | docroot com `frontend/dist` | servir o frontend e terminar o roteamento por caminho |
| PM2 + Node | `127.0.0.1:${BACKEND_PORT:-PORT}` | runtime Express, sessoes, APIs, paginas publicadas e admin SSR |

### O que fica estatico no `lighttpd` e o que vai para o PM2

- `scripts/deploy.sh` publica `frontend/dist` no docroot do `lighttpd` e reinicia o backend no PM2 na mesma maquina.
- O bundle do React deve sair do `lighttpd` em `ADMIN_FRONTEND_PATH`; esse caminho nao entra no proxy do backend.
- Todo o resto abaixo so precisa de proxy quando pertencer a superficie publica do backend.

| Caminho publico | Destino | Observacao |
| --- | --- | --- |
| `ADMIN_FRONTEND_PATH` e assets do bundle | `lighttpd` docroot (`frontend/dist`) | React admin same-origin |
| `/api/admin/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | sessao, contratos, templates, presells, uploads, analytics e `GET /api/admin/summary` |
| `/api/public/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | tracking publico (`/contracts`, eventos e redirects) |
| `/media/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | uploads usados no editor, previews e paginas publicadas |
| `/static/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | CSS/JS do SSR legado e das presells renderizadas pelo backend |
| `/p/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | paginas publicadas |
| `/go/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | redirect com tracking |
| `/health` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | healthcheck do PM2/backend |
| `LEGACY_ADMIN_PATH/*` | `http://127.0.0.1:${BACKEND_PORT:-PORT}` | arvore inteira do admin SSR legado, incluindo login/logout, previews e statistics |

Em outras palavras: `lighttpd` fica responsavel pelo frontend e o proxy por caminho cobre somente os prefixos acima.

### Exemplo de roteamento no `lighttpd`

Exemplo ilustrativo usando `mod_proxy` (troque `3000` pela porta interna real do backend: `BACKEND_PORT` ou `PORT` quando `BACKEND_PORT` nao estiver setada):

```lighttpd
server.modules += ("mod_proxy")
server.document-root = "/var/www/presell-creator/current/frontend/dist"

$HTTP["url"] =~ "^/(api/admin|api/public|media|static|p|go)(/|$)" {
  proxy.server = ("" => (("host" => "127.0.0.1", "port" => 3000)))
}

$HTTP["url"] =~ "^/health$" {
  proxy.server = ("" => (("host" => "127.0.0.1", "port" => 3000)))
}

# Em coexistencia use ^/admin(/|$); apos o cutover troque para ^/admin-legacy(/|$)
$HTTP["url"] =~ "^/admin-legacy(/|$)" {
  proxy.server = ("" => (("host" => "127.0.0.1", "port" => 3000)))
}
```

O importante e manter `ADMIN_FRONTEND_PATH` fora do proxy e refletir no `lighttpd` o valor corrente de `LEGACY_ADMIN_PATH`.

### Modos de cutover recomendados

1. **Modo seguro / coexistencia**
   - `ADMIN_FRONTEND_PATH=/admin-app`
   - `LEGACY_ADMIN_PATH=/admin`
   - resultado: o admin legado continua em `/admin` e o React admin fica validavel em `/admin-app`
   - proxy: `lighttpd` segue servindo `/admin-app`, enquanto a arvore `/admin/*` continua indo ao backend

2. **Modo cutover para React**
   - `ADMIN_FRONTEND_PATH=/admin`
   - `LEGACY_ADMIN_PATH=/admin-legacy`
   - `VITE_LEGACY_ADMIN_URL=/admin-legacy`
   - resultado: os links padrao passam a cair no React admin, mas o SSR legado continua disponivel em `/admin-legacy` para rollback imediato
   - proxy: remova `/admin` das regras de backend e passe a encaminhar `/admin-legacy/*`

O efeito pratico do cutover e somente este: o caminho publico do admin legado muda, entao a regra de proxy precisa acompanhar o novo `LEGACY_ADMIN_PATH`.

### Quando usar `cloudflared ingress` por caminho como fallback

O recomendado continua sendo **Cloudflare Tunnel -> lighttpd -> PM2**, porque isso deixa o roteamento same-origin concentrado no `lighttpd`.

Use `cloudflared ingress` por hostname/path apenas como fallback quando voce **nao puder** habilitar `mod_proxy` no `lighttpd` ou quando quiser que o proprio `cloudflared` separe trafego estatico e dinamico antes de chegar ao host local. Nesse modo:

- caminhos do backend (`/api/admin/*`, `/api/public/*`, `/media/*`, `/static/*`, `/p/*`, `/go/*`, `/health` e `LEGACY_ADMIN_PATH/*`) podem apontar direto para `http://127.0.0.1:${BACKEND_PORT:-PORT}`;
- o restante, incluindo `ADMIN_FRONTEND_PATH`, continua apontando para o `lighttpd`.

Exemplo simplificado:

```yaml
ingress:
  - hostname: app.seu-dominio.com
    path: /api/admin/.*
    service: http://127.0.0.1:3000
  - hostname: app.seu-dominio.com
    path: /api/public/.*
    service: http://127.0.0.1:3000
  - hostname: app.seu-dominio.com
    path: /(media|static|p|go)/.*
    service: http://127.0.0.1:3000
  - hostname: app.seu-dominio.com
    path: /health
    service: http://127.0.0.1:3000
  - hostname: app.seu-dominio.com
    path: /admin-legacy/.*
    service: http://127.0.0.1:3000
  - hostname: app.seu-dominio.com
    service: http://127.0.0.1:80
```

No fallback acima, a ultima regra continua entregando o frontend estatico pelo `lighttpd`; as regras especificas so desviam para o PM2 o que realmente e backend. Se voce ainda estiver em coexistencia, troque `/admin-legacy/.*` pela arvore atual de `LEGACY_ADMIN_PATH` (por exemplo `/admin/.*`).

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
