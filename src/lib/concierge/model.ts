// Outage Concierge estimate model + copy. Ported from the design handoff
// (ConciergeDashboard.dc.html `model()` and helpers). Pure functions only.

import { alertWorthy, assessRisk, RISK, windStrength, type RiskAssessment, type RiskLevel } from "@/lib/concierge/risk";

export { RISK, RISK_ORDER, type RiskLevel } from "@/lib/concierge/risk";

export type Scenario = "normal" | "watch" | "outage" | "restoring" | "restored";
export type Access = "clear" | "limited" | "blocked";
export type ToneKey = "low" | "mid" | "high" | "brand";
export type Intent = "risk" | "time" | "prep" | "alerts" | "why" | "none";
export type IconName =
  | "zap" | "zap-off" | "gauge" | "bell" | "clock" | "truck" | "house" | "target"
  | "badge-check" | "sparkles" | "list" | "trending-up" | "trending-down"
  | "battery-charging" | "refrigerator" | "moon" | "heart-pulse" | "triangle-alert"
  | "settings" | "circle-check" | "cloud-sun" | "wind" | "tree-pine" | "wrench"
  | "circle-help" | "cloud-lightning" | "sun";

export interface Premise {
  id: string;
  area: string;
  kind: string;
  circuit: string;
  overhead: boolean;
  tree: number;
  single: boolean;
  hits: number;
  upstream: boolean;
  remote: boolean;
}

export const PREMISES: Record<string, Premise> = {
  "P-20417": { id: "P-20417", area: "Maple Grove", kind: "Tree-lined suburb", circuit: "C-1142", overhead: true, tree: 0.8, single: true, hits: 4, upstream: true, remote: false },
  "P-33810": { id: "P-33810", area: "Riverside", kind: "Downtown, buried lines", circuit: "C-0871", overhead: false, tree: 0.2, single: false, hits: 1, upstream: false, remote: false },
  "P-51122": { id: "P-51122", area: "Ridge Road", kind: "Rural, long line", circuit: "C-2290", overhead: true, tree: 0.9, single: true, hits: 5, upstream: true, remote: true },
};

export interface WhatIf {
  poles: number;
  spans: number;
  xfmr: boolean;
  crews: number;
  access: Access;
  reroute: boolean;
}

export const DEF: WhatIf & { wind: number } = { wind: 58, poles: 2, spans: 3, xfmr: false, crews: 3, access: "clear", reroute: true };
export const ORDER: Scenario[] = ["normal", "watch", "outage", "restoring", "restored"];

export interface Tone { c: string; bg: string; ink: string; edge: string }
export const TONE: Record<ToneKey, Tone> = {
  low: { c: "var(--low)", bg: "var(--low-bg)", ink: "var(--low-ink)", edge: "color-mix(in oklch,var(--low) 35%,transparent)" },
  mid: { c: "var(--mid)", bg: "var(--mid-bg)", ink: "var(--mid-ink)", edge: "color-mix(in oklch,var(--mid) 45%,transparent)" },
  high: { c: "var(--high)", bg: "var(--high-bg)", ink: "var(--high-ink)", edge: "color-mix(in oklch,var(--high) 35%,transparent)" },
  brand: { c: "var(--brand)", bg: "var(--brand-soft)", ink: "var(--brand-ink)", edge: "color-mix(in oklch,var(--brand) 35%,transparent)" },
};

