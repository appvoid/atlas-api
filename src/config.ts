import fs from 'node:fs';
import path from 'node:path';

export interface CrispEmbedConfig {
  model: string;
  threads: number;
  host: string;
  port: number;
  startupTimeoutMs: number;
  serverUrl: string | null;
  binaryPath: string;
}

export interface AtlasConfig {
  host: string;
  port: number;
  apiKey: string;
  apiKeyHeaderName: string;
  databasePath: string;
  promptVectorsPath: string;
  crispEmbed: CrispEmbedConfig;
}

const projectRoot = path.resolve(__dirname, '..');
const crispEmbedBuildDir = path.join(projectRoot, 'CrispEmbed', 'build');
const localDefaultModelPath = path.join(projectRoot, 'CrispEmbed', 'e5.gguf');
const legacyLocalModelPath = path.join(projectRoot, 'CrispEmbed', 'es_q8_0.gguf');

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDefaultModel(): string {
  if (fs.existsSync(localDefaultModelPath)) {
    return localDefaultModelPath;
  }

  if (fs.existsSync(legacyLocalModelPath)) {
    return legacyLocalModelPath;
  }

  return 'multilingual-e5-small';
}

const config: AtlasConfig = {
  host: process.env.HOST || '0.0.0.0',
  port: readNumber(process.env.PORT, 8000),
  apiKey: process.env.ATLAS_API_KEY || 'sk-atlas-123',
  apiKeyHeaderName: process.env.ATLAS_API_KEY_HEADER || 'apiKey',
  databasePath: process.env.DATABASE_PATH || path.join(projectRoot, 'data', 'atlas.sqlite'),
  promptVectorsPath:
    process.env.PROMPT_VECTORS_PATH || path.join(projectRoot, 'data', 'prompt-vectors.json'),
  crispEmbed: {
    model: process.env.CRISPEMBED_MODEL || resolveDefaultModel(),
    threads: readNumber(process.env.CRISPEMBED_THREADS, 1),
    host: process.env.CRISPEMBED_HOST || '127.0.0.1',
    port: readNumber(process.env.CRISPEMBED_PORT, 8091),
    startupTimeoutMs: readNumber(process.env.CRISPEMBED_STARTUP_TIMEOUT_MS, 300000),
    serverUrl: process.env.CRISPEMBED_SERVER_URL || null,
    binaryPath:
      process.env.CRISPEMBED_SERVER_BINARY ||
      path.join(
        crispEmbedBuildDir,
        process.platform === 'win32' ? 'crispembed-server.exe' : 'crispembed-server'
      ),
  },
};

export default config;
