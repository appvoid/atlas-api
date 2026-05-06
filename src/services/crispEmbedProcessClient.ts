import { spawn, type ChildProcessByStdio } from 'node:child_process';
import fs from 'node:fs';
import type { Readable } from 'node:stream';
import { z } from 'zod';
import type { EmbeddingClient } from '../types';

const embedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
});

export interface CrispEmbedProcessClientOptions {
  model: string;
  threads: number;
  host: string;
  port: number;
  binaryPath: string;
  startupTimeoutMs: number;
  serverUrl: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export class CrispEmbedProcessClient implements EmbeddingClient {
  readonly model: string;
  readonly threads: number;
  readonly host: string;
  readonly port: number;
  readonly binaryPath: string;
  readonly startupTimeoutMs: number;
  readonly serverUrl: string | null;

  private process: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private startingPromise: Promise<void> | null = null;
  private readonly lastLogs: string[] = [];

  constructor(options: CrispEmbedProcessClientOptions) {
    this.model = options.model;
    this.threads = options.threads;
    this.host = options.host;
    this.port = options.port;
    this.binaryPath = options.binaryPath;
    this.startupTimeoutMs = options.startupTimeoutMs;
    this.serverUrl = options.serverUrl;
  }

  get baseUrl(): string {
    return this.serverUrl || `http://${this.host}:${this.port}`;
  }

  get modelIdentifier(): string {
    return `${this.model}@${this.baseUrl}`;
  }

  async start(): Promise<void> {
    if (this.serverUrl) {
      await this.waitForHealth();
      return;
    }

    if (this.process && this.process.exitCode === null) {
      await this.waitForHealth();
      return;
    }

    if (this.startingPromise) {
      await this.startingPromise;
      return;
    }

    if (!fs.existsSync(this.binaryPath)) {
      throw new Error(
        `No se encontro el binario de CrispEmbed en ${this.binaryPath}. Ejecuta "npm run build:crispembed".`
      );
    }

    this.startingPromise = this.spawnProcess();

    try {
      await this.startingPromise;
    } finally {
      this.startingPromise = null;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    await this.start();

    const response = await fetch(`${this.baseUrl}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      throw new Error(`CrispEmbed devolvio ${response.status}: ${await response.text()}`);
    }

    const payload = embedResponseSchema.parse(await response.json());
    return payload.embeddings;
  }

  async stop(): Promise<void> {
    if (!this.process || this.process.exitCode !== null) {
      this.process = null;
      return;
    }

    const processRef = this.process;

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (processRef.exitCode === null) {
          processRef.kill('SIGKILL');
        }
      }, 5000);

      processRef.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });

      processRef.kill('SIGTERM');
    });

    this.process = null;
  }

  private async spawnProcess(): Promise<void> {
    const args = [
      '-m',
      this.model,
      '--host',
      this.host,
      '--port',
      String(this.port),
      '-t',
      String(this.threads),
    ];

    const processRef = spawn(this.binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process = processRef;

    processRef.stdout.on('data', (chunk) => {
      this.captureLog(chunk);
    });

    processRef.stderr.on('data', (chunk) => {
      this.captureLog(chunk);
    });

    processRef.once('exit', (code, signal) => {
      this.process = null;

      if (code !== 0) {
        this.captureLog(
          `crispembed-server termino con codigo ${code} y senal ${signal ?? 'ninguna'}`
        );
      }
    });

    await this.waitForHealth();
  }

  private captureLog(chunk: Buffer | string): void {
    const text = chunk.toString().trim();
    if (!text) {
      return;
    }

    this.lastLogs.push(text);
    if (this.lastLogs.length > 20) {
      this.lastLogs.shift();
    }
  }

  private async waitForHealth(): Promise<void> {
    const startedAt = Date.now();
    let lastError: string | null = null;

    while (Date.now() - startedAt < this.startupTimeoutMs) {
      if (this.process && this.process.exitCode !== null) {
        break;
      }

      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        lastError = getErrorMessage(error);
      }

      await sleep(500);
    }

    const details = this.lastLogs.length ? this.lastLogs.join('\n') : lastError || 'sin detalles';
    throw new Error(`No se pudo iniciar CrispEmbed.\n${details}`);
  }
}
