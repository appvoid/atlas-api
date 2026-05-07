const verificar = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const prueba = require('node:test');
const { crearClasificadorSoporte } = require('../src/servicios/clasificadorSoporte');

function crearClienteEmbeddingsFalso(vectores) {
  return {
    hilos: 1,
    identificadorModelo: 'fake-model@memory',
    iniciado: false,
    async iniciar() {
      this.iniciado = true;
    },
    async detener() {},
    async generarEmbeddings(textos) {
      return textos.map((texto) => {
        const vector = vectores[texto];

        if (!vector) {
          throw new Error(`Vector no configurado para: ${texto}`);
        }

        return vector;
      });
    },
  };
}

prueba('el clasificador usa el prefijo por defecto y soporta ejemplos personalizados', async () => {
  const directorioTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-classifier-'));
  const rutaVectoresPrompt = path.join(directorioTemporal, 'prompt-vectors.json');

  const clienteEmbeddings = crearClienteEmbeddingsFalso({
    pago: [1, 0],
    factura: [0.95, 0.05],
    error: [0, 1],
    'query: ticket de pago duplicado': [1, 0],
    'prioriza soporte: necesito ayuda tecnica': [0, 1],
    tecnico: [0, 1],
    ventas: [1, 0],
  });

  const clasificador = crearClasificadorSoporte({
    clienteEmbeddings,
    temasPredeterminados: {
      Facturacion: ['pago', 'factura'],
      'Problema Tecnico': ['error'],
    },
    instruccionPredeterminada: 'query: ',
    rutaVectoresPrompt,
  });

  const resultadoPorDefecto = await clasificador.clasificar({
    texto: 'ticket de pago duplicado',
  });

  const resultadoPersonalizado = await clasificador.clasificar({
    texto: 'necesito ayuda tecnica',
    instruccion: 'prioriza soporte: ',
    ejemplos: {
      Soporte: ['tecnico'],
      Ventas: ['ventas'],
    },
  });

  verificar.deepEqual(resultadoPorDefecto, {
    tema: 'Facturacion',
    confianza: 1,
  });
  verificar.deepEqual(resultadoPersonalizado, {
    tema: 'Soporte',
    confianza: 1,
  });
  verificar.equal(clienteEmbeddings.iniciado, true);
  verificar.equal(fs.existsSync(rutaVectoresPrompt), true);
});
