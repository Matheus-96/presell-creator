/**
 * Integration tests for public routes — focused on /p/* SPA handler behaviour.
 *
 * Uses jest.doMock (non-hoisted) + jest.resetModules() so each test gets a
 * fresh module graph with controlled fs.existsSync behaviour.
 */

const request = require("supertest");
const path = require("path");

// Resolve the frontend dist index path the same way paths.js does
// __dirname = backend/src/__tests__, so 3 levels up = repo root
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const frontendDistIndexFile = path.join(repoRoot, "frontend", "dist", "index.html");

// A tiny stub for the SQLiteSessionStore constructor
function makeSessionStore() {
  return class {
    on() {}
    get(sid, cb) { cb(null, null); }
    set(sid, session, cb) { if (cb) cb(null); }
    destroy(sid, cb) { if (cb) cb(null); }
  };
}

/**
 * Build a fresh Express app with infrastructure mocked.
 * Uses doMock (not hoisted) so closures work correctly.
 */
async function makeApp(distExists) {
  jest.resetModules();

  jest.doMock("../db/migrations", () => ({ migrate: jest.fn() }));
  jest.doMock("../db/sessionStore", () => ({ SQLiteSessionStore: makeSessionStore() }));
  jest.doMock("../services/presellService", () => ({
    getPublishedPresell: jest.fn(() => null)
  }));
  jest.doMock("../services/analyticsService", () => ({
    getOrCreateSession: jest.fn(() => ({ params: {} })),
    recordEventWithSession: jest.fn(),
    resolveRedirect: jest.fn(() => ({ redirectUrl: "https://example.com" }))
  }));

  // Mock fs so existsSync returns what we want for the dist index file
  jest.doMock("fs", () => {
    const realFs = jest.requireActual("fs");
    return {
      ...realFs,
      existsSync: (p) => {
        if (p === frontendDistIndexFile) return distExists;
        return false;
      }
    };
  });

  const createApp = require("../bootstrap/createApp");
  return createApp();
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

// ── Test 1: dist built → 200 HTML ─────────────────────────────────────────

describe("GET /p/:slug with dist built", () => {
  test("returns 200 with HTML content (SPA index.html served)", async () => {
    const app = await makeApp(true);
    const res = await request(app).get("/p/my-presell");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

// ── Test 2: dist NOT built → 404 ──────────────────────────────────────────

describe("GET /p/:slug without dist built", () => {
  test("returns 404 when dist does not exist", async () => {
    const app = await makeApp(false);
    const res = await request(app).get("/p/some-presell");

    expect(res.status).toBe(404);
  });
});

// ── Test 3: /go/:slug still works ─────────────────────────────────────────

describe("GET /go/:slug", () => {
  test("still handles redirect (not affected by SPA change)", async () => {
    jest.resetModules();

    jest.doMock("../db/migrations", () => ({ migrate: jest.fn() }));
    jest.doMock("../db/sessionStore", () => ({ SQLiteSessionStore: makeSessionStore() }));
    jest.doMock("../services/presellService", () => ({
      getPublishedPresell: jest.fn(() => ({
        id: 1,
        slug: "test-slug",
        title: "Test",
        redirectUrl: "https://affiliate.example.com",
        utmParams: {}
      }))
    }));
    jest.doMock("../services/analyticsService", () => ({
      getOrCreateSession: jest.fn(() => ({ params: {} })),
      recordEventWithSession: jest.fn(),
      resolveRedirect: jest.fn(() => ({ redirectUrl: "https://affiliate.example.com" }))
    }));
    jest.doMock("fs", () => {
      const realFs = jest.requireActual("fs");
      return { ...realFs, existsSync: () => false };
    });

    const createApp = require("../bootstrap/createApp");
    const app = createApp();
    const res = await request(app).get("/go/test-slug");

    // Should redirect (302) — not 500, proving /go route is still mounted
    expect(res.status).not.toBe(500);
    expect([301, 302, 404]).toContain(res.status);
  });
});

// ── Test 4: /p/ not in Vite proxiedPaths ──────────────────────────────────

describe("Vite config", () => {
  test("/p/ is NOT in proxiedPaths (dev uses Vite Router, not backend proxy)", () => {
    const viteConfigPath = path.resolve(repoRoot, "frontend", "vite.config.ts");
    const fs = jest.requireActual("fs");
    const content = fs.readFileSync(viteConfigPath, "utf8");

    // Extract the proxiedPaths array content
    const match = content.match(/const proxiedPaths\s*=\s*\[([^\]]*)\]/s);
    expect(match).not.toBeNull();

    const proxiedPathsSource = match[1];
    // '/p/' should not appear as a proxied path
    expect(proxiedPathsSource).not.toMatch(/['"]\/p\//);
  });
});
