# B-roll for the AI Outage Concierge video

Programmatic b-roll built with [Remotion](https://www.remotion.dev) from real captures of the app. Every clip comes in four variants: **light** or **dark**, each **with text** (titles and labels) or **clean** (no text, for adding your own in the editor).

Output: `out/<Clip>/<Clip>-<theme>-<text|clean>.mp4`. All are 1920×1080, 30 fps, H.264 (CRF 16). Standalone clips fade in and out over their first and last few frames so they cut cleanly.

## Clips

| Clip | Length | What it shows |
| --- | --- | --- |
| `Hero` | 7 s | The desktop app in a tilted browser dollying in; status tiles and the pre-storm text float off it. Title: *AI Outage Concierge* |
| `PhoneScroll` | 6 s | A real, frame-by-frame scroll through the mobile dashboard, with cards floating beside the phone |
| `PhoneTrio` | 6 s | Home, chat and alerts on three phones fanning in |
| `StormTimeline` | 8.2 s | One phone moving through All Clear → Watch Alert → Power Outage → Restoring → Restored; the glow changes with each stage |
| `RiskCard` | 6 s | The outage-risk card flying in, then panning down through *Why We Think So* |
| `Restoration` | 8 s | The estimate card reacting to what-ifs (trees down, then damage on a nearby branch), then *What Crews May Replace* |
| `Messages` | 6 s | The four proactive messages cascading in like notifications |
| `Safety` | 6 s | The fixed 911 safety card and the "we can't make a confident call" fallback |
| `StaffConsole` | 8 s | Staff overview → review queue → audit trail inside one browser, with a review card lifting off |
| `AuditChain` | 7 s | Hash-chain blocks linking up; one is tampered with and the integrity check flips to broken |
| `StaffMobile` | 6 s | The staff console on three phones |
| `ThemeSwitch` | 6 s | A diagonal sweep between light and dark across the desktop and phone |
| `Outro` | 4 s | AEP logo, *AI Outage Concierge*, *Predict. Explain. Prepare. Communicate.* (clean: logo only) |
| `Montage` | about 48 s | A ready-cut sizzle chaining Hero, PhoneScroll, RiskCard, Restoration, StormTimeline, Safety, StaffConsole, AuditChain and Outro with slide, wipe, flip and fade transitions |

## Rebuilding

```bash
# 1. Serve the production build. Captures need it: a production build never shows the debug menu.
cd .. && npm run build && npx next start -p 3100

# 2. In video/: install once, then capture (writes public/captures/{light,dark}, about 5 min).
npm install
npx playwright install chromium
npm run capture
node capture/manifest.mjs

# 3. Preview and tweak in Remotion Studio (http://localhost:3300).
npm run studio

# 4. Render everything, or filter by id.
npm run render                       # all 56
node render.mjs Hero                 # the 4 Hero variants
node render.mjs dark-clean           # one variant of every clip
node stills.mjs Safety-dark-text:150 # quick still for checking a frame
```

## How it works

- **Captures** (`capture/capture.mjs`): Playwright drives the real app in both themes and fills in the demo state along the way: a declared medical need, every storm stage, a safety question, a question with personal details, the limited-data premise, and the staff console. It saves full screens (desktop at 2×, phone at 3×), close-ups of single cards cropped to their exact bounds, and a 150-frame scroll sequence. It hides the debug menu and toasts with CSS, and fails if the debug menu is ever on screen.
- **Compositions** (`src/`): `theme.ts` holds the palette (the app's own colors), fonts (Geist, matching the app) and easing. `components/primitives.tsx` has the animated backdrop, browser and phone frames, floating cards (with the app's real corner radius), the animated caption and chips. `components/place.tsx` positions things in 3D. The clips are in `src/clips/`.
- **Ports:** Remotion uses 3300 (`REMOTION_PORT`), because the app's dev server usually holds 3000.
- **GPU:** rendering uses ANGLE (`GL=angle`). If your machine has no GPU, use `GL=swangle node render.mjs` (slower).

Remotion is free for individuals and teams of up to 3 people. Larger companies need a [company license](https://www.remotion.dev/license).
