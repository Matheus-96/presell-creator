'use strict';

const { collectTrackingParams, getClientIp, hashIp } = require('../middleware/tracking');

describe('collectTrackingParams', () => {
  test('coleta todos os params de tracking presentes', () => {
    const params = collectTrackingParams({
      gclid: 'abc123',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp1',
      utm_content: 'ad1',
      utm_term: 'keyword',
      utm_id: 'id1',
    });
    expect(params).toMatchObject({
      gclid: 'abc123',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp1',
      utm_content: 'ad1',
      utm_term: 'keyword',
      utm_id: 'id1',
    });
  });

  test('coleta wbraid e gbraid', () => {
    const params = collectTrackingParams({ wbraid: 'wbr1', gbraid: 'gbr1' });
    expect(params.wbraid).toBe('wbr1');
    expect(params.gbraid).toBe('gbr1');
  });

  test('ignora chaves não permitidas', () => {
    const params = collectTrackingParams({ foo: 'bar', evil: 'val', gclid: 'abc' });
    expect(params.foo).toBeUndefined();
    expect(params.evil).toBeUndefined();
    expect(params.gclid).toBe('abc');
  });

  test('ignora valores vazios', () => {
    const params = collectTrackingParams({ gclid: '', utm_source: '   ' });
    expect(params.gclid).toBeUndefined();
    expect(params.utm_source).toBeUndefined();
  });

  test('ignora valores com mais de 100 caracteres', () => {
    const long = 'a'.repeat(101);
    const params = collectTrackingParams({ gclid: long });
    expect(params.gclid).toBeUndefined();
  });

  test('aceita valor com exatamente 100 caracteres', () => {
    const exact = 'a'.repeat(100);
    const params = collectTrackingParams({ gclid: exact });
    expect(params.gclid).toBe(exact);
  });

  test('faz trim do valor antes de armazenar', () => {
    const params = collectTrackingParams({ gclid: '  abc123  ' });
    expect(params.gclid).toBe('abc123');
  });

  test('retorna objeto vazio quando query está vazia', () => {
    expect(collectTrackingParams({})).toEqual({});
  });

  test('ignora params não-string (número, objeto)', () => {
    const params = collectTrackingParams({ gclid: 123, utm_source: { x: 1 } });
    expect(params.gclid).toBeUndefined();
    expect(params.utm_source).toBeUndefined();
  });
});

describe('getClientIp', () => {
  test('usa primeiro IP do header x-forwarded-for', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      socket: { remoteAddress: '9.9.9.9' },
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  test('usa remoteAddress quando x-forwarded-for está ausente', () => {
    const req = { headers: {}, socket: { remoteAddress: '9.9.9.9' } };
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  test('retorna string vazia quando socket não tem remoteAddress', () => {
    const req = { headers: {}, socket: {} };
    expect(getClientIp(req)).toBe('');
  });

  test('ignora x-forwarded-for com valor vazio e usa remoteAddress', () => {
    const req = { headers: { 'x-forwarded-for': '' }, socket: { remoteAddress: '9.9.9.9' } };
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  test('faz trim do IP extraído do x-forwarded-for', () => {
    const req = {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
      socket: { remoteAddress: '9.9.9.9' },
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});

describe('hashIp', () => {
  test('retorna string vazia para IP falsy', () => {
    expect(hashIp('')).toBe('');
    expect(hashIp(null)).toBe('');
    expect(hashIp(undefined)).toBe('');
  });

  test('retorna hash sha256 em hex (64 chars) para IP válido', () => {
    const hash = hashIp('1.2.3.4');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('hash é determinístico para o mesmo IP', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  test('IPs diferentes produzem hashes diferentes', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('4.3.2.1'));
  });
});
