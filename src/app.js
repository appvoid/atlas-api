const express = require('express');
const tickets = require('./modulos/tickets');
const { crearMiddlewareApiKey } = require('./middlewares/apiKey');
const { crearMiddlewareClasificadorListo } = require('./middlewares/clasificadorListo');
const { crearRouterCrud } = require('./nucleo/crud');
const { manejarErrores, manejarRutaNoEncontrada } = require('./nucleo/errores');
const { validarCuerpo } = require('./nucleo/validar');

function crearApp({ clasificador, baseDeDatos, apiKey, nombreEncabezadoApiKey }) {
  const app = express();
  const validarApiKey = crearMiddlewareApiKey({
    apiKey,
    nombreEncabezado: nombreEncabezadoApiKey,
  });
  const validarClasificadorListo = crearMiddlewareClasificadorListo(clasificador);
  const autenticado = [validarApiKey];
  const autenticadoYListo = [validarApiKey, validarClasificadorListo];

  app.locals.clasificador = clasificador;
  app.locals.baseDeDatos = baseDeDatos;

  app.use(express.json());

  app.get('/salud', (_req, res) => {
    const estado = clasificador.obtenerEstado();

    res.json({
      estado: 'ok',
      modelo: estado.modelo,
      hilos: estado.hilos,
      baseDatos: 'ok',
    });
  });

  app.post(
    '/clasificar',
    ...autenticadoYListo,
    validarCuerpo(tickets.esquemaCrear),
    async (req, res) => {
      res.json(await clasificador.clasificar(req.body));
    }
  );

  app.use(
    '/tickets',
    crearRouterCrud({
      recurso: tickets,
      baseDeDatos,
      middlewares: {
        listar: autenticado,
        obtener: autenticado,
        crear: autenticadoYListo,
        actualizar: autenticadoYListo,
        eliminar: autenticado,
      },
    })
  );

  app.use(manejarRutaNoEncontrada);
  app.use(manejarErrores);

  return app;
}

module.exports = {
  crearApp,
};
