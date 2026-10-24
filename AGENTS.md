<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Icons

Two icon libraries are installed. Use them before hand-rolling SVGs.

- **Lucide** (`lucide-react`): general UI icons, imported as React components.
  ```tsx
  import { Zap, MapPin } from "lucide-react";
  <Zap className="size-4" aria-hidden />
  ```
- **Simple Icons** (`simple-icons`): brand and logo icons. Each export (`si<Name>`, e.g. `siGithub`) is a typed object (`SimpleIcon`) with `title`, `hex` (brand color, no `#`), `path` (SVG path data for a 24×24 viewBox), and `svg`.
  ```tsx
  import { siGithub } from "simple-icons";
  <svg role="img" viewBox="0 0 24 24" className="size-4" fill={`#${siGithub.hex}`}>
    <title>{siGithub.title}</title>
    <path d={siGithub.path} />
  </svg>
  ```
  Import individual icons by name so unused ones are tree-shaken. Browse names at https://simpleicons.org.

## Outage maps

These rules apply to every map in every status (All Clear, Storm Watch, Outage, Restoring, Restored), on mobile and desktop, and in every screen and sheet.

- **No status pills on maps** (e.g. "Line Running Normally", "Outage Area", "Partly Restored", "Restored"). The header status pill and the event card already show the status. Weather lives in the Status Overview cards, not on the map.
- **No expand/collapse (maximize/minimize) button on maps.** Event details open from the event card or the header status pill, never by tapping the map.
- **Mobile map is touch-movable.** The mobile hero uses `interactive="gestures"`: one-finger drag pans, pinch and double-tap zoom, no zoom buttons.
- **Keep the event card clear of the map attribution** (© OpenStreetMap / CARTO, bottom-right). The card sits above it, not on top of it.
