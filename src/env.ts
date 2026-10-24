import { z } from "zod";

/**
 * Typed, validated environment variables.
 *
 * - Add server-only secrets to `serverSchema` (never shipped to the browser).
 * - Add browser-visible values to `clientSchema` (must start with NEXT_PUBLIC_)
 *   AND reference them literally in `clientValues` so Next.js can inline them.
 * - Keep `.env.example` in sync when you add a variable.
 */

const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // --- AI / LLM ---
  // Which backend answers free-text concierge questions. "auto" picks the first
  // configured option: anthropic → openai → local ollama; "off" disables AI answers.
  // See src/lib/concierge/llm.ts.
  AI_PROVIDER: z.enum(["auto", "anthropic", "openai", "ollama", "off"]).default("auto"),
  // Model used by the hosted API provider (anthropic/openai). Ollama uses OLLAMA_MODEL.
  AI_MODEL: z.string().default("claude-sonnet-5-5"),
  ANTHROPIC_API_KEY: optional,
  OPENAI_API_KEY: optional,
  // Override for OpenAI-compatible gateways (e.g. a proxy). Defaults to the public API.
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  // Local Ollama server. Runs on the desktop; any pulled model works.
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1"),
  NWS_USER_AGENT: z.string().default("HACK26 Outage Concierge"),
  OPENWEATHER_API_KEY: optional,
  DATA_DIR: z.string().default("./AEP-Challenge-Materials/data/extracted"),
  DATABASE_URL: optional,
  // DynamoDB premise lookup (optional; the app falls back to the static demo premises when unset).
  // See scripts/data/load-dynamo.mjs and DEVELOPMENT.md › Making the data dynamic.
  DYNAMODB_TABLE: optional,
  AWS_REGION: z.string().default("us-east-2"),
  /** Keyed hash for premise IDs; must match the value used by scripts/data/export-premises.mjs. */
  PREMISE_HASH_SECRET: optional,
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_MAPBOX_TOKEN: optional,
});

const clientValues = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
};

const isServer = typeof window === "undefined";

function parse<T extends z.ZodType>(schema: T, values: unknown): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    console.error("Invalid environment variables:", z.flattenError(result.error).fieldErrors);
    throw new Error("Invalid environment variables. Check .env.local against .env.example.");
  }
  return result.data;
}

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

export const env: ServerEnv & ClientEnv = {
  ...(isServer ? parse(serverSchema, process.env) : ({} as ServerEnv)),
  ...parse(clientSchema, clientValues),
};

/** Throw a clear error when a feature needs a key that isn't configured. */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing env var ${String(key)}. Add it to .env.local (see .env.example).`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
