import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env/server";
import { LlmNotConfiguredError, type LlmClient } from "./types";

export function anthropicLlm(): LlmClient {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) throw new LlmNotConfiguredError();
  const client = new Anthropic({ apiKey });

  return {
    async json({ model, system, prompt, schema, maxTokens }) {
      const message = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(schema) },
      });
      // Check the shape ourselves as well; never trust the model's output.
      return schema.parse(message.parsed_output);
    },
  };
}
