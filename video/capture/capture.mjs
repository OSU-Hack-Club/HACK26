// Captures the real app (production build, so no debug menu) for the b-roll compositions.
//
//   cd .. && npm run build && npx next start -p 3100     # in another terminal
//   npm run capture                                       # writes public/captures/{light,dark}/…
//
// Full screens, close-ups of single cards, and frame-by-frame scroll sequences (one screenshot per
// video frame, so scrolling is perfectly smooth and sharp). Every capture is checked for the debug menu.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.resolve("public/captures");
const THEMES = (process.env.THEMES ?? "light,dark").split(",");
const SCROLL_FRAMES = 150;

const HIDE_CSS = `
  section[aria-label="Debug menu"], [data-sonner-toaster], nextjs-portal { display: none !important; }
  * { caret-color: transparent !important; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function prepare(page) {
  await page.addStyleTag({ content: HIDE_CSS });
}

async function assertNoDebug(page) {
  const visible = await page.locator('section[aria-label="Debug menu"]').isVisible().catch(() => false);
  if (visible) throw new Error("Debug menu is visible: capture from a production build without NEXT_PUBLIC_DEBUG_MENU");
}

async function open(context, settle = 4000) {
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await prepare(page);
  await sleep(settle);
  return page;
}

function saver(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const shot = async (page, name, opts = {}) => {
    await assertNoDebug(page);
    await page.screenshot({ path: path.join(dir, `${name}.png`), ...opts });
    console.log(`  ${path.basename(dir)}/${name}.png`);
  };
  // Close-up of the card (rounded panel) that contains `text`.
  const card = async (page, text, name, { closest = '[class*="rounded-[14px]"]', within = "" } = {}) => {
    await assertNoDebug(page);
    const ok = await page.evaluate(
      ({ text, closest, within }) => {
        document.querySelectorAll("[data-cap]").forEach((e) => e.removeAttribute("data-cap"));
        // Both layouts are in the DOM; scope to the one that's on screen.
        const root = within ? [...document.querySelectorAll(within)].find((e) => e.getBoundingClientRect().width > 0) : document.body;
        if (!root) return false;
        const it = document.evaluate(`.//*[contains(normalize-space(.), ${JSON.stringify(text)})][not(*[contains(normalize-space(.), ${JSON.stringify(text)})])]`, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < it.snapshotLength; i++) {
          const el = it.snapshotItem(i);
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const panel = el.closest(closest);
          if (panel) {
            panel.setAttribute("data-cap", "1");
            return true;
          }
        }
        return false;
      },
      { text, closest, within },
    );
    if (!ok) {
      console.warn(`  ! no card for "${text}"`);
      return;
    }
    const loc = page.locator("[data-cap]").first();
    await loc.scrollIntoViewIfNeeded();
    await sleep(250);
    await loc.screenshot({ path: path.join(dir, `${name}.png`) });
    console.log(`  ${path.basename(dir)}/${name}.png`);
  };
  return { shot, card };
}

async function ask(page, q, scope = "body") {
  const input = page.locator(`${scope} input[placeholder]:visible`).last();
  await input.fill(q);
  await input.press("Enter");
  await sleep(1400);
}

// The desktop Settings button toggles, so check where we are first.
async function settings(page) {
  for (let i = 0; i < 3; i++) {
    if (await page.locator("main h1", { hasText: /^Settings$/ }).count()) return;
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await sleep(450);
  }
}

// For the Hero → phone morph: records where each part of the screen sits (CSS px) in <name>.layout.json,
// then saves <name>-map.png with the `hide` parts hidden, so the bare map can be separated from its overlays.
async function layers(page, shot, dir, name, parts, hide) {
  await assertNoDebug(page);
  const rects = await page.evaluate((parts) => {
    const out = {};
    for (const [k, sel] of Object.entries(parts)) {
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
      const r = el?.getBoundingClientRect();
      out[k] = r ? [r.x, r.y, r.width, r.height] : null;
    }
    return out;
  }, parts);
  const missing = Object.keys(rects).filter((k) => !rects[k]);
  if (missing.length) throw new Error(`${name}: no element for ${missing.join(", ")}`);
  fs.writeFileSync(path.join(dir, `${name}.layout.json`), JSON.stringify(rects));
  const style = await page.addStyleTag({ content: `${hide.map((k) => parts[k]).join(", ")} { display: none !important; }` });
  await sleep(300);
  await shot(page, `${name}-map`);
  await style.evaluate((s) => s.remove());
  await sleep(300);
}

const radio = (page, name) => page.getByRole("radio", { name, exact: true }).first().click();
const button = (page, name) => page.getByRole("button", { name, exact: true }).first().click();

// ---------------------------------------------------------------------------

