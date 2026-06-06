'use strict';

jest.mock('../services/presellTemplates', () => ({
  allowedTemplates: ['advertorial', 'offer-modal'],
  normalizeSettings: jest.fn((template, input, existing) => ({ ...existing, ...input })),
  parseSettingsJson: jest.fn((json) => {
    try { return JSON.parse(json || '{}'); } catch { return {}; }
  }),
}));

jest.mock('../services/uploadService', () => ({
  deleteUpload: jest.fn(),
}));

const mockCreatePresell = jest.fn((data) => ({ id: 1, rendered_html: null, ...data }));
const mockUpdatePresell = jest.fn((id, data) => ({ id, rendered_html: null, ...data }));
const mockGetPresellById = jest.fn(() => null);
const mockUpdateRenderedHtml = jest.fn();
const mockListDuplicateSlugs = jest.fn(() => []);
const mockDuplicatePresell = jest.fn((source, extra) => ({ ...source, ...extra, id: 99 }));

jest.mock('../repositories/presellRepository', () => ({
  createPresell: (...args) => mockCreatePresell(...args),
  updatePresell: (...args) => mockUpdatePresell(...args),
  updateRenderedHtml: (...args) => mockUpdateRenderedHtml(...args),
  getPresellById: (...args) => mockGetPresellById(...args),
  listDuplicateSlugs: (...args) => mockListDuplicateSlugs(...args),
  duplicatePresell: (...args) => mockDuplicatePresell(...args),
  deletePresell: jest.fn(),
  listPresells: jest.fn(() => []),
  listPresellCollection: jest.fn(() => ({ rows: [], total: 0 })),
  getPublishedPresell: jest.fn(() => null),
  getPresellBySlug: jest.fn(() => null),
}));

// renderPresellHtml é chamado via require tardio em renderAndPersistHtml
jest.mock('../services/presellRenderer', () => ({
  renderPresellHtml: jest.fn(() => '<html>rendered</html>'),
}));

