// Data for the iOS notification mockups (/mockups). Everything comes from the real concierge model and
// inbox, so the phone shows the same copy the app sends. Pure functions only.

import {
  DEF,
  DEFAULT_PREMISE,
  NO_NEEDS,
  PREMISES,
  RISK,
  SC,
  TONE,
  estimateLine,
  fmt,
  model,
  previewMessages,
  statusLabel,
  timeline,
  weather,
  type ConciergeInput,
  type IconName,
  type Model,
  type PreviewMessage,
  type Scenario,
  type Tone,
} from "@/lib/concierge/model";
import { inbox, type Notice } from "@/lib/concierge/notifications";
import { DEFAULT_ALERT_PREFS } from "@/lib/concierge/services";

const PREMISE = PREMISES["P-20417"] ? "P-20417" : DEFAULT_PREMISE;

export function inputFor(scenario: Scenario, medical: boolean): ConciergeInput {
  return {
    ...DEF,
    scenario,
    premise: PREMISE,
    medical,
    needs: NO_NEEDS,
    ch: { push: true, sms: true, email: false, call: false },
    alertPrefs: DEFAULT_ALERT_PREFS,
    riskOverride: null,
    premiseOverride: null,
  };
}

/** iOS interruption level each notice would be sent with. */
export type Level = "critical" | "time-sensitive" | "active" | "passive";

export const LEVEL_INFO: Record<Level, { label: string; d: string }> = {
  critical: { label: "Critical", d: "Breaks through Silent and Focus with a sound. Only for safety: downed wires and medical welfare checks." },
  "time-sensitive": { label: "Time Sensitive", d: "Breaks through Focus and stays on the Lock Screen for an hour. Storm watches and confirmed outages." },
  active: { label: "Active", d: "Normal banner and sound. Estimate changes, crew progress and restoration." },
  passive: { label: "Passive", d: "Delivered quietly to Notification Center and the Scheduled Summary. Tips and account notes." },
};

export function levelOf(n: Notice): Level {
  if (n.id === "downed-wires" || (n.id === "escalation" && n.icon === "heart-pulse")) return "critical";
  if (n.kind === "alert") return "time-sensitive";
  if (n.kind === "update") return "active";
  return "passive";
}

/** Storm stage (ORDER index) that sends each notice. 0 = not tied to the storm. */
export const STAGE: Record<string, number> = {
  "watch-issued": 1,
  "nws-advisory": 1,
  "pre-storm": 1,
  "crews-staged": 1,
  "prep-tip": 1,
  "facility-prep": 1,
  "outage-confirmed": 2,
  "downed-wires": 2,
  "heartbeat-1": 2,
  escalation: 3,
  "facility-digest": 3,
  "estimate-updated": 3,
  "upstream-restored": 3,
  "power-restored": 4,
  survey: 4,
};

const WEEKDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_DAY_MONDAY = 26; // Monday, October 26, 2026

/** Hours since Monday 00:00 → lock-screen clock and date. */
export function clock(h: number) {
  const totalMin = Math.round(h * 60);
  const day = Math.floor(totalMin / 1440);
  const min = totalMin - day * 1440;
  const H = Math.floor(min / 60);
  const M = min % 60;
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const wd = WEEKDAY[((day % 7) + 7) % 7];
  const date = MONTH_DAY_MONDAY + day;
  return {
    time: `${h12}:${String(M).padStart(2, "0")}`,
    ampm: H < 12 ? "AM" : "PM",
    date: `${wd}, October ${date}`,
    short: `${wd.slice(0, 3)} ${date}`,
  };
}

/** Notification timestamp relative to the lock-screen clock, iOS style. */
export function relTime(at: number, now: number, fallback: string) {
  const min = Math.round((now - at) * 60);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)}h ago`;
  return fallback;
}

export interface MockData {
  sc: Scenario;
  m: Model;
  tone: Tone;
  /** "Power Outage" */
  label: string;
  /** "Power Outage · Mon. Night" */
  pill: string;
  /** "Power Outage Detected" */
  title: string;
  line: string;
  icon: IconName;
  area: string;
  /** Power is out at the premise right now. */
  out: boolean;
  reliable: boolean;
  /** "Tue. 4 AM" */
  eta: string;
  /** "4 AM" */
  etaTime: string;
  /** "Tue. 1 AM – Tue. 7 AM" */
  range: string;
  risk: (typeof RISK)[keyof typeof RISK];
  /** 0–1 through the outage, for Live Activity progress. */
  progress: number;
  /** Live Activity step reached: 1 detected, 2 crews assigned, 3 on site, 4 restored. */
  step: number;
  now: number;
  feed: Notice[];
  previews: PreviewMessage[];
  timeline: { title: string; t: string }[];
  weather: { icon: IconName; label: string };
  battery: number;
}

const STATUS_ICON: Record<Scenario, IconName> = {
  normal: "circle-check",
  watch: "cloud-lightning",
  outage: "zap-off",
  restoring: "truck",
  restored: "zap",
};

const BATTERY: Record<Scenario, number> = { normal: 82, watch: 100, outage: 71, restoring: 46, restored: 38 };

export function mockData(sc: Scenario, medical: boolean): MockData {
  const s = inputFor(sc, medical);
  const m = model(s);
  const { feed } = inbox(m, s);
  const restoredH = m.start + m.mid * 0.95;
  const base: Record<Scenario, number> = { normal: 9 + 41 / 60, watch: 17, outage: m.start + 0.1, restoring: m.nowH, restored: restoredH };
  // Move the clock just past the latest storm message of this stage. Escalations the app's feed
  // schedules later than that haven't arrived yet, so the phone leaves them out.
  const recent = feed.filter((n) => STAGE[n.id] && n.h <= base[sc] + 1).map((n) => n.h + 0.05);
  const now = Math.max(base[sc], ...recent);
  const arrived = feed.filter((n) => n.h <= now + 1e-6);
  const reliable = m.confidence.reliable;
  const eta = fmt(m.start + m.mid);
  const step = { normal: 0, watch: 0, outage: 1, restoring: 3, restored: 4 }[sc];
  const progress = sc === "restored" ? 1 : sc === "outage" || sc === "restoring" ? Math.min(0.92, Math.max(0.06, (now - m.start) / m.mid)) : 0;
  return {
    sc,
    m,
    tone: TONE[SC[sc].tone],
    label: SC[sc].label,
    pill: statusLabel(sc, m),
    title: SC[sc].title,
    line: estimateLine(m, sc),
    icon: STATUS_ICON[sc],
    area: m.P.area,
    out: sc === "outage" || sc === "restoring",
    reliable,
    eta,
    etaTime: eta.split(" ").slice(1).join(" "),
    range: `${fmt(m.start + m.lo)} – ${fmt(m.start + m.hi)}`,
    risk: RISK[m.level],
    progress,
    step,
    now,
    feed: arrived,
    previews: previewMessages(m, s),
    timeline: timeline(m, sc),
    weather: weather(sc, s.wind),
    battery: BATTERY[sc],
  };
}

/** Every notice the app can send over the whole storm, oldest first. */
export function catalog(medical: boolean): Notice[] {
  const s = inputFor("restored", medical);
  return [...inbox(model(s), s).feed].sort((a, b) => a.h - b.h);
}
