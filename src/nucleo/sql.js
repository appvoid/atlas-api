const LIMITE_PREDETERMINADO = 50;
const LIMITE_MAXIMO = 200;

function leerEnteroPositivo(valor, respaldo) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return respaldo;
  }

  return Math.floor(numero);
}

function construirInsert(tabla, datos) {
  const entradas = Object.entries(datos).filter(([, valor]) => valor !== undefined);
  const columnas = entradas.map(([columna]) => columna);
  const marcadores = columnas.map(() => '?').join(', ');

  return {
    sql: `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`,
    valores: entradas.map(([, valor]) => valor),
  };
}

function construirUpdate(tabla, datos) {
  const entradas = Object.entries(datos).filter(([, valor]) => valor !== undefined);

  return {
    sql: `UPDATE ${tabla} SET ${entradas.map(([columna]) => `${columna} = ?`).join(', ')}`,
    valores: entradas.map(([, valor]) => valor),
  };
}

function construirListado(recurso, query) {
  const limite = Math.min(
    leerEnteroPositivo(query.limite ?? query.limit, LIMITE_PREDETERMINADO) || LIMITE_PREDETERMINADO,
    LIMITE_MAXIMO
  );
  const offset = leerEnteroPositivo(query.offset, 0);
  const campoOrden =
    recurso.camposOrdenables.includes(query.ordenarPor ?? query.sort)
      ? query.ordenarPor ?? query.sort
      : recurso.ordenarPorPredeterminado;
  const orden = (query.orden ?? query.order) === 'asc' ? 'ASC' : 'DESC';

  return {
    sql: `SELECT * FROM ${recurso.tabla} ORDER BY ${campoOrden} ${orden} LIMIT ? OFFSET ?`,
    parametros: [limite, offset],
  };
}

module.exports = {
  construirInsert,
  construirListado,
  construirUpdate,
};
