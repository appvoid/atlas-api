function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateExamples(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    return false;
  }

  return entries.every(([topic, examples]) => {
    if (typeof topic !== 'string' || topic.trim().length === 0) {
      return false;
    }

    if (!Array.isArray(examples) || !examples.length) {
      return false;
    }

    return examples.every((example) => typeof example === 'string' && example.trim().length > 0);
  });
}

function validateTicketPayload(body, options = {}) {
  const { requireText = false, requireAtLeastOneField = false } = options;

  if (!isPlainObject(body)) {
    return { error: 'El cuerpo debe ser un objeto JSON.' };
  }

  const hasText = hasOwn(body, 'texto');
  const hasInstruction = hasOwn(body, 'instruccion');
  const hasExamples = hasOwn(body, 'ejemplos');

  if (requireAtLeastOneField && !hasText && !hasInstruction && !hasExamples) {
    return { error: 'Debes enviar al menos uno de estos campos: texto, instruccion o ejemplos.' };
  }

  if (requireText && !hasText) {
    return { error: "El campo 'texto' es obligatorio." };
  }

  const payload = {
    hasText,
    hasInstruction,
    hasExamples,
  };

  if (hasText) {
    if (typeof body.texto !== 'string' || body.texto.trim().length === 0) {
      return { error: "El campo 'texto' debe ser un string no vacio." };
    }

    payload.texto = body.texto;
  }

  if (hasInstruction) {
    if (body.instruccion !== null && typeof body.instruccion !== 'string') {
      return { error: "El campo 'instruccion' debe ser un string o null." };
    }

    payload.instruccion = body.instruccion;
  }

  if (hasExamples) {
    if (body.ejemplos !== null && !validateExamples(body.ejemplos)) {
      return {
        error:
          "El campo 'ejemplos' debe ser un objeto con temas y arreglos de ejemplos no vacios.",
      };
    }

    payload.ejemplos = body.ejemplos;
  }

  return { value: payload };
}

function parseTicketId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

module.exports = {
  hasOwn,
  parseTicketId,
  validateTicketPayload,
};
