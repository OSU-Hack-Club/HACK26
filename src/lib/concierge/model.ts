// Outage Concierge estimate model + copy. Ported from the design handoff
// (ConciergeDashboard.dc.html `model()` and helpers). Pure functions only.

import { featureSource, type PremiseRecord } from "@/lib/concierge/features";
import {
  alertWorthy,
  assessConfidence,
  assessRisk,
  INDICATORS,
  RISK,
  windStrength,
  type Confidence,
  type IndicatorId,
  type RiskAssessment,
  type RiskContribution,
  type RiskLevel,
} from "@/lib/concierge/risk";
import { ASSUME, LABOR, estimate, type Access, type DamageWhere, type Estimate } from "@/lib/concierge/restoration";

export { RISK, RISK_ORDER, type RiskLevel } from "@/lib/concierge/risk";
export type { Access, DamageWhere, Estimate } from "@/lib/concierge/restoration";

export type Scenario = "normal" | "watch" | "outage" | "restoring" | "restored";
export type ToneKey = "low" | "mid" | "high" | "brand";
export type Intent = "risk" | "time" | "prep" | "alerts" | "why" | "none";
export type IconName =
  | "zap" | "zap-off" | "gauge" | "bell" | "clock" | "truck" | "house" | "target"
  | "badge-check" | "sparkles" | "list" | "trending-up" | "trending-down"
  | "battery-charging" | "refrigerator" | "moon" | "heart-pulse" | "triangle-alert"
  | "settings" | "circle-check" | "cloud-sun" | "wind" | "tree-pine" | "wrench"
  | "circle-help" | "cloud-lightning" | "sun" | "star"
  | "trees" | "tree-deciduous" | "utility-pole" | "cable" | "git-commit-horizontal" | "git-fork" | "history"
  | "network" | "mountain" | "building-2" | "route";

/** A premise as the app sees it: the data record (features.ts) plus values the restoration estimate derives from it. */
export interface Premise extends PremiseRecord {
  /** Anonymized circuit name; the ID lookup also accepts it. */
  circuit: string;
  /** The circuit has a tie switch, so crews can feed it from another circuit around main-line damage. */
  backfeed: boolean;
  /** Rural (density at or below the 10th percentile): crews take longer to arrive. */
  remote: boolean;
}

const NORMS = featureSource.dataset.norms;

const toPremise = (r: PremiseRecord, norms: typeof NORMS = NORMS): Premise => ({
  ...r,
  circuit: r.features.circuit,
  backfeed: r.features.hasTie === true,
  remote: r.features.premiseDensity <= norms.premiseDensity.p10,
});

/** Demo premises from src/data/risk-features.json (built by `npm run data:risk`). */
export const PREMISES: Record<string, Premise> = Object.fromEntries(featureSource.list().map((r) => [r.id, toPremise(r)]));
export const DEFAULT_PREMISE = featureSource.list()[0].id;

export interface WhatIf {
  poles: number;
  spans: number;
  xfmr: boolean;
  crews: number;
  access: Access;
  /** Where the damage is relative to the customer's power path. */
  where: DamageWhere;
  /** Crews restore in steps (isolate the damage, switch healthy sections back on) when the network allows it. */
  reroute: boolean;
}

/** Starting what-if: the damage AEP reported (or, before the storm, typical damage for a storm on this line). */
export const DEF: WhatIf & { wind: number } = { wind: 58, poles: 2, spans: 3, xfmr: false, crews: 3, access: "clear", where: "street", reroute: true };

const WHAT_IF_KEYS = ["poles", "spans", "xfmr", "crews", "access", "where", "reroute"] as const satisfies readonly (keyof WhatIf)[];

/** True when the customer has changed any damage or crew input away from the starting what-if. */
export const whatIfActive = (s: WhatIf) => WHAT_IF_KEYS.some((k) => s[k] !== DEF[k]);
export const ORDER: Scenario[] = ["normal", "watch", "outage", "restoring", "restored"];