async function desktop(browser, theme) {
  const dir = path.join(OUT, theme);
  const { shot, card } = saver(dir);
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme });
  await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await open(context);
  console.log(`desktop · ${theme}`);

  await shot(page, "desk-watch");
  await layers(
    page,
    shot,
    dir,
    "desk-watch",
    {
      header: "header",
      map: 'section[aria-label="Outage map"]',
      main: 'section[aria-label="Outage map"] + div',
      chat: 'aside[aria-label="Outage Concierge chat"]',
      event: '[class*="group/event"]',
      zoom: ".maplibregl-ctrl-top-right",
      attrib: ".maplibregl-ctrl-bottom-right",
      home: ".maplibregl-marker.size-4",
    },
    ["event", "zoom", "attrib"],
  );
  await card(page, "Outage Chance", "card-kpis", { closest: '[class*="grid"]', within: "main" });
  await button(page, "Why We Think So");
  await sleep(600);
  await card(page, "Will I Lose Power", "card-risk", { within: "main" });
  await button(page, "Why We Think So");
  await card(page, "If the Power Goes Out", "card-estimate", { within: "main" });
  await card(page, "Starting Point", "card-explorer", { within: "main" });

  // Restoration Explorer what-ifs.
  await button(page, "More broken poles");
  await radio(page, "Trees Down");
  await sleep(500);
  await card(page, "If the Power Goes Out", "card-estimate-trees", { within: "main" });
  await radio(page, "Nearby Branch");
  await sleep(500);
  await card(page, "If the Power Goes Out", "card-estimate-branch", { within: "main" });
  await button(page, "Back to Typical Damage");
  await sleep(400);

  // Docked chat (2xl layout).
  await ask(page, "Will I lose power?", "aside");
  await ask(page, "How long could it take?", "aside");
  await shot(page, "desk-chat");

  // Help: materials from the structure drawings.
  await settings(page);
  await page.getByText("Help & How It Works").first().click();
  await sleep(600);
  await card(page, "What Crews May Replace", "card-materials", { within: "main" });

  // Notifications: declare a medical need, then message previews.
  await settings(page);
  await page.getByText("Notifications", { exact: true }).first().click();
  await sleep(500);
  await page.getByText("I Rely on Powered Medical Equipment").filter({ visible: true }).first().click();
  await sleep(600);
  await card(page, "You Qualify for Storm Alerts", "card-alert-status", { within: "main", closest: '[class*="rounded-[14px]"]' });
  await card(page, "Before the Storm", "card-msg-prestorm", { within: "main" });
  await card(page, "Outage Confirmed", "card-msg-outage", { within: "main" });
  await card(page, "Estimate Updated", "card-msg-update", { within: "main" });
  await card(page, "Power Restored", "card-msg-restored", { within: "main" });

  // Storm stages.
  for (const [label, name] of [
    ["All Clear", "desk-normal"],
    ["Watch Alert", null],
    ["Power Outage", "desk-outage"],
    ["Restoring Power", "desk-restoring"],
    ["Power Restored", "desk-restored"],
    ["Power Outage", null],
  ]) {
    await settings(page);
    await radio(page, label);
    await sleep(name ? 3500 : 1200);
    if (name) await shot(page, name);
  }

  // Safety + PII questions (logged for the staff view).
  await ask(page, "There's a downed wire sparking near my house", "aside");
  await card(page, "Safety first", "card-safety", { within: "aside", closest: '[class*="rounded-[16px"]' });
  await ask(page, "Can you text me at 614-555-0123 about 12 Elm St?", "aside");

  // Not enough data: the fallback.
  await settings(page);
  await page.getByText("Location", { exact: true }).first().click();
  await sleep(300);
  await page.getByRole("button", { name: /Cedar Hollow/ }).click();
  await sleep(2500);
  await shot(page, "desk-fallback");
  await card(page, "We can’t make a confident call", "card-fallback", { within: "main" });
  await settings(page);
  await page.getByText("Location", { exact: true }).first().click();
  await page.getByRole("button", { name: /Maple Grove/ }).click();
  await sleep(1500);

  // Staff console.
  await settings(page);
  await radio(page, "AEP Staff");
  await sleep(1500);
  await shot(page, "staff-overview");
  await card(page, "Audit Chain Verified", "card-integrity");
  await card(page, "Open Reviews", "card-staff-kpis", { closest: '[class*="grid-cols-2"]' });
  await card(page, "Live customer session", "card-live");
  await card(page, "Maple Grove", "card-board", { closest: '[class*="overflow-hidden"][class*="rounded-[14px]"]', within: "main" });

  const staffTab = (name) => page.locator('nav[aria-label="Staff"]').first().getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await staffTab("Reviews");
  await sleep(700);
  await shot(page, "staff-reviews");
  await card(page, "Safety question escalated", "card-review");

  await staffTab("Audit Trail");
  await sleep(700);
  await shot(page, "staff-audit");
  await page.locator("tbody tr").nth(3).click();
  await sleep(900);
  await shot(page, "staff-detail");
  await page.keyboard.press("Escape");
  await sleep(500);

  await staffTab("Controls");
  await sleep(600);
  await shot(page, "staff-controls");
  await card(page, "Outage-risk model", "card-model");

  // Tamper with one stored entry, reload: the chain check fails.
  await page.evaluate(() => {
    const key = "concierge.audit.v1";
    const log = JSON.parse(localStorage.getItem(key));
    log[Math.floor(log.length / 2)].summary += " [edited]";
    localStorage.setItem(key, JSON.stringify(log));
  });
  await page.reload({ waitUntil: "networkidle" });
  await prepare(page);
  await sleep(1500);
  await card(page, "Audit Chain Broken", "card-integrity-broken");
  await shot(page, "staff-overview-broken");

  await context.close();
}

