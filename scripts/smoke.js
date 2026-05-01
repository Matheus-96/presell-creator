require("dotenv").config();

const app = require("../src/server");

async function main() {
  const server = app.listen(3001);
  const base = "http://127.0.0.1:3001";
  const slug = `demo-smoke-${Date.now()}`;

  try {
    let response = await fetch(`${base}/admin/login`);
    let cookie = response.headers.get("set-cookie").split(";")[0];
    const html = await response.text();
    const csrf = html.match(/name="_csrf" value="([^"]+)/)[1];

    response = await fetch(`${base}/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie },
      body: new URLSearchParams({
        _csrf: csrf,
        username: process.env.ADMIN_USER || "admin",
        password: process.env.SMOKE_ADMIN_PASSWORD || "admin123"
      }),
      redirect: "manual"
    });

    if (response.status !== 302) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    cookie = (response.headers.get("set-cookie") || cookie).split(";")[0];

    const form = new FormData();
    const fields = {
      _csrf: csrf,
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

    for (const [key, value] of Object.entries(fields)) {
      form.set(key, value);
    }

    response = await fetch(`${base}/admin/presells`, {
      method: "POST",
      headers: { cookie },
      body: form,
      redirect: "manual"
    });

    if (response.status !== 302) {
      throw new Error(`Create presell failed with status ${response.status}`);
    }

    response = await fetch(
      `${base}/p/${slug}?gclid=TeSter-123&utm_source=google&utm_campaign=camp`,
      { headers: { cookie } }
    );

    if (response.status !== 200) {
      throw new Error(`Public page failed with status ${response.status}`);
    }

    response = await fetch(`${base}/go/${slug}`, {
      headers: { cookie },
      redirect: "manual"
    });

    const location = response.headers.get("location") || "";
    if (!location.includes("gclid=TeSter-123") || !location.includes("utm_source=google")) {
      throw new Error(`Redirect did not preserve tracking params: ${location}`);
    }

    console.log(`SMOKE_OK ${location}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
