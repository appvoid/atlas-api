const v = require('valibot');
const { crearError } = require('./errores');

const esquemaId = v.pipe(
  v.string(),
  v.regex(/^[1-9]\d*$/, 'Id de ticket invalido.'),
  v.transform(Number)
);

function esObjetoPlano(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function obtenerMensaje(issues, respaldo) {
  return issues && issues[0] && issues[0].message ? issues[0].message : respaldo;
}

function leerSalidaValida(esquema, entrada, estado, mensaje) {
  const resultado = v.safeParse(esquema, entrada);

  if (!resultado.success) {
    throw crearError(estado, obtenerMensaje(resultado.issues, mensaje));
  }

  return resultado.output;
}

function validarCuerpo(esquema) {
  return (req, _res, next) => {
    try {
      if (!esObjetoPlano(req.body)) {
        throw crearError(422, 'El cuerpo debe ser un objeto JSON.');
      }

      req.body = leerSalidaValida(esquema, req.body, 422, 'El cuerpo es invalido.');
      next();
    } catch (error) {
      next(error);
    }
  };
}

function validarId(req, _res, next) {
  try {
    req.params.id = leerSalidaValida(esquemaId, req.params.id, 400, 'Id de ticket invalido.');
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  esquemaId,
  obtenerMensaje,
  validarCuerpo,
  validarId,
};
