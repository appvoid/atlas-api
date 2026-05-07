function tieneCampo(objeto, campo) {
  return Object.prototype.hasOwnProperty.call(objeto, campo);
}

function serializarEjemplos(ejemplos) {
  return ejemplos ? JSON.stringify(ejemplos) : null;
}

function deserializarEjemplos(valor) {
  return valor ? JSON.parse(valor) : null;
}

function aRegistroGuardable(ticket) {
  return {
    texto: ticket.texto,
    tema: ticket.tema,
    confianza: ticket.confianza,
    instruccion: ticket.instruccion ?? null,
    ejemplos_json: serializarEjemplos(ticket.ejemplos ?? null),
  };
}

function mezclarTicket(actual, cambios) {
  return {
    texto: cambios.texto ?? actual.texto,
    instruccion: tieneCampo(cambios, 'instruccion') ? cambios.instruccion ?? null : actual.instruccion,
    ejemplos: tieneCampo(cambios, 'ejemplos') ? cambios.ejemplos ?? null : actual.ejemplos,
  };
}

function desdeBaseDeDatos(fila) {
  return {
    id: fila.id,
    texto: fila.texto,
    tema: fila.tema,
    confianza: Number(fila.confianza),
    instruccion: fila.instruccion,
    ejemplos: deserializarEjemplos(fila.ejemplos_json),
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

module.exports = {
  aRegistroGuardable,
  desdeBaseDeDatos,
  mezclarTicket,
};
