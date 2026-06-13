#!/usr/bin/env node
// Compila os componentes de seções (.tsx) do frontend para um bundle CommonJS
// que o backend importa em runtime para fazer renderToStaticMarkup (SSR de
// páginas V2).
//
// O bundle expõe `{ registry }` — o mapa type -> ReactComponent já populado
// pelos side-effect imports de presells-v2/sections/index.ts.

const path = require("path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const entry = path.join(
  root,
  "frontend/src/features/presells-v2/sections/index.ts"
);
const outfile = path.join(
  root,
  "backend/src/templates/sections.bundle.js"
);

esbuild
  .build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.join(root, "frontend/src")
    },
    logLevel: "warning"
  })
  .then(() => {
    console.log(`sections.bundle.js gerado em ${path.relative(root, outfile)}`);
  })
  .catch((error) => {
    console.error("Falha ao gerar o bundle de seções:", error);
    process.exit(1);
  });
