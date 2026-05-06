const fs = require('node:fs');
const { spawn } = require('node:child_process');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CrispEmbedProcessClient {
  constructor(options) {
    this.model = options.model;
    this.threads = options.threads;
    this.host = options.host;
    this.port = options.port;
    this.binaryPath = options.binaryPath;
    this.startupTimeoutMs = options.startupTimeoutMs;
    this.serverUrl = options.serverUrl;
    this.process = null;
    this.startingPromise = null;
    this.lastLogs = [];
  }

  get baseUrl() {
    return this.serverUrl || `http://${this.host}:${this.port}`;
  }

  get modelIdentifier() {
    return `${this.model}@${this.baseUrl}`;
  }

  async start() {
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

  async spawnProcess() {
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

    this.process = spawn(this.binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.stdout.on('data', (chunk) => {
      this.captureLog(chunk);
    });

    this.process.stderr.on('data', (chunk) => {
      this.captureLog(chunk);
    });

    this.process.once('exit', (code, signal) => {
      this.process = null;

      if (code !== 0) {
        this.captureLog(`crispembed-server termino con codigo ${code} y senal ${signal ?? 'ninguna'}`);
      }
    });

    await this.waitForHealth();
  }

  captureLog(chunk) {
    const text = chunk.toString().trim();
    if (!text) {
      return;
    }

    this.lastLogs.push(text);
    if (this.lastLogs.length > 20) {
      this.lastLogs.shift();
    }
  }

  async waitForHealth() {
    const startedAt = Date.now();
    let lastError = null;

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
        lastError = error;
      }

      await sleep(500);
    }

    const details = this.lastLogs.length ? this.lastLogs.join('\n') : lastError?.message || 'sin detalles';
    throw new Error(`No se pudo iniciar CrispEmbed.\n${details}`);
  }

  async embed(texts) {
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

    const data = await response.json();
    return data.embeddings;
  }

  async stop() {
    if (!this.process || this.process.exitCode !== null) {
      this.process = null;
      return;
    }

    const processRef = this.process;

    await new Promise((resolve) => {
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
}

module.exports = {
  CrispEmbedProcessClient,
};
