const fs = require('node:fs');
const path = require('node:path');

function esVector(valor) {
  return Array.isArray(valor) && valor.every((numero) => typeof numero === 'number');
}

function esMapaDeVectores(valor) {
  return (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor) &&
    Object.values(valor).every((grupo) => Array.isArray(grupo) && grupo.every(esVector))
  );
}

function leerCacheValido(rutaArchivo, llaveDeCache) {
  if (!fs.existsSync(rutaArchivo)) {
    return null;
  }

  try {
    const cache = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));

    if (
      cache &&
      typeof cache === 'object' &&
      typeof cache.cacheKey === 'string' &&
      cache.cacheKey === llaveDeCache &&
      esMapaDeVectores(cache.topicVectors)
    ) {
      return cache.topicVectors;
    }
  } catch {
    // Ignora cache roto y lo regenera.
  }

  return null;
}

async function cargarOVolverAGenerarVectores({
  rutaArchivo,
  llaveDeCache,
  generarVectores,
}) {
  fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });

  const cache = leerCacheValido(rutaArchivo, llaveDeCache);
  if (cache) {
    return cache;
  }

  const topicVectors = await generarVectores();
  fs.writeFileSync(
    rutaArchivo,
    JSON.stringify({
      cacheKey: llaveDeCache,
      generatedAt: new Date().toISOString(),
      topicVectors,
    }),
    'utf8'
  );

  return topicVectors;
}

module.exports = {
  cargarOVolverAGenerarVectores,
};
