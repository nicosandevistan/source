import type { LlmClient, LlmJsonRequest } from "./types";
import type { z } from "zod";

/**
 * Test double. Returns a canned reply and records what it was asked, so
 * tests never call a paid API (spec section 13).
 */
export function fixtureLlm(reply: unknown | ((request: LlmJsonRequest<z.ZodType>) => unknown)) {
  const calls: LlmJsonRequest<z.ZodType>[] = [];
  const client: LlmClient = {
    async json(request) {
      calls.push(request);
      const raw = typeof reply === "function" ? reply(request) : reply;
      return request.schema.parse(raw);
    },
  };
  return { client, calls };
}
