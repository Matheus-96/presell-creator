'use strict';

const { buildAffiliateUrl, buildRedirectUrl } = require('../services/urlBuilder');

describe('buildAffiliateUrl', () => {
  test('adiciona params de tracking na URL afiliada', () => {
    const url = buildAffiliateUrl('https://example.com', { utm_source: 'google', utm_medium: 'cpc' });
    expect(url).toContain('utm_source=google');
    expect(url).toContain('utm_medium=cpc');
  });

  test('não sobrescreve params já presentes na URL base', () => {
    const url = buildAffiliateUrl('https://example.com?utm_source=existing', { utm_source: 'new' });
    expect(url).toContain('utm_source=existing');
    expect(url).not.toContain('utm_source=new');
  });

  test('retorna URL intacta quando params vazio', () => {
    const url = buildAffiliateUrl('https://example.com', {});
    expect(url).toMatch(/^https:\/\/example\.com/);
    expect(url).not.toContain('=');
  });

  test('adiciona gclid se presente nos params', () => {
    const url = buildAffiliateUrl('https://example.com', { gclid: 'abc123' });
    expect(url).toContain('gclid=abc123');
  });

  test('adiciona wbraid e gbraid quando presentes', () => {
    const url = buildAffiliateUrl('https://example.com', { wbraid: 'wbr1', gbraid: 'gbr1' });
    expect(url).toContain('wbraid=wbr1');
    expect(url).toContain('gbraid=gbr1');
  });

  test('adiciona todos os params utm de uma vez', () => {
    const params = {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp1',
      utm_content: 'ad1',
      utm_term: 'keyword',
      utm_id: 'id123',
    };
    const url = buildAffiliateUrl('https://example.com', params);
    for (const [k, v] of Object.entries(params)) {
      expect(url).toContain(`${k}=${v}`);
    }
  });
});

describe('buildRedirectUrl', () => {
  test('injeta gclid no trackingParam "gclid"', () => {
    const url = buildRedirectUrl('https://example.com', {}, 'gclid123', 'gclid');
    expect(url).toContain('gclid=gclid123');
  });

  test('injeta wbraid quando trackingParam="wbraid"', () => {
    const url = buildRedirectUrl('https://example.com', {}, 'wbr_value', 'wbraid');
    expect(url).toContain('wbraid=wbr_value');
  });

  test('injeta gbraid quando trackingParam="gbraid"', () => {
    const url = buildRedirectUrl('https://example.com', {}, 'gbr_value', 'gbraid');
    expect(url).toContain('gbraid=gbr_value');
  });

  test('não injeta clickId se já presente na URL afiliada', () => {
    const url = buildRedirectUrl('https://example.com?gclid=existing', {}, 'new', 'gclid');
    expect(url).toContain('gclid=existing');
    expect(url).not.toContain('gclid=new');
  });

  test('não injeta clickId quando null', () => {
    const url = buildRedirectUrl('https://example.com', {}, null, 'gclid');
    expect(url).not.toContain('gclid');
  });

  test('não injeta clickId quando string vazia', () => {
    const url = buildRedirectUrl('https://example.com', {}, '', 'gclid');
    expect(url).not.toContain('gclid');
  });

  test('injeta utm_source e utm_medium vindos de params', () => {
    const url = buildRedirectUrl('https://example.com', { utm_source: 'google', utm_medium: 'cpc' }, null, 'gclid');
    expect(url).toContain('utm_source=google');
    expect(url).toContain('utm_medium=cpc');
  });

  test('combina clickId com outros params de tracking', () => {
    const url = buildRedirectUrl('https://example.com', { utm_source: 'google' }, 'gclid123', 'gclid');
    expect(url).toContain('utm_source=google');
    expect(url).toContain('gclid=gclid123');
  });

  test('não sobrescreve params já presentes na URL afiliada', () => {
    const url = buildRedirectUrl('https://example.com?utm_source=existing', { utm_source: 'new' }, null, 'gclid');
    expect(url).toContain('utm_source=existing');
    expect(url).not.toContain('utm_source=new');
  });

  test('URL sem params de tracking permanece limpa', () => {
    const url = buildRedirectUrl('https://example.com', {}, null, 'gclid');
    expect(url).toMatch(/^https:\/\/example\.com/);
    expect(url).not.toMatch(/[?&]/);
  });
});
