const verificar = require('node:assert/strict');
const prueba = require('node:test');
const { crearApp } = require('../src/app');
const { crearBaseDeDatos } = require('../src/baseDeDatos');

const API_KEY = 'sk-atlas-123';
const ENCABEZADOS_JSON = { apiKey: API_KEY, 'Content-Type': 'application/json' };

function crearClasificadorFalso() {
  return {
    llamadas: [],
    obtenerEstado() {
      return { modelo: 'cargado', hilos: 1 };
    },
    async clasificar(ticket) {
      this.llamadas.push(ticket);

      if (ticket.texto.toLowerCase().includes('pago')) {
        return { tema: 'Facturacion', confianza: 0.95 };
      }

      if (ticket.texto.toLowerCase().includes('login')) {
        return { tema: 'Acceso a Cuenta', confianza: 0.91 };
      }

      return { tema: 'Consulta General', confianza: 0.72 };
    },
  };
}

async function levantarServidor(app) {
  const servidor = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  const direccion = servidor.address();

  if (!direccion || typeof direccion === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de prueba.');
  }

  const urlBase = `http://127.0.0.1:${direccion.port}`;

  return {
    pedir(ruta, opciones) {
      return fetch(`${urlBase}${ruta}`, opciones);
    },
    cerrar() {
      return new Promise((resolve, reject) => {
        servidor.close((fallo) => (fallo ? reject(fallo) : resolve()));
      });
    },
  };
}

async function crearContextoDePrueba() {
  const baseDeDatos = crearBaseDeDatos(':memory:');
  const clasificador = crearClasificadorFalso();
  const servidor = await levantarServidor(
    crearApp({
      clasificador,
      baseDeDatos,
      apiKey: API_KEY,
      nombreEncabezadoApiKey: 'apiKey',
    })
  );

  return {
    clasificador,
    pedir: servidor.pedir,
    async cerrar() {
      await servidor.cerrar();
      baseDeDatos.close();
    },
  };
}

async function leerJson(respuesta) {
  return respuesta.json();
}

prueba('GET /salud devuelve el estado base de la API', async (t) => {
  const contexto = await crearContextoDePrueba();
  t.after(() => contexto.cerrar());

  const respuesta = await contexto.pedir('/salud');

  verificar.equal(respuesta.status, 200);
  verificar.deepEqual(await leerJson(respuesta), {
    estado: 'ok',
    modelo: 'cargado',
    hilos: 1,
    baseDatos: 'ok',
  });
});

prueba('POST /clasificar exige apiKey valida', async (t) => {
  const contexto = await crearContextoDePrueba();
  t.after(() => contexto.cerrar());

  const respuesta = await contexto.pedir('/clasificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: "I can't login" }),
  });

  verificar.equal(respuesta.status, 403);
});

prueba('POST /clasificar devuelve 503 mientras el clasificador sigue cargando', async (t) => {
  const baseDeDatos = crearBaseDeDatos(':memory:');
  const servidor = await levantarServidor(
    crearApp({
      clasificador: {
        obtenerEstado() {
          return { modelo: 'cargando', hilos: 1 };
        },
        async clasificar() {
          throw new Error('No deberia clasificar mientras carga');
        },
      },
      baseDeDatos,
      apiKey: API_KEY,
      nombreEncabezadoApiKey: 'apiKey',
    })
  );

  t.after(async () => {
    await servidor.cerrar();
    baseDeDatos.close();
  });

  const respuesta = await servidor.pedir('/clasificar', {
    method: 'POST',
    headers: ENCABEZADOS_JSON,
    body: JSON.stringify({ texto: 'No puedo hacer login' }),
  });

  verificar.equal(respuesta.status, 503);
  verificar.match((await leerJson(respuesta)).detail, /clasificador aun se esta inicializando/i);
});

prueba('POST /clasificar valida el campo texto', async (t) => {
  const contexto = await crearContextoDePrueba();
  t.after(() => contexto.cerrar());

  const respuesta = await contexto.pedir('/clasificar', {
    method: 'POST',
    headers: ENCABEZADOS_JSON,
    body: JSON.stringify({}),
  });

  verificar.equal(respuesta.status, 422);
  verificar.equal((await leerJson(respuesta)).detail, "El campo 'texto' es obligatorio.");
});

prueba('POST /clasificar delega la clasificacion y responde tema + confianza', async (t) => {
  const contexto = await crearContextoDePrueba();
  t.after(() => contexto.cerrar());

  const respuesta = await contexto.pedir('/clasificar', {
    method: 'POST',
    headers: ENCABEZADOS_JSON,
    body: JSON.stringify({
      texto: 'Tengo un problema con mi pago mensual',
      instruccion: 'custom: ',
      ejemplos: { Facturacion: ['pago', 'factura'] },
    }),
  });

  verificar.equal(respuesta.status, 200);
  verificar.deepEqual(await leerJson(respuesta), {
    tema: 'Facturacion',
    confianza: 0.95,
  });
  verificar.deepEqual(contexto.clasificador.llamadas[0], {
    texto: 'Tengo un problema con mi pago mensual',
    instruccion: 'custom: ',
    ejemplos: { Facturacion: ['pago', 'factura'] },
  });
});

prueba('CRUD de /tickets crea, lista, consulta, actualiza y elimina tickets persistidos', async (t) => {
  const contexto = await crearContextoDePrueba();
  t.after(() => contexto.cerrar());

  const ticketCreado = await leerJson(
    await contexto.pedir('/tickets', {
      method: 'POST',
      headers: ENCABEZADOS_JSON,
      body: JSON.stringify({ texto: 'Tengo un problema con mi pago anual' }),
    })
  );

  verificar.equal(ticketCreado.id, 1);
  verificar.equal(ticketCreado.tema, 'Facturacion');
  verificar.equal(ticketCreado.texto, 'Tengo un problema con mi pago anual');

  const tickets = await leerJson(await contexto.pedir('/tickets', { headers: { apiKey: API_KEY } }));
  verificar.equal(tickets.length, 1);
  verificar.equal(tickets[0].id, ticketCreado.id);

  const ticketBuscado = await leerJson(
    await contexto.pedir(`/tickets/${ticketCreado.id}`, { headers: { apiKey: API_KEY } })
  );
  verificar.equal(ticketBuscado.tema, 'Facturacion');

  const ticketActualizado = await leerJson(
    await contexto.pedir(`/tickets/${ticketCreado.id}`, {
      method: 'PUT',
      headers: ENCABEZADOS_JSON,
      body: JSON.stringify({ texto: 'No puedo hacer login en la plataforma' }),
    })
  );
  verificar.equal(ticketActualizado.tema, 'Acceso a Cuenta');
  verificar.equal(ticketActualizado.texto, 'No puedo hacer login en la plataforma');

  const respuestaBorrar = await contexto.pedir(`/tickets/${ticketCreado.id}`, {
    method: 'DELETE',
    headers: { apiKey: API_KEY },
  });
  verificar.equal(respuestaBorrar.status, 204);

  const respuestaFaltante = await contexto.pedir(`/tickets/${ticketCreado.id}`, {
    headers: { apiKey: API_KEY },
  });
  verificar.equal(respuestaFaltante.status, 404);
});
