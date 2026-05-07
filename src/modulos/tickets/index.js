const { esquemaCrear, esquemaActualizar } = require('./esquemas');
const { aRegistroGuardable, desdeBaseDeDatos, mezclarTicket } = require('./transformaciones');

async function clasificarTicket(clasificador, ticket) {
  return {
    ...ticket,
    ...(await clasificador.clasificar(ticket)),
  };
}

module.exports = {
  tabla: 'tickets',
  esquemaCrear,
  esquemaActualizar,
  camposOrdenables: ['id', 'created_at', 'updated_at', 'texto', 'tema', 'confianza'],
  ordenarPorPredeterminado: 'created_at',
  mensajeNoEncontrado: 'Ticket no encontrado.',
  desdeBaseDeDatos,
  async prepararCreacion({ cuerpo, req }) {
    return aRegistroGuardable(await clasificarTicket(req.app.locals.clasificador, cuerpo));
  },
  async prepararActualizacion({ actual, cuerpo, req }) {
    const ticketCompleto = mezclarTicket(actual, cuerpo);
    return aRegistroGuardable(await clasificarTicket(req.app.locals.clasificador, ticketCompleto));
  },
};
