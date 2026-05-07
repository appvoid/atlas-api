const { crearError } = require('../nucleo/errores');

function crearMiddlewareApiKey({ apiKey, nombreEncabezado }) {
  return (req, _res, next) => {
    if (req.get(nombreEncabezado) !== apiKey) {
      next(crearError(403, 'No se pudieron validar las credenciales'));
      return;
    }

    next();
  };
}

module.exports = {
  crearMiddlewareApiKey,
};
