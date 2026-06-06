'use strict';

const {
  createCsrfToken,
  ensureCsrfToken,
  getCsrfTokenFromRequest,
  verifyApiCsrf,
  verifyCsrf,
} = require('../middleware/csrf');

// ── createCsrfToken ───────────────────────────────────────────────────────────

describe('createCsrfToken', () => {
  test('retorna string hex de 48 chars (24 bytes em hex)', () => {
    expect(createCsrfToken()).toMatch(/^[0-9a-f]{48}$/);
  });

  test('tokens gerados são únicos entre si', () => {
    const tokens = new Set(Array.from({ length: 10 }, createCsrfToken));
    expect(tokens.size).toBe(10);
  });
});

// ── ensureCsrfToken ───────────────────────────────────────────────────────────

describe('ensureCsrfToken', () => {
  test('cria e armazena token na session quando ausente', () => {
    const req = { session: {} };
    const token = ensureCsrfToken(req);
    expect(token).toBeTruthy();
    expect(req.session.csrfToken).toBe(token);
  });

  test('retorna token existente sem gerar um novo', () => {
    const req = { session: { csrfToken: 'token-existente' } };
    const token = ensureCsrfToken(req);
    expect(token).toBe('token-existente');
  });

  test('retorna null quando session é null', () => {
    expect(ensureCsrfToken({ session: null })).toBeNull();
  });

  test('retorna null quando session está ausente no objeto', () => {
    expect(ensureCsrfToken({})).toBeNull();
  });
});

// ── getCsrfTokenFromRequest ───────────────────────────────────────────────────

describe('getCsrfTokenFromRequest', () => {
  test('lê do body._csrf', () => {
    const req = { body: { _csrf: 'tok1' }, headers: {} };
    expect(getCsrfTokenFromRequest(req)).toBe('tok1');
  });

  test('lê do header x-csrf-token', () => {
    const req = { body: {}, headers: { 'x-csrf-token': 'tok2' } };
    expect(getCsrfTokenFromRequest(req)).toBe('tok2');
  });

  test('lê do header x-csrftoken', () => {
    const req = { body: {}, headers: { 'x-csrftoken': 'tok3' } };
    expect(getCsrfTokenFromRequest(req)).toBe('tok3');
  });

  test('lê do body.csrfToken', () => {
    const req = { body: { csrfToken: 'tok4' }, headers: {} };
    expect(getCsrfTokenFromRequest(req)).toBe('tok4');
  });

  test('retorna null quando nenhuma fonte possui token', () => {
    const req = { body: {}, headers: {} };
    expect(getCsrfTokenFromRequest(req)).toBeNull();
  });

  test('prioriza body._csrf sobre x-csrf-token', () => {
    const req = { body: { _csrf: 'do-body' }, headers: { 'x-csrf-token': 'do-header' } };
    expect(getCsrfTokenFromRequest(req)).toBe('do-body');
  });
});

// ── verifyApiCsrf — códigos de erro retornados ────────────────────────────────

describe('verifyApiCsrf — códigos de erro', () => {
  function makeRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
  }
  function baseReq(token, sessionToken) {
    return {
      session: { csrfToken: sessionToken },
      body: token ? { _csrf: token } : {},
      headers: {},
      path: '/api/x',
      method: 'POST',
      sessionID: 'sid',
    };
  }

  test('responde com código csrf_required quando nenhum token enviado', () => {
    const res = makeRes();
    verifyApiCsrf(baseReq(null, 'tok'), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'csrf_required' }) })
    );
  });

  test('responde com código csrf_invalid quando token não bate', () => {
    const res = makeRes();
    verifyApiCsrf(baseReq('errado', 'correto'), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'csrf_invalid' }) })
    );
  });
});

// ── verifyApiCsrf middleware ──────────────────────────────────────────────────

describe('verifyApiCsrf', () => {
  function makeRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
  }
  function makeReq(token, sessionToken) {
    return {
      session: { csrfToken: sessionToken },
      body: token ? { _csrf: token } : {},
      headers: {},
      path: '/api/test',
      method: 'POST',
      sessionID: 'sid-abc',
    };
  }

  test('chama next() quando token é válido', () => {
    const next = jest.fn();
    verifyApiCsrf(makeReq('tok', 'tok'), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 403 quando token está ausente', () => {
    const res = makeRes();
    const next = jest.fn();
    verifyApiCsrf(makeReq(null, 'tok'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 403 quando token é inválido', () => {
    const res = makeRes();
    const next = jest.fn();
    verifyApiCsrf(makeReq('errado', 'correto'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── verifyCsrf middleware (legado) ────────────────────────────────────────────

describe('verifyCsrf', () => {
  function makeRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
  }

  test('chama next() quando token é válido', () => {
    const req = {
      session: { csrfToken: 'tok' },
      body: { _csrf: 'tok' },
      headers: {},
      path: '/form',
      method: 'POST',
      sessionID: 'sid',
    };
    const next = jest.fn();
    verifyCsrf(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 403 quando token está ausente', () => {
    const req = {
      session: { csrfToken: 'tok' },
      body: {},
      headers: {},
      path: '/form',
      method: 'POST',
      sessionID: 'sid',
    };
    const res = makeRes();
    const next = jest.fn();
    verifyCsrf(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
