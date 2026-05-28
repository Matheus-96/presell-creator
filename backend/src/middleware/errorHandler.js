module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);
  return res.status(500).send("Erro interno no servidor.");
};
