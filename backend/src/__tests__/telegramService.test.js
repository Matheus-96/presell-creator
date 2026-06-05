'use strict';

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

function loadService() {
  jest.resetModules();
  jest.doMock('../config/env', () => ({ loadEnv: () => {} }));
  return require('../services/telegram.service');
}

// ── no-op quando variáveis ausentes ─────────────────────────────────────────

describe('notify — sem variáveis de ambiente', () => {
  test('não chama fetch quando TELEGRAM_BOT_TOKEN está ausente', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    process.env.TELEGRAM_CHAT_ID = '123';
    const { notify } = loadService();

    await notify('presell.created', { title: 'Teste' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('não chama fetch quando TELEGRAM_CHAT_ID está ausente', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    process.env.TELEGRAM_BOT_TOKEN = 'token123';
    const { notify } = loadService();

    await notify('presell.created', { title: 'Teste' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('não chama fetch quando ambas as variáveis estão ausentes', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const { notify } = loadService();

    await notify('presell.created', { title: 'Teste' });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── chamada correta à API ────────────────────────────────────────────────────

describe('notify — com variáveis configuradas', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token-abc';
    process.env.TELEGRAM_CHAT_ID = '999';
  });

  test('chama a URL correta da Telegram API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { notify } = loadService();
    await notify('presell.created', { title: 'Meu Presell', slug: 'meu-presell' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botbot-token-abc/sendMessage');
  });

  test('envia payload com chat_id e text corretos', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { notify } = loadService();
    await notify('presell.created', { title: 'Meu Presell', slug: 'meu-presell' });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.chat_id).toBe('999');
    expect(typeof body.text).toBe('string');
    expect(body.text).toContain('Meu Presell');
  });

  test('usa method POST e Content-Type application/json', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { notify } = loadService();
    await notify('presell.created', { title: 'X' });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('tipo desconhecido usa fallback genérico no texto', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { notify } = loadService();
    await notify('evento.desconhecido', { foo: 'bar' });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.text).toContain('evento.desconhecido');
  });
});

// ── tratamento de falhas ─────────────────────────────────────────────────────

describe('notify — falhas de envio', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token-abc';
    process.env.TELEGRAM_CHAT_ID = '999';
  });

  test('não lança quando fetch rejeita', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { notify } = loadService();

    await expect(notify('presell.created', { title: 'X' })).resolves.toBeUndefined();
  });

  test('chama console.error quando fetch rejeita', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { notify } = loadService();
    await notify('presell.created', { title: 'X' });

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('não lança quando API retorna status não-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    });

    const { notify } = loadService();

    await expect(notify('presell.created', { title: 'X' })).resolves.toBeUndefined();
  });

  test('chama console.error quando API retorna status não-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { notify } = loadService();
    await notify('presell.created', { title: 'X' });

    expect(consoleSpy).toHaveBeenCalled();
  });
});
