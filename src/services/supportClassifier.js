const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function dotProduct(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += left[index] * right[index];
  }
  return total;
}

function roundConfidence(value) {
  return Math.round(value * 10000) / 10000;
}

class SupportClassifier {
  constructor(options) {
    this.embeddingClient = options.embeddingClient;
    this.defaultTopics = options.defaultTopics;
    this.defaultInstruction = options.defaultInstruction || 'query: ';
    this.promptVectorsPath = options.promptVectorsPath;
    this.defaultTopicVectors = null;
    this.ready = false;
    this.initializingPromise = null;
    this.lastError = null;
  }

  getStatus() {
    return {
      modelo: this.ready
        ? 'cargado'
        : this.initializingPromise
          ? 'cargando'
          : this.lastError
            ? 'error'
            : 'no_cargado',
      hilos: this.embeddingClient.threads,
    };
  }

  async initialize() {
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

  async initializeInternal() {
    try {
      await this.embeddingClient.start();
      this.defaultTopicVectors = await this.loadOrCreateDefaultTopicVectors();
      this.ready = true;
      this.lastError = null;
    } catch (error) {
      this.ready = false;
      this.lastError = error;
      throw error;
    }
  }

  async close() {
    await this.embeddingClient.stop();
  }

  async classify({ texto, instruccion = null, ejemplos = null }) {
    await this.initialize();

    const instruction = instruccion === null ? this.defaultInstruction : instruccion;
    const [ticketVector] = await this.embeddingClient.embed([`${instruction}${texto}`]);
    const referenceVectors = ejemplos ? await this.computeTopicVectors(ejemplos) : this.defaultTopicVectors;

    let bestTopic = null;
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

    return {
      tema: bestTopic,
      confianza: roundConfidence(bestScore),
    };
  }

  getCacheKey() {
    const hash = crypto.createHash('sha256');
    hash.update(
      JSON.stringify({
        model: this.embeddingClient.modelIdentifier,
        topics: this.defaultTopics,
      })
    );
    return hash.digest('hex');
  }

  async loadOrCreateDefaultTopicVectors() {
    const directory = path.dirname(this.promptVectorsPath);
    fs.mkdirSync(directory, { recursive: true });

    if (fs.existsSync(this.promptVectorsPath)) {
      const cached = JSON.parse(fs.readFileSync(this.promptVectorsPath, 'utf8'));
      if (cached.cacheKey === this.getCacheKey() && cached.topicVectors) {
        return cached.topicVectors;
      }
    }

    const topicVectors = await this.computeTopicVectors(this.defaultTopics);
    const payload = {
      cacheKey: this.getCacheKey(),
      model: this.embeddingClient.modelIdentifier,
      generatedAt: new Date().toISOString(),
      topicVectors,
    };

    fs.writeFileSync(this.promptVectorsPath, JSON.stringify(payload), 'utf8');
    return topicVectors;
  }

  async computeTopicVectors(topics) {
    const entries = Object.entries(topics);
    const flattenedTexts = [];
    const segments = [];

    for (const [topic, examples] of entries) {
      segments.push({
        topic,
        startIndex: flattenedTexts.length,
        count: examples.length,
      });
      flattenedTexts.push(...examples);
    }

    const embeddings = await this.embeddingClient.embed(flattenedTexts);
    const topicVectors = {};

    for (const segment of segments) {
      topicVectors[segment.topic] = embeddings.slice(
        segment.startIndex,
        segment.startIndex + segment.count
      );
    }

    return topicVectors;
  }
}

module.exports = {
  SupportClassifier,
};
