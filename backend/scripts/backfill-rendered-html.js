#!/usr/bin/env node
/**
 * Backfill: gera rendered_html para todos os presells published que ainda não
 * têm HTML estático. Execução idempotente — só processa linhas com NULL.
 *
 * Uso: node backend/scripts/backfill-rendered-html.js
 */

function runBackfill({ repository, renderer, logger = console }) {
  const presells = repository.listPublishedWithoutHtml();

  if (presells.length === 0) {
    logger.log("Nenhum presell publicado sem HTML encontrado. Nada a fazer.");
    return { ok: 0, failed: 0 };
  }

  logger.log(`Gerando HTML para ${presells.length} presell(s)...`);

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

  logger.log(`\nConcluído: ${ok} gerado(s), ${failed} falha(s).`);
  return { ok, failed };
}

module.exports = { runBackfill };

if (require.main === module) {
  require("dotenv").config();

  const { migrate } = require("../src/db/migrations");
  const repository = require("../src/repositories/presellRepository");
  const renderer = require("../src/services/presellRenderer");

  migrate();

  const { failed } = runBackfill({ repository, renderer });
  process.exit(failed > 0 ? 1 : 0);
}
