const express = require('express');
const { crearError } = require('./errores');
const { crearAlmacenCrud } = require('./almacenCrud');
const { validarCuerpo, validarId } = require('./validar');

function convertirEnLista(valor) {
  if (!valor) {
    return [];
  }

  return Array.isArray(valor) ? valor : [valor];
}

function crearRouterCrud({ recurso, baseDeDatos, middlewares = {} }) {
  const router = express.Router();
  const almacen = crearAlmacenCrud({ recurso, baseDeDatos });
  const mensajeNoEncontrado = recurso.mensajeNoEncontrado || 'Registro no encontrado.';

  function obtenerRegistro(id, next) {
    const registro = almacen.obtenerPorId(id);

    if (!registro) {
      next(crearError(404, mensajeNoEncontrado));
      return null;
    }

    return registro;
  }

  async function preparar(nombre, contexto) {
    return recurso[nombre] ? recurso[nombre](contexto) : contexto.cuerpo;
  }

  router.get('/', ...convertirEnLista(middlewares.listar), (req, res) => {
    res.json(almacen.listar(req.query));
  });

  router.get('/:id', ...convertirEnLista(middlewares.obtener), validarId, (req, res, next) => {
    const fila = obtenerRegistro(req.params.id, next);

    if (fila) {
      res.json(fila);
    }
  });

  router.post(
    '/',
    ...convertirEnLista(middlewares.crear),
    validarCuerpo(recurso.esquemaCrear),
    async (req, res) => {
      const registro = await preparar('prepararCreacion', { cuerpo: req.body, req });
      res.status(201).json(almacen.crear(registro));
    }
  );

  async function actualizar(req, res, next) {
    const actual = obtenerRegistro(req.params.id, next);
    if (!actual) {
      return;
    }

    const cambios = await preparar('prepararActualizacion', { actual, cuerpo: req.body, req });
    const actualizado = almacen.actualizar(req.params.id, cambios);

    if (!actualizado) {
      next(crearError(400, 'Debes enviar al menos un campo para actualizar.'));
      return;
    }

    res.json(actualizado);
  }

  for (const metodo of ['put', 'patch']) {
    router[metodo](
      '/:id',
      ...convertirEnLista(middlewares.actualizar),
      validarId,
      validarCuerpo(recurso.esquemaActualizar),
      actualizar
    );
  }

  router.delete(
    '/:id',
    ...convertirEnLista(middlewares.eliminar),
    validarId,
    (req, res, next) => {
      if (!almacen.eliminar(req.params.id)) {
        next(crearError(404, mensajeNoEncontrado));
        return;
      }

      res.status(204).end();
    }
  );

  return router;
}

module.exports = {
  crearRouterCrud,
};
