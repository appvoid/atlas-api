const crypto = require('node:crypto');

function crearLlaveDeCache({ identificadorModelo, temas }) {
  const hash = crypto.createHash('sha256');
  hash.update(
    JSON.stringify({
      modelo: identificadorModelo,
      temas,
    })
  );

  return hash.digest('hex');
}

async function calcularVectoresPorTema(temas, generarEmbeddings) {
  const entradas = Object.entries(temas);
  const textos = [];
  const segmentos = [];

  for (const [tema, ejemplos] of entradas) {
    segmentos.push({
      tema,
      inicio: textos.length,
      cantidad: ejemplos.length,
    });
    textos.push(...ejemplos);
  }

  const embeddings = await generarEmbeddings(textos);
  const vectoresPorTema = {};

  for (const segmento of segmentos) {
    vectoresPorTema[segmento.tema] = embeddings.slice(segmento.inicio, segmento.inicio + segmento.cantidad);
  }

  return vectoresPorTema;
}

function elegirTemaMasCercano(vectorTicket, vectoresPorTema) {
  let mejorTema = null;
  let mejorPuntaje = Number.NEGATIVE_INFINITY;

  for (const [tema, vectores] of Object.entries(vectoresPorTema)) {
    for (const vector of vectores) {
      const puntaje = vectorTicket.reduce((total, valor, indice) => total + valor * vector[indice], 0);

      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejorTema = tema;
      }
    }
  }

  if (!mejorTema) {
    throw new Error('No hay temas disponibles para clasificar.');
  }

  return {
    tema: mejorTema,
    confianza: Math.round(mejorPuntaje * 10000) / 10000,
  };
}

module.exports = {
  calcularVectoresPorTema,
  crearLlaveDeCache,
  elegirTemaMasCercano,
};
