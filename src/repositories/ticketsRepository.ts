import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { StoredTicket, TicketMutation, TopicExamples } from '../types';

interface TicketRow {
  id: number;
  texto: string;
  tema: string;
  confianza: number;
  instruccion: string | null;
  ejemplos_json: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TicketRow): StoredTicket {
  return {
    id: row.id,
    texto: row.texto,
    tema: row.tema,
    confianza: Number(row.confianza),
    instruccion: row.instruccion,
    ejemplos: row.ejemplos_json ? (JSON.parse(row.ejemplos_json) as TopicExamples) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TicketsRepository {
  private readonly insertStatement: StatementSync;
  private readonly listStatement: StatementSync;
  private readonly getStatement: StatementSync;
  private readonly updateStatement: StatementSync;
  private readonly deleteStatement: StatementSync;

  constructor(private readonly database: DatabaseSync) {
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

  create(ticket: TicketMutation): StoredTicket {
    const timestamp = new Date().toISOString();
    const result = this.insertStatement.run(
      ticket.texto,
      ticket.tema,
      ticket.confianza,
      ticket.instruccion,
      ticket.ejemplos ? JSON.stringify(ticket.ejemplos) : null,
      timestamp,
      timestamp
    );

    return this.getById(Number(result.lastInsertRowid)) as StoredTicket;
  }

  list(): StoredTicket[] {
    return this.listStatement.all().map((row) => mapRow(row as unknown as TicketRow));
  }

  getById(id: number): StoredTicket | null {
    const row = this.getStatement.get(id) as TicketRow | undefined;
    return row ? mapRow(row) : null;
  }

  update(id: number, ticket: TicketMutation): StoredTicket | null {
    const timestamp = new Date().toISOString();
    const result = this.updateStatement.run(
      ticket.texto,
      ticket.tema,
      ticket.confianza,
      ticket.instruccion,
      ticket.ejemplos ? JSON.stringify(ticket.ejemplos) : null,
      timestamp,
      id
    );

    if (!result.changes) {
      return null;
    }

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.deleteStatement.run(id);
    return Number(result.changes) > 0;
  }
}
