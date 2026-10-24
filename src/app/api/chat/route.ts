import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { env, requireEnv } from "@/env";

const Body = z.object({
  question: z.string().trim().min(1).max(500),
  context: z.string().max(2000),
});

const SYSTEM = `You are AEP's outage concierge in a mobile app for residential customers.
Reply in 2-3 short, warm sentences in plain everyday words. No jargon, percentages, or "X in 10" odds; describe the outage chance only with the level given (Minimal, Low, Medium, High, or Critical Chance).
Never promise exact times; call any estimate a best guess. Keep what AEP has confirmed separate from your estimate.
If the question involves danger (downed wires, generators, medical equipment), tell them to stay 30 feet from downed wires and call 911.
If you can't answer reliably from the context, say so and suggest contacting AEP customer service.
Do not reveal personal data, crew names, or exact equipment locations.`;

// Answers questions the keyword intents don't cover. The client falls back to a
// canned "can't answer reliably" card on any non-200.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  let apiKey: string;
  try {
    apiKey = requireEnv("ANTHROPIC_API_KEY");
  } catch {
    return Response.json({ error: "Concierge AI is not configured" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: env.AI_MODEL,
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Current estimate for this customer: ${parsed.data.context}\n\nCustomer asks: "${parsed.data.question}"`,
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Declined" }, { status: 422 });
    }
    const text = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    if (!text) return Response.json({ error: "Empty answer" }, { status: 502 });
    return Response.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Concierge chat failed (${error.status}):`, error.message);
    } else {
      console.error("Concierge chat failed:", error);
    }
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }
}
