import { connection } from "next/server";

import { env } from "@/env";
import { dynamoConfigured } from "@/lib/concierge/dynamo-source";

// Quick sanity check: which integrations are configured (never returns values).
export async function GET() {
  await connection(); // render per request so it reflects the current env
  return Response.json({
    ok: true,
    configured: {
      anthropic: Boolean(env.ANTHROPIC_API_KEY),
      openai: Boolean(env.OPENAI_API_KEY),
      mapbox: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
      openweather: Boolean(env.OPENWEATHER_API_KEY),
      database: Boolean(env.DATABASE_URL),
      // Real-premise lookup via DynamoDB (table + hash secret both set). See /api/premise.
      premiseLookup: dynamoConfigured(),
    },
    aiModel: env.AI_MODEL,
  });
}
