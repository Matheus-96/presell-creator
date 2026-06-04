#!/usr/bin/env node
/**
 * Force re-render: regenera rendered_html de TODOS os presells publicados,
 * incluindo os que já têm HTML (ao contrário do backfill-rendered-html que
 * só processa NULL). Deve ser executado após deploys que alterem o renderer.
 *
 * Uso: node backend/scripts/rerender-all.js
 */

function runRerender({ repository, renderer, logger = console }) {
  const presells = repository.listAllPublished();

  if (presells.length === 0) {
    logger.log("Nenhum presell publicado encontrado. Nada a fazer.");
    return { ok: 0, failed: 0 };
  }

  logger.log(`Re-renderizando ${presells.length} presell(s)...`);

  let ok = 0;
  let failed = 0;

  for (const presell of presells) {
    try {
      const html = renderer.renderPresellHtml(presell);
      repository.updateRenderedHtml(presell.id, html);
      ok++;
      logger.log(`  ✓ [${presell.id}] ${presell.slug}`);
    } catch (err) {
      failed++;
      logger.error(`  ✗ [${presell.id}] ${presell.slug}: ${err.message}`);
    }
  }

  logger.log(`\nConcluído: ${ok} re-renderizado(s), ${failed} falha(s).`);
  return { ok, failed };
}

module.exports = { runRerender };

if (require.main === module) {
  require("dotenv").config();

  const { migrate } = require("../src/db/migrations");
  const repository = require("../src/repositories/presellRepository");
  const renderer = require("../src/services/presellRenderer");

  migrate();

  const { failed } = runRerender({ repository, renderer });
  process.exit(failed > 0 ? 1 : 0);
}
