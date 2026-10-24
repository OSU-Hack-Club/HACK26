// Notification center: what the customer has been sent, plus alerts active right now.
// Demo data derived from the current scenario so the inbox tracks the storm. Pure functions only.

import {
  ORDER,
  PREMISES,
  RISK,
  SC,
  anyDeclared,
  channelList,
  eligibility,
  estimateLine,
  fmt,
  escalation,
  forcedChannel,
  previewMessages,
  priorityNeed,
  restoredAt,
  type ConciergeInput,
  type IconName,
  type Intent,
  type Model,
  type ToneKey,
} from "@/lib/concierge/model";
import { DEFAULT_ALERT_PREFS } from "@/lib/concierge/services";

export type NoticeKind = "alert" | "update" | "tip" | "account";

export type NoticeAction =
  | { label: string; kind: "status" }
  | { label: string; kind: "ask"; q: string; intent: Intent }
  | { label: string; kind: "screen"; screen: "notifications" | "location" | "services" };

export interface Notice {
  id: string;
  kind: NoticeKind;
  icon: IconName;
  tone: ToneKey | "muted";
  title: string;
  body: string;
  /** Day group shown in the feed ("Monday", "Last Week"). */
  day: string;
  /** Display time, e.g. "Sun. 8:00 PM". */
  t: string;
  /** Hours since Monday 00:00, for ordering (negative = the weekend before). */
  h: number;
  channel?: string;
  action?: NoticeAction;
  /** Read until the user says otherwise. Items from earlier storm stages start read. */
  defaultRead: boolean;
}

