'use strict';

jest.mock('../repositories/analyticsRepository', () => ({
  upsertTrackingSession: jest.fn(),
  getTrackingSessionParams: jest.fn(() => null),
  createEvent: jest.fn(),
}));

jest.mock('../utils/request-meta', () => ({
  extractRequestMeta: jest.fn(() => ({ country: 'BR', device_type: 'desktop' })),
}));

const analyticsRepository = require('../repositories/analyticsRepository');
const {
  getOrCreateSession,
  recordEventWithSession,
  resolveRedirect,
} = require('../services/analyticsService');

function makeReq(overrides = {}) {
  return {
    session: {},
    query: {},
    headers: {},
    get: jest.fn(() => null),
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

function makePresell(overrides = {}) {
  return {
    id: 1,
    slug: 'test',
    affiliate_url: 'https://afiliado.com',
    tracking_param: 'gclid',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getOrCreateSession ────────────────────────────────────────────────────────

describe('getOrCreateSession', () => {
  test('cria trackingKey nova na session quando ausente', () => {
    const req = makeReq();
    getOrCreateSession(req);
    expect(typeof req.session.trackingKey).toBe('string');
    expect(req.session.trackingKey.length).toBeGreaterThan(0);
  });

  test('reutiliza trackingKey existente sem sobrescrever', () => {
    const req = makeReq({ session: { trackingKey: 'chave-existente' } });
    const result = getOrCreateSession(req);
    expect(result.sessionKey).toBe('chave-existente');
    expect(req.session.trackingKey).toBe('chave-existente');
  });

  test('chama upsertTrackingSession uma vez com sessionKey correto', () => {
    const req = makeReq({ session: { trackingKey: 'k1' } });
    getOrCreateSession(req);
    expect(analyticsRepository.upsertTrackingSession).toHaveBeenCalledTimes(1);
    const call = analyticsRepository.upsertTrackingSession.mock.calls[0][0];
    expect(call.sessionKey).toBe('k1');
  });

  test('faz merge de params existentes na sessão com params recebidos na query', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValueOnce({
      params_json: '{"utm_source":"google"}',
    });
    const req = makeReq({
      session: { trackingKey: 'k2' },
      query: { utm_medium: 'cpc' },
    });
    const result = getOrCreateSession(req);
    expect(result.params.utm_source).toBe('google');
    expect(result.params.utm_medium).toBe('cpc');
  });

  test('params da query sobrescrevem params existentes em caso de conflito', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValueOnce({
      params_json: '{"gclid":"old"}',
    });
    const req = makeReq({
      session: { trackingKey: 'k3' },
      query: { gclid: 'new' },
    });
    const result = getOrCreateSession(req);
    expect(result.params.gclid).toBe('new');
  });

  test('retorna objeto vazio de params quando sessão e query não têm tracking params', () => {
    const req = makeReq({ session: { trackingKey: 'k4' } });
    const result = getOrCreateSession(req);
    expect(result.params).toEqual({});
  });
});

// ── recordEventWithSession ────────────────────────────────────────────────────

describe('recordEventWithSession', () => {
  test('chama createEvent com eventType, presellId e sessionKey corretos', () => {
    const req = makeReq();
    const presell = makePresell({ id: 42 });
    const session = { sessionKey: 'sess1', params: {} };

    recordEventWithSession(req, presell, 'page_view', session, {});

    expect(analyticsRepository.createEvent).toHaveBeenCalledTimes(1);
    const call = analyticsRepository.createEvent.mock.calls[0][0];
    expect(call.eventType).toBe('page_view');
    expect(call.presellId).toBe(42);
    expect(call.sessionKey).toBe('sess1');
  });

  test('inclui country e device_type extraídos da requisição', () => {
    const req = makeReq();
    const session = { sessionKey: 's', params: {} };

    recordEventWithSession(req, makePresell(), 'cta_click', session, {});

    const call = analyticsRepository.createEvent.mock.calls[0][0];
    expect(call.country).toBe('BR');
    expect(call.deviceType).toBe('desktop');
  });

  test('serializa params merged (session + extraParams) em paramsJson', () => {
    const req = makeReq();
    const session = { sessionKey: 's', params: { utm_source: 'google' } };

    recordEventWithSession(req, makePresell(), 'cta_click', session, { target_url: 'https://x.com' });

    const call = analyticsRepository.createEvent.mock.calls[0][0];
    const parsed = JSON.parse(call.paramsJson);
    expect(parsed.utm_source).toBe('google');
    expect(parsed.target_url).toBe('https://x.com');
  });

  test('extraParams sobrescrevem session.params em caso de conflito', () => {
    const req = makeReq();
    const session = { sessionKey: 's', params: { utm_source: 'old' } };

    recordEventWithSession(req, makePresell(), 'page_view', session, { utm_source: 'new' });

    const call = analyticsRepository.createEvent.mock.calls[0][0];
    expect(JSON.parse(call.paramsJson).utm_source).toBe('new');
  });

  test('funciona com presell null (sem presell associado)', () => {
    const req = makeReq();
    const session = { sessionKey: 's', params: {} };

    recordEventWithSession(req, null, 'error', session, {});

    const call = analyticsRepository.createEvent.mock.calls[0][0];
    expect(call.presellId).toBeNull();
  });
});

// ── resolveRedirect ───────────────────────────────────────────────────────────

describe('resolveRedirect', () => {
  test('registra eventos cta_click e redirect', () => {
    const req = makeReq({ session: { trackingKey: 'k1' } });
    const presell = makePresell();

    resolveRedirect(req, presell);

    const types = analyticsRepository.createEvent.mock.calls.map(c => c[0].eventType);
    expect(types).toContain('cta_click');
    expect(types).toContain('redirect');
  });

  test('injeta gclid da sessão no trackingParam da URL de redirect', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValue({
      params_json: '{"gclid":"gclid_value"}',
    });
    const req = makeReq({ session: { trackingKey: 'k2' } });
    const presell = makePresell({ tracking_param: 'gclid' });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('gclid=gclid_value');
  });

  test('injeta wbraid quando gclid ausente e trackingParam="wbraid"', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValue({
      params_json: '{"wbraid":"wbr_value"}',
    });
    const req = makeReq({ session: { trackingKey: 'k3' } });
    const presell = makePresell({ tracking_param: 'wbraid' });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('wbraid=wbr_value');
  });

  test('injeta gbraid quando gclid e wbraid ausentes', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValue({
      params_json: '{"gbraid":"gbr_value"}',
    });
    const req = makeReq({ session: { trackingKey: 'k4' } });
    const presell = makePresell({ tracking_param: 'gbraid' });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('gbraid=gbr_value');
  });

  test('retorna redirectUrl baseada em affiliate_url mesmo sem clickId', () => {
    const req = makeReq({ session: { trackingKey: 'k5' } });
    const presell = makePresell({ affiliate_url: 'https://afiliado.com' });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('https://afiliado.com');
    expect(result.sessionKey).toBeDefined();
  });

  test('evento de redirect contém target_url nos params', () => {
    const req = makeReq({ session: { trackingKey: 'k6' } });
    const presell = makePresell({ affiliate_url: 'https://afiliado.com' });

    resolveRedirect(req, presell);

    const redirectEvent = analyticsRepository.createEvent.mock.calls.find(
      c => c[0].eventType === 'redirect'
    );
    expect(redirectEvent).toBeDefined();
    const params = JSON.parse(redirectEvent[0].paramsJson);
    expect(params.target_url).toContain('https://afiliado.com');
  });

  test('usa "gclid" como trackingParam padrão quando presell não define', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValue({
      params_json: '{"gclid":"gc1"}',
    });
    const req = makeReq({ session: { trackingKey: 'k7' } });
    const presell = makePresell({ tracking_param: undefined });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('gclid=gc1');
  });

  test('gclid tem prioridade sobre wbraid e gbraid para seleção do clickId', () => {
    analyticsRepository.getTrackingSessionParams.mockReturnValue({
      params_json: '{"gclid":"gc1","wbraid":"wbr1","gbraid":"gbr1"}',
    });
    const req = makeReq({ session: { trackingKey: 'k8' } });
    const presell = makePresell({ tracking_param: 'gclid' });

    const result = resolveRedirect(req, presell);

    expect(result.redirectUrl).toContain('gclid=gc1');
  });
});
