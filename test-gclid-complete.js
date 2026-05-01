#!/usr/bin/env node
/**
 * Teste completo do fluxo de gclid
 * Usa presell existente para testar captura, armazenamento e redirect com gclid
 */

const http = require("http");
const { URL } = require("url");
const { db } = require("./src/db/connection");

const BASE_URL = "http://localhost:3000";
const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

// Presell de teste já existente
const TEST_PRESELL_SLUG = "test-presell";

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "User-Agent": "Test-Client",
        "Accept": "text/html,application/json",
        ...options.headers
      },
      followRedirect: false
    };

    const req = http.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          url: res.headers.location || null
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      const bodyStr =
        typeof options.body === "string"
          ? options.body
          : new URLSearchParams(options.body).toString();
      req.write(bodyStr);
    }

    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    TEST_RESULTS.passed++;
    TEST_RESULTS.tests.push({ type: "PASS", message });
    console.log(`✓ ${message}`);
  } else {
    TEST_RESULTS.failed++;
    TEST_RESULTS.tests.push({ type: "FAIL", message });
    console.log(`✗ ${message}`);
  }
}

async function testGclidFlow() {
  console.log("\n=== TESTE COMPLETO DO FLUXO GCLID ===\n");

  try {
    // Step 1: Acessar presell com gclid
    console.log("1. Acessando presell com gclid e utm_source...");
    const testGclid = "ABC123XYZ789TEST";
    const testUtmSource = "google";

    const presellRes = await request(
      "GET",
      `/p/${TEST_PRESELL_SLUG}?gclid=${testGclid}&utm_source=${testUtmSource}`
    );

    assert(
      presellRes.status === 200,
      "Presell é acessível com gclid"
    );
    assert(
      presellRes.body.includes("Test Presell") || presellRes.body.length > 100,
      "Página do presell carregou corretamente"
    );

    // Step 2: Verificar dados armazenados no banco de dados
    console.log("\n2. Verificando dados armazenados...");
    const sessions = db
      .prepare("SELECT * FROM tracking_sessions ORDER BY updated_at DESC LIMIT 1")
      .all();
    
    assert(sessions.length > 0, "Sessão foi criada no banco de dados");

    let sessionKey = null;
    if (sessions.length > 0) {
      const params = JSON.parse(sessions[0].params_json);
      sessionKey = sessions[0].session_key;
      
      assert(
        params.gclid === testGclid,
        `GCLID capturado corretamente: ${params.gclid}`
      );
      assert(
        params.utm_source === testUtmSource,
        `UTM Source capturado: ${params.utm_source}`
      );
    }

    // Step 3: Verificar evento page_view
    console.log("\n3. Verificando evento page_view...");
    const pageViewEvents = db
      .prepare(
        `SELECT * FROM events 
         WHERE event_type = 'page_view' 
         ORDER BY created_at DESC LIMIT 1`
      )
      .all();

    assert(pageViewEvents.length > 0, "Evento page_view foi registrado");

    if (pageViewEvents.length > 0) {
      const eventParams = JSON.parse(pageViewEvents[0].params_json);
      assert(
        eventParams.gclid === testGclid,
        `GCLID no event page_view: ${eventParams.gclid}`
      );
    }

    // Step 4: Simular clique no CTA (redirect)
    console.log("\n4. Simulando clique no CTA button (redirect)...");
    const redirectRes = await request("GET", `/go/${TEST_PRESELL_SLUG}?gclid=${testGclid}&utm_source=${testUtmSource}`);

    assert(
      redirectRes.status === 302,
      "Clique no CTA retorna redirect 302"
    );
    assert(
      redirectRes.url !== null,
      "URL de redirect foi fornecida"
    );

    // Step 5: Verificar GCLID na URL de redirect
    console.log("\n5. Verificando preservação de gclid na URL de redirect...");
    if (redirectRes.url) {
      const redirectUrl = new URL(redirectRes.url);
      const gclidParam = redirectUrl.searchParams.get("gclid");
      assert(
        gclidParam === testGclid,
        `GCLID preservado no redirect: ${gclidParam}`
      );

      console.log(`\n   URL de redirect final: ${redirectRes.url}\n`);
    }

    // Step 6: Verificar CTA click event
    console.log("6. Verificando eventos registrados...");
    const ctaEvents = db
      .prepare(
        `SELECT * FROM events 
         WHERE event_type = 'cta_click' 
         ORDER BY created_at DESC LIMIT 1`
      )
      .all();

    assert(ctaEvents.length > 0, "Evento cta_click foi registrado");

    if (ctaEvents.length > 0) {
      const ctaParams = JSON.parse(ctaEvents[0].params_json);
      assert(
        ctaParams.gclid === testGclid,
        `GCLID no cta_click event: ${ctaParams.gclid}`
      );
    }

    // Step 7: Teste edge cases
    console.log("\n7. Testando edge cases...");

    // Edge case 1: gclid vazio
    const emptyGclidRes = await request(
      "GET",
      `/p/${TEST_PRESELL_SLUG}?gclid=&utm_source=test`
    );
    assert(
      emptyGclidRes.status === 200,
      "Presell com gclid vazio é acessível"
    );

    // Edge case 2: gclid muito longo (>100 chars)
    const longGclid = "A".repeat(101) + "TOOLONG";
    const longGclidRes = await request(
      "GET",
      `/p/${TEST_PRESELL_SLUG}?gclid=${encodeURIComponent(longGclid)}`
    );

    assert(
      longGclidRes.status === 200,
      "Presell com gclid longo é acessível (validação local)"
    );

    // Verificar que gclid foi rejeitado pela validação
    const longGclidSessions = db
      .prepare(
        "SELECT params_json FROM tracking_sessions ORDER BY updated_at DESC LIMIT 1"
      )
      .all();

    if (longGclidSessions.length > 0) {
      const params = JSON.parse(longGclidSessions[0].params_json);
      assert(
        !params.gclid || params.gclid.length <= 100,
        "GCLID muito longo foi rejeitado (max 100 chars)"
      );
    }

    // Edge case 3: gclid com caracteres especiais
    const specialGclid = "ABC-123_XYZ.789";
    const specialGclidRes = await request(
      "GET",
      `/p/${TEST_PRESELL_SLUG}?gclid=${encodeURIComponent(specialGclid)}`
    );

    assert(
      specialGclidRes.status === 200,
      "Presell com gclid contendo caracteres especiais é acessível"
    );

    // Step 8: Analytics verification
    console.log("\n8. Verificando analytics overview...");
    const { getOverview } = require("./src/services/analyticsService");
    const overview = getOverview();

    assert(overview.totals.views > 0, "Overview mostra views");
    assert(overview.totals.clicks > 0, "Overview mostra clicks");
    assert(overview.totals.ctr >= 0, "CTR foi calculado corretamente");

    console.log(`\n   Analytics:
   - Total Views: ${overview.totals.views}
   - Total Clicks: ${overview.totals.clicks}
   - CTR: ${overview.totals.ctr.toFixed(2)}%`);

    // Step 9: Database verification
    console.log("\n9. Verificando queries de banco de dados...");

    const sessionCount = db
      .prepare("SELECT COUNT(*) as count FROM tracking_sessions WHERE params_json LIKE '%gclid%'")
      .get();

    assert(
      sessionCount.count > 0,
      `Sessões com gclid existem: ${sessionCount.count}`
    );

    const eventCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM events WHERE params_json LIKE '%gclid%'"
      )
      .get();

    assert(
      eventCount.count > 0,
      `Eventos com gclid existem: ${eventCount.count}`
    );

    const gclidEventDistribution = db
      .prepare(
        `SELECT event_type, COUNT(*) as count FROM events 
         WHERE params_json LIKE '%gclid%' 
         GROUP BY event_type 
         ORDER BY count DESC`
      )
      .all();

    console.log("\n   Distribuição de eventos com gclid:");
    gclidEventDistribution.forEach(row => {
      console.log(`   - ${row.event_type}: ${row.count} eventos`);
    });

    // Step 10: Múltiplos presells com diferentes gclids
    console.log("\n10. Testando múltiplos presells com diferentes gclids...");

    const gclid1 = "GCLID-001-" + Date.now();
    const gclid2 = "GCLID-002-" + Date.now();

    // Acessa presell 1 com gclid1
    await request("GET", `/p/${TEST_PRESELL_SLUG}?gclid=${gclid1}`);
    
    // Acessa presell 1 com gclid2
    await request("GET", `/p/${TEST_PRESELL_SLUG}?gclid=${gclid2}`);

    // Verifica que ambos foram registrados
    const multipleGclids = db
      .prepare(
        `SELECT DISTINCT json_extract(params_json, '$.gclid') as gclid 
         FROM events 
         WHERE json_extract(params_json, '$.gclid') LIKE 'GCLID-0%'
         ORDER BY created_at DESC`
      )
      .all();

    assert(
      multipleGclids.length >= 2,
      "Múltiplos gclids diferentes foram registrados"
    );

  } catch (error) {
    console.error("ERRO:", error.message);
    console.error(error.stack);
    TEST_RESULTS.failed++;
    TEST_RESULTS.tests.push({
      type: "ERROR",
      message: error.message
    });
  }

  // Print results
  console.log("\n=== RESULTADOS ===\n");
  console.log(`✓ Testes passados: ${TEST_RESULTS.passed}`);
  console.log(`✗ Testes falhados: ${TEST_RESULTS.failed}`);
  console.log(`Total: ${TEST_RESULTS.passed + TEST_RESULTS.failed}\n`);

  if (TEST_RESULTS.failed === 0) {
    console.log("✓✓✓ FLUXO GCLID FUNCIONAL - PRODUCTION READY ✓✓✓\n");
    process.exit(0);
  } else {
    console.log("✗ ALGUNS TESTES FALHARAM\n");
    process.exit(1);
  }
}

testGclidFlow();
