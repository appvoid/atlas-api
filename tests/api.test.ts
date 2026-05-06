import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { TicketsRepository } from '../src/repositories/ticketsRepository';
import type { ClassificationResult, Classifier, TicketPayload } from '../src/types';

const API_KEY = 'sk-atlas-123';
const HEADERS = {
  apiKey: API_KEY,
  'Content-Type': 'application/json',
};

type MockClassifier = Classifier & {
  calls: TicketPayload[];
};

interface TestContext {
  classifier: MockClassifier;
  baseUrl: string;
  close(): Promise<void>;
}

function createMockClassifier(): MockClassifier {
  return {
    calls: [],
    getStatus() {
      return { modelo: 'cargado', hilos: 1 };
    },
    async classify(payload): Promise<ClassificationResult> {
      this.calls.push(payload);

      if (payload.texto.toLowerCase().includes('pago')) {
        return { tema: 'Facturacion', confianza: 0.95 };
      }

      if (payload.texto.toLowerCase().includes('login')) {
        return { tema: 'Acceso a Cuenta', confianza: 0.91 };
      }

      return { tema: 'Consulta General', confianza: 0.72 };
    },
  };
}

async function createTestContext(): Promise<TestContext> {
  const database = createDatabase(':memory:');
  const ticketsRepository = new TicketsRepository(database);
  const classifier = createMockClassifier();
  const app = createApp({
    classifier,
    ticketsRepository,
    apiKey: API_KEY,
    apiKeyHeaderName: 'apiKey',
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de prueba.');
  }

  return {
    classifier,
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      database.close();
    },
  };
}

test('GET /salud devuelve el estado base de la API', async (t) => {
  const context = await createTestContext();
  t.after(() => context.close());

  const response = await fetch(`${context.baseUrl}/salud`);
  const body = (await response.json()) as {
    estado: string;
    modelo: string;
    hilos: number;
  };

  assert.equal(response.status, 200);
  assert.equal(body.estado, 'ok');
  assert.equal(body.modelo, 'cargado');
  assert.equal(body.hilos, 1);
});

test('POST /clasificar exige apiKey valida', async (t) => {
  const context = await createTestContext();
  t.after(() => context.close());

  const response = await fetch(`${context.baseUrl}/clasificar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texto: "I can't login" }),
  });

  assert.equal(response.status, 403);
});

test('POST /clasificar devuelve 503 mientras el clasificador sigue cargando', async (t) => {
  const database = createDatabase(':memory:');
  const ticketsRepository = new TicketsRepository(database);
  const app = createApp({
    classifier: {
      getStatus() {
        return { modelo: 'cargando', hilos: 1 };
      },
      async classify() {
        throw new Error('No deberia clasificar mientras carga');
      },
    },
    ticketsRepository,
    apiKey: API_KEY,
    apiKeyHeaderName: 'apiKey',
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de prueba.');
  }

  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    database.close();
  });

  const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/clasificar`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ texto: 'No puedo hacer login' }),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json() as { detail: string }).detail, /clasificador aun se esta inicializando/i);
});

test('POST /clasificar valida el campo texto', async (t) => {
  const context = await createTestContext();
  t.after(() => context.close());

  const response = await fetch(`${context.baseUrl}/clasificar`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({}),
  });

  const body = (await response.json()) as { detail: string };

  assert.equal(response.status, 422);
  assert.equal(body.detail, "El campo 'texto' es obligatorio.");
});

test('POST /clasificar delega la clasificacion y responde tema + confianza', async (t) => {
  const context = await createTestContext();
  t.after(() => context.close());

  const response = await fetch(`${context.baseUrl}/clasificar`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      texto: 'Tengo un problema con mi pago mensual',
      instruccion: 'custom: ',
      ejemplos: {
        Facturacion: ['pago', 'factura'],
      },
    }),
  });

  const body = (await response.json()) as ClassificationResult;

  assert.equal(response.status, 200);
  assert.deepEqual(body, { tema: 'Facturacion', confianza: 0.95 });
  assert.deepEqual(context.classifier.calls[0], {
    texto: 'Tengo un problema con mi pago mensual',
    instruccion: 'custom: ',
    ejemplos: {
      Facturacion: ['pago', 'factura'],
    },
  });
});

test('CRUD de /tickets crea, lista, consulta, actualiza y elimina tickets persistidos', async (t) => {
  const context = await createTestContext();
  t.after(() => context.close());

  const createResponse = await fetch(`${context.baseUrl}/tickets`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      texto: 'Tengo un problema con mi pago anual',
    }),
  });

  const createdTicket = (await createResponse.json()) as {
    id: number;
    texto: string;
    tema: string;
  };

  assert.equal(createResponse.status, 201);
  assert.equal(createdTicket.tema, 'Facturacion');
  assert.equal(createdTicket.texto, 'Tengo un problema con mi pago anual');
  assert.equal(createdTicket.id, 1);

  const listResponse = await fetch(`${context.baseUrl}/tickets`, {
    headers: {
      apiKey: API_KEY,
    },
  });
  const listedTickets = (await listResponse.json()) as Array<{ id: number }>;

  assert.equal(listResponse.status, 200);
  assert.equal(listedTickets.length, 1);
  assert.equal(listedTickets[0].id, createdTicket.id);

  const getResponse = await fetch(`${context.baseUrl}/tickets/${createdTicket.id}`, {
    headers: {
      apiKey: API_KEY,
    },
  });
  const fetchedTicket = (await getResponse.json()) as { tema: string };

  assert.equal(getResponse.status, 200);
  assert.equal(fetchedTicket.tema, 'Facturacion');

  const updateResponse = await fetch(`${context.baseUrl}/tickets/${createdTicket.id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({
      texto: 'No puedo hacer login en la plataforma',
    }),
  });
  const updatedTicket = (await updateResponse.json()) as { tema: string; texto: string };

  assert.equal(updateResponse.status, 200);
  assert.equal(updatedTicket.tema, 'Acceso a Cuenta');
  assert.equal(updatedTicket.texto, 'No puedo hacer login en la plataforma');

  const deleteResponse = await fetch(`${context.baseUrl}/tickets/${createdTicket.id}`, {
    method: 'DELETE',
    headers: {
      apiKey: API_KEY,
    },
  });

  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${context.baseUrl}/tickets/${createdTicket.id}`, {
    headers: {
      apiKey: API_KEY,
    },
  });

  assert.equal(missingResponse.status, 404);
});