const { parseBullets, savePresell, duplicatePresell } = require('../services/presellService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ── parseBullets ──────────────────────────────────────────────────────────────

describe('parseBullets', () => {
  test('separa texto multi-linha em array de itens', () => {
    expect(parseBullets({ bullets: 'item um\nitem dois\nitem três' }))
      .toEqual(['item um', 'item dois', 'item três']);
  });

  test('filtra linhas vazias', () => {
    expect(parseBullets({ bullets: 'item um\n\n\nitem dois' }))
      .toEqual(['item um', 'item dois']);
  });

  test('faz trim de cada linha', () => {
    expect(parseBullets({ bullets: '  item um  \n  item dois  ' }))
      .toEqual(['item um', 'item dois']);
  });

  test('retorna array vazio quando bullets é vazio', () => {
    expect(parseBullets({ bullets: '' })).toEqual([]);
  });

  test('retorna array vazio quando bullets é null ou undefined', () => {
    expect(parseBullets({ bullets: null })).toEqual([]);
    expect(parseBullets({})).toEqual([]);
  });

  test('aceita quebras de linha Windows (\\r\\n)', () => {
    expect(parseBullets({ bullets: 'item um\r\nitem dois' }))
      .toEqual(['item um', 'item dois']);
  });
});

// ── savePresell — normalização de slug ───────────────────────────────────────

describe('savePresell — normalização de slug', () => {
  test('converte slug para lowercase', () => {
    savePresell({ slug: 'MEU-PRESELL', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.slug).toBe('meu-presell');
  });

  test('remove caracteres inválidos do slug (mantém apenas a-z, 0-9, -)', () => {
    savePresell({ slug: 'meu presell! @top', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.slug).toMatch(/^[a-z0-9-]+$/);
    expect(data.slug).not.toContain(' ');
    expect(data.slug).not.toContain('!');
  });

  test('remove hifens no início e fim do slug', () => {
    savePresell({ slug: '-meu-presell-', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.slug).not.toMatch(/^-/);
    expect(data.slug).not.toMatch(/-$/);
  });
});

// ── savePresell — template e status ──────────────────────────────────────────

describe('savePresell — template e status', () => {
  test('usa template fornecido quando válido', () => {
    savePresell({ slug: 'test', template: 'offer-modal', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.template).toBe('offer-modal');
  });

  test('usa "advertorial" como fallback para template desconhecido', () => {
    savePresell({ slug: 'test', template: 'template-inexistente', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.template).toBe('advertorial');
  });

  test('status "published" é mantido', () => {
    savePresell({ slug: 'test', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'published' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.status).toBe('published');
  });

  test('qualquer status diferente de "published" vira "draft"', () => {
    savePresell({ slug: 'test', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'active' });
    const data = mockCreatePresell.mock.calls[0][0];
    expect(data.status).toBe('draft');
  });
});

// ── savePresell — renderAndPersistHtml não bloqueia save em caso de erro ─────

describe('savePresell — renderAndPersistHtml', () => {
  test('salva o presell mesmo se o renderer lançar erro', () => {
    const { renderPresellHtml } = require('../services/presellRenderer');
    renderPresellHtml.mockImplementationOnce(() => { throw new Error('render falhou'); });

    const saved = savePresell({ slug: 'test-render-err', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });

    // savePresell retorna o presell do repositório; o erro de render não deve propagar
    expect(saved).toBeDefined();
    expect(saved.id).toBeDefined();
  });

  test('persiste rendered_html quando render é bem-sucedido', () => {
    savePresell({ slug: 'test-render-ok', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });

    expect(mockUpdateRenderedHtml).toHaveBeenCalledWith(
      expect.anything(),
      '<html>rendered</html>'
    );
  });
});

// ── savePresell — atualização usa updatePresell ───────────────────────────────

describe('savePresell — create vs update', () => {
  test('chama createPresell quando input não tem id', () => {
    savePresell({ slug: 'novo', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    expect(mockCreatePresell).toHaveBeenCalledTimes(1);
    expect(mockUpdatePresell).not.toHaveBeenCalled();
  });

  test('chama updatePresell quando input tem id existente', () => {
    mockGetPresellById.mockReturnValueOnce({ id: 5, slug: 'existente', settings_json: '{}' });
    savePresell({ id: 5, slug: 'existente', template: 'advertorial', headline: 'H', affiliate_url: 'https://x.com', status: 'draft' });
    expect(mockUpdatePresell).toHaveBeenCalledWith(5, expect.any(Object));
    expect(mockCreatePresell).not.toHaveBeenCalled();
  });
});

// ── duplicatePresell — geração de slug único ──────────────────────────────────

describe('duplicatePresell', () => {
  test('retorna null quando presell de origem não existe', () => {
    mockGetPresellById.mockReturnValueOnce(null);
    expect(duplicatePresell(999)).toBeNull();
  });

  test('gera slug com sufixo -copia quando slug base não existe', () => {
    mockGetPresellById.mockReturnValueOnce({ id: 1, slug: 'meu-presell', title: 'Título' });
    mockListDuplicateSlugs.mockReturnValueOnce([]);

    duplicatePresell(1);

    const call = mockDuplicatePresell.mock.calls[0];
    expect(call[1].slug).toBe('meu-presell-copia');
  });

  test('gera slug -copia-2 quando -copia já existe', () => {
    mockGetPresellById.mockReturnValueOnce({ id: 1, slug: 'meu-presell', title: 'Título' });
    mockListDuplicateSlugs.mockReturnValueOnce(['meu-presell-copia']);

    duplicatePresell(1);

    const call = mockDuplicatePresell.mock.calls[0];
    expect(call[1].slug).toBe('meu-presell-copia-2');
  });

  test('título do duplicado recebe sufixo "(copia)"', () => {
    mockGetPresellById.mockReturnValueOnce({ id: 1, slug: 'teste', title: 'Meu Título' });
    mockListDuplicateSlugs.mockReturnValueOnce([]);

    duplicatePresell(1);

    const call = mockDuplicatePresell.mock.calls[0];
    expect(call[1].title).toBe('Meu Título (copia)');
  });
});
