const fs = require('node:fs');
const path = require('node:path');

const raizProyecto = path.resolve(__dirname, '..');
const directorioCrispEmbed = path.join(raizProyecto, 'CrispEmbed');
const directorioCompilado = path.join(directorioCrispEmbed, 'build');
const rutaModeloActual = path.join(directorioCrispEmbed, 'e5.gguf');
const rutaModeloLegado = path.join(directorioCrispEmbed, 'es_q8_0.gguf');

function leerNumero(valor, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
}

function resolverModeloPredeterminado() {
  if (fs.existsSync(rutaModeloActual)) {
    return rutaModeloActual;
  }

  if (fs.existsSync(rutaModeloLegado)) {
    return rutaModeloLegado;
  }

  return 'multilingual-e5-small';
}

module.exports = {
  host: process.env.HOST || '0.0.0.0',
  puerto: leerNumero(process.env.PORT, 8000),
  apiKey: process.env.ATLAS_API_KEY || 'sk-atlas-123',
  encabezadoApiKey: process.env.ATLAS_API_KEY_HEADER || 'apiKey',
  rutaBaseDeDatos: process.env.DATABASE_PATH || path.join(raizProyecto, 'data', 'atlas.sqlite'),
  rutaVectoresPrompt:
    process.env.PROMPT_VECTORS_PATH || path.join(raizProyecto, 'data', 'prompt-vectors.json'),
  crispEmbed: {
    modelo: process.env.CRISPEMBED_MODEL || resolverModeloPredeterminado(),
    hilos: leerNumero(process.env.CRISPEMBED_THREADS, 1),
    host: process.env.CRISPEMBED_HOST || '127.0.0.1',
    puerto: leerNumero(process.env.CRISPEMBED_PORT, 8091),
    tiempoMaximoInicioMs: leerNumero(process.env.CRISPEMBED_STARTUP_TIMEOUT_MS, 300000),
    urlServidor: process.env.CRISPEMBED_SERVER_URL || null,
    rutaBinario:
      process.env.CRISPEMBED_SERVER_BINARY ||
      path.join(
        directorioCompilado,
        process.platform === 'win32' ? 'crispembed-server.exe' : 'crispembed-server'
      ),
  },
};
