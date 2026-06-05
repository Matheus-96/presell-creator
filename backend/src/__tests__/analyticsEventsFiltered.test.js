const { DatabaseSync } = require("node:sqlite");

let db;
let getPresellEventsPaginated;

function insertEvent(db, overrides = {}) {
  const base = {
    presell_id: 1,
    session_key: "sess",
    event_type: "page_view",
    params_json: "{}",
    referrer: "",
    user_agent: "",
    ip_hash: "",
    country: null,
    device_type: null,
    created_at: new Date().toISOString(),
  };
  const e = { ...base, ...overrides };
  db.prepare(
    `INSERT INTO events (presell_id, session_key, event_type, params_json, referrer, user_agent, ip_hash, country, device_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    e.presell_id, e.session_key, e.event_type, e.params_json,
    e.referrer, e.user_agent, e.ip_hash, e.country, e.device_type, e.created_at
  );
}

beforeAll(() => {
  jest.resetModules();

  db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE tracking_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL UNIQUE,
      params_json TEXT NOT NULL DEFAULT '{}',
      referrer TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_hash TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE presells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      template TEXT NOT NULL DEFAULT 'advertorial',
      title TEXT NOT NULL,
      headline TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      body TEXT DEFAULT '',
      bullets TEXT DEFAULT '',
      cta_text TEXT NOT NULL DEFAULT 'Continuar',
      affiliate_url TEXT NOT NULL,
      image_path TEXT DEFAULT '',
      settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presell_id INTEGER,
      session_key TEXT DEFAULT '',
      event_type TEXT NOT NULL,
      params_json TEXT NOT NULL DEFAULT '{}',
      referrer TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_hash TEXT DEFAULT '',
      country TEXT,
      device_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (presell_id) REFERENCES presells(id) ON DELETE SET NULL
    );
    CREATE TABLE uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec("PRAGMA foreign_keys = OFF;");

  jest.doMock("../db/connection", () => ({ db }));

  const repo = require("../repositories/analyticsRepository");
  getPresellEventsPaginated = repo.getPresellEventsPaginated;
});

afterAll(() => {
  jest.resetModules();
});

beforeEach(() => {
  db.exec("DELETE FROM events");
});

describe("getPresellEventsPaginated — sem filtros", () => {
  test("retorna até 50 eventos do presell ordenados por data desc", () => {
    for (let i = 1; i <= 60; i++) {
      insertEvent(db, {
        presell_id: 1,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      });
    }

    const { rows, total } = getPresellEventsPaginated(1, 1);

    expect(rows).toHaveLength(50);
    expect(total).toBe(60);
    // ordena desc: primeiro item tem created_at maior
    expect(rows[0].created_at > rows[49].created_at).toBe(true);
  });

  test("não retorna eventos de outro presell", () => {
    insertEvent(db, { presell_id: 1 });
    insertEvent(db, { presell_id: 2 });

    const { rows, total } = getPresellEventsPaginated(1, 1);

    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
  });
});

describe("getPresellEventsPaginated — filtro hasClickId", () => {
  test("hasClickId=true retorna apenas eventos com gclid, gbraid ou wbraid", () => {
    insertEvent(db, { params_json: '{"gclid":"abc"}' });
    insertEvent(db, { params_json: '{"gbraid":"def"}' });
    insertEvent(db, { params_json: '{"wbraid":"ghi"}' });
    insertEvent(db, { params_json: '{}' });
    insertEvent(db, { params_json: '{"utm_source":"google"}' });

    const { rows, total } = getPresellEventsPaginated(1, 1, { hasClickId: true });

    expect(rows).toHaveLength(3);
    expect(total).toBe(3);
    for (const row of rows) {
      const params = JSON.parse(row.params_json);
      expect(params.gclid || params.gbraid || params.wbraid).toBeTruthy();
    }
  });

  test("sem hasClickId retorna todos os eventos", () => {
    insertEvent(db, { params_json: '{"gclid":"abc"}' });
    insertEvent(db, { params_json: '{}' });

    const { rows, total } = getPresellEventsPaginated(1, 1);

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
  });
});

describe("getPresellEventsPaginated — filtro de data", () => {
  test("from exclui eventos anteriores ao limite", () => {
    insertEvent(db, { created_at: "2024-01-01T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-06-15T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-12-31T00:00:00.000Z" });

    const { rows, total } = getPresellEventsPaginated(1, 1, { from: "2024-06-01T00:00:00.000Z" });

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
  });

  test("to exclui eventos posteriores ao limite", () => {
    insertEvent(db, { created_at: "2024-01-01T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-06-15T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-12-31T00:00:00.000Z" });

    const { rows, total } = getPresellEventsPaginated(1, 1, { to: "2024-06-30T23:59:59.000Z" });

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
  });

  test("from e to combinados retornam apenas eventos dentro do intervalo", () => {
    insertEvent(db, { created_at: "2024-01-01T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-03-15T00:00:00.000Z" });
    insertEvent(db, { created_at: "2024-12-31T00:00:00.000Z" });

    const { rows, total } = getPresellEventsPaginated(1, 1, {
      from: "2024-02-01T00:00:00.000Z",
      to: "2024-06-30T23:59:59.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
  });
});

describe("getPresellEventsPaginated — filtros de device e country", () => {
  test("device filtra por device_type", () => {
    insertEvent(db, { device_type: "mobile" });
    insertEvent(db, { device_type: "desktop" });
    insertEvent(db, { device_type: "mobile" });

    const { rows, total } = getPresellEventsPaginated(1, 1, { device: "mobile" });

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
    for (const row of rows) {
      expect(row.device_type).toBe("mobile");
    }
  });

  test("country filtra por country", () => {
    insertEvent(db, { country: "BR" });
    insertEvent(db, { country: "US" });
    insertEvent(db, { country: "BR" });

    const { rows, total } = getPresellEventsPaginated(1, 1, { country: "BR" });

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
    for (const row of rows) {
      expect(row.country).toBe("BR");
    }
  });

  test("device e country combinados retornam interseção correta", () => {
    insertEvent(db, { device_type: "mobile", country: "BR" });
    insertEvent(db, { device_type: "desktop", country: "BR" });
    insertEvent(db, { device_type: "mobile", country: "US" });

    const { rows, total } = getPresellEventsPaginated(1, 1, { device: "mobile", country: "BR" });

    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
    expect(rows[0].device_type).toBe("mobile");
    expect(rows[0].country).toBe("BR");
  });
});

describe("getPresellEventsPaginated — paginação", () => {
  test("página 2 retorna o segundo lote e total não muda", () => {
    for (let i = 0; i < 70; i++) {
      insertEvent(db, { created_at: new Date(Date.now() + i * 1000).toISOString() });
    }

    const page1 = getPresellEventsPaginated(1, 1);
    const page2 = getPresellEventsPaginated(1, 2);

    expect(page1.rows).toHaveLength(50);
    expect(page2.rows).toHaveLength(20);
    expect(page1.total).toBe(70);
    expect(page2.total).toBe(70);

    const idsPage1 = new Set(page1.rows.map((r) => r.id));
    for (const row of page2.rows) {
      expect(idsPage1.has(row.id)).toBe(false);
    }
  });

  test("filtros são mantidos ao trocar de página", () => {
    for (let i = 0; i < 60; i++) {
      insertEvent(db, {
        params_json: '{"gclid":"abc"}',
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      });
    }
    for (let i = 0; i < 10; i++) {
      insertEvent(db, { params_json: '{}' });
    }

    const page1 = getPresellEventsPaginated(1, 1, { hasClickId: true });
    const page2 = getPresellEventsPaginated(1, 2, { hasClickId: true });

    expect(page1.total).toBe(60);
    expect(page2.total).toBe(60);
    expect(page1.rows).toHaveLength(50);
    expect(page2.rows).toHaveLength(10);
  });
});
