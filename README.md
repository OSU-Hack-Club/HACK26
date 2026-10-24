# HACK26 — AI Outage Concierge

HackOHI/O 2026 · AEP challenge. Challenge brief: [`Main-Challenge.pdf`](Main-Challenge.pdf) and [`AEP-Challenge-Materials/`](AEP-Challenge-Materials/README.md).

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
  components/concierge/  the Outage Concierge UI (mobile + desktop shells, map, chat, settings)
  components/ui/     shadcn components (generated; edit freely)
  components/providers/  theme, tooltip, toaster providers
  hooks/             shared hooks
  lib/concierge/     estimate model + copy (port of the design handoff) and map-data derivation
  data/map-data.json simplified CIR2 lines + ARCOS damage points (from Data1.zip)
  lib/utils.ts       cn() helper
  env.ts             typed env
AEP-Challenge-Materials/  challenge data + docs (do not move)
```

## Outage Concierge

- One page (`/`) with two layouts sharing one state store: a **mobile** map-first dashboard with bottom sheets (below `lg`), and a **desktop** view with an interactive map, dashboard column and a docked concierge chat (docked at `2xl`, side sheet otherwise).
- **Demo scenarios** (All Clear → Power Restored) are under Settings › Demo. Set `NEXT_PUBLIC_HIDE_DEMO=1` to hide them.
- The map uses MapLibre GL with CARTO basemaps. `npm run dev` / `npm run build` copy MapLibre's web worker into `public/` first (`scripts/copy-maplibre-worker.mjs`).
- Free-text chat questions that don't match a built-in intent go to `/api/chat` (needs `ANTHROPIC_API_KEY`; model from `AI_MODEL`). Without a key the concierge shows its "can't answer reliably" card.
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
