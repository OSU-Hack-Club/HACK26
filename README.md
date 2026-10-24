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
  app/               routes (App Router); api/health is a sample route handler
  components/ui/     shadcn components (generated; edit freely)
  components/providers/  theme, tooltip, toaster providers
  hooks/             shared hooks
  lib/utils.ts       cn() helper
  env.ts             typed env
AEP-Challenge-Materials/  challenge data + docs (do not move)
```

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
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
