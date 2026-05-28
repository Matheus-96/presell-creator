module.exports = (req, res) => {
  res.status(404).render("presell/404", {
    title: "Pagina nao encontrada",
    pixelHtml: ""
  });
};
