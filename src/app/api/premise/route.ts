import { z } from "zod";

import { dynamoConfigured, lookupPremise } from "@/lib/concierge/dynamo-source";

// Server-side premise lookup. Takes a premise number, returns the anonymized record (features + the
// snapshot's norms) or 404. The real number is never logged or echoed; only the hashed id comes back.
// No auth on this hackathon endpoint — it returns only anonymized data, but add rate limiting / auth
// before any real deployment (see docs/dynamodb-premise-lookup.md › Security).

const Body = z.object({
  premise: z.string().trim().min(1).max(40),
});

export async function POST(request: Request) {
  if (!dynamoConfigured()) {
    // Lookup is off; the client keeps using the static demo premises.
    return Response.json({ error: "Premise lookup is not configured" }, { status: 503 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  try {
    const hit = await lookupPremise(parsed.data.premise);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ premise: hit.record, norms: hit.norms, storms: hit.storms });
  } catch (error) {
    // Never include the submitted premise number in the log.
    console.error("Premise lookup failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Lookup error" }, { status: 502 });
  }
}
