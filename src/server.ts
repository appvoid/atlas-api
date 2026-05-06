import type { Server } from 'node:http';
import config from './config';
import { createApp } from './app';
import { createDatabase } from './db/database';
import { TicketsRepository } from './repositories/ticketsRepository';
import { CrispEmbedProcessClient } from './services/crispEmbedProcessClient';
import { SupportClassifier } from './services/supportClassifier';
import { DEFAULT_TOPICS } from './topics';

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function main(): Promise<void> {
  const database = createDatabase(config.databasePath);
  const ticketsRepository = new TicketsRepository(database);
  const embeddingClient = new CrispEmbedProcessClient(config.crispEmbed);
  const classifier = SupportClassifier.create({
    embeddingClient,
    defaultTopics: DEFAULT_TOPICS,
    defaultInstruction: 'query: ',
    promptVectorsPath: config.promptVectorsPath,
  });

  const app = createApp({
    classifier,
    ticketsRepository,
    apiKey: config.apiKey,
    apiKeyHeaderName: config.apiKeyHeaderName,
  });

  const server = app.listen(config.port, config.host, () => {
    console.log(`Atlas escuchando en http://${config.host}:${config.port}`);
  });

  classifier
    .initialize()
    .then(() => {
      console.log('Clasificador listo.');
    })
    .catch((error: Error) => {
      console.error(`Fallo inicializando el clasificador: ${error.message}`);
    });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    console.log(`Recibida senal ${signal}. Cerrando servicios...`);
    await closeServer(server);
    await classifier.close();
    database.close();
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT')
      .catch((error: Error) => {
        console.error(error.message);
        process.exitCode = 1;
      })
      .finally(() => process.exit());
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM')
      .catch((error: Error) => {
        console.error(error.message);
        process.exitCode = 1;
      })
      .finally(() => process.exit());
  });
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
}
