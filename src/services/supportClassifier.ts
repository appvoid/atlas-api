import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type {
  ClassificationResult,
  ClassifierStatus,
  EmbeddingClient,
  EmbeddingVector,
  TicketPayload,
  TopicExamples,
  TopicVectors,
} from '../types';

const promptVectorCacheSchema = z.object({
  cacheKey: z.string(),
  topicVectors: z.record(z.string(), z.array(z.array(z.number()))),
});

export interface SupportClassifierOptions {
  embeddingClient: EmbeddingClient;
  defaultTopics: TopicExamples;
  defaultInstruction?: string;
  promptVectorsPath: string;
}

function dotProduct(left: EmbeddingVector, right: EmbeddingVector): number {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += left[index] * right[index];
  }
  return total;
}

function roundConfidence(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export class SupportClassifier {
  private defaultTopicVectors: TopicVectors | null = null;
  private ready = false;
  private initializingPromise: Promise<void> | null = null;
  private lastError: Error | null = null;

  constructor(
    private readonly options: Required<Pick<SupportClassifierOptions, 'defaultInstruction'>> &
      Omit<SupportClassifierOptions, 'defaultInstruction'>
  ) {}

  static create(options: SupportClassifierOptions): SupportClassifier {
    return new SupportClassifier({
      ...options,
      defaultInstruction: options.defaultInstruction || 'query: ',
    });
  }

  getStatus(): ClassifierStatus {
    return {
      modelo: this.ready
        ? 'cargado'
        : this.initializingPromise
          ? 'cargando'
          : this.lastError
            ? 'error'
            : 'no_cargado',
      hilos: this.options.embeddingClient.threads,
    };
  }

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }

    this.initializingPromise = this.initializeInternal();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  async close(): Promise<void> {
    await this.options.embeddingClient.stop();
  }

  async classify({
    texto,
    instruccion = null,
    ejemplos = null,
  }: TicketPayload): Promise<ClassificationResult> {
    await this.initialize();

    const instruction =
      instruccion === null ? this.options.defaultInstruction : instruccion;
    const [ticketVector] = await this.options.embeddingClient.embed([`${instruction}${texto}`]);
    const referenceVectors = ejemplos
      ? await this.computeTopicVectors(ejemplos)
      : this.defaultTopicVectors;

    if (!referenceVectors) {
      throw new Error('No hay vectores de referencia disponibles para clasificar.');
    }

    let bestTopic: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const [topic, vectors] of Object.entries(referenceVectors)) {
      for (const vector of vectors) {
        const score = dotProduct(ticketVector, vector);
        if (score > bestScore) {
          bestScore = score;
          bestTopic = topic;
        }
      }
    }

    if (!bestTopic) {
      throw new Error('No hay temas disponibles para clasificar.');
    }

    return {
      tema: bestTopic,
      confianza: roundConfidence(bestScore),
    };
  }

  private async initializeInternal(): Promise<void> {
    try {
      await this.options.embeddingClient.start();
      this.defaultTopicVectors = await this.loadOrCreateDefaultTopicVectors();
      this.ready = true;
      this.lastError = null;
    } catch (error) {
      this.ready = false;
      this.lastError = error instanceof Error ? error : new Error(String(error));
      throw this.lastError;
    }
  }

  private getCacheKey(): string {
    const hash = crypto.createHash('sha256');
    hash.update(
      JSON.stringify({
        model: this.options.embeddingClient.modelIdentifier,
        topics: this.options.defaultTopics,
      })
    );
    return hash.digest('hex');
  }

  private async loadOrCreateDefaultTopicVectors(): Promise<TopicVectors> {
    const directory = path.dirname(this.options.promptVectorsPath);
    fs.mkdirSync(directory, { recursive: true });

    if (fs.existsSync(this.options.promptVectorsPath)) {
      try {
        const cached = promptVectorCacheSchema.safeParse(
          JSON.parse(fs.readFileSync(this.options.promptVectorsPath, 'utf8'))
        );

        if (cached.success && cached.data.cacheKey === this.getCacheKey()) {
          return cached.data.topicVectors;
        }
      } catch {
        // Ignora caches corruptos y vuelve a generarlos.
      }
    }

    const topicVectors = await this.computeTopicVectors(this.options.defaultTopics);
    const payload = {
      cacheKey: this.getCacheKey(),
      model: this.options.embeddingClient.modelIdentifier,
      generatedAt: new Date().toISOString(),
      topicVectors,
    };

    fs.writeFileSync(this.options.promptVectorsPath, JSON.stringify(payload), 'utf8');
    return topicVectors;
  }

  private async computeTopicVectors(topics: TopicExamples): Promise<TopicVectors> {
    const entries = Object.entries(topics);
    const flattenedTexts: string[] = [];
    const segments: Array<{ topic: string; startIndex: number; count: number }> = [];

    for (const [topic, examples] of entries) {
      segments.push({
        topic,
        startIndex: flattenedTexts.length,
        count: examples.length,
      });
      flattenedTexts.push(...examples);
    }

    const embeddings = await this.options.embeddingClient.embed(flattenedTexts);
    const topicVectors: TopicVectors = {};

    for (const segment of segments) {
      topicVectors[segment.topic] = embeddings.slice(
        segment.startIndex,
        segment.startIndex + segment.count
      );
    }

    return topicVectors;
  }
}
