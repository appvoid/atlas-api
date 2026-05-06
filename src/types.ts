export type TopicExamples = Record<string, string[]>;

export type EmbeddingVector = number[];
export type TopicVectors = Record<string, EmbeddingVector[]>;

export interface TicketPayload {
  texto: string;
  instruccion?: string | null;
  ejemplos?: TopicExamples | null;
}

export interface ClassificationResult {
  tema: string;
  confianza: number;
}

export interface StoredTicket extends ClassificationResult {
  id: number;
  texto: string;
  instruccion: string | null;
  ejemplos: TopicExamples | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMutation extends ClassificationResult {
  texto: string;
  instruccion: string | null;
  ejemplos: TopicExamples | null;
}

export type ClassifierModelStatus = 'cargado' | 'cargando' | 'error' | 'no_cargado';

export interface ClassifierStatus {
  modelo: ClassifierModelStatus;
  hilos: number;
}

export interface EmbeddingClient {
  threads: number;
  modelIdentifier: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  embed(texts: string[]): Promise<EmbeddingVector[]>;
}

export interface Classifier {
  getStatus(): ClassifierStatus;
  classify(payload: TicketPayload): Promise<ClassificationResult>;
}
