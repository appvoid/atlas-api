const configuracion = require('./configuracion');
const { crearApp } = require('./app');
const { crearBaseDeDatos } = require('./baseDeDatos');
const { crearClienteProcesoCrispEmbed } = require('./servicios/clienteProcesoCrispEmbed');
const { crearClasificadorSoporte } = require('./servicios/clasificadorSoporte');
const { TEMAS_PREDETERMINADOS } = require('./temas');

function salirDespues(promesa) {
  promesa
    .catch((fallo) => {
      console.error(fallo.message);
      process.exitCode = 1;
    })
    .finally(() => process.exit());
}

function cerrarServidor(servidor) {
  return new Promise((resolve, reject) => {
    servidor.close((fallo) => {
      if (fallo) {
        reject(fallo);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  const baseDeDatos = crearBaseDeDatos(configuracion.rutaBaseDeDatos);
  const clasificador = crearClasificadorSoporte({
    clienteEmbeddings: crearClienteProcesoCrispEmbed(configuracion.crispEmbed),
    temasPredeterminados: TEMAS_PREDETERMINADOS,
    instruccionPredeterminada: 'query: ',
    rutaVectoresPrompt: configuracion.rutaVectoresPrompt,
  });

  const app = crearApp({
    clasificador,
    baseDeDatos,
    apiKey: configuracion.apiKey,
    nombreEncabezadoApiKey: configuracion.encabezadoApiKey,
  });

  const servidor = app.listen(configuracion.puerto, configuracion.host, () => {
    console.log(`Atlas escuchando en http://${configuracion.host}:${configuracion.puerto}`);
  });

  clasificador
    .inicializar()
    .then(() => {
      console.log('Clasificador listo.');
    })
    .catch((fallo) => {
      console.error(`Fallo inicializando el clasificador: ${fallo.message}`);
    });

  async function apagar(senal) {
    console.log(`Recibida senal ${senal}. Cerrando servicios...`);
    await cerrarServidor(servidor);
    await clasificador.cerrar();
    baseDeDatos.close();
  }

  for (const senal of ['SIGINT', 'SIGTERM']) {
    process.once(senal, () => salirDespues(apagar(senal)));
  }
}

if (require.main === module) {
  main().catch((fallo) => {
    console.error(fallo.message);
    process.exit(1);
  });
}

module.exports = {
  main,
};
