const { construirInsert, construirListado, construirUpdate } = require('./sql');

function identidad(valor) {
  return valor;
}

function crearAlmacenCrud({ recurso, baseDeDatos }) {
  const mapearFila = recurso.desdeBaseDeDatos || identidad;
  const leerFilaPorId = baseDeDatos.prepare(`SELECT * FROM ${recurso.tabla} WHERE id = ?`);
  const borrarFilaPorId = baseDeDatos.prepare(`DELETE FROM ${recurso.tabla} WHERE id = ?`);

  function obtenerPorId(id) {
    const fila = leerFilaPorId.get(id);
    return fila ? mapearFila(fila) : null;
  }

  return {
    listar(query) {
      const { sql, parametros } = construirListado(recurso, query);
      return baseDeDatos.prepare(sql).all(...parametros).map(mapearFila);
    },
    obtenerPorId,
    crear(registro) {
      const { sql, valores } = construirInsert(recurso.tabla, registro);
      const resultado = baseDeDatos.prepare(sql).run(...valores);
      return obtenerPorId(Number(resultado.lastInsertRowid));
    },
    actualizar(id, cambios) {
      const { sql, valores } = construirUpdate(recurso.tabla, cambios);

      if (!valores.length) {
        return null;
      }

      const resultado = baseDeDatos.prepare(`${sql} WHERE id = ?`).run(...valores, id);
      return resultado.changes ? obtenerPorId(id) : null;
    },
    eliminar(id) {
      return Boolean(borrarFilaPorId.run(id).changes);
    },
  };
}

module.exports = {
  crearAlmacenCrud,
};
