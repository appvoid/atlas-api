import express, { type ErrorRequestHandler, type RequestHandler, type Response } from 'express';
import { TicketsRepository } from './repositories/ticketsRepository';
import type { Classifier, TicketMutation } from './types';
import {
  hasOwn,
  parseCreateTicketPayload,
  parseTicketId,
  parseUpdateTicketPayload,
} from './utils/validation';

interface CreateAppOptions {
  classifier: Classifier;
  ticketsRepository: TicketsRepository;
  apiKey: string;
  apiKeyHeaderName: string;
}

function requireApiKey(apiKeyHeaderName: string, apiKey: string): RequestHandler {
  return (request, response, next) => {
    const providedApiKey = request.header(apiKeyHeaderName);
    if (providedApiKey !== apiKey) {
      response.status(403).json({ detail: 'No se pudieron validar las credenciales' });
      return;
    }

    next();
  };
}

function ensureClassifierReady(classifier: Classifier, response: Response): boolean {
  const status = classifier.getStatus();
  if (status.modelo === 'cargando' || status.modelo === 'no_cargado') {
    response.status(503).json({
      detail:
        "El clasificador aun se esta inicializando. Intenta de nuevo cuando /salud reporte 'modelo: cargado'.",
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

function isJsonSyntaxError(error: unknown): error is SyntaxError & { status: number; body: string } {
  const candidate = error as Record<string, unknown> | null;
  return (
    error instanceof SyntaxError &&
    candidate !== null &&
    typeof candidate.status === 'number' &&
    candidate.status === 400 &&
    'body' in candidate
  );
}

function getErrorMessage(error: unknown): string | null {
  return error instanceof Error && error.message ? error.message : null;
}

function normalizeTicketMutation(
  texto: string,
  instruccion: string | null | undefined,
  ejemplos: TicketMutation['ejemplos'] | undefined,
  tema: string,
  confianza: number
): TicketMutation {
  return {
    texto,
    instruccion: instruccion ?? null,
    ejemplos: ejemplos ?? null,
    tema,
    confianza,
  };
}

export function createApp(options: CreateAppOptions) {
  const app = express();
  const authMiddleware = requireApiKey(options.apiKeyHeaderName, options.apiKey);

  app.use(express.json());

  app.get('/salud', (_request, response) => {
    const status = options.classifier.getStatus();
    response.status(200).json({
      estado: 'ok',
      modelo: status.modelo,
      hilos: status.hilos,
      baseDatos: 'ok',
    });
  });

  app.post('/clasificar', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(options.classifier, response)) {
        return;
      }

      const validation = parseCreateTicketPayload(request.body);
      if ('error' in validation) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const result = await options.classifier.classify(validation.value);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/tickets', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(options.classifier, response)) {
        return;
      }

      const validation = parseCreateTicketPayload(request.body);
      if ('error' in validation) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const classification = await options.classifier.classify(validation.value);
      const ticket = options.ticketsRepository.create(
        normalizeTicketMutation(
          validation.value.texto,
          validation.value.instruccion,
          validation.value.ejemplos,
          classification.tema,
          classification.confianza
        )
      );

      response.status(201).json(ticket);
    } catch (error) {
      next(error);
    }
  });

  app.get('/tickets', authMiddleware, (_request, response) => {
    response.status(200).json(options.ticketsRepository.list());
  });

  app.get('/tickets/:id', authMiddleware, (request, response) => {
    const ticketId = parseTicketId(request.params.id);
    if (!ticketId) {
      response.status(400).json({ detail: 'Id de ticket invalido.' });
      return;
    }

    const ticket = options.ticketsRepository.getById(ticketId);
    if (!ticket) {
      response.status(404).json({ detail: 'Ticket no encontrado.' });
      return;
    }

    response.status(200).json(ticket);
  });

  app.put('/tickets/:id', authMiddleware, async (request, response, next) => {
    try {
      if (!ensureClassifierReady(options.classifier, response)) {
        return;
      }

      const ticketId = parseTicketId(request.params.id);
      if (!ticketId) {
        response.status(400).json({ detail: 'Id de ticket invalido.' });
        return;
      }

      const existingTicket = options.ticketsRepository.getById(ticketId);
      if (!existingTicket) {
        response.status(404).json({ detail: 'Ticket no encontrado.' });
        return;
      }

      const validation = parseUpdateTicketPayload(request.body);
      if ('error' in validation) {
        response.status(422).json({ detail: validation.error });
        return;
      }

      const nextPayload = {
        texto: hasOwn(validation.value, 'texto') ? validation.value.texto! : existingTicket.texto,
        instruccion: hasOwn(validation.value, 'instruccion')
          ? validation.value.instruccion ?? null
          : existingTicket.instruccion,
        ejemplos: hasOwn(validation.value, 'ejemplos')
          ? validation.value.ejemplos ?? null
          : existingTicket.ejemplos,
      };

      const classification = await options.classifier.classify(nextPayload);
      const updatedTicket = options.ticketsRepository.update(
        ticketId,
        normalizeTicketMutation(
          nextPayload.texto,
          nextPayload.instruccion,
          nextPayload.ejemplos,
          classification.tema,
          classification.confianza
        )
      );

      if (!updatedTicket) {
        response.status(404).json({ detail: 'Ticket no encontrado.' });
        return;
      }

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

    const deleted = options.ticketsRepository.delete(ticketId);
    if (!deleted) {
      response.status(404).json({ detail: 'Ticket no encontrado.' });
      return;
    }

    response.status(204).send();
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (isJsonSyntaxError(error)) {
      response.status(400).json({ detail: 'JSON invalido.' });
      return;
    }

    const message = getErrorMessage(error);
    if (message) {
      response.status(503).json({ detail: message });
      return;
    }

    next(error);
  };

  app.use(errorHandler);

  return app;
}
