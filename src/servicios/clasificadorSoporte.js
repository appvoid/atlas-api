const { cargarOVolverAGenerarVectores } = require('./cacheVectoresPrompt');
const { calcularVectoresPorTema, crearLlaveDeCache, elegirTemaMasCercano } = require('./vectorizacion');

function crearClasificadorSoporte({
  clienteEmbeddings,
  temasPredeterminados,
  instruccionPredeterminada = 'query: ',
  rutaVectoresPrompt,
}) {
  let vectoresPredeterminados = null;
  let listo = false;
  let promesaInicializacion = null;
  let ultimoError = null;

  const generarVectores = (temas) => calcularVectoresPorTema(temas, clienteEmbeddings.generarEmbeddings);

  async function cargarOVolverAGenerarVectoresPredeterminados() {
    return cargarOVolverAGenerarVectores({
      rutaArchivo: rutaVectoresPrompt,
      llaveDeCache: crearLlaveDeCache({
        identificadorModelo: clienteEmbeddings.identificadorModelo,
        temas: temasPredeterminados,
      }),
      generarVectores: () => generarVectores(temasPredeterminados),
    });
  }

  async function inicializarInternamente() {
    try {
      await clienteEmbeddings.iniciar();
      vectoresPredeterminados = await cargarOVolverAGenerarVectoresPredeterminados();
      listo = true;
      ultimoError = null;
    } catch (error) {
      listo = false;
      ultimoError = error instanceof Error ? error : new Error(String(error));
      throw ultimoError;
    }
  }

  return {
    obtenerEstado() {
      return {
        modelo: listo
          ? 'cargado'
          : promesaInicializacion
            ? 'cargando'
            : ultimoError
              ? 'error'
              : 'no_cargado',
        hilos: clienteEmbeddings.hilos,
      };
    },
    async inicializar() {
      if (listo) {
        return;
      }

      if (promesaInicializacion) {
        await promesaInicializacion;
        return;
      }

      promesaInicializacion = inicializarInternamente();

      try {
        await promesaInicializacion;
      } finally {
        promesaInicializacion = null;
      }
    },
    async cerrar() {
      await clienteEmbeddings.detener();
    },
    async clasificar({ texto, instruccion = null, ejemplos = null }) {
      await this.inicializar();

      const prefijo = instruccion === null ? instruccionPredeterminada : instruccion;
      const [vectorTicket] = await clienteEmbeddings.generarEmbeddings([`${prefijo}${texto}`]);
      const vectoresDeReferencia = ejemplos ? await generarVectores(ejemplos) : vectoresPredeterminados;

      if (!vectoresDeReferencia) {
        throw new Error('No hay vectores de referencia disponibles para clasificar.');
      }

      return elegirTemaMasCercano(vectorTicket, vectoresDeReferencia);
    },
  };
}

module.exports = {
  crearClasificadorSoporte,
};
