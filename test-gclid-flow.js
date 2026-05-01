#!/usr/bin/env node
/**
 * Teste completo do fluxo de gclid
 * Testa captura, armazenamento e redirect com preservação de gclid
 */

const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");

const BASE_URL = "http://localhost:3000";
const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

// Simulate cookie jar
let cookies = {};

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

    // Add cookies
    if (Object.keys(cookies).length > 0) {
      const cookieHeader = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
      requestOptions.headers["Cookie"] = cookieHeader;
    }

    const req = http.request(requestOptions, (res) => {
      // Store cookies
      if (res.headers["set-cookie"]) {
        res.headers["set-cookie"].forEach((cookie) => {
          const [kv] = cookie.split(";");
          const [key, value] = kv.split("=");
          cookies[key.trim()] = value.trim();
        });
      }

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
    // Step 1: Login admin
    console.log("1. Fazendo login admin...");
    const loginPage = await request("GET", "/admin/login");
    const csrfToken = loginPage.body.match(/name="_csrf" value="([^"]+)"/)[1];

    const loginRes = await request("POST", "/admin/login", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: {
        username: "admin",
        password: "admin123",
        _csrf: csrfToken
      }
    });

    assert(
      loginRes.url === "/admin",
      "Login redireciona para /admin"
    );

    // Step 2: Criar presell de teste
    console.log("\n2. Criando presell de teste...");
    const newPresellPage = await request("GET", "/admin/presells/new");
    const csrfNew = newPresellPage.body.match(/name="csrf_token" value="([^"]+)"/)[1];

    const createRes = await request("POST", "/admin/presells", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: {
        slug: "test-gclid-" + Date.now(),
        status: "published",
        template: "advertorial",
        title: "Test Presell for GCLID",
        headline: "Test Headline",
        subtitle: "Test Subtitle",
        body: "Test Body",
        bullets: "Bullet 1\nBullet 2",
        cta_text: "Click to continue",
        affiliate_url: "https://example.com/affiliate",
        settings_json: "{}",
        csrf_token: csrfNew
      }
    });

    const presellSlug = createRes.url.match(/presells\/([^/]+)\/edit/)[1];
    assert(createRes.status === 302, "Presell criado com sucesso (redirect 302)");

    // Step 3: Acessar presell com gclid e verificar captura
    console.log("\n3. Acessando presell com gclid...");
    const testGclid = "ABC123XYZ789";
    const testUtmSource = "google";

    // Clear cookies para simular novo visitante
    cookies = {};

    const presellRes = await request(
      "GET",
      `/p/${presellSlug}?gclid=${testGclid}&utm_source=${testUtmSource}`
    );

    assert(
      presellRes.status === 200,
      "Presell é acessível com gclid"
    );
    assert(
      presellRes.body.includes("Test Presell for GCLID"),
      "Página do presell carregou corretamente"
    );

    // Step 4: Verificar dados no banco de dados
    console.log("\n4. Verificando dados armazenados no banco de dados...");
    const dbCheck = require("./src/db/connection").db;

    const sessions = dbCheck
      .prepare("SELECT * FROM tracking_sessions ORDER BY updated_at DESC LIMIT 1")
      .all();
    
    assert(sessions.length > 0, "Sessão foi criada no banco de dados");

    if (sessions.length > 0) {
      const params = JSON.parse(sessions[0].params_json);
      assert(
        params.gclid === testGclid,
        `GCLID capturado: ${params.gclid} === ${testGclid}`
      );
      assert(
        params.utm_source === testUtmSource,
        `UTM Source capturado: ${params.utm_source} === ${testUtmSource}`
      );
    }

    const events = dbCheck
      .prepare(
        `SELECT * FROM events WHERE event_type = 'page_view' ORDER BY created_at DESC LIMIT 1`
      )
      .all();

    assert(events.length > 0, "Event page_view foi registrado");

    if (events.length > 0) {
      const eventParams = JSON.parse(events[0].params_json);
      assert(
        eventParams.gclid === testGclid,
        `GCLID no event: ${eventParams.gclid} === ${testGclid}`
      );
    }

    // Step 5: Clicar no CTA (simular redirect)
    console.log("\n5. Simulando clique no CTA button...");
    const redirectRes = await request("GET", `/go/${presellSlug}`);

    assert(
      redirectRes.status === 302,
      "Clique no CTA retorna redirect 302"
    );
    assert(
      redirectRes.url !== null,
      "URL de redirect foi fornecida"
    );

    // Step 6: Verificar que gclid está na URL de redirect
    if (redirectRes.url) {
      const redirectUrl = new URL(redirectRes.url);
      const gclidParam = redirectUrl.searchParams.get("gclid");
      assert(
        gclidParam === testGclid,
        `GCLID preservado no redirect: ${gclidParam} === ${testGclid}`
      );

      console.log(`\n   URL de redirect: ${redirectRes.url}`);
    }

    // Step 7: Verificar CTA click event
    console.log("\n6. Verificando eventos registrados...");
    const ctaEvents = dbCheck
      .prepare(
        `SELECT * FROM events WHERE event_type = 'cta_click' ORDER BY created_at DESC LIMIT 1`
      )
      .all();

    assert(ctaEvents.length > 0, "Event cta_click foi registrado");

    if (ctaEvents.length > 0) {
      const ctaParams = JSON.parse(ctaEvents[0].params_json);
      assert(
        ctaParams.gclid === testGclid,
        `GCLID no cta_click event: ${ctaParams.gclid} === ${testGclid}`
      );
    }

    // Step 8: Verificar analytics overview
    console.log("\n7. Verificando analytics...");
    const { getOverview } = require("./src/services/analyticsService");
    const overview = getOverview();

    assert(overview.totals.views > 0, "Overview mostra views");
    assert(overview.totals.clicks > 0, "Overview mostra clicks");
    assert(overview.totals.ctr > 0, "CTR foi calculado corretamente");

    // Step 9: Testar edge cases
    console.log("\n8. Testando edge cases...");

    // Edge case 1: gclid vazio
    cookies = {};
    const emptyGclidRes = await request(
      "GET",
      `/p/${presellSlug}?gclid=&utm_source=test`
    );
    assert(
      emptyGclidRes.status === 200,
      "Presell com gclid vazio é acessível"
    );

    // Edge case 2: gclid muito longo (>100 chars)
    cookies = {};
    const longGclid =
      "A".repeat(101) + "TOOLONG";
    const longGclidRes = await request(
      "GET",
      `/p/${presellSlug}?gclid=${longGclid}&utm_source=test`
    );

    assert(
      longGclidRes.status === 200,
      "Presell com gclid longo é acessível (mas rejeitado pela validação)"
    );

    // Verificar que gclid muito longo foi rejeitado
    const longSessions = dbCheck
      .prepare(
        "SELECT * FROM tracking_sessions ORDER BY updated_at DESC LIMIT 1"
      )
      .all();

    if (longSessions.length > 0) {
      const params = JSON.parse(longSessions[0].params_json);
      assert(
        !params.gclid || params.gclid.length <= 100,
        `GCLID muito longo foi rejeitado (validação de 100 chars)`
      );
    }

    // Edge case 3: gclid com caracteres especiais
    cookies = {};
    const specialGclid = "ABC-123_XYZ.789";
    const specialGclidRes = await request(
      "GET",
      `/p/${presellSlug}?gclid=${encodeURIComponent(specialGclid)}`
    );

    assert(
      specialGclidRes.status === 200,
      "Presell com gclid com caracteres especiais é acessível"
    );

    // Step 10: Testes múltiplos presells com diferentes gclids
    console.log("\n9. Testando múltiplos presells com diferentes gclids...");

    // Criar segundo presell
    const newPresellPage2 = await request("GET", "/admin/presells/new");
    const csrfNew2 = newPresellPage2.body.match(/name="csrf_token" value="([^"]+)"/)[1];

    const createRes2 = await request("POST", "/admin/presells", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: {
        slug: "test-gclid-2-" + Date.now(),
        status: "published",
        template: "advertorial",
        title: "Test Presell 2",
        headline: "Test Headline 2",
        body: "Test Body 2",
        bullets: "Bullet",
        cta_text: "Click",
        affiliate_url: "https://example.com/aff2",
        settings_json: "{}",
        csrf_token: csrfNew2
      }
    });

    const presellSlug2 = createRes2.url.match(/presells\/([^/]+)\/edit/)[1];

    // Clear cookies e acessar presell 2 com gclid diferente
    cookies = {};
    const gclid2 = "XYZ999ABC";
    const presellRes2 = await request(
      "GET",
      `/p/${presellSlug2}?gclid=${gclid2}&utm_source=facebook`
    );

    assert(
      presellRes2.status === 200,
      "Segundo presell com gclid diferente é acessível"
    );

    // Verificar que sessions têm gclids diferentes
    const allSessions = dbCheck
      .prepare("SELECT params_json FROM tracking_sessions ORDER BY created_at DESC LIMIT 2")
      .all();

    if (allSessions.length >= 2) {
      const params1 = JSON.parse(allSessions[1].params_json);
      const params2 = JSON.parse(allSessions[0].params_json);

      assert(
        (params1.gclid === testGclid || params1.gclid === gclid2) &&
        (params2.gclid === testGclid || params2.gclid === gclid2),
        "Múltiplas sessões com diferentes gclids foram registradas"
      );
    }

    // Step 11: Verificar queries de banco de dados
    console.log("\n10. Verificando queries de banco de dados...");

    const sessionCount = dbCheck
      .prepare("SELECT COUNT(*) as count FROM tracking_sessions WHERE params_json LIKE '%gclid%'")
      .get();

    assert(
      sessionCount.count > 0,
      `Sessões com gclid existem: ${sessionCount.count}`
    );

    const eventCount = dbCheck
      .prepare(
        "SELECT COUNT(*) as count FROM events WHERE params_json LIKE '%gclid%'"
      )
      .get();

    assert(
      eventCount.count > 0,
      `Eventos com gclid existem: ${eventCount.count}`
    );

    const gclidEvents = dbCheck
      .prepare(
        `SELECT event_type, COUNT(*) as count FROM events 
         WHERE params_json LIKE '%gclid%' 
         GROUP BY event_type 
         ORDER BY count DESC`
      )
      .all();

    console.log("\n   Distribuição de eventos com gclid:");
    gclidEvents.forEach(row => {
      console.log(`   - ${row.event_type}: ${row.count}`);
    });

  } catch (error) {
    console.error("ERRO:", error.message);
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
    console.log("✓ FLUXO GCLID FUNCIONAL - PRODUCTION READY ✓\n");
    process.exit(0);
  } else {
    console.log("✗ ALGUNS TESTES FALHARAM\n");
    process.exit(1);
  }
}

testGclidFlow();
