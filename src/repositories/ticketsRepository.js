function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    texto: row.texto,
    tema: row.tema,
    confianza: Number(row.confianza),
    instruccion: row.instruccion,
    ejemplos: row.ejemplos_json ? JSON.parse(row.ejemplos_json) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class TicketsRepository {
  constructor(database) {
    this.database = database;
    this.insertStatement = database.prepare(`
      INSERT INTO tickets (
        texto,
        tema,
        confianza,
        instruccion,
        ejemplos_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.listStatement = database.prepare(`
      SELECT id, texto, tema, confianza, instruccion, ejemplos_json, created_at, updated_at
      FROM tickets
      ORDER BY created_at DESC, id DESC
    `);
    this.getStatement = database.prepare(`
      SELECT id, texto, tema, confianza, instruccion, ejemplos_json, created_at, updated_at
      FROM tickets
      WHERE id = ?
    `);
    this.updateStatement = database.prepare(`
      UPDATE tickets
      SET texto = ?, tema = ?, confianza = ?, instruccion = ?, ejemplos_json = ?, updated_at = ?
      WHERE id = ?
    `);
    this.deleteStatement = database.prepare('DELETE FROM tickets WHERE id = ?');
  }

  create(ticket) {
    const timestamp = new Date().toISOString();
    const result = this.insertStatement.run(
      ticket.texto,
      ticket.tema,
      ticket.confianza,
      ticket.instruccion ?? null,
      ticket.ejemplos ? JSON.stringify(ticket.ejemplos) : null,
      timestamp,
      timestamp
    );

    return this.getById(Number(result.lastInsertRowid));
  }

  list() {
    return this.listStatement.all().map(mapRow);
  }

  getById(id) {
    return mapRow(this.getStatement.get(id));
  }

  update(id, ticket) {
    const timestamp = new Date().toISOString();
    const result = this.updateStatement.run(
      ticket.texto,
      ticket.tema,
      ticket.confianza,
      ticket.instruccion ?? null,
      ticket.ejemplos ? JSON.stringify(ticket.ejemplos) : null,
      timestamp,
      id
    );

    if (!result.changes) {
      return null;
    }

    return this.getById(id);
  }

  delete(id) {
    const result = this.deleteStatement.run(id);
    return result.changes > 0;
  }
}

module.exports = {
  TicketsRepository,
};
