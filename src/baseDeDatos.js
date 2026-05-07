const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function ejecutarMigraciones(baseDeDatos) {
  baseDeDatos.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL,
      tema TEXT NOT NULL,
      confianza REAL NOT NULL,
      instruccion TEXT,
      ejemplos_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TRIGGER IF NOT EXISTS tickets_actualizar_updated_at
    AFTER UPDATE ON tickets
    FOR EACH ROW
    BEGIN
      UPDATE tickets
      SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = OLD.id;
    END;
  `);
}

function crearBaseDeDatos(rutaArchivo) {
  if (rutaArchivo !== ':memory:') {
    fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });
  }

  const baseDeDatos = new Database(rutaArchivo);
  baseDeDatos.pragma('journal_mode = WAL');
  baseDeDatos.pragma('foreign_keys = ON');
  ejecutarMigraciones(baseDeDatos);

  return baseDeDatos;
}

module.exports = {
  crearBaseDeDatos,
};
