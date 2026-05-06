const express = require('express');
const { parseTicketId, validateTicketPayload } = require('./utils/validation');

function requireApiKey(apiKeyHeaderName, apiKey) {
  return (request, response, next) => {
    const providedApiKey = request.header(apiKeyHeaderName);
    if (providedApiKey !== apiKey) {
      response.status(403).json({ detail: 'No se pudieron validar las credenciales' });
      return;
    }

    next();
  };
}

function ensureClassifierReady(classifier, response) {
  const status = classifier.getStatus();
  if (status.modelo === 'cargando' || status.modelo === 'no_cargado') {
    response.status(503).json({
      detail: "El clasificador aun se esta inicializando. Intenta de nuevo cuando /salud reporte 'modelo: cargado'.",
    });
    return false;
  }

  if (status.modelo === 'error') {
    response.status(503).json({
      detail: 'El clasificador no pudo inicializarse. Revisa los logs del servidor.',
    });
    return false;
  }

  return true;
}

function createApp(options) {
  const app = express();
  const classifier = options.classifier;
  const ticketsRepository = options.ticketsRepository;
  const authMiddleware = requireApiKey(options.apiKeyHeaderName, options.apiKey);

  app.use(express.json());

  app.get('/salud', (request, response) => {
    const status = classifier.getStatus();
    response.status(200).json({
      estado: 'ok',
      modelo: status.modelo,
      hilos: status.hilos,
      baseDatos: 'ok',
    });
  });

  app.post('/clasificar', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(classifier, response)) {
        return;
      }

      const validation = validateTicketPayload(request.body, { requireText: true });
      if (validation.error) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const result = await classifier.classify(validation.value);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/tickets', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(classifier, response)) {
        return;
      }

      const validation = validateTicketPayload(request.body, { requireText: true });
      if (validation.error) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const classification = await classifier.classify(validation.value);
      const ticket = ticketsRepository.create({
        texto: validation.value.texto,
        instruccion: validation.value.instruccion ?? null,
        ejemplos: validation.value.ejemplos ?? null,
        ...classification,
      });

      response.status(201).json(ticket);
    } catch (error) {
      next(error);
    }
  });

  app.get('/tickets', authMiddleware, (request, response) => {
    response.status(200).json(ticketsRepository.list());
  });

  app.get('/tickets/:id', authMiddleware, (request, response) => {
    const ticketId = parseTicketId(request.params.id);
    if (!ticketId) {
      response.status(400).json({ detail: 'Id de ticket invalido.' });
      return;
    }

    const ticket = ticketsRepository.getById(ticketId);
    if (!ticket) {
      response.status(404).json({ detail: 'Ticket no encontrado.' });
      return;
    }

    response.status(200).json(ticket);
  });

  app.put('/tickets/:id', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(classifier, response)) {
        return;
      }

      const ticketId = parseTicketId(request.params.id);
      if (!ticketId) {
        response.status(400).json({ detail: 'Id de ticket invalido.' });
        return;
      }

      const existingTicket = ticketsRepository.getById(ticketId);
      if (!existingTicket) {
        response.status(404).json({ detail: 'Ticket no encontrado.' });
        return;
      }

      const validation = validateTicketPayload(request.body, { requireAtLeastOneField: true });
      if (validation.error) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const nextPayload = {
        texto: validation.value.hasText ? validation.value.texto : existingTicket.texto,
        instruccion: validation.value.hasInstruction
          ? validation.value.instruccion
          : existingTicket.instruccion,
        ejemplos: validation.value.hasExamples ? validation.value.ejemplos : existingTicket.ejemplos,
      };

      const classification = await classifier.classify(nextPayload);
      const updatedTicket = ticketsRepository.update(ticketId, {
        ...nextPayload,
        ...classification,
      });

      response.status(200).json(updatedTicket);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/tickets/:id', authMiddleware, (request, response) => {
    const ticketId = parseTicketId(request.params.id);
    if (!ticketId) {
      response.status(400).json({ detail: 'Id de ticket invalido.' });
      return;
    }

    const deleted = ticketsRepository.delete(ticketId);
    if (!deleted) {
      response.status(404).json({ detail: 'Ticket no encontrado.' });
      return;
    }

    response.status(204).send();
  });

  app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      response.status(400).json({ detail: 'JSON invalido.' });
      return;
    }

    if (error && error.message) {
      response.status(503).json({ detail: error.message });
      return;
    }

    next(error);
  });

  return app;
}

module.exports = {
  createApp,
};
