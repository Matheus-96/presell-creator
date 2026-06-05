'use strict';

const { parseDevice, extractRequestMeta } = require('../utils/request-meta');

describe('parseDevice', () => {
  test('retorna null quando ua é ausente', () => {
    expect(parseDevice(null)).toBeNull();
    expect(parseDevice(undefined)).toBeNull();
    expect(parseDevice('')).toBeNull();
  });

  test('retorna "bot" para user-agents de bots', () => {
    expect(parseDevice('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe('bot');
    expect(parseDevice('facebookexternalhit/1.1')).toBe('bot');
    expect(parseDevice('Mozilla/5.0 (compatible; spider)')).toBe('bot');
    expect(parseDevice('crawl/1.0')).toBe('bot');
    expect(parseDevice('Yahoo! Slurp')).toBe('bot');
  });

  test('retorna "mobile" para user-agents de dispositivos móveis', () => {
    expect(parseDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')).toBe('mobile');
    expect(parseDevice('Mozilla/5.0 (Linux; Android 11; Pixel 5)')).toBe('mobile');
    expect(parseDevice('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('mobile');
    expect(parseDevice('Mozilla/5.0 (iPod touch; CPU iPhone OS 12_0 like Mac OS X)')).toBe('mobile');
    expect(parseDevice('Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1)')).toBe('mobile');
  });

  test('retorna "desktop" para user-agents de desktop', () => {
    expect(parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124')).toBe('desktop');
    expect(parseDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')).toBe('desktop');
  });
});

describe('extractRequestMeta', () => {
  test('retorna nulls quando req é ausente', () => {
    expect(extractRequestMeta(null)).toEqual({ country: null, device_type: null });
    expect(extractRequestMeta(undefined)).toEqual({ country: null, device_type: null });
  });

  test('retorna country null quando header cf-ipcountry ausente', () => {
    const req = { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };
    expect(extractRequestMeta(req).country).toBeNull();
  });

  test('retorna country quando header cf-ipcountry presente', () => {
    const req = { headers: { 'cf-ipcountry': 'BR', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' } };
    expect(extractRequestMeta(req).country).toBe('BR');
  });

  test('retorna device_type null quando user-agent ausente', () => {
    const req = { headers: { 'cf-ipcountry': 'US' } };
    expect(extractRequestMeta(req).device_type).toBeNull();
  });

  test('retorna device_type correto quando user-agent presente', () => {
    const req = { headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' } };
    expect(extractRequestMeta(req).device_type).toBe('mobile');
  });

  test('retorna ambos os campos quando headers presentes', () => {
    const req = {
      headers: {
        'cf-ipcountry': 'BR',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124'
      }
    };
    expect(extractRequestMeta(req)).toEqual({ country: 'BR', device_type: 'desktop' });
  });

  test('headers ausentes resultam em nulls', () => {
    const req = { headers: {} };
    expect(extractRequestMeta(req)).toEqual({ country: null, device_type: null });
  });
});