async function mobile(browser, theme) {
  const dir = path.join(OUT, theme);
  const { shot, card } = saver(dir);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: theme });
  await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await open(context, 4500);
  console.log(`mobile · ${theme}`);
  const tab = (name) => page.locator('nav[aria-label="Main"]').getByRole("button", { name: new RegExp(`^${name}`) }).click();

  await shot(page, "m-watch");
  await layers(
    page,
    shot,
    dir,
    "m-watch",
    {
      header: "header",
      event: '[class*="group/event"]',
      nav: 'nav[aria-label="Main"]',
      attrib: ".maplibregl-ctrl-bottom-right",
      home: ".maplibregl-marker.size-4",
    },
    ["header", "event", "nav", "attrib"],
  );

  // Smooth scroll through the home dashboard, one screenshot per frame.
  const seq = path.join(dir, "seq-m-scroll");
  fs.rmSync(seq, { recursive: true, force: true });
  fs.mkdirSync(seq, { recursive: true });
  const vp = page.locator("[data-slot=scroll-area-viewport]").first();
  const max = await vp.evaluate((el) => {
    el.style.scrollBehavior = "auto";
    return Math.min(el.scrollHeight - el.clientHeight, 2600);
  });
  for (let i = 0; i < SCROLL_FRAMES; i++) {
    const t = Math.min(1, Math.max(0, (i - 12) / (SCROLL_FRAMES - 24)));
    await vp.evaluate((el, y) => (el.scrollTop = y), Math.round(ease(t) * max));
    await page.screenshot({ path: path.join(seq, `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  console.log(`  ${theme}/seq-m-scroll (${SCROLL_FRAMES} frames)`);
  await vp.evaluate((el) => (el.scrollTop = 0));

  await page.getByRole("button", { name: /^Open status/ }).click();
  await sleep(1200);
  await shot(page, "m-status");
  await page.keyboard.press("Escape");
  await sleep(800);

  await tab("Ask");
  await sleep(500);
  await ask(page, "Will I lose power?");
  await ask(page, "What should I do?");
  await shot(page, "m-chat");

  await tab("Alerts");
  await sleep(700);
  await shot(page, "m-alerts");

  await tab("Settings");
  await sleep(500);
  await shot(page, "m-settings");

  for (const [label, name] of [
    ["All Clear", "m-normal"],
    ["Watch Alert", "m-watch2"],
    ["Power Outage", "m-outage"],
    ["Restoring Power", "m-restoring"],
    ["Power Restored", "m-restored"],
  ]) {
    await tab("Settings");
    await sleep(350);
    await radio(page, label);
    await sleep(3000);
    await shot(page, name);
  }

  await tab("Ask");
  await sleep(400);
  await ask(page, "There's a downed wire sparking near my house");
  await shot(page, "m-safety");

  await tab("Settings");
  await sleep(300);
  await page.getByText("Location", { exact: true }).first().click();
  await sleep(300);
  await page.getByRole("button", { name: /Cedar Hollow/ }).click();
  await sleep(1500);
  await shot(page, "m-fallback");
  await tab("Settings");
  await page.getByText("Location", { exact: true }).first().click();
  await page.getByRole("button", { name: /Maple Grove/ }).click();
  await sleep(800);

  await tab("Settings");
  await sleep(300);
  await page.getByText("Notifications", { exact: true }).first().click();
  await sleep(400);
  await page.getByText("I Rely on Powered Medical Equipment").filter({ visible: true }).first().click();
  await sleep(600);
  await tab("Settings");
  await sleep(300);
  await radio(page, "AEP Staff");
  await sleep(1500);
  await shot(page, "m-staff");
  const staffNav = (name) => page.locator("nav.glass").getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await staffNav("Reviews");
  await sleep(700);
  await shot(page, "m-staff-reviews");
  await staffNav("Audit");
  await sleep(700);
  await shot(page, "m-staff-audit");

  await context.close();
}

const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    await desktop(browser, theme);
    await mobile(browser, theme);
  }
} finally {
  await browser.close();
}
console.log("done");
