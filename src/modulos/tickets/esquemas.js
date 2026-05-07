const v = require('valibot');

const MENSAJE_TEXTO_OBLIGATORIO = "El campo 'texto' es obligatorio.";
const MENSAJE_TEXTO_INVALIDO = "El campo 'texto' debe ser un string no vacio.";
const MENSAJE_INSTRUCCION_INVALIDA = "El campo 'instruccion' debe ser un string o null.";
const MENSAJE_EJEMPLOS_INVALIDOS =
  "El campo 'ejemplos' debe ser un objeto con temas y arreglos de ejemplos no vacios.";
const MENSAJE_AL_MENOS_UN_CAMPO =
  'Debes enviar al menos uno de estos campos: texto, instruccion o ejemplos.';

function crearCadenaNoVacia(mensaje) {
  return v.pipe(v.string(mensaje), v.trim(), v.minLength(1, mensaje));
}

const esquemaTexto = crearCadenaNoVacia(MENSAJE_TEXTO_INVALIDO);
const esquemaTextoEjemplo = crearCadenaNoVacia(MENSAJE_EJEMPLOS_INVALIDOS);
const esquemaTema = crearCadenaNoVacia(MENSAJE_EJEMPLOS_INVALIDOS);

const esquemaEjemplos = v.pipe(
  v.record(esquemaTema, v.pipe(v.array(esquemaTextoEjemplo), v.minLength(1, MENSAJE_EJEMPLOS_INVALIDOS))),
  v.check((valor) => Object.keys(valor).length > 0, MENSAJE_EJEMPLOS_INVALIDOS)
);

const esquemaCamposTicket = v.object({
  texto: v.optional(esquemaTexto),
  instruccion: v.optional(v.nullish(v.string(MENSAJE_INSTRUCCION_INVALIDA))),
  ejemplos: v.optional(v.nullish(esquemaEjemplos)),
});

const esquemaCrear = v.pipe(
  esquemaCamposTicket,
  v.check((valor) => valor.texto !== undefined, MENSAJE_TEXTO_OBLIGATORIO)
);

const esquemaActualizar = v.pipe(
  esquemaCamposTicket,
  v.check((valor) => Object.keys(valor).length > 0, MENSAJE_AL_MENOS_UN_CAMPO)
);

module.exports = {
  esquemaCrear,
  esquemaActualizar,
};
