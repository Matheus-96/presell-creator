const request = require("supertest");
const path = require("path");
const fs = require("fs");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const frontendDistDir = path.join(repoRoot, "frontend", "dist");
const frontendDistIndexFile = path.join(frontendDistDir, "index.html");
const SPA_HTML = "<!doctype html><html><body>SPA</body></html>";

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

// ── Test 1: dist built → 200 HTML ─────────────────────────────────────────

describe("GET /p/:slug with dist built", () => {
  beforeAll(() => {
    fs.mkdirSync(frontendDistDir, { recursive: true });
    fs.writeFileSync(frontendDistIndexFile, SPA_HTML);
  });

  afterAll(() => {
    try { fs.unlinkSync(frontendDistIndexFile); } catch {}
  });

  test("returns 200 with HTML content (SPA index.html served)", async () => {
    const app = makeApp();
    const res = await request(app).get("/p/my-presell");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

// ── Test 2: dist NOT built → 404 ──────────────────────────────────────────

describe("GET /p/:slug without dist built", () => {
  test("returns 404 when dist does not exist", async () => {
    const app = makeApp();
    const res = await request(app).get("/p/some-presell");

    expect(res.status).toBe(404);
  });
});

// ── Test 3: /go/:slug still works ─────────────────────────────────────────

describe("GET /go/:slug", () => {
  test("still redirects (not affected by SPA change)", async () => {
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

// ── Test 4: /p/ not in Vite proxiedPaths ──────────────────────────────────

describe("Vite config", () => {
  test("/p/ is NOT in proxiedPaths", () => {
    const viteConfigPath = path.resolve(repoRoot, "frontend", "vite.config.ts");
    const content = fs.readFileSync(viteConfigPath, "utf8");

    const match = content.match(/const proxiedPaths\s*=\s*\[([^\]]*)\]/s);
    expect(match).not.toBeNull();
    expect(match[1]).not.toMatch(/['"]\/p\//);
  });
});
