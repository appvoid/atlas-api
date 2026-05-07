function crearError(estado, detalle) {
  const error = new Error(detalle);
  error.estado = estado;
  return error;
}

function manejarRutaNoEncontrada(_req, res) {
  res.status(404).json({ detail: 'Ruta no encontrada.' });
}

function manejarErrores(error, _req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error && error.type === 'entity.parse.failed') {
    res.status(400).json({ detail: 'El cuerpo debe ser JSON valido.' });
    return;
  }

  if (error && (error.estado || error.status)) {
    res.status(error.estado || error.status).json({
      detail: error.message || 'La solicitud no pudo completarse.',
    });
    return;
  }

  console.error(error);
  res.status(500).json({ detail: 'Error interno del servidor.' });
}

module.exports = {
  crearError,
  manejarRutaNoEncontrada,
  manejarErrores,
};
