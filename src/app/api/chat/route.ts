import { connection } from "next/server";
import { z } from "zod";

import { aiEnabled, generateAnswer, NoProviderError, RefusalError } from "@/lib/concierge/llm";
import { redactPII } from "@/lib/concierge/privacy";

const Body = z.object({
  question: z.string().trim().min(1).max(500),
  context: z.string().max(2000),
});

/** Whether AI answers are available, so the client can switch to built-in answers only. */
export async function GET() {
  await connection(); // render per request so it reflects the current env
  return Response.json({ enabled: await aiEnabled() });
}

/**
 * Answers the free-text questions the keyword intents don't cover.
 *
 * The provider (hosted API or local Ollama) and the hardened, injection-resistant
 * system prompt both live in src/lib/concierge/llm.ts. The client falls back to a
 * canned "can't answer reliably" card on any non-200, so every failure path here
 * returns an error status rather than a half-answer. Personal details are redacted before
 * the question reaches any provider (src/lib/concierge/privacy.ts).
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  // Personal details (phone, email, address, account numbers) never reach the model.
  const { text: question, total: redacted } = redactPII(parsed.data.question);

  try {
    const { text, provider, model, flagged } = await generateAnswer(question, parsed.data.context);
    // `guard` feeds the client's audit trail; it never echoes the question.
    return Response.json({ text, provider, model, guard: { injection: Boolean(flagged), redacted } });
  } catch (error) {
    if (error instanceof NoProviderError) {
      return Response.json({ error: "Concierge AI is not configured" }, { status: 503 });
    }
    if (error instanceof RefusalError) {
      return Response.json({ error: "Declined" }, { status: 422 });
    }
    console.error("Concierge chat failed:", error);
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }
}
