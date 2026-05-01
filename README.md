# Presell Server

Aplicacao server-side em Node.js para criar, publicar e medir paginas de presell para afiliados.

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

## Variaveis de ambiente

- `PORT`: porta interna da aplicacao.
- `APP_URL`: URL publica base.
- `SESSION_SECRET`: segredo longo para cookies de sessao.
- `ADMIN_USER`: usuario fixo do painel.
- `ADMIN_PASSWORD_HASH`: hash `scrypt` gerado pelo script.
- `NODE_ENV`: use `production` no servidor.

## Deploy auto-hospedado

1. Instale Node.js 24 no servidor.
2. Clone o repositorio Git.
3. Crie `.env` a partir de `.env.example`.
4. Rode `npm install --omit=dev`.
5. Inicie com PM2:

```bash
pm2 start src/server.js --name presell-server
pm2 save
```

6. Configure Nginx como reverse proxy para a porta definida em `PORT`.

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
