const { spawn } = require('node:child_process');
const fs = require('node:fs');

function dormir(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function obtenerMensajeDeFallo(fallo) {
  return fallo instanceof Error ? fallo.message : String(fallo);
}

function tieneEmbeddingsValidos(valor) {
  return (
    valor &&
    typeof valor === 'object' &&
    Array.isArray(valor.embeddings) &&
    valor.embeddings.every(
      (vector) =>
        Array.isArray(vector) && vector.every((numero) => typeof numero === 'number' && Number.isFinite(numero))
    )
  );
}

function crearClienteProcesoCrispEmbed({
  modelo,
  hilos,
  host,
  puerto,
  rutaBinario,
  tiempoMaximoInicioMs,
  urlServidor,
}) {
  let proceso = null;
  let promesaInicio = null;
  const ultimosLogs = [];

  function obtenerBaseUrl() {
    return urlServidor || `http://${host}:${puerto}`;
  }

  function capturarLog(chunk) {
    const texto = chunk.toString().trim();

    if (!texto) {
      return;
    }

    ultimosLogs.push(texto);
    if (ultimosLogs.length > 20) {
      ultimosLogs.shift();
    }
  }

  async function esperarSalud() {
    const inicio = Date.now();
    let ultimoFallo = null;

    while (Date.now() - inicio < tiempoMaximoInicioMs) {
      if (proceso && proceso.exitCode !== null) {
        break;
      }

      try {
        const respuesta = await fetch(`${obtenerBaseUrl()}/health`);

        if (respuesta.ok) {
          return;
        }
      } catch (fallo) {
        ultimoFallo = obtenerMensajeDeFallo(fallo);
      }

      await dormir(500);
    }

    const detalle = ultimosLogs.length ? ultimosLogs.join('\n') : ultimoFallo || 'sin detalles';
    throw new Error(`No se pudo iniciar CrispEmbed.\n${detalle}`);
  }

  async function iniciarProceso() {
    const procesoLocal = spawn(
      rutaBinario,
      ['-m', modelo, '--host', host, '--port', String(puerto), '-t', String(hilos)],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    proceso = procesoLocal;
    procesoLocal.stdout.on('data', capturarLog);
    procesoLocal.stderr.on('data', capturarLog);
    procesoLocal.once('exit', (codigo, senal) => {
      proceso = null;

      if (codigo !== 0) {
        capturarLog(`crispembed-server termino con codigo ${codigo} y senal ${senal || 'ninguna'}`);
      }
    });

    await esperarSalud();
  }

  const cliente = {
    modelo,
    hilos,
    host,
    puerto,
    rutaBinario,
    tiempoMaximoInicioMs,
    urlServidor,
    get urlBase() {
      return obtenerBaseUrl();
    },
    get identificadorModelo() {
      return `${modelo}@${obtenerBaseUrl()}`;
    },
    async iniciar() {
      if (urlServidor) {
        await esperarSalud();
        return;
      }

      if (proceso && proceso.exitCode === null) {
        await esperarSalud();
        return;
      }

      if (promesaInicio) {
        await promesaInicio;
        return;
      }

      if (!fs.existsSync(rutaBinario)) {
        throw new Error(
          `No se encontro el binario de CrispEmbed en ${rutaBinario}. Ejecuta "npm run build:crispembed".`
        );
      }

      promesaInicio = iniciarProceso();

      try {
        await promesaInicio;
      } finally {
        promesaInicio = null;
      }
    },
    async generarEmbeddings(textos) {
      await cliente.iniciar();

      const respuesta = await fetch(`${obtenerBaseUrl()}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts: textos }),
      });

      if (!respuesta.ok) {
        throw new Error(`CrispEmbed devolvio ${respuesta.status}: ${await respuesta.text()}`);
      }

      const cuerpo = await respuesta.json();
      if (!tieneEmbeddingsValidos(cuerpo)) {
        throw new Error('CrispEmbed devolvio una respuesta invalida.');
      }

      return cuerpo.embeddings;
    },
    async detener() {
      if (!proceso || proceso.exitCode !== null) {
        proceso = null;
        return;
      }

      const procesoActual = proceso;

      await new Promise((resolve) => {
        const temporizador = setTimeout(() => {
          if (procesoActual.exitCode === null) {
            procesoActual.kill('SIGKILL');
          }
        }, 5000);

        procesoActual.once('exit', () => {
          clearTimeout(temporizador);
          resolve();
        });

        procesoActual.kill('SIGTERM');
      });

      proceso = null;
    },
  };

  return cliente;
}

module.exports = {
  crearClienteProcesoCrispEmbed,
};