export interface Inbox {
  /** Alerts in effect right now, pinned above the feed. */
  active: Notice[];
  /** Everything we've sent, newest first. */
  feed: Notice[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const dayOf = (h: number) => (h < -24 ? "Saturday" : h < 0 ? "Sunday" : DAYS[Math.min(Math.floor(h / 24), 4)]);

export function inbox(m: Model, s: ConciergeInput): Inbox {
  const sc = s.scenario;
  const idx = ORDER.indexOf(sc);
  const P = PREMISES[s.premise] ?? m.P;
  const el = eligibility(m, s);
  const previews = previewMessages(m, s);
  const prefs = s.alertPrefs ?? DEFAULT_ALERT_PREFS;
  const chan = s.ch.sms ? "Text" : s.ch.push ? "Push" : s.ch.email ? "Email" : "Text";
  const callChan = forcedChannel(s, "call") ? `${chan} + Call` : chan;
  const restoredH = m.start + m.mid * 0.95;
  const esc = escalation(s);
  const reach = s.needs.hearing ? "Text" : forcedChannel(s, "call") ? "Call" : chan;

  /** Storm items: stage = the ORDER index that sends them. Older stages start read. */
  const staged = (stage: number, n: Omit<Notice, "day" | "defaultRead">): Notice | null =>
    stage > idx ? null : { ...n, day: dayOf(n.h), defaultRead: stage < idx };

  const storm: (Notice | null)[] = [
    staged(1, { id: "watch-issued", kind: "alert", icon: "cloud-lightning", tone: "mid", title: "Watch Alert Issued", body: `Strong winds are expected in ${P.area} Monday night. We’ll keep you posted as the forecast firms up.`, t: "Sat. 6:00 PM", h: -30, channel: "Push", action: { label: "View Status", kind: "status" } }),
    staged(1, { id: "nws-advisory", kind: "alert", icon: "wind", tone: "mid", title: "Wind Advisory from the National Weather Service", body: `Monday 6 PM to Tuesday 6 AM, gusts up to ${s.wind} mph. Secure loose items outside.`, t: "Sun. 3:10 PM", h: -8.8, channel: "Push" }),
    el.ok
      ? staged(1, { id: "pre-storm", kind: "alert", icon: "bell", tone: "mid", title: previews[0].title, body: previews[0].text, t: priorityNeed(s) ? "Sat. 8:00 PM" : "Sun. 8:00 PM", h: priorityNeed(s) ? -28 : -4, channel: chan })
      : null,
    staged(1, { id: "crews-staged", kind: "update", icon: "truck", tone: "brand", title: "Crews Staged Nearby", body: `6 crews are standing by near ${P.area} so repairs can start as soon as it’s safe.`, t: "Mon. 2:00 PM", h: 14, channel: "Push" }),
    staged(1, { id: "prep-tip", kind: "tip", icon: "battery-charging", tone: "brand", title: "Get Ready Tonight", body: "Charge phones and battery packs, find flashlights, and keep the fridge closed if the power goes out.", t: "Mon. 4:30 PM", h: 16.5, channel: "Push", action: { label: "What Should I Do?", kind: "ask", q: "What should I do?", intent: "prep" } }),
    s.needs.facility
      ? staged(1, { id: "facility-prep", kind: "tip", icon: "building-2", tone: "high", title: "Critical Facility: Storm Playbook", body: "Test generators, confirm who decides to close or relocate, and keep your facility contact current with AEP. We’ll escalate to the critical-facility team if power is out more than 4 hours.", t: "Mon. 3:00 PM", h: 15, channel: "Push", action: { label: "Open Playbook", kind: "screen", screen: "services" } })
      : null,
    staged(2, { id: "outage-confirmed", kind: "alert", icon: "zap-off", tone: "high", title: previews[1].title, body: previews[1].text, t: "Mon. 9:41 PM", h: 21.68, channel: callChan, action: { label: "View Status", kind: "status" } }),
    staged(2, { id: "downed-wires", kind: "alert", icon: "triangle-alert", tone: "high", title: "Downed Wires Reported Nearby", body: "Stay at least 30 feet from any downed wire, even if it looks dead, and call 911. Run generators outside only.", t: "Mon. 10:05 PM", h: 22.08, channel: "Push" }),
    prefs.heartbeat
      ? staged(2, { id: "heartbeat-1", kind: "update", icon: "bell", tone: "brand", title: "Status Check-In", body: `No change to your estimate since the last update. Most likely back ${fmt(m.start + m.mid)}. We’ll message again in 6 hours, or sooner if the estimate moves.`, t: "Tue. 3:40 AM", h: 27.67, channel: chan })
      : null,
    // Escalation after the long-outage threshold for this customer's needs.
    staged(3, {
      id: "escalation",
      kind: "alert",
      icon: s.medical ? "heart-pulse" : s.needs.facility ? "building-2" : s.needs.mobility ? "accessibility" : "sun",
      tone: "high",
      title: s.medical
        ? "Welfare Check Started"
        : s.needs.facility
          ? "Critical-Facility Team Notified"
          : s.needs.mobility
            ? "Check-In & Center List"
            : "Warming & Cooling Centers",
      body: esc.v + (prefs.centerList && !s.needs.facility ? " Open Services for approximate center areas near you." : s.needs.facility ? " Open Services for your facility playbook." : ""),
      t: fmt(m.start + (s.medical || s.needs.facility ? 4 : s.needs.mobility ? 12 : 24), true),
      h: m.start + (s.medical || s.needs.facility ? 4 : s.needs.mobility ? 12 : 24),
      channel: reach,
      action:
        prefs.centerList || s.needs.facility
          ? { label: "Open Services", kind: "screen", screen: "services" }
          : { label: "View Status", kind: "status" },
    }),
    s.needs.facility && prefs.facilityDigest
      ? staged(3, { id: "facility-digest", kind: "update", icon: "building-2", tone: "brand", title: "Facility Ops Digest", body: `Estimate still ${fmt(m.start + m.lo)}–${fmt(m.start + m.hi)}. Crews are on the damage near your street. Next escalation already queued with AEP’s critical-facility team.`, t: fmt(m.nowH + 0.1, true), h: m.nowH + 0.1, channel: callChan, action: { label: "Facility Playbook", kind: "screen", screen: "services" } })
      : null,
    staged(3, { id: "estimate-updated", kind: "update", icon: "clock", tone: "brand", title: previews[2].title, body: previews[2].text, t: fmt(m.nowH, true), h: m.nowH, channel: chan, action: { label: "How Long Could It Take?", kind: "ask", q: "How long could it take?", intent: "time" } }),
    staged(3, { id: "upstream-restored", kind: "update", icon: "zap", tone: "low", title: "Power Back for 830 Homes Upstream", body: "Crews restored the main line. About 410 homes, including yours, are still out while they fix the damage near your street.", t: fmt(m.nowH + 0.25, true), h: m.nowH + 0.25, channel: "Push" }),
    staged(4, { id: "power-restored", kind: "update", icon: "circle-check", tone: "low", title: previews[3].title, body: previews[3].text, t: restoredAt(m), h: restoredH, channel: chan }),
    staged(4, { id: "survey", kind: "account", icon: "star", tone: "brand", title: "How Did We Do?", body: "Tell us whether our estimate helped you plan. It takes about 30 seconds.", t: fmt(restoredH + 1, true), h: restoredH + 1, channel: "Email" }),
  ];

  const always: Notice[] = [
    { id: "trimming", kind: "update", icon: "tree-pine", tone: "low", title: "Tree Trimming on Your Line", body: `Crews trimmed trees near the lines in ${P.area} to cut storm damage. Your power stayed on.`, day: "Last Week", t: "Last Thu.", h: -100, channel: "Email", defaultRead: true },
    { id: "storm-history", kind: "tip", icon: "gauge", tone: "brand", title: "Your Line’s Storm History", body: `${P.features.circuitStormHits} of the last ${P.features.stormsTotal} storms damaged your circuit. See what raises or lowers your chance.`, day: "Last Week", t: "Last Fri.", h: -76, channel: "Email", defaultRead: true, action: { label: "Why Do You Think That?", kind: "ask", q: "Why do you think that?", intent: "why" } },
    { id: "prefs-saved", kind: "account", icon: "settings", tone: "muted", title: "Alert Preferences Saved", body: `We’ll reach you by ${channelList(s.ch, s) || "no channels"}. You can change this any time.`, day: "Saturday", t: "Sat. 11:20 AM", h: -36.67, channel: "Push", defaultRead: true, action: { label: "Notification Settings", kind: "screen", screen: "notifications" } },
  ];
  if (!anyDeclared(s))
    always.push({ id: "medical-prompt", kind: "account", icon: "heart-pulse", tone: "high", title: "Need Extra Help in an Outage?", body: "Tell us about medical equipment, mobility, hearing or vision needs, or a critical facility. We’ll alert you earlier and reach you the way that works for you. Only you can turn this on.", day: "Saturday", t: "Sat. 12:00 PM", h: -36, channel: "Push", defaultRead: idx > 1, action: { label: "Set It Up", kind: "screen", screen: "notifications" } });

  const feed = [...storm.filter((n): n is Notice => n !== null), ...always].sort((a, b) => b.h - a.h);

  const B = RISK[m.level];
  const riskTone: ToneKey = m.level === "high" || m.level === "critical" ? "high" : m.level === "medium" ? "mid" : "low";
  const status = { label: "View Status", kind: "status" } as const;
  const servicesAction = { label: "Open Services", kind: "screen", screen: "services" } as const;
  const activeBy: Record<typeof sc, Omit<Notice, "day" | "defaultRead">[]> = {
    normal: [],
    watch: [
      { id: "now-watch", kind: "alert", icon: "cloud-lightning", tone: "mid", title: "Watch Alert in Effect", body: estimateLine(m, sc), t: "Mon. 6 PM – Tue. 6 AM", h: 18, action: status },
      { id: "now-risk", kind: "alert", icon: "gauge", tone: riskTone, title: `${B.label} of Losing Power`, body: B.detail, t: "Updated just now", h: 17, action: { label: "Will I Lose Power?", kind: "ask", q: "Will I lose power?", intent: "risk" } },
      ...(s.needs.facility
        ? [{ id: "now-facility", kind: "tip" as const, icon: "building-2" as const, tone: "high" as const, title: "Critical Facility Watch", body: "Review your storm playbook before the winds arrive. We’ll escalate after 4 hours without power.", t: "Updated just now", h: 16.5, action: servicesAction }]
        : []),
    ],
    outage: [
      { id: "now-outage", kind: "alert", icon: "zap-off", tone: "high", title: "Power Outage on Your Line", body: estimateLine(m, sc), t: "Since Mon. 9:40 PM", h: 21.67, action: status },
      { id: "now-wires", kind: "alert", icon: "triangle-alert", tone: "high", title: "Downed Wires in Your Area", body: "Stay at least 30 feet away and call 911 if you see one.", t: "Since Mon. 10:05 PM", h: 22.08 },
      ...(prefs.centerList || s.needs.facility || s.needs.mobility || s.medical
        ? [{ id: "now-help", kind: "tip" as const, icon: "building-2" as const, tone: "brand" as const, title: "Help & Services Nearby", body: s.needs.facility ? "Facility playbook and approximate emergency areas are in Services." : "Warming centers and emergency areas (approximate) are in Services.", t: "Updated just now", h: 22.2, action: servicesAction }]
        : []),
    ],
    restoring: [
      { id: "now-restoring", kind: "alert", icon: "truck", tone: "brand", title: SC.restoring.title, body: estimateLine(m, sc), t: `Updated ${fmt(m.nowH, true)}`, h: m.nowH, action: status },
      ...(s.needs.facility
        ? [{ id: "now-facility-ops", kind: "update" as const, icon: "building-2" as const, tone: "high" as const, title: "Facility Follow-Up Active", body: "AEP’s critical-facility team has your site. Use the playbook for reopen steps.", t: `Updated ${fmt(m.nowH, true)}`, h: m.nowH + 0.05, action: servicesAction }]
        : []),
    ],
    restored: [],
  };
  const active = activeBy[sc].map((n) => ({ ...n, day: "Now", defaultRead: false }));

  return { active, feed };
}

/** Effective read state: the user's choice if they made one, else the item's default. */
export const isRead = (n: Notice, read: Record<string, boolean>) => read[n.id] ?? n.defaultRead;