export const SC: Record<Scenario, { label: string; tone: ToneKey; title: string; badge?: string; tag: string }> = {
  normal: { label: "All Clear", tone: "low", title: "No Outages on Your Line", badge: "Line Running Normally", tag: "No Outages" },
  watch: { label: "Storm Watch", tone: "mid", title: "Storm Watch: Strong Winds Monday Night", tag: "Storm Watch" },
  outage: { label: "Outage Detected", tone: "high", title: "Power Outage Detected", badge: "Outage Area", tag: "Outage" },
  restoring: { label: "Restoring Power", tone: "brand", title: "Crews Restoring Power", badge: "Partly Restored", tag: "Restoring" },
  restored: { label: "Power Restored", tone: "low", title: "Power Restored", badge: "Restored", tag: "Restored" },
};

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAYL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SMALL = new Set(["a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "for", "by", "vs", "via"]);

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Title Case, keeping small words lowercase unless first. */
export const tc = (str: string) =>
  String(str)
    .split(" ")
    .map((w, i) =>
      i > 0 && SMALL.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.replace(/^([“"(]?)(\p{Ll})/u, (_m, p: string, c: string) => p + c.toUpperCase()),
    )
    .join(" ");

/** Hours since Monday 00:00 → "Tue 4 AM" (or "Tue 4:30 AM" with minutes). */
export function fmt(h: number, withMin = false) {
  let d = Math.floor(h / 24);
  const hr = h - d * 24;
  let H = Math.floor(hr);
  let M = Math.round((hr - H) * 60);
  if (!withMin) {
    if (M >= 30) H++;
    M = 0;
  }
  if (M === 60) {
    M = 0;
    H++;
  }
  if (H >= 24) {
    H -= 24;
    d++;
  }
  const ap = H < 12 ? "AM" : "PM";
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return `${DAY[Math.min(d, 4)]} ${h12}${withMin ? ":" + String(M).padStart(2, "0") : ""} ${ap}`;
}

/** Hours since Monday 00:00 → "Tuesday morning". */
export function when(h: number) {
  const d = Math.min(Math.floor(h / 24), 4);
  const hr = h % 24;
  const D = DAYL[d];
  if (hr < 5) return d === 0 ? "late Monday night" : `early ${D} morning`;
  if (hr < 12) return `${D} morning`;
  if (hr < 17) return `${D} afternoon`;
  if (hr < 21) return `${D} evening`;
  return `${D} night`;
}

export interface ModelInput extends WhatIf {
  premise: string;
  scenario: Scenario;
  wind: number;
  /** Debug only: force the outage-chance level instead of the calculated one. */
  riskOverride?: RiskLevel | null;
}

export interface Estimate { wait: number; road: number; repair: number; mid: number }

export interface Model {
  P: Premise;
  w: number;
  risk: RiskAssessment;
  level: RiskLevel;
  conf: 1 | 2 | 3;
  e: Estimate;
  base: Estimate;
  lo: number;
  hi: number;
  start: number;
  mid: number;
  nowH: number;
  delta: number;
  wind: number;
}

export function model(s: ModelInput): Model {
  const P = PREMISES[s.premise] ?? PREMISES["P-20417"];
  const wind = s.scenario === "normal" ? 18 : s.wind;
  const w = windStrength(wind);
  const risk = assessRisk({ storm: s.scenario !== "normal", wind, overhead: P.overhead, tree: P.tree, single: P.single, hits: P.hits, hitsOf: 6 });
  const conf: 1 | 2 | 3 = !P.overhead && wind <= 70 ? 3 : wind > 70 ? 1 : 2;
  const est = (o: WhatIf): Estimate => {
    // Labor hours from Install_Labor_HackOHIO.xlsx: pole + crossarm, wire span, transformer.
    let labor = o.poles * (2.5 + 0.93 + 0.59) + o.spans * 0.6 + (o.xfmr ? 2.0 : 0);
    const sites = Math.max(1, o.poles + (o.spans > 0 ? 1 : 0) + (o.xfmr ? 1 : 0));
    if (labor === 0) labor = 0.5;
    if (o.access === "limited") labor += 0.5 * sites;
    if (o.access === "blocked") labor += 1.312 * sites;
    let repair = (labor * 4.5) / (o.crews * 3);
    if (o.reroute && P.upstream) repair *= 0.6;
    const wait = 1 + 6 * w + (P.remote ? 1.5 : 0);
    const road = o.access === "blocked" ? 4 : o.access === "limited" ? 1 : 0;
    return { wait, road, repair, mid: wait + road + repair };
  };
  const e = est(s);
  const base = est(DEF);
  const restoring = s.scenario === "restoring";
  const spread = restoring ? 0.18 : conf === 1 ? 0.5 : conf === 2 ? 0.35 : 0.25;
  const mid = e.mid;
  const lo = Math.max(1, Math.round(mid * (1 - spread * 0.7)));
  const hi = Math.max(lo + 1, Math.round(mid * (1 + spread)));
  const start = s.scenario === "normal" || s.scenario === "watch" ? 21.5 : 21 + 40 / 60;
  const nowH = start + e.wait + e.road * 0.5;
  return { P, w, risk, level: s.riskOverride ?? risk.level, conf, e, base, lo, hi, start, mid, nowH, delta: e.mid - base.mid, wind };
}

export function timeText(m: Model) {
  return {
    plan: fmt(m.start + m.hi),
    likely: when(m.start + m.mid),
    range: `between ${fmt(m.start + m.lo)} and ${fmt(m.start + m.hi)}`,
    hours: `${m.lo}–${m.hi} hours`,
  };
}

export const restoredAt = (m: Model) => fmt(m.start + m.mid * 0.95, true);

export function damageText(s: WhatIf) {
  const a: string[] = [];
  if (s.poles) a.push(`${s.poles} broken pole${s.poles > 1 ? "s" : ""}`);
  if (s.spans) a.push(`${s.spans} downed wire${s.spans > 1 ? "s" : ""}`);
  if (s.xfmr) a.push("a damaged transformer");
  return a.length ? a.join(", ").replace(/, ([^,]*)$/, " and $1") : "only a tripped fuse";
}

export interface Segment { label: string; h: number; color: string; op: number; pct: string; hText: string }

export function segments(m: Model, s: WhatIf & { scenario: Scenario }): Segment[] {
  const done = s.scenario === "restoring";
  return [
    { label: done ? "Crew reached you (done)" : "Waiting for a crew to reach you", h: m.e.wait, color: "var(--chart-2)", op: done ? 0.35 : 1 },
    { label: "Clearing roads to the damage", h: m.e.road, color: "var(--mid)", op: 1 },
    { label: `Fixing ${damageText(s)}`, h: m.e.repair, color: "var(--brand)", op: 1 },
  ]
    .filter((x) => x.h > 0.05)
    .map((x) => ({
      ...x,
      label: tc(x.label),
      pct: ((x.h / m.e.mid) * 100).toFixed(1) + "%",
      hText: x.h < 1 ? "<1 h" : "~" + Math.round(x.h) + " h",
    }));
}

export interface Factor { up: boolean; s: number; t: string; d: string; effect: string }

export function factors(m: Model, scenario: Scenario): Factor[] {
  const P = m.P;
  const wind = m.wind;
  const f: Omit<Factor, "effect">[] = [
    { up: P.tree >= 0.5, s: P.tree >= 0.7 ? 3 : 1, t: P.tree >= 0.5 ? "Lots of trees grow near your lines" : "Few trees near your lines", d: P.tree >= 0.5 ? "Falling limbs caused most of the damage on your line in February 2025." : "Less chance of branches hitting the wires." },
    { up: P.overhead, s: 2, t: P.overhead ? "Your power comes on overhead wires" : "Your lines are buried underground", d: P.overhead ? "They’re out in the open, exposed to wind and trees." : "Protected from wind, so storm outages are rarer." },
    { up: P.single, s: P.single ? 2 : 1, t: P.single ? "One line feeds your street" : "Your area has a backup route", d: P.single ? "If that line is damaged, there’s no other way to get power to you." : "AEP can often switch you to another line." },
    { up: P.hits >= 3, s: P.hits >= 4 ? 2 : 1, t: `${P.hits} of the last 6 big storms caused outages here`, d: P.hits >= 3 ? "How past storms went is a strong clue for this one." : "Your area has held up well in past storms." },
  ];
  if (scenario !== "normal")
    f.unshift({ up: wind >= 45, s: wind >= 65 ? 3 : wind >= 45 ? 2 : 1, t: wind >= 45 ? `Gusts up to ${wind} mph are expected` : `Winds of ${wind} mph are fairly mild`, d: wind >= 45 ? "Strong enough to bring branches down onto power lines." : "Power lines usually handle winds like this." });
  return f
    .sort((a, b) => Number(b.up) - Number(a.up) || b.s - a.s)
    .map((x) => ({ ...x, t: tc(x.t), effect: (x.up ? "Raises" : "Lowers") + " your chance" }));
}

export function confText(m: Model) {
  return m.conf === 3
    ? "We’re quite sure: buried lines rarely fail and we have plenty of storm history here."
    : m.conf === 2
      ? "We’re fairly sure: we have good storm history for your line and this forecast is in a familiar range."
      : "We’re less sure: storms this strong are rare in our records. Treat this as a rough guide.";
}

export interface Channels { push: boolean; sms: boolean; email: boolean; call: boolean }

export function eligibility(m: Model, s: { medical: boolean; scenario: Scenario }) {
  const riskOk = alertWorthy(m.level);
  return { riskOk, ok: riskOk || s.medical || (s.scenario !== "normal" && s.scenario !== "watch") };
}

export const channelOn = (ch: Channels, medical: boolean, k: keyof Channels) => ch[k] || (k === "call" && medical);

export function channelList(ch: Channels, medical: boolean) {
  const names = { push: "Push", sms: "Text", email: "Email", call: "Call" } as const;
  return (["push", "sms", "email", "call"] as const).filter((k) => channelOn(ch, medical, k)).map((k) => names[k]).join(" + ");
}

export interface PreviewMessage {
  key: number;
  title: string;
  icon: "cloud-lightning" | "zap-off" | "clock" | "circle-check";
  meta: string;
  text: string;
  status: "Not Needed" | "Latest" | "Sent" | "Scheduled";
  current: boolean;
  count: string;
}

export function previewMessages(m: Model, s: WhatIf & { scenario: Scenario; medical: boolean; ch: Channels }): PreviewMessage[] {
  const t = timeText(m);
  const el = eligibility(m, s);
  const idx = ORDER.indexOf(s.scenario);
  const chan = s.ch.sms ? "Text" : s.ch.push ? "Push" : s.ch.email ? "Email" : "Text";
  const first = s.medical ? "Sat 8 PM · 48 h before the storm" : "Sun 8 PM · 24 h before the storm";
  const med = s.medical ? " Have backup power ready for medical equipment, or a place to go." : "";
  const list = [
    { at: 1, title: "Before the storm", icon: "cloud-lightning" as const, meta: `${chan} · ${first}`, text: `AEP: A strong storm reaches ${m.P.area} Monday evening. There's a ${RISK[m.level].label.toLowerCase()} you lose power. If it goes out, plan to be without it until ${t.plan}. Charge your phone tonight.${med}` },
    { at: 2, title: "Outage confirmed", icon: "zap-off" as const, meta: `${chan}${s.medical ? " + phone call" : ""} · within 5 min of outage`, text: `AEP: We know your power is out (reported 9:40 PM). You don't need to call. Our best guess: it's back ${t.range}. We'll text you if that changes.` },
    { at: 3, title: "Estimate updated", icon: "clock" as const, meta: `${chan} · when the estimate moves 2+ hours`, text: `AEP update: Crews found ${damageText(s)}. New estimate: back ${t.range}. Stay away from downed wires and call 911 if you see one.` },
    { at: 4, title: "Power restored", icon: "circle-check" as const, meta: `${chan} · as soon as crews finish`, text: `AEP: Power is back on in ${m.P.area} (${restoredAt(m)}). Still out? Your home may need its own repair. Reply OUT and we'll send someone.` },
  ];
  return list.map((x, i) => {
    const cur = idx === x.at;
    const status: PreviewMessage["status"] = x.at === 1 && !el.ok && idx <= 1 ? "Not Needed" : cur ? "Latest" : idx > x.at ? "Sent" : "Scheduled";
    const c = x.text.length;
    return {
      key: i,
      title: tc(x.title),
      icon: x.icon,
      meta: x.meta,
      text: x.text,
      status,
      current: cur,
      count: chan === "Text" ? `${c} characters · ${c > 160 ? Math.ceil(c / 153) + " texts" : "1 text"}` : `${c} characters`,
    };
  });
}

// ---------------------------------------------------------------------------
// Concierge answers

export interface ChatPoint { k: string; icon: IconName; kColor: string; v: string }
export interface UserMessage { id: string; role: "user"; text: string }
export interface BotMessage {
  id: string;
  role: "bot";
  accent: string;
  headline?: string;
  body?: string;
  risk?: RiskLevel;
  segs?: Segment[];
  segStart?: string;
  segEnd?: string;
  points: ChatPoint[];
  foot?: string;
}
export type ChatMessage = UserMessage | BotMessage;

export interface ConciergeInput extends ModelInput {
  medical: boolean;
  ch: Channels;
}

let msgSeq = 0;
export const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(msgSeq++).toString(36)}`;

export function greeting(premise: string): BotMessage {
  const P = PREMISES[premise] ?? PREMISES["P-20417"];
  return { id: "g", role: "bot", accent: "var(--brand)", headline: "Hi. Ask me anything about your power.", body: `I’m using the live estimate for ${P.area}. I’ll explain things in plain words and tell you when I’m not sure.`, points: [] };
}

export function answer(intent: Intent, s: ConciergeInput): BotMessage {
  const m = model(s);
  const t = timeText(m);
  const B = RISK[m.level];
  const f = factors(m, s.scenario);
  const el = eligibility(m, s);
  const sc = s.scenario;
  const confWords = ["", "not very sure", "fairly sure", "quite sure"][m.conf];
  const base: BotMessage = { id: nextId("b"), role: "bot", accent: B.c, points: [] };
  if (intent === "risk") {
    if (sc === "outage" || sc === "restoring")
      return { ...base, accent: "var(--high)", headline: "Yes, your power is out right now.", body: "AEP confirmed it at 9:40 PM Monday. About 1,240 homes on your line are out too, so you don’t need to report it.", points: [{ k: "Confirmed by AEP", icon: "badge-check", kColor: "var(--foreground)", v: sc === "restoring" ? "Crews are on site and power is back for 830 homes upstream of you." : "Crews have been sent to the damage on your line." }, { k: "Our best guess", icon: "sparkles", kColor: "var(--muted-foreground)", v: `It should be back ${t.likely}.` }] };
    if (sc === "restored") return { ...base, accent: "var(--low)", headline: "Your power is back on.", body: "If your lights are still out but your neighbors have power, the wire to your home may need its own repair. Tell us and we’ll send someone." };
    if (sc === "normal") return { ...base, accent: "var(--low)", headline: "Very unlikely right now.", body: "There are no storms in the forecast for your area this week. We’ll message you if that changes." };
    return { ...base, headline: B.label, body: B.detail, risk: m.level, points: [{ k: "Main reasons", icon: "list", kColor: "var(--muted-foreground)", v: f.filter((x) => x.up).slice(0, 2).map((x) => x.t).join(". ") + "." }, { k: "How sure we are", icon: "gauge", kColor: "var(--muted-foreground)", v: `We’re ${confWords}. ${m.conf === 1 ? "Storms this strong are rare, so we have less history to learn from." : "The forecast could still shift before Monday."}` }], foot: "This is a prediction, not a promise." };
  }
  if (intent === "time") {
    if (sc === "restored") return { ...base, accent: "var(--low)", headline: `It came back ${restoredAt(m)}.`, body: `We had guessed ${t.range}, so it landed inside our window.` };
    if (sc === "normal") return { ...base, accent: "var(--low)", headline: "There’s no outage to estimate right now.", body: "If a storm heads your way, I’ll show you how long an outage could last before it happens." };
    const segs = segments(m, s);
    const big = segs.slice().sort((a, b) => b.h - a.h)[0];
    return { ...base, accent: "var(--brand)", headline: `Plan to be without power until ${t.plan}.`, body: `Most likely it’s back ${t.likely}. That’s about ${t.hours} from when it went out${m.hi >= 10 ? ", so plan for a night without power" : ""}.`, segs, segStart: sc === "watch" ? "Outage" : "Out 9:40 PM", segEnd: "Likely back", points: [{ k: "Biggest factor", icon: "clock", kColor: "var(--muted-foreground)", v: `${big.label} (${big.hText.replace("~", "about ")}).` }, { k: "Could be later if", icon: "trending-up", kColor: "var(--high-ink)", v: s.access === "blocked" ? "more trees come down on the access roads." : "fallen trees block the roads to the damage." }], foot: "Estimate, not a confirmed crew time." };
  }
  if (intent === "prep") {
    const long = m.hi >= 10;
    const pts: ChatPoint[] = [
      { k: "Do tonight", icon: "battery-charging", kColor: "var(--muted-foreground)", v: "Charge phones and battery packs. Find flashlights. Skip candles, they’re a fire risk." },
      { k: "Food", icon: "refrigerator", kColor: "var(--muted-foreground)", v: "Keep the fridge closed. Food stays cold about 4 hours; a full freezer lasts about 2 days." },
    ];
    if (long) pts.push({ k: "For a long outage", icon: "moon", kColor: "var(--muted-foreground)", v: "Fill water jugs, and plan where to stay warm or cool overnight." });
    if (s.medical) pts.push({ k: "Medical equipment", icon: "heart-pulse", kColor: "var(--high-ink)", v: `Charge backup batteries now. If you can’t power your equipment for ${m.hi} hours, plan a place to go. If you’re in danger, call 911.` });
    pts.push({ k: "Safety", icon: "triangle-alert", kColor: "var(--destructive)", v: "Stay at least 30 feet from downed wires, even if they look dead. Call 911. Run generators outside only." });
    return { ...base, accent: "var(--foreground)", headline: sc === "normal" ? "Nothing urgent. A few basics help." : "Here’s what helps most.", body: sc === "normal" ? "Keep a flashlight and a charged battery pack handy so you’re ready for the next storm." : `Your outage could last ${t.hours}.`, points: sc === "normal" ? pts.slice(0, 1) : pts };
  }
  if (intent === "alerts") {
    return { ...base, accent: el.ok ? "var(--low)" : "var(--muted-foreground)", headline: el.ok ? "Yes, you’ll get alerts." : "Only if your power goes out.", body: el.ok ? (s.medical ? "Because you told us you rely on medical equipment, you’ll hear from us 48 hours ahead, and we’ll call you if the outage runs long." : "We’ll message you before the storm, when an outage is confirmed, when the estimate changes, and when power is back.") : "Your outage chance is low, so there’s no pre-storm alert. You’ll still hear from us right away if your power goes out.", points: [{ k: "Change this", icon: "settings", kColor: "var(--muted-foreground)", v: "Settings → Notifications." }] };
  }
  if (intent === "why") {
    return { ...base, headline: "Here’s what we looked at.", body: "We compare your line with how it held up in past storms, including February 2025, then adjust for this storm’s wind.", points: f.slice(0, 4).map((x) => ({ k: x.effect, icon: x.up ? "trending-up" : "trending-down", kColor: x.up ? "var(--high-ink)" : "var(--low-ink)", v: `${x.t}. ${x.d}` })), foot: "We never use or show other customers’ details, crew names, or exact equipment locations." };
  }
  return { ...base, accent: "var(--muted-foreground)", headline: "I can’t answer that one reliably.", body: "I can tell you your chance of losing power, how long it might last, how to prepare, and how alerts work. For anything else, contact AEP customer service." };
}

export function intentOf(q: string): Intent | null {
  const x = q.toLowerCase();
  if (/why|how do you know|reason|factor/.test(x)) return "why";
  if (/alert|text me|notif|notify|message|sign up/.test(x)) return "alerts";
  if (/prep|ready|should i|what do i do|what can i do|generator|food|fridge|safe|medical/.test(x)) return "prep";
  if (/how long|when|back on|restor|time|hours|come back/.test(x)) return "time";
  if (/lose|out|chance|risk|likely|will i|outage|fixed/.test(x)) return "risk";
  return null;
}

/** One-paragraph context handed to the LLM for unmatched questions. */
export function llmContext(s: ConciergeInput) {
  const m = model(s);
  const t = timeText(m);
  return `Location: ${m.P.area} (${m.P.kind}). Status: ${SC[s.scenario].label}. Storm gusts ${m.wind} mph. Outage chance: ${RISK[m.level].label}. Estimated restoration: ${t.range}. Damage: ${damageText(s)}, ${s.crews} crews. Medical equipment declared: ${s.medical ? "yes" : "no"}.`;
}

export function quickAsks(sc: Scenario): { intent: Intent; label: string }[] {
  return [
    { intent: "risk", label: sc === "outage" || sc === "restoring" ? "Is it just me?" : sc === "restored" ? "Is it fixed?" : "Will I lose power?" },
    { intent: "time", label: sc === "restored" ? "When did it come back?" : "How long could it take?" },
    { intent: "prep", label: "What should I do?" },
    { intent: "why", label: "Why do you think that?" },
    { intent: "alerts", label: "Do I get alerts?" },
  ];
}

// ---------------------------------------------------------------------------
// Status-sheet content

export interface LegendItem { c: string; label: string; line: boolean }
const L = (c: string, label: string, line = false): LegendItem => ({ c, label, line });

export const LEGENDS: Record<Scenario, LegendItem[]> = {
  normal: [L("var(--brand)", "Your Area (Approx.)"), L("var(--chart-2)", "Your Power Line", true)],
  watch: [L("var(--low)", "Low Risk", true), L("var(--mid)", "Medium Risk", true), L("var(--high)", "High Risk", true), L("var(--past)", "Past Storm Damage"), L("var(--brand)", "Your Area")],
  outage: [L("var(--high)", "Outage Area", true), L("var(--high)", "Reported Damage"), L("var(--brand)", "Crew"), L("var(--brand)", "Your Area")],
  restoring: [L("var(--high)", "Still Out", true), L("var(--low)", "Restored", true), L("var(--brand)", "Crew"), L("var(--brand)", "Your Area")],
  restored: [L("var(--low)", "Restored", true), L("var(--low)", "Repaired Damage"), L("var(--brand)", "Your Area")],
};

export function facts(m: Model, s: WhatIf & { scenario: Scenario; wind: number }): { icon: IconName; v: string }[] {
  const dmg = damageText(s);
  const at = restoredAt(m);
  return {
    normal: [{ icon: "circle-check" as const, v: "No outages reported on your line." }, { icon: "cloud-sun" as const, v: "No storm warnings for your area this week." }],
    watch: [{ icon: "wind" as const, v: `National Weather Service wind advisory: Monday 6 PM to Tuesday 6 AM, gusts up to ${s.wind} mph.` }, { icon: "truck" as const, v: "6 crews are being staged nearby before the storm." }, { icon: "circle-check" as const, v: "No outages on your line right now." }],
    outage: [{ icon: "zap-off" as const, v: "Outage reported on your line at 9:40 PM Monday." }, { icon: "house" as const, v: "About 1,240 homes are affected. You don’t need to report it." }, { icon: "tree-pine" as const, v: `Cause: fallen trees. Crews have reported ${dmg}.` }],
    restoring: [{ icon: "zap" as const, v: `Power is back for 830 homes upstream of you (${fmt(m.nowH, true)}).` }, { icon: "house" as const, v: "About 410 homes, including yours, are still out." }, { icon: "truck" as const, v: `3 crews are repairing ${dmg} near your street.` }],
    restored: [{ icon: "zap" as const, v: `Power restored to all 1,240 homes at ${at}.` }, { icon: "wrench" as const, v: `Crews repaired ${dmg}.` }, { icon: "circle-help" as const, v: "Still out? The wire to your home may need its own repair. Report it from the home screen." }],
  }[s.scenario];
}

export function estimateLine(m: Model, sc: Scenario) {
  const t = timeText(m);
  return {
    normal: "Your chance of losing power this week is very low.",
    watch: `${RISK[m.level].label} of losing power in this storm. If yours goes out, plan to be without it until ${t.plan}.`,
    outage: `Most likely back ${t.likely}, ${t.range}.`,
    restoring: `Updated: most likely back ${t.likely}, ${t.range}.`,
    restored: `We estimated ${t.range}. Power came back at ${restoredAt(m)}, inside that window.`,
  }[sc];
}

export function timeline(m: Model, sc: Scenario) {
  const idx = ORDER.indexOf(sc);
  const events = [
    { at: 1, title: "Storm Watch Issued", t: "Sat 6:00 PM" },
    { at: 2, title: "Power Outage Detected", t: "Mon 9:40 PM" },
    { at: 3, title: "Crews On Site · Estimate Updated", t: fmt(m.nowH, true) },
    { at: 4, title: "Power Restored", t: restoredAt(m) },
  ]
    .filter((e) => e.at <= idx)
    .reverse();
  return events.length ? events : [{ at: 0, title: "All Clear on Your Line", t: "Checked just now" }];
}

export const weather = (sc: Scenario, wind: number) => ({
  icon: (sc === "normal" ? "cloud-sun" : sc === "watch" ? "wind" : sc === "restored" ? "sun" : "cloud-lightning") as IconName,
  label: sc === "normal" ? "Calm · 8 mph" : sc === "watch" ? `Mon · ${wind} mph gusts` : sc === "restored" ? "Clearing · 12 mph" : `Gusts ${wind} mph`,
});

export const statusLabel = (sc: Scenario) => (sc === "watch" ? "Storm Watch · Mon Night" : SC[sc].label);
