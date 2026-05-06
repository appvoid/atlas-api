import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SupportClassifier } from '../src/services/supportClassifier';
import type { EmbeddingClient, EmbeddingVector } from '../src/types';

class FakeEmbeddingClient implements EmbeddingClient {
  readonly threads = 1;
  readonly modelIdentifier = 'fake-model@memory';
  started = false;

  constructor(private readonly vectors: Record<string, EmbeddingVector>) {}

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {}

  async embed(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map((text) => {
      const vector = this.vectors[text];
      if (!vector) {
        throw new Error(`Vector no configurado para: ${text}`);
      }
      return vector;
    });
  }
}

test('SupportClassifier clasifica con el prefijo por defecto y soporta ejemplos personalizados', async () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-classifier-'));
  const promptVectorsPath = path.join(tempDirectory, 'prompt-vectors.json');

  const embeddingClient = new FakeEmbeddingClient({
    pago: [1, 0],
    factura: [0.95, 0.05],
    error: [0, 1],
    'query: ticket de pago duplicado': [1, 0],
    'prioriza soporte: necesito ayuda tecnica': [0, 1],
    tecnico: [0, 1],
    ventas: [1, 0],
  });

  const classifier = SupportClassifier.create({
    embeddingClient,
    defaultTopics: {
      Facturacion: ['pago', 'factura'],
      'Problema Tecnico': ['error'],
    },
    defaultInstruction: 'query: ',
    promptVectorsPath,
  });

  const defaultResult = await classifier.classify({
    texto: 'ticket de pago duplicado',
  });

  const customResult = await classifier.classify({
    texto: 'necesito ayuda tecnica',
    instruccion: 'prioriza soporte: ',
    ejemplos: {
      Soporte: ['tecnico'],
      Ventas: ['ventas'],
    },
  });

  assert.deepEqual(defaultResult, {
    tema: 'Facturacion',
    confianza: 1,
  });

  assert.deepEqual(customResult, {
    tema: 'Soporte',
    confianza: 1,
  });

  assert.equal(embeddingClient.started, true);
  assert.equal(fs.existsSync(promptVectorsPath), true);
});
