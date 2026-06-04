const request = require("supertest");
const path = require("path");
const fs = require("fs");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const frontendDistDir = path.join(repoRoot, "frontend", "dist");
const frontendDistIndexFile = path.join(frontendDistDir, "index.html");
const SPA_HTML = "<!doctype html><html><body>SPA</body></html>";
const RENDERED_HTML = "<!doctype html><html><body><h1>Headline Real</h1></body></html>";

function makeSessionStore() {
  return class {
    on() {}
    get(sid, cb) { cb(null, null); }
    set(sid, session, cb) { if (cb) cb(null); }
    destroy(sid, cb) { if (cb) cb(null); }
  };
}

function makeApp(extraMocks = {}) {
  jest.resetModules();

  jest.doMock("../db/migrations", () => ({ migrate: jest.fn() }));
  jest.doMock("../db/sessionStore", () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock("../services/presellService", () => ({
    getPublishedPresell: extraMocks.getPublishedPresell ?? jest.fn(() => null)
  }));
  jest.doMock("../services/analyticsService", () => ({
    getOrCreateSession: jest.fn(() => ({ params: {} })),
    recordEventWithSession: jest.fn(),
    resolveRedirect: jest.fn(() => ({ redirectUrl: "https://example.com" }))
  }));

  const createApp = require("../bootstrap/createApp");
  return createApp();
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Presell published com rendered_html → serve HTML estático ──────────────

describe("GET /p/:slug with rendered_html", () => {
  test("returns 200, text/html and the stored HTML", async () => {
    const app = makeApp({
      getPublishedPresell: jest.fn(() => ({
        id: 1,
        slug: "meu-presell",
        status: "published",
        rendered_html: RENDERED_HTML
      }))
    });

    const res = await request(app).get("/p/meu-presell");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toBe(RENDERED_HTML);
    expect(res.text).toContain("Headline Real");
  });
});

// ── Presell published sem rendered_html → fallback SPA ─────────────────────

describe("GET /p/:slug without rendered_html (legacy fallback)", () => {
  beforeAll(() => {
    fs.mkdirSync(frontendDistDir, { recursive: true });
    fs.writeFileSync(frontendDistIndexFile, SPA_HTML);
  });

  afterAll(() => {
    try { fs.unlinkSync(frontendDistIndexFile); } catch {}
  });

  test("falls back to the SPA index.html", async () => {
    const app = makeApp({
      getPublishedPresell: jest.fn(() => ({
        id: 2,
        slug: "legado",
        status: "published",
        rendered_html: null
      }))
    });

    const res = await request(app).get("/p/legado");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("SPA");
  });
});

// ── Presell draft / inexistente → 404 ──────────────────────────────────────

describe("GET /p/:slug for draft or missing presell", () => {
  test("returns 404 when getPublishedPresell returns null (draft or missing)", async () => {
    const app = makeApp({
      getPublishedPresell: jest.fn(() => null)
    });

    const res = await request(app).get("/p/inexistente");

    expect(res.status).toBe(404);
  });
});

// ── /go/:slug still works ──────────────────────────────────────────────────

describe("GET /go/:slug", () => {
  test("still redirects (not affected by SSR change)", async () => {
    const app = makeApp({
      getPublishedPresell: jest.fn(() => ({
        id: 1,
        slug: "test-slug",
        title: "Test",
        affiliate_url: "https://affiliate.example.com",
        utm_source: null
      }))
    });
    const res = await request(app).get("/go/test-slug");

    expect(res.status).not.toBe(500);
    expect([301, 302]).toContain(res.status);
  });
});

// ── /p/ not in Vite proxiedPaths ───────────────────────────────────────────

describe("Vite config", () => {
  test("/p/ is NOT in proxiedPaths", () => {
    const viteConfigPath = path.resolve(repoRoot, "frontend", "vite.config.ts");
    const content = fs.readFileSync(viteConfigPath, "utf8");

    const match = content.match(/const proxiedPaths\s*=\s*\[([^\]]*)\]/s);
    expect(match).not.toBeNull();
    expect(match[1]).not.toMatch(/['"]\/p\//);
  });
});
