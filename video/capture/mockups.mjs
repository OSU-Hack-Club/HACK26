// Captures every iPhone mockup on /mockups, in every storm status and both themes, for the Mockups clip.
//
//   cd .. && npm run build && npx next start -p 3100     # in another terminal
//   node capture/mockups.mjs && node capture/manifest.mjs
//
// Writes public/captures/{light,dark}/mock-<shot>-<status>.png (each figure's mockup, cropped to its bounds),
// mock-hero-<status>.png (the live phone at the top) and mock-matrix-<status>.png (one widget row per status).

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.resolve("public/captures");
const THEMES = (process.env.THEMES ?? "light,dark").split(",");
const STATUSES = ["normal", "watch", "outage", "restoring", "restored"];

const STILL_CSS = `
  section[aria-label="Debug menu"], [data-sonner-toaster], nextjs-portal { display: none !important; }
  *, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; caret-color: transparent !important; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const browser = await chromium.launch();
for (const theme of THEMES) {
  const dir = path.join(OUT, theme);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3, colorScheme: theme });
  await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await context.newPage();
  await page.goto(`${BASE}/mockups`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: STILL_CSS });
  await sleep(1500);
  console.log(`mockups · ${theme}`);

  const figures = page.locator("main figure");
  const count = await figures.count();
  const titles = [];
  for (let i = 0; i < count; i++) titles.push(slug(await figures.nth(i).locator("figcaption p").first().innerText()));

  for (const [si, status] of STATUSES.entries()) {
    await page.locator('[role=radiogroup][aria-label="Status"] [role=radio]').nth(si).click();
    await sleep(700);
    await page.locator("main section").first().locator(":scope > div").first().locator(":scope > *").first().screenshot({ path: path.join(dir, `mock-hero-${status}.png`) });
    for (let i = 0; i < count; i++) {
      const shot = figures.nth(i).locator(":scope > *").first();
      await shot.scrollIntoViewIfNeeded();
      await shot.screenshot({ path: path.join(dir, `mock-${titles[i]}-${status}.png`) });
    }
    console.log(`  ${status}: hero + ${count} mockups`);
  }

  // Widget States: one row per status, side by side on the page.
  const rows = page.locator("main section").last().locator(".col-span-full > div");
  for (let i = 0; i < (await rows.count()); i++) {
    await rows.nth(i).scrollIntoViewIfNeeded();
    await rows.nth(i).screenshot({ path: path.join(dir, `mock-matrix-${STATUSES[i]}.png`) });
  }
  console.log(`  matrix: ${await rows.count()} rows`);
  console.log(`  shots: ${titles.join(", ")}`);
  await context.close();
}
await browser.close();
console.log("done");