export interface Tone { c: string; bg: string; ink: string; edge: string }
export const TONE: Record<ToneKey, Tone> = {
  low: { c: "var(--low)", bg: "var(--low-bg)", ink: "var(--low-ink)", edge: "color-mix(in oklch,var(--low) 35%,transparent)" },
  mid: { c: "var(--mid)", bg: "var(--mid-bg)", ink: "var(--mid-ink)", edge: "color-mix(in oklch,var(--mid) 45%,transparent)" },
  high: { c: "var(--high)", bg: "var(--high-bg)", ink: "var(--high-ink)", edge: "color-mix(in oklch,var(--high) 35%,transparent)" },
  brand: { c: "var(--brand)", bg: "var(--brand-soft)", ink: "var(--brand-ink)", edge: "color-mix(in oklch,var(--brand) 35%,transparent)" },
};

export const SC: Record<Scenario, { label: string; tone: ToneKey; title: string; tag: string }> = {
  normal: { label: "All Clear", tone: "low", title: "No Outages on Your Line", tag: "No Outages" },
  watch: { label: "Watch Alert", tone: "mid", title: "Strong Winds Monday", tag: "Watch Alert" },
  outage: { label: "Power Outage", tone: "high", title: "Power Outage Detected", tag: "Power Outage" },
  restoring: { label: "Restoring Power", tone: "brand", title: "Crews Restoring Power", tag: "Restoring" },
  restored: { label: "Power Restored", tone: "low", title: "Power Restored", tag: "Restored" },
};

const DAY = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri."];
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

/** Hours since Monday 00:00 → "Tue. 4 AM" (or "Tue. 4:30 AM" with minutes). */
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
  /**
   * A premise fetched at runtime (e.g. from /api/premise, backed by DynamoDB), used instead of the
   * static demo premises. Carries its own norms so scaling matches the snapshot it came from.
   * When unset, the model uses the built-in demo premises. See DEVELOPMENT.md › Making the data dynamic.
   */
  premiseOverride?: RuntimePremise | null;
}

/** A premise plus the snapshot norms it was scored against, as returned by the DynamoDB lookup. */
export interface RuntimePremise {
  record: PremiseRecord;
  norms: typeof NORMS;
}

export interface Model {
  P: Premise;
  w: number;
  risk: RiskAssessment;
  level: RiskLevel;
  confidence: Confidence;
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
  /** The what-if the estimate was built from. */
  input: WhatIf;
}

