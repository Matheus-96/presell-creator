const { buildApiError } = require("../contracts/shared");
const { getEnv } = require("../config/env");

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const env = getEnv();
  const isDevelopment = env.nodeEnv !== "production";

  // Se o erro já tem um status HTTP específico, preserva
  const statusCode = err.status || err.statusCode || 500;

  // Constrói resposta de erro estruturada
  const details = isDevelopment ? { stack: err.stack } : {};
  const errorResponse = buildApiError("internal_error", "Erro interno no servidor.", details);

  return res.status(statusCode).json(errorResponse);
};
