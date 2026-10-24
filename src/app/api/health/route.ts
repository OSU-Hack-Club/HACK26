import { connection } from "next/server";

import { env } from "@/env";
import { dynamoConfigured } from "@/lib/concierge/dynamo-source";
import { providerStatus } from "@/lib/concierge/llm";

// Quick sanity check: which integrations are configured (never returns values).
export async function GET() {
  await connection(); // render per request so it reflects the current env

  const ai = await providerStatus();
  return Response.json({
    ok: true,
    configured: {
      // The selected (or auto-detected) LLM backend is usable, so the concierge can answer free-text questions.
      conciergeAi: ai.enabled,
      anthropic: ai.anthropic,
      openai: ai.openai,
      ollama: ai.ollama,
      mapbox: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
      openweather: Boolean(env.OPENWEATHER_API_KEY),
      database: Boolean(env.DATABASE_URL),
      // Real-premise lookup via DynamoDB (table + hash secret both set). See /api/premise.
      premiseLookup: dynamoConfigured(),
    },
    ai: {
      selected: ai.selected,
      model: env.AI_MODEL,
      ollamaModel: env.OLLAMA_MODEL,
    },
  });
}
