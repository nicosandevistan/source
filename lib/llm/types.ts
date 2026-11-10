import type { z } from "zod";

export type LlmJsonRequest<S extends z.ZodType> = {
  model: string;
  system: string;
  prompt: string;
  schema: S;
  maxTokens: number;
};

/**
 * The only way the app talks to a language model. Every call asks for JSON
 * in a given shape and gets back a value already checked against it.
 */
export interface LlmClient {
  json<S extends z.ZodType>(request: LlmJsonRequest<S>): Promise<z.infer<S>>;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("The language model is not configured (ANTHROPIC_API_KEY is missing).");
    this.name = "LlmNotConfiguredError";
  }
}
