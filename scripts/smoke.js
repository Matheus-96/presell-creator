require("dotenv").config();

const app = require("../src/server");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getCookie(response, fallback = "") {
  const header = response.headers.get("set-cookie");
  return header ? header.split(";")[0] : fallback;
}

function normalizeBasePath(value, fallback) {
  const normalized = String(value || fallback).trim();
  if (!normalized || normalized === "/") {
    return "/";
  }

  return `/${normalized.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function extractCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)/);
  if (!match) {
    throw new Error("Unable to locate a CSRF token in the HTML response.");
  }

  return match[1];
}

async function readJson(response) {
  const payload = await response.text();

  try {
    return payload ? JSON.parse(payload) : null;
  } catch (error) {
    throw new Error(`Expected JSON but received: ${payload || "<empty>"}`, {
      cause: error
    });
  }
}

async function expectApiError(response, expectedStatus, expectedCode) {
  const payload = await readJson(response);

  assert(
    response.status === expectedStatus,
    `Expected status ${expectedStatus} but received ${response.status}.`
  );
  assert(
    payload && payload.error && payload.error.code === expectedCode,
    `Expected API error code ${expectedCode} but received ${JSON.stringify(payload)}.`
  );

  return payload;
}

async function expectApiSession(response, { authenticated }) {
  const payload = await readJson(response);

  assert(response.status === 200, `Expected status 200 but received ${response.status}.`);
  assert(
    Boolean(payload && payload.authenticated) === authenticated,
    `Expected authenticated=${authenticated} but received ${JSON.stringify(payload)}.`
  );
  assert(
    payload && typeof payload.csrfToken === "string" && payload.csrfToken.length > 0,
    "Expected the session response to include a CSRF token."
  );

  return payload;
}

async function main() {
  const server = app.listen(3001);
  const base = "http://127.0.0.1:3001";
  const adminFrontendPath = normalizeBasePath(process.env.ADMIN_FRONTEND_PATH, "/admin-app");
  const legacyAdminPath = normalizeBasePath(process.env.LEGACY_ADMIN_PATH, "/admin");
  const slug = `demo-smoke-${Date.now()}`;
  const credentials = {
    username: process.env.ADMIN_USER || "admin",
    password: process.env.SMOKE_ADMIN_PASSWORD || "admin123"
  };

  try {
    let response = await fetch(`${base}/health`);
    const health = await readJson(response);
    assert(response.status === 200, `Health check failed with status ${response.status}.`);
    assert(health && health.admin, "Health payload did not expose admin routing metadata.");
    assert(
      health.admin.frontendPath === adminFrontendPath,
      `Expected frontendPath ${adminFrontendPath} but received ${health.admin.frontendPath}.`
    );
    assert(
      health.admin.legacyPath === legacyAdminPath,
      `Expected legacyPath ${legacyAdminPath} but received ${health.admin.legacyPath}.`
    );

    if (health.admin.frontendBuilt) {
      response = await fetch(`${base}${adminFrontendPath}`);
      assert(response.status === 200, `Admin frontend root failed with status ${response.status}.`);
      const adminHtml = await response.text();
      assert(
        adminHtml.includes('id="root"'),
        "Admin frontend root did not return the React shell HTML."
      );

      response = await fetch(`${base}${adminFrontendPath}/login`);
      assert(response.status === 200, `Admin frontend login failed with status ${response.status}.`);
    }

    response = await fetch(`${base}/api/admin/templates`);
    await expectApiError(response, 401, "auth_required");

    response = await fetch(`${base}${legacyAdminPath}/login`);
    let legacyCookie = getCookie(response);
    assert(legacyCookie, "Legacy login did not bootstrap a session cookie.");
    const legacyLoginHtml = await response.text();
    const legacyGuestCsrf = extractCsrfToken(legacyLoginHtml);

    response = await fetch(`${base}${legacyAdminPath}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: legacyCookie
      },
      body: new URLSearchParams({
        _csrf: legacyGuestCsrf,
        username: credentials.username,
        password: credentials.password
      }),
      redirect: "manual"
    });

    assert(response.status === 302, `Legacy login failed with status ${response.status}.`);
    legacyCookie = getCookie(response, legacyCookie);

    response = await fetch(`${base}${legacyAdminPath}/presells/new`, {
      headers: { cookie: legacyCookie }
    });
    assert(response.status === 200, `Legacy auth guard failed with status ${response.status}.`);
    const legacyEditorHtml = await response.text();
    const legacyEditorCsrf = extractCsrfToken(legacyEditorHtml);
    assert(
      legacyEditorCsrf !== legacyGuestCsrf,
      "Legacy login did not rotate the CSRF token after authenticating."
    );

    response = await fetch(`${base}${legacyAdminPath}/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: legacyCookie
      },
      body: new URLSearchParams({ _csrf: legacyGuestCsrf }),
      redirect: "manual"
    });
    assert(response.status === 403, `Legacy stale-CSRF logout returned ${response.status}.`);

    response = await fetch(`${base}${legacyAdminPath}/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: legacyCookie
      },
      body: new URLSearchParams({ _csrf: legacyEditorCsrf }),
      redirect: "manual"
    });

    assert(response.status === 302, `Legacy logout failed with status ${response.status}.`);
    legacyCookie = getCookie(response, legacyCookie);

    response = await fetch(`${base}${legacyAdminPath}`, {
      headers: { cookie: legacyCookie },
      redirect: "manual"
    });
    assert(response.status === 302, `Legacy logout did not clear access (status ${response.status}).`);

    response = await fetch(`${base}/api/admin/session`);
    let apiCookie = getCookie(response);
    assert(apiCookie, "API session bootstrap did not issue a session cookie.");
    const guestSession = await expectApiSession(response, { authenticated: false });

    response = await fetch(`${base}/api/admin/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: apiCookie
      },
      body: JSON.stringify(credentials)
    });
    await expectApiError(response, 403, "csrf_required");

    response = await fetch(`${base}/api/admin/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": guestSession.csrfToken,
        cookie: apiCookie
      },
      body: JSON.stringify(credentials)
    });
    apiCookie = getCookie(response, apiCookie);
    const authenticatedSession = await expectApiSession(response, { authenticated: true });
    assert(
      authenticatedSession.csrfToken !== guestSession.csrfToken,
      "API login did not rotate the CSRF token after authenticating."
    );

    response = await fetch(`${base}/api/admin/templates`, {
      headers: { cookie: apiCookie }
    });
    assert(response.status === 200, `Authenticated template fetch failed with status ${response.status}.`);

    response = await fetch(`${base}/api/admin/session`, {
      method: "DELETE",
      headers: {
        "x-csrf-token": guestSession.csrfToken,
        cookie: apiCookie
      }
    });
    await expectApiError(response, 403, "csrf_invalid");

    response = await fetch(`${base}${legacyAdminPath}/presells/new`, {
      headers: { cookie: apiCookie }
    });
    assert(response.status === 200, `Legacy editor failed after API login with status ${response.status}.`);
    const editorHtml = await response.text();
    const editorCsrf = extractCsrfToken(editorHtml);
    assert(
      editorCsrf === authenticatedSession.csrfToken,
      "Legacy admin did not receive the rotated API CSRF token."
    );

    const form = new FormData();
    const fields = {
      _csrf: editorCsrf,
      slug,
      status: "published",
      template: "advertorial",
      title: "Demo Smoke",
      headline: "Pagina demo de validacao",
      subtitle: "Subtitulo curto",
      body: "Conteudo da presell.",
      bullets: "Beneficio 1\nBeneficio 2",
      cta_text: "Ver oferta",
      affiliate_url: "https://example.com/offer?existing=1"
    };

    Object.entries(fields).forEach(([key, value]) => {
      form.set(key, value);
    });

    response = await fetch(`${base}${legacyAdminPath}/presells`, {
      method: "POST",
      headers: { cookie: apiCookie },
      body: form,
      redirect: "manual"
    });
    assert(response.status === 302, `Create presell failed with status ${response.status}.`);

    response = await fetch(
      `${base}/p/${slug}?gclid=TeSter-123&utm_source=google&utm_campaign=camp`,
      { headers: { cookie: apiCookie } }
    );
    assert(response.status === 200, `Public page failed with status ${response.status}.`);

    response = await fetch(`${base}/go/${slug}`, {
      headers: { cookie: apiCookie },
      redirect: "manual"
    });

    const location = response.headers.get("location") || "";
    if (!location.includes("gclid=TeSter-123") || !location.includes("utm_source=google")) {
      throw new Error(`Redirect did not preserve tracking params: ${location}`);
    }

    response = await fetch(`${base}/api/admin/session`, {
      method: "DELETE",
      headers: {
        "x-csrf-token": authenticatedSession.csrfToken,
        cookie: apiCookie
      }
    });
    apiCookie = getCookie(response, apiCookie);
    const loggedOutSession = await expectApiSession(response, { authenticated: false });
    assert(
      loggedOutSession.csrfToken !== authenticatedSession.csrfToken,
      "API logout did not rotate the CSRF token."
    );

    response = await fetch(`${base}/api/admin/templates`, {
      headers: { cookie: apiCookie }
    });
    await expectApiError(response, 401, "auth_required");

    console.log(`SMOKE_OK ${location}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
