const path = require("path");

const { runBackfill } = require(path.resolve(__dirname, "../../scripts/backfill-rendered-html"));

function makePresell(overrides = {}) {
  return {
    id: 1,
    slug: "test-presell",
    status: "published",
    rendered_html: null,
    ...overrides,
  };
}

function makeLogger() {
  return { log: jest.fn(), error: jest.fn() };
}

describe("runBackfill", () => {
  it("gera e persiste HTML para cada presell sem rendered_html", () => {
    const presells = [makePresell({ id: 1, slug: "p1" }), makePresell({ id: 2, slug: "p2" })];
    const repository = {
      listPublishedWithoutHtml: jest.fn(() => presells),
      updateRenderedHtml: jest.fn(),
    };
    const renderer = { renderPresellHtml: jest.fn(() => "<html>ok</html>") };

    const result = runBackfill({ repository, renderer, logger: makeLogger() });

    expect(renderer.renderPresellHtml).toHaveBeenCalledTimes(2);
    expect(repository.updateRenderedHtml).toHaveBeenCalledWith(1, "<html>ok</html>");
    expect(repository.updateRenderedHtml).toHaveBeenCalledWith(2, "<html>ok</html>");
    expect(result).toEqual({ ok: 2, failed: 0 });
  });

  it("retorna ok=0 e não chama renderer quando não há presells sem HTML", () => {
    const repository = {
      listPublishedWithoutHtml: jest.fn(() => []),
      updateRenderedHtml: jest.fn(),
    };
    const renderer = { renderPresellHtml: jest.fn() };

    const result = runBackfill({ repository, renderer, logger: makeLogger() });

    expect(renderer.renderPresellHtml).not.toHaveBeenCalled();
    expect(repository.updateRenderedHtml).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: 0, failed: 0 });
  });

  it("continua processando os demais quando um presell falha na renderização", () => {
    const presells = [makePresell({ id: 1, slug: "ok" }), makePresell({ id: 2, slug: "broken" })];
    const repository = {
      listPublishedWithoutHtml: jest.fn(() => presells),
      updateRenderedHtml: jest.fn(),
    };
    const renderer = {
      renderPresellHtml: jest.fn()
        .mockReturnValueOnce("<html>ok</html>")
        .mockImplementationOnce(() => { throw new Error("template not found"); }),
    };
    const logger = makeLogger();

    const result = runBackfill({ repository, renderer, logger });

    expect(repository.updateRenderedHtml).toHaveBeenCalledTimes(1);
    expect(repository.updateRenderedHtml).toHaveBeenCalledWith(1, "<html>ok</html>");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("broken"));
    expect(result).toEqual({ ok: 1, failed: 1 });
  });
});