export function model(s: ModelInput): Model {
  const P = s.premiseOverride ? toPremise(s.premiseOverride.record, s.premiseOverride.norms) : (PREMISES[s.premise] ?? PREMISES[DEFAULT_PREMISE]);
  const norms = s.premiseOverride?.norms ?? NORMS;
  const wind = s.scenario === "normal" ? 18 : s.wind;
  const w = windStrength(wind);
  const ctx = { storm: s.scenario !== "normal", wind, features: P.features, norms };
  const risk = assessRisk(ctx);
  const confidence = assessConfidence(ctx, risk);
  const conf = confidence.level;
  const net = { storm: w, rural: P.remote, backfeed: P.backfeed };
  const e = estimate(s, net);
  const base = estimate(DEF, net);
  const restoring = s.scenario === "restoring";
  const spread = restoring ? 0.18 : conf === 1 ? 0.5 : conf === 2 ? 0.35 : 0.25;
  const mid = e.mid;
  const lo = Math.max(1, Math.round(mid * (1 - spread * 0.7)));
  const hi = Math.max(lo + 1, Math.round(mid * (1 + spread)));
  const start = s.scenario === "normal" || s.scenario === "watch" ? 21.5 : 21 + 40 / 60;
  const nowH = start + e.wait + e.road * 0.5;
  return { P, w, risk, level: s.riskOverride ?? risk.level, confidence, conf, e, base, lo, hi, start, mid, nowH, delta: e.mid - base.mid, wind, input: { poles: s.poles, spans: s.spans, xfmr: s.xfmr, crews: s.crews, access: s.access, where: s.where, reroute: s.reroute } };
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

/** Map event card title: "Mon. 6 PM: Strong Winds". */
export function eventTitle(m: Model, sc: Scenario) {
  const [at, cond] = {
    normal: [fmt(m.start, true), "No Outages"],
    watch: [fmt(18), "Strong Winds"],
    outage: [fmt(m.start, true), "Power Outage"],
    restoring: [fmt(m.nowH, true), "Crews Restoring Power"],
    restored: [restoredAt(m), "Power Restored"],
  }[sc];
  return `${at}: ${cond}`;
}

export function damageText(s: WhatIf) {
  const a: string[] = [];
  if (s.poles) a.push(`${s.poles} broken pole${s.poles > 1 ? "s" : ""}`);
  if (s.spans) a.push(`${s.spans} downed wire${s.spans > 1 ? "s" : ""}`);
  if (s.xfmr) a.push("a damaged transformer");
  return a.length ? a.join(", ").replace(/, ([^,]*)$/, " and $1") : "only a tripped fuse";
}

/** Copy for each damage location. `at` completes "the damage …". */
export const WHERE: Record<DamageWhere, { label: string; at: string; hint: string }> = {
  street: { label: "Your Street", at: "on your street", hint: "Only the repair brings your power back." },
  branch: { label: "Nearby Branch", at: "on a nearby branch", hint: "It tripped equipment you share, so crews can cut it off and switch you back on." },
  main: { label: "Main Line", at: "on the main line", hint: "You depend on it. Only a backup line from another circuit can feed you around it." },
};

/** Why step restoration does or doesn't help with this damage on this line. */
export function stepText(m: Model, s: WhatIf) {
  if (m.e.stepped) return `Crews can switch you back on in about ${ASSUME.switchHours} hour while repairs continue (about ${Math.round(m.e.repair)} hours of work).`;
  if (!m.e.canStep)
    return s.where === "main"
      ? "Your circuit has no backup line from another circuit, so you wait for the main line repair."
      : "Damage on your own street can’t be bypassed, so you wait for the repair.";
  return "Crews are repairing everything before switching power back on.";
}

export interface Mover { icon: IconName; t: string; h: number }

/** What would move the estimate most from here: each alternative input and how many hours it adds or saves. */
export function movers(m: Model, s: WhatIf): Mover[] {
  const net = { storm: m.w, rural: m.P.remote, backfeed: m.P.backfeed };
  const delta = (o: Partial<WhatIf>) => estimate({ ...s, ...o }, net).mid - m.e.mid;
  const list: Mover[] = [];
  if (s.access !== "blocked") list.push({ icon: "tree-pine", t: "Fallen trees block the roads", h: delta({ access: "blocked" }) });
  else list.push({ icon: "route", t: "Roads are cleared", h: delta({ access: "clear" }) });
  if (!m.e.stepped) {
    if (s.crews < 6) list.push({ icon: "truck", t: "One more crew is assigned", h: delta({ crews: s.crews + 1 }) });
    list.push({ icon: "wrench", t: "Crews find another broken pole", h: delta({ poles: s.poles + 1 }) });
    if (s.where !== "branch") list.push({ icon: "git-fork", t: "The damage turns out to be on a nearby branch", h: delta({ where: "branch", reroute: true }) });
  } else {
    list.push({ icon: "git-commit-horizontal", t: "The damage turns out to be on your street", h: delta({ where: "street" }) });
  }
  return list
    .filter((x) => Math.abs(x.h) >= 0.5)
    .sort((a, b) => Math.abs(b.h) - Math.abs(a.h))
    .slice(0, 3);
}

/** "+3 h" / "−2 h" for a mover. */
export const moveText = (h: number) => `${h > 0 ? "+" : "−"}${Math.round(Math.abs(h)) || "<1"} h`;

/** The labor basis behind the repair time, in plain words. */
export function laborText(m: Model) {
  const e = m.e;
  const idle = m.input.crews > e.working ? ` Only ${e.sites.length} damage site${e.sites.length > 1 ? "s" : ""}, so extra crews don’t help.` : "";
  const dmg = damageText(m.input);
  return `${dmg.charAt(0).toUpperCase()}${dmg.slice(1)}: about ${Math.round(e.personHours)} hours of work at AEP’s labor standards, including travel and setup, shared by ${e.working} crew${e.working > 1 ? "s" : ""} of ${ASSUME.crewSize}.${idle}`;
}

/** The assumptions behind the restoration estimate, in plain words (disclosed under "How We Calculated This"). */
export const ASSUME_TEXT: string[] = [
  `Repair time uses AEP’s labor standards for each part replaced (poles, crossarms, insulators, wire, transformers), multiplied by ${LABOR.ilm} for travel, safety briefings and setup.`,
  `A crew is ${ASSUME.crewSize} line workers and works one damage site at a time.`,
  `Crews take ${ASSUME.wait.base}–${ASSUME.wait.base + ASSUME.wait.storm} hours to reach you, longer in stronger storms, plus about ${ASSUME.wait.rural} hours in rural areas.`,
  `Debris on the roads adds about ${ASSUME.roadHours.limited} hour, fallen trees about ${ASSUME.roadHours.blocked} hours, plus extra work at each site.`,
  `Switching you back on in steps takes about ${ASSUME.switchHours} hour once crews reach the damage.`,
];

/** Past-storm context from ARCOS for the road-access what-if. */
export const accessHistoryText = () => `In past storms here, about ${Math.round(LABOR.history.accessIssueShare * 100)}% of damage sites were hard to reach.`;

export interface Segment { label: string; h: number; color: string; op: number; pct: string; hText: string }

export function segments(m: Model, s: WhatIf & { scenario: Scenario }): Segment[] {
  const done = s.scenario === "restoring";
  return [
    { label: done ? "Crew reached you (done)" : "Waiting for a crew to reach you", h: m.e.wait, color: "var(--chart-2)", op: done ? 0.35 : 1 },
    { label: "Clearing roads to the damage", h: m.e.road, color: "var(--mid)", op: 1 },
    m.e.stepped
      ? { label: `Isolating the damage ${WHERE[s.where].at} and switching you back on`, h: m.e.switch, color: "var(--low)", op: 1 }
      : { label: `Fixing ${damageText(s)}`, h: m.e.repair, color: "var(--brand)", op: 1 },
  ]
    .filter((x) => x.h > 0.05)
    .map((x) => ({
      ...x,
      label: tc(x.label),
      pct: ((x.h / m.e.mid) * 100).toFixed(1) + "%",
      hText: x.h < 1 ? "<1 h" : "~" + Math.round(x.h) + " h",
    }));
}

export interface Factor { up: boolean; s: number; icon: IconName; t: string; d: string; effect: string }

type FactorCopy = Pick<Factor, "icon" | "t" | "d">;

/** Signal at or above which an indicator counts as raising the chance (default 0.5). Wind: underground service signals 0.6. */
const UP_AT: Partial<Record<IndicatorId, number>> = { wind: 0.8, history: 0.3, path: 0.15 };

/** Indicators that scale with wind (they define a `value`), as opposed to fixed network/history traits. */
const isStormScaled = (c: RiskContribution) => INDICATORS.find((i) => i.id === c.id)?.value !== undefined;

/** Plain-language copy for each risk indicator (risk.ts). Every indicator needs an entry. */
const FACTOR_COPY: Record<IndicatorId, (m: Model, up: boolean) => FactorCopy> = {
  wind: (m) =>
    m.P.features.overhead === false
      ? { icon: "cable", t: "Your service line is buried", d: "That protects the last stretch to your home, though the lines feeding your street may still be overhead." }
      : { icon: "utility-pole", t: "Your power comes in on overhead wires", d: "They’re out in the open, exposed to wind and falling branches." },
  line: (m, up) =>
    up
      ? { icon: "network", t: `Your power passes ${m.P.features.upstreamDevices} branch points on its way to you`, d: "Each branch means more line that a falling tree or limb can hit." }
      : { icon: "network", t: "You’re close to the main line", d: "Less wire between you and the substation means fewer places for damage." },
  rural: (_m, up) =>
    up
      ? { icon: "mountain", t: "You’re in a rural area", d: "Lines run longer through open and wooded country." }
      : { icon: "building-2", t: "You’re in a built-up area", d: "Lines are shorter, with fewer stretches through open country." },
  trees: (_m, up) =>
    up
      ? { icon: "trees", t: "Lots of trees grow near your lines", d: "Falling limbs cause much of the storm damage on lines like yours." }
      : { icon: "tree-deciduous", t: "Few trees near your lines", d: "Less chance of branches hitting the wires." },
  feeder: (m, up) => {
    const mi = Math.round((m.P.features.circuitOverheadKm ?? 0) * 0.621);
    return up
      ? { icon: "route", t: `Your circuit runs about ${mi} miles of overhead line`, d: "A longer circuit has more places where storm damage can cut power." }
      : { icon: "route", t: "Your circuit is fairly short", d: "Less overhead line means fewer places for storm damage." };
  },
  single: (_m, up) =>
    up
      ? { icon: "git-commit-horizontal", t: "One line feeds your street", d: "If that line is damaged, there’s no other way to get power to you." }
      : { icon: "git-fork", t: "Your area has a backup route", d: "AEP can often switch you to another line." },
  history: (m, up) => ({
    icon: "history",
    t: `${m.P.features.circuitStormHits} of the last ${m.P.features.stormsTotal} storms damaged your circuit`,
    d: up ? "How past storms went is a strong clue for this one." : "Your circuit has held up well in past storms.",
  }),
  path: (m, up) =>
    m.P.features.pathStormHits > 0
      ? { icon: "history", t: `The line feeding you was damaged in ${m.P.features.pathStormHits} of the last ${m.P.features.stormsTotal} storms`, d: up ? "Damage upstream of you has repeated in big storms." : "It happened, but not often." }
      : { icon: "history", t: "The line feeding you came through recent storms undamaged", d: "Nothing between you and the substation was damaged in the storms we have on record." },
};

/**
 * The factors behind the outage chance, biggest effect first. Built from the risk assessment, so they
 * always match the score. Indicators with missing data are left out here and disclosed in confText().
 */
export function factors(m: Model, scenario: Scenario): Factor[] {
  const storm = scenario !== "normal";
  const shown = m.risk.contributions.filter((c) => !c.missing && (storm || !isStormScaled(c)));
  const f: Omit<Factor, "effect">[] = shown.map((c) => {
    const up = c.signal >= (UP_AT[c.id] ?? 0.5);
    return { up, s: c.points, ...FACTOR_COPY[c.id](m, up) };
  });
  if (storm) {
    // The storm itself: what wind adds across every wind-scaled indicator.
    const s = m.risk.contributions.filter(isStormScaled).reduce((a, c) => a + c.points, 0);
    const up = m.wind >= 45;
    f.push({ up, s, icon: "wind", t: up ? `Gusts up to ${m.wind} mph are expected` : `Winds of ${m.wind} mph are fairly mild`, d: up ? "Strong enough to bring branches down onto power lines." : "Power lines usually handle winds like this." });
  }
  return f
    .sort((a, b) => Number(b.up) - Number(a.up) || b.s - a.s)
    .map((x) => ({ ...x, t: tc(x.t), effect: (x.up ? "Raises" : "Lowers") + " your chance" }));
}

/** How each missing input is named when we disclose it. */
const MISSING_COPY: Record<IndicatorId, string> = {
  wind: "whether your service line is overhead",
  line: "how your line branches",
  rural: "how built-up your area is",
  trees: "tree cover near your lines",
  feeder: "your circuit’s length",
  single: "whether your line has a backup route",
  history: "past storms on your circuit",
  path: "past storms on the line feeding you",
};

/** "We don’t have data on tree cover near your lines yet, so we assumed a typical amount." or null. */
export function missingText(m: Model) {
  const names = m.confidence.missing.map((id) => MISSING_COPY[id]);
  if (!names.length) return null;
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return `We don’t have data on ${list} yet, so we assumed what’s typical for the area.`;
}

export function confText(m: Model) {
  const r = m.confidence.reasons;
  const base =
    m.conf === 3
      ? "We’re quite sure: we have plenty of storm history for your line and this forecast is in a familiar range."
      : m.conf === 2
        ? r.includes("exposed-lines")
          ? "We’re fairly sure: we have good storm history for your line, but overhead lines in a storm like this can go either way."
          : "We’re fairly sure: we have good storm history for your line, but some of the inputs are assumptions."
        : "We’re less sure: storms this strong are rare in our records. Treat this as a rough guide.";
  const missing = missingText(m);
  return missing ? `${base} ${missing}` : base;
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
  const first = s.medical ? "Sat. 8 PM · 48 h before the storm" : "Sun. 8 PM · 24 h before the storm";
  const med = s.medical ? " Have backup power ready for medical equipment, or a place to go." : "";
  const list = [
    { at: 1, title: "Before the storm", icon: "cloud-lightning" as const, meta: `${chan} · ${first}`, text: `AEP: A strong storm reaches ${m.P.area} Monday evening. There's a ${RISK[m.level].label.toLowerCase()} you lose power. If it goes out, plan to be without it until ${t.plan}. Charge your phone tonight.${med}` },
    { at: 2, title: "Outage confirmed", icon: "zap-off" as const, meta: `${chan}${s.medical ? " + phone call" : ""} · within 5 min of outage`, text: `AEP: We know your power is out (reported 9:40 PM). You don't need to call. Our best guess: it's back ${t.range}. We'll text you if that changes.` },
    { at: 3, title: "Estimate updated", icon: "clock" as const, meta: `${chan} · when the estimate moves 2+ hours`, text: `AEP update: Crews found ${damageText(s)} ${WHERE[s.where].at}.${m.e.stepped ? " They'll switch you back on before the repair is done." : ""} New estimate: back ${t.range}. Stay away from downed wires and call 911 if you see one.` },
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

export function greeting(premise: string, override?: RuntimePremise | null): BotMessage {
  const P = override ? toPremise(override.record, override.norms) : (PREMISES[premise] ?? PREMISES[DEFAULT_PREMISE]);
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
    const mv = movers(m, s);
    const later = mv.find((x) => x.h > 0);
    const sooner = mv.find((x) => x.h < 0);
    const lower = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
    const points: ChatPoint[] = [
      { k: "Biggest factor", icon: "clock", kColor: "var(--muted-foreground)", v: `${big.label} (${big.hText.replace("~", "about ")}).` },
      { k: m.e.stepped ? "Restoring in steps" : "How the repair adds up", icon: "wrench", kColor: "var(--muted-foreground)", v: m.e.stepped ? stepText(m, s) : laborText(m) },
    ];
    if (later) points.push({ k: "Could be later if", icon: "trending-up", kColor: "var(--high-ink)", v: `${lower(later.t)} (${moveText(later.h)}).` });
    if (sooner) points.push({ k: "Could be sooner if", icon: "trending-down", kColor: "var(--low-ink)", v: `${lower(sooner.t)} (${moveText(sooner.h)}).` });
    return { ...base, accent: "var(--brand)", headline: `Plan to be without power until ${t.plan}.`, body: `Most likely it’s back ${t.likely}. That’s about ${t.hours} from when it went out${m.hi >= 10 ? ", so plan for a night without power" : ""}.`, segs, segStart: sc === "watch" ? "Outage" : "Out 9:40 PM", segEnd: "Likely back", points, foot: whatIfActive(s) ? "What-if estimate from the inputs you changed, not a confirmed crew time." : "Estimate, not a confirmed crew time." };
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
    const missing = missingText(m);
    const points: ChatPoint[] = f.slice(0, 4).map((x) => ({ k: x.effect, icon: x.icon, kColor: x.up ? "var(--high-ink)" : "var(--low-ink)", v: `${x.t}. ${x.d}` }));
    if (missing) points.push({ k: "What we don’t know", icon: "circle-help", kColor: "var(--muted-foreground)", v: missing });
    return { ...base, headline: "Here’s what we looked at.", body: `We compare your line with how it held up in the last ${m.P.features.stormsTotal} storms on record, including February 2025, then adjust for this storm’s wind.`, points, foot: "We never use or show other customers’ details, crew names, or exact equipment locations." };
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
  return `Location: ${m.P.area} (${m.P.kind}). Status: ${SC[s.scenario].label}. Storm gusts ${m.wind} mph. Outage chance: ${RISK[m.level].label}. Estimated restoration: ${t.range}. Damage (${whatIfActive(s) ? "customer what-if" : "as reported"}): ${damageText(s)} ${WHERE[s.where].at}, ${s.crews} crews, road access ${s.access}. ${m.e.stepped ? "Crews can switch the customer back on before the repair is done." : "The customer waits for the repair."} Medical equipment declared: ${s.medical ? "yes" : "no"}.`;
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
  restoring: [L("var(--high)", "Outage Area", true), L("var(--low)", "Restored"), L("var(--high)", "Reported Damage"), L("var(--brand)", "Crew"), L("var(--brand)", "Your Area")],
  restored: [L("var(--low)", "Restored", true), L("var(--low)", "Repaired Damage"), L("var(--brand)", "Your Area")],
};

export function facts(m: Model, s: WhatIf & { scenario: Scenario; wind: number }): { icon: IconName; v: string }[] {
  // Confirmed facts describe the damage AEP reported, never the customer's what-if.
  const dmg = damageText(DEF);
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
    { at: 1, title: "Watch Alert Issued", t: "Sat. 6:00 PM" },
    { at: 2, title: "Power Outage Detected", t: "Mon. 9:40 PM" },
    { at: 3, title: "Crews On Site · Estimate Updated", t: fmt(m.nowH, true) },
    { at: 4, title: "Power Restored", t: restoredAt(m) },
  ]
    .filter((e) => e.at <= idx)
    .reverse();
  return events.length ? events : [{ at: 0, title: "All Clear on Your Line", t: "Checked just now" }];
}

export const weather = (sc: Scenario, wind: number) => ({
  icon: (sc === "normal" ? "cloud-sun" : sc === "watch" ? "wind" : sc === "restored" ? "sun" : "cloud-lightning") as IconName,
  label: sc === "normal" ? "Calm · 8 mph" : sc === "watch" ? `Mon. · ${wind} mph gusts` : sc === "restored" ? "Clearing · 12 mph" : `Gusts ${wind} mph`,
});

/** Hours since Monday 00:00 → "Mon. Morning", "Tue. Afternoon", "Mon. Night". Hours before 5 AM count as that day's night. */
export function dayPart(h: number) {
  const hr = h % 24;
  const d = Math.min(Math.floor((hr < 5 ? h - 5 : h) / 24), 4);
  const part = hr < 5 || hr >= 17 ? "Night" : hr < 12 ? "Morning" : "Afternoon";
  return `${DAY[d]} ${part}`;
}

/** Header pill text: the status name plus a generic time window. */
export function statusLabel(sc: Scenario, m: Model) {
  const when: Record<Scenario, string> = {
    normal: "All Week",
    watch: dayPart(m.start),
    outage: dayPart(m.start),
    restoring: dayPart(m.nowH),
    restored: dayPart(m.start + m.mid * 0.95),
  };
  return `${SC[sc].label} · ${when[sc]}`;
}
