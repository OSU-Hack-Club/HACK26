# HACK26 — AI Outage Concierge

HackOHI/O 2026 · AEP challenge. Challenge brief: [`Main-Challenge.pdf`](Main-Challenge.pdf) and [`AEP-Challenge-Materials/`](AEP-Challenge-Materials/README.md). Presenting? Start with [`PRESENTATION.md`](PRESENTATION.md).

## Stack

- **Next.js 16** (App Router, Turbopack, `src/` dir) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (`base-nova` style, Base UI primitives, lucide icons)
- **Recharts** via shadcn `chart`, **sonner** toasts, **next-themes** dark mode
- **zod** for validated env vars (`src/env.ts`)

## Getting started

```bash
npm install
cp .env.example .env.local   # already done locally; fill in keys you need
npm run dev                  # http://localhost:3000
```

Check which integrations are configured: http://localhost:3000/api/health

## Environment variables

All variables are documented in [`.env.example`](.env.example) and validated in [`src/env.ts`](src/env.ts).

- Import with `import { env } from "@/env"`, not `process.env` directly.
- Use `requireEnv("ANTHROPIC_API_KEY")` inside a feature to fail with a clear message when a key is missing.
- Server-only secrets go in `serverSchema`; browser values must be `NEXT_PUBLIC_*` and go in `clientSchema` + `clientValues`.
- `.env.local` is git-ignored. Never commit real keys.

## Project layout

```
src/
  app/               routes (App Router)
    api/map          outage-map GeoJSON derived from the CIR2 extract (static)
    api/chat         LLM fallback for concierge questions the intents don't cover
    api/outage       demo event feed (scenarios, sample premises, what-if defaults)
    api/premise      optional real-premise lookup backed by DynamoDB (docs/dynamodb-premise-lookup.md)
  components/concierge/  the Outage Concierge UI (mobile + desktop shells, map, chat, settings, staff console in staff.tsx)
  components/ui/     shadcn components (generated; edit freely)
  components/providers/  theme, tooltip, toaster providers
  hooks/             shared hooks
  lib/concierge/     estimate model + copy, risk indicators (risk.ts), feature contract (features.ts), map-data derivation,
                     audit trail (audit.ts), PII redaction + safety detection (privacy.ts)
  data/map-data.json simplified CIR2 lines + ARCOS damage points (from Data1.zip)
  data/risk-features.json  demo premise features built by `npm run data:risk` (see DEVELOPMENT.md)
  data/restoration.json    labor standards behind the restoration estimate, built by `npm run data:restoration`
scripts/data/        shapefile readers + the risk-feature pipeline, plus the DynamoDB export/load scripts
docs/                feature docs (dynamodb-premise-lookup.md)
  lib/utils.ts       cn() helper
  env.ts             typed env
AEP-Challenge-Materials/  challenge data + docs (do not move)
```

## Outage Concierge

- One page (`/`) with two layouts sharing one state store: a **mobile** map-first dashboard with bottom sheets (below `lg`), and a **desktop** view with an interactive map, dashboard column and a docked concierge chat (docked at `2xl`, side sheet otherwise).
- **Demo scenarios** (All Clear → Power Restored) and the **Account View** switch (Customer ↔ AEP Staff) are under Settings › Demo and in the debug menu. Set `NEXT_PUBLIC_HIDE_DEMO=1` to hide them.
- **Staff console** (`staff.tsx`): overview, human review queue, hash-chained audit trail (CSV/JSON export) and controls. The audit log is built in `src/lib/concierge/audit.ts` by diffing settled state snapshots in the store, plus explicit entries for chat questions and staff decisions. It's kept in localStorage for the demo.
- The map uses MapLibre GL with CARTO basemaps. `npm run dev` / `npm run build` copy MapLibre's web worker into `public/` first (`scripts/copy-maplibre-worker.mjs`).
- Free-text chat questions that don't match a built-in intent go to `/api/chat`. The backend is chosen by `AI_PROVIDER` (`auto` by default): a hosted API (`anthropic` via `ANTHROPIC_API_KEY`, or `openai` via `OPENAI_API_KEY`, model from `AI_MODEL`), or a **local Ollama** server on your desktop (`OLLAMA_BASE_URL` + `OLLAMA_MODEL`, any pulled model). `auto` picks the first that's configured: anthropic → openai → ollama. The hardened, prompt-injection-resistant system prompt and the provider routing live in `src/lib/concierge/llm.ts`. Set `AI_PROVIDER=off` to disable AI. AI is also off when nothing is configured (`auto` finds no key and no Ollama, or a named provider has no key): the client checks `GET /api/chat` on load, drops the "Ask AI" labels, and answers only the built-in questions, showing the "can't answer reliably" card for anything else. `/api/health` reports which backends are usable.
- `--brand` in `globals.css` is a placeholder blue; swap it for AEP's brand color.

## shadcn components

Installed: accordion, alert, alert-dialog, avatar, badge, button, card, chart, checkbox, collapsible, command, dialog, drawer, dropdown-menu, empty, field, hover-card, input, input-group, label, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip.

Add more: `npx shadcn@latest add <component>`

> This uses the Base UI flavour of shadcn: compose with the `render` prop instead of Radix's `asChild`.

## Challenge data

Extract the shapefiles (git-ignored) from `AEP-Challenge-Materials/`:

```bash
cd AEP-Challenge-Materials
mkdir -p data/extracted/Data1 data/extracted/Data2 data/extracted/matched_upstream
unzip -n data/raw/Data1.zip -d data/extracted/Data1
unzip -n data/raw/Data2.zip -d data/extracted/Data2
unzip -n data/raw/matched_upstream.zip -d data/extracted/matched_upstream
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run tunnel` | Public Cloudflare quick-tunnel URL to the dev server on port 3000 (run alongside `npm run dev`; live reload works). For another port: `npx cloudflared tunnel --url http://localhost:<port>` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests (`src/**/*.test.ts`): audit trail, privacy filters, reliability fallback, materials |
| `npm run data:extract` | Unzip the challenge archives into `AEP-Challenge-Materials/data/extracted` |
| `npm run data:risk` | Rebuild `src/data/risk-features.json` from the extracted data and print the level mix + backtest ([DEVELOPMENT.md](DEVELOPMENT.md)) |
| `npm run data:restoration` | Rebuild `src/data/restoration.json` (labor hours, adders, ILM from `Install_Labor_HackOHIO.xlsx`; access shares from ARCOS) |
| `npm run data:export` | Optional: write every premise as an anonymized record to `AEP-Challenge-Materials/data/exported/` (needs `PREMISE_HASH_SECRET`; see [docs/dynamodb-premise-lookup.md](docs/dynamodb-premise-lookup.md)) |
| `npm run data:load` | Optional: load the exported records into DynamoDB (`DYNAMODB_TABLE`, AWS credentials) |
