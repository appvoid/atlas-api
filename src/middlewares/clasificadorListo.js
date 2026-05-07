const { crearError } = require('../nucleo/errores');

const MENSAJES = {
  cargando:
    "El clasificador aun se esta inicializando. Intenta de nuevo cuando /salud reporte 'modelo: cargado'.",
  no_cargado:
    "El clasificador aun se esta inicializando. Intenta de nuevo cuando /salud reporte 'modelo: cargado'.",
  error: 'El clasificador no pudo inicializarse. Revisa los logs del servidor.',
};

function crearMiddlewareClasificadorListo(clasificador) {
  return (_req, _res, next) => {
    const mensaje = MENSAJES[clasificador.obtenerEstado().modelo];

    if (mensaje) {
      next(crearError(503, mensaje));
      return;
    }

    next();
  };
}

module.exports = {
  crearMiddlewareClasificadorListo,
};
