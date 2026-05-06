const config = require('./config');
const { createApp } = require('./app');
const { createDatabase } = require('./db/database');
const { TicketsRepository } = require('./repositories/ticketsRepository');
const { CrispEmbedProcessClient } = require('./services/crispEmbedProcessClient');
const { SupportClassifier } = require('./services/supportClassifier');
const { DEFAULT_TOPICS } = require('./topics');

async function main() {
  const database = createDatabase(config.databasePath);
  const ticketsRepository = new TicketsRepository(database);
  const embeddingClient = new CrispEmbedProcessClient(config.crispEmbed);
  const classifier = new SupportClassifier({
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
    .catch((error) => {
      console.error(`Fallo inicializando el clasificador: ${error.message}`);
    });

  async function shutdown(signal) {
    console.log(`Recibida senal ${signal}. Cerrando servicios...`);
    server.close();
    await classifier.close();
    database.close();
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT').finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').finally(() => process.exit(0));
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  main,
};
