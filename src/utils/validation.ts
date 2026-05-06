import { z } from 'zod';
import type { TicketPayload } from '../types';

const BODY_ERROR = 'El cuerpo debe ser un objeto JSON.';
const MISSING_TEXT_ERROR = "El campo 'texto' es obligatorio.";
const INVALID_TEXT_ERROR = "El campo 'texto' debe ser un string no vacio.";
const INVALID_INSTRUCTION_ERROR = "El campo 'instruccion' debe ser un string o null.";
const INVALID_EXAMPLES_ERROR =
  "El campo 'ejemplos' debe ser un objeto con temas y arreglos de ejemplos no vacios.";
const AT_LEAST_ONE_FIELD_ERROR =
  'Debes enviar al menos uno de estos campos: texto, instruccion o ejemplos.';

type ValidationResult<T> = { value: T } | { error: string };

const nonEmptyStringSchema = z.string().trim().min(1);
const examplesSchema = z
  .record(nonEmptyStringSchema, z.array(nonEmptyStringSchema).min(1))
  .refine((value) => Object.keys(value).length > 0, {
    message: INVALID_EXAMPLES_ERROR,
  });

const createTicketPayloadSchema = z.object({
  texto: nonEmptyStringSchema,
  instruccion: z.string().nullable().optional(),
  ejemplos: examplesSchema.nullable().optional(),
});

const updateTicketPayloadSchema = createTicketPayloadSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: AT_LEAST_ONE_FIELD_ERROR,
  }
);

export type CreateTicketPayload = z.infer<typeof createTicketPayloadSchema>;
export type UpdateTicketPayload = z.infer<typeof updateTicketPayloadSchema>;

export function hasOwn(object: object, property: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatTicketPayloadError(
  body: Record<string, unknown>,
  issues: z.ZodIssue[],
  requireText: boolean
): string {
  const issue = issues[0];
  if (!issue) {
    return BODY_ERROR;
  }

  if (issue.message === AT_LEAST_ONE_FIELD_ERROR) {
    return AT_LEAST_ONE_FIELD_ERROR;
  }

  switch (issue.path[0]) {
    case 'texto':
      if (requireText && !hasOwn(body, 'texto')) {
        return MISSING_TEXT_ERROR;
      }
      return INVALID_TEXT_ERROR;
    case 'instruccion':
      return INVALID_INSTRUCTION_ERROR;
    case 'ejemplos':
      return INVALID_EXAMPLES_ERROR;
    default:
      return BODY_ERROR;
  }
}

function parseTicketPayload<T>(
  body: unknown,
  schema: z.ZodType<T>,
  requireText: boolean
): ValidationResult<T> {
  if (!isPlainObject(body)) {
    return { error: BODY_ERROR };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: formatTicketPayloadError(body, result.error.issues, requireText) };
  }

  return { value: result.data };
}

export function parseCreateTicketPayload(body: unknown): ValidationResult<CreateTicketPayload> {
  return parseTicketPayload(body, createTicketPayloadSchema, true);
}

export function parseUpdateTicketPayload(body: unknown): ValidationResult<UpdateTicketPayload> {
  return parseTicketPayload(body, updateTicketPayloadSchema, false);
}

export function parseTicketId(value: unknown): number | null {
  const result = z
    .union([z.string(), z.array(z.string()).length(1).transform(([ticketId]) => ticketId)])
    .pipe(
      z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform((ticketId) => Number(ticketId))
    )
    .safeParse(value);

  return result.success ? result.data : null;
}

export type NormalizedTicketPayload = Required<
  Pick<TicketPayload, 'texto'>
> & {
  instruccion: string | null;
  ejemplos: TicketPayload['ejemplos'] extends infer T ? Exclude<T, undefined> : never;
};
