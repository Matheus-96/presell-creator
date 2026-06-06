'use strict';

const crypto = require('crypto');
const { verifyAdminPassword, requireAuth, requireApiAuth } = require('../middleware/auth');

function hashPassword(password, { N = 16384, r = 8, p = 1 } = {}) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${r}:${p}:${salt}:${hash.toString('hex')}`;
}

// ── verifyAdminPassword ───────────────────────────────────────────────────────

describe('verifyAdminPassword', () => {
  test('retorna true para senha correta', () => {
    const stored = hashPassword('senha-correta');
    expect(verifyAdminPassword('senha-correta', stored)).toBe(true);
  });

  test('retorna false para senha incorreta', () => {
    const stored = hashPassword('senha-correta');
    expect(verifyAdminPassword('senha-errada', stored)).toBe(false);
  });

  test('retorna false quando password é string vazia', () => {
    const stored = hashPassword('senha');
    expect(verifyAdminPassword('', stored)).toBe(false);
  });

  test('retorna false quando password é null', () => {
    const stored = hashPassword('senha');
    expect(verifyAdminPassword(null, stored)).toBe(false);
  });

  test('retorna false quando storedHash é null', () => {
    expect(verifyAdminPassword('senha', null)).toBe(false);
  });

  test('retorna false quando storedHash é string vazia', () => {
    expect(verifyAdminPassword('senha', '')).toBe(false);
  });

  test('retorna false quando storedHash não começa com "scrypt:"', () => {
    expect(verifyAdminPassword('senha', 'plaintext-hash')).toBe(false);
    expect(verifyAdminPassword('senha', 'bcrypt:$2b$...')).toBe(false);
  });

  test('retorna false quando formato do hash está incompleto (faltam partes)', () => {
    expect(verifyAdminPassword('senha', 'scrypt:16384:8')).toBe(false);
  });

  test('é case-sensitive — senhas diferentes em maiúsculas/minúsculas não batem', () => {
    const stored = hashPassword('Senha123');
    expect(verifyAdminPassword('senha123', stored)).toBe(false);
    expect(verifyAdminPassword('SENHA123', stored)).toBe(false);
  });

  test('hashes gerados com parâmetros distintos ainda verificam corretamente', () => {
    const stored = hashPassword('abc', { N: 8192, r: 4, p: 1 });
    expect(verifyAdminPassword('abc', stored)).toBe(true);
    expect(verifyAdminPassword('errado', stored)).toBe(false);
  });
});

// ── requireAuth / requireApiAuth ──────────────────────────────────────────────

describe('requireAuth', () => {
  function makeRes() {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  }

  test('chama next() quando session.isAdmin é true', () => {
    const req = { session: { isAdmin: true } };
    const next = jest.fn();
    requireAuth(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 401 quando session.isAdmin é false', () => {
    const req = { session: { isAdmin: false } };
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 quando session está ausente', () => {
    const req = { session: null };
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireApiAuth', () => {
  function makeRes() {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  }

  test('chama next() quando autenticado', () => {
    const req = { session: { isAdmin: true } };
    const next = jest.fn();
    requireApiAuth(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 401 quando não autenticado', () => {
    const req = { session: {} };
    const res = makeRes();
    const next = jest.fn();
    requireApiAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
