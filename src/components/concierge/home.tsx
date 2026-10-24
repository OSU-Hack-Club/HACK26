"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  CalculatorIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  ClockIcon,
  GaugeIcon,
  HouseIcon,
  InfoIcon,
  LightbulbIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
  TargetIcon,
  TriangleAlertIcon,
  TruckIcon,
  WindIcon,
  ZapIcon,
  ZapOffIcon,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  DEF,
  RISK,
  type RiskLevel,
  LEGENDS,
  confText,
  estimateLine,
  eventTitle,
  factors,
  fmt,
  segments,
  tc,
  timeText,
  restoredAt,
  damageText,
  movers,
  moveText,
  stepText,
  weather,
  when,
  whatIfActive,
} from "@/lib/concierge/model";
import { WhatIfControls } from "@/components/concierge/what-if";
import { OutageMap } from "@/components/concierge/outage-map";
import { ChanceBattery, PowerBattery, type PowerState } from "@/components/concierge/power-battery";
import {
  ConfirmedBadge,
  Icon,
  Legend,
  ModelEstimateBadge,
  Panel,
  RiskScale,
  SectionHeader,
  SegmentBar,
} from "@/components/concierge/primitives";
import { DESKTOP, useConcierge, useMediaQuery } from "@/components/concierge/store";

export function useMapTheme() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? "dark" : "light";
}

/** Floating event summary over the map. The whole card opens event details. */
export function EventCard({ className }: { className?: string }) {
  const { state, m, openStatus } = useConcierge();
  const sc = state.scenario;
  return (
    <button
      type="button"
      className={cn(
        "group/event flex cursor-pointer flex-col gap-2.5 rounded-2xl bg-background p-3.5 text-left shadow-[0_0_0_1px_var(--ring-card),var(--shadow-lg)] transition-[background-color,scale] duration-150 hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        openStatus();
      }}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPinIcon size={13} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {m.P.area} · {m.P.id}
        </span>
        <span className="-my-1 flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-brand-ink">
          Details
          <ChevronRightIcon size={14} className="transition-transform group-hover/event:translate-x-0.5" aria-hidden />
        </span>
      </div>
      <div className="text-xl leading-tight font-semibold tracking-[-0.02em] text-pretty">{eventTitle(m, sc)}</div>
      <div className="text-[13px] text-pretty text-muted-foreground">{estimateLine(m, sc)}</div>
      <Legend items={LEGENDS[sc]} />
    </button>
  );
}

/** Keeps the outage zone clear of the frosted header, the event card, and the bottom nav. */
const HERO_EVENT_PADDING = { top: 72, bottom: 300, left: 24, right: 24 };

/**
 * Mobile hero: full-bleed event map with overlays. Drag to pan, pinch to zoom; the page
 * scrolls from the card. Details open from the card or the header status pill.
 */
export function EventMapHero() {
  const { state } = useConcierge();
  const theme = useMapTheme();
  const heroRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const hero = heroRef.current;
    const viewport = hero?.closest<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!hero || !viewport) return;
    const fillViewport = () => {
      hero.style.height = `${viewport.clientHeight}px`;
    };
    fillViewport();
    const observer = new ResizeObserver(fillViewport);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return (
    // Pulls up under the frosted mobile header so the map fills the screen behind it.
    <div ref={heroRef} className="relative -mx-3 -mt-[calc(var(--mobile-header,0px)+0.875rem)] h-[500px] bg-muted">
      <OutageMap
        scenario={state.scenario}
        theme={theme}
        view="event"
        interactive="gestures"
        eventPadding={HERO_EVENT_PADDING}
        className="absolute inset-0 [--map-inset-bottom:var(--mobile-nav,0px)]"
      />
      {/* Sits above the map attribution (bottom-right, 24px tall + 10px margin), which sits
          above the floating bottom nav, so none of the three overlap. */}
      <EventCard className="absolute inset-x-3 bottom-[calc(var(--mobile-nav,0px)+2.75rem)]" />
    </div>
  );
}

export function FallbackCard() {
  const { state, set } = useConcierge();
  return (
    <Panel className="gap-3 px-4 py-5">
      <span className="flex size-10 items-center justify-center rounded-[10px] bg-muted">
        <CircleHelpIcon size={20} />
      </span>
      <div className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-pretty">
        We can’t make a confident call for “{state.unknownId}”.
      </div>
      <p className="text-pretty text-muted-foreground">
        We don’t have enough storm history or network data for this ID, so any number we showed you would be a guess. We’d rather tell you that than make one up.
      </p>
      <div className="flex gap-2.5 rounded-[10px] border px-3 py-2.5 text-destructive">
        <TriangleAlertIcon size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">Safety:</strong> Stay 30 feet from any downed wire and call 911.
        </span>
      </div>
      <Button onClick={() => set({ screen: "location" })} className="h-11 self-start bg-brand px-3.5 text-white hover:bg-brand-hover">
        Choose a Sample Location
        <ArrowRightIcon />
      </Button>
    </Panel>
  );
}

interface KpiRow {
  k: string;
  v: string;
}

/** What a card's modal explains: a plain-language summary, the key facts, and an optional next step. */
interface KpiDetail {
  summary: string;
  rows: KpiRow[];
  note?: string;
  safety?: boolean;
  action?: { label: string; run: () => void };
}

interface Kpi {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  /** Shows the battery glyph on cards about the power itself. */
  power?: PowerState;
  /** Shows the battery glyph for the outage chance; charge drops as the chance rises. */
  chance?: RiskLevel;
  detail: KpiDetail;
}

const CONF_LABEL = { 3: "Quite sure", 2: "Fairly sure", 1: "Less sure" } as const;

export function StatusOverview() {
  const { state, m, set, openStatus } = useConcierge();
  const isDesktop = useMediaQuery(DESKTOP);
  // Keeps the last card's content while the modal animates closed.
  const [active, setActive] = React.useState<{ label: string; open: boolean } | null>(null);
  const sc = state.scenario;
  const B = RISK[m.level];
  const t = timeText(m);
  const dmg = tc(damageText(state));
  const rangeStart = fmt(m.start + m.lo);
  const rangeEnd = fmt(m.start + m.hi);
  // fmt() returns "Tue. 3 PM"; keep AM/PM on both ends of the range.
  const [rangeDay, ...rangeStartTime] = rangeStart.split(" ");
  const [rangeEndDay, ...rangeEndTime] = rangeEnd.split(" ");
  const compactRange = rangeDay === rangeEndDay
    ? `${rangeDay} ${rangeStartTime.join(" ")}–${rangeEndTime.join(" ")}`
    : `${rangeStart}–${rangeEnd}`;
  const close = () => setActive((a) => (a ? { ...a, open: false } : a));
  const then = (fn: () => void) => () => {
    close();
    fn();
  };
  const seeStatus = { label: "See Full Status", run: then(openStatus) };
  const seeFactors = (label: string) => ({ label, run: then(() => set({ factorsOpen: true })) });
  const steps = segments(m, state).map((sg) => ({ k: sg.label, v: sg.hText }));

  const sets: Record<typeof sc, Kpi[]> = {
    normal: [
      {
        icon: GaugeIcon, label: "Outage Chance", value: RISK.minimal.short, color: "var(--low-ink)", chance: "minimal",
        detail: {
          summary: `${RISK.minimal.detail} There are no storms in the forecast this week.`,
          rows: [{ k: "Forecast", v: "No storms this week" }, { k: "Your line", v: m.P.circuit }],
          note: "We’ll message you as soon as a storm heads your way.",
          action: seeFactors("See Your Line at a Glance"),
        },
      },
      {
        icon: ZapIcon, label: "Your Power", value: "On", color: "var(--low-ink)", power: "on",
        detail: {
          summary: "Your power is on and there are no outages reported on your line.",
          rows: [{ k: "Your line", v: m.P.circuit }, { k: "Outages nearby", v: "None" }, { k: "Last checked", v: "Just now" }],
          action: seeStatus,
        },
      },
    ],
    watch: [
      {
        icon: GaugeIcon, label: "Outage Chance", value: B.short, color: B.ink, chance: m.level,
        detail: {
          summary: B.detail,
          rows: [{ k: "Storm", v: "Mon. 6 PM – Tue. 6 AM" }, { k: "Gusts", v: `Up to ${state.wind} mph` }, { k: "How sure we are", v: CONF_LABEL[m.conf] }],
          note: confText(m),
          action: seeFactors("See Why We Think So"),
        },
      },
      {
        icon: ClockIcon, label: "Estimated Duration", value: `${m.lo}–${m.hi} Hours`, color: "var(--foreground)",
        detail: {
          summary: `If your power goes out in this storm, it would most likely be out for ${t.hours}. Plan to be without power until ${t.plan}.`,
          rows: steps,
          note: "Crews can’t safely work in high winds, so repairs start once gusts calm down.",
          action: seeStatus,
        },
      },
      {
        icon: TruckIcon, label: "Crews Ready", value: "6 Crews", color: "var(--foreground)",
        detail: {
          summary: "AEP is staging 6 crews nearby before the storm, so repairs can start as soon as it’s safe.",
          rows: [{ k: "Crews staged", v: "6" }, { k: "Ready by", v: "Monday" }, { k: "Where", v: `Near ${m.P.area}` }],
          note: "Staged crews don’t mean your power will go out. They shorten the wait if it does.",
        },
      },
      {
        icon: WindIcon, label: "Storm Arrives", value: "Mon. 6 PM", color: "var(--mid-ink)",
        detail: {
          summary: `The National Weather Service issued a wind advisory for your area, with gusts up to ${state.wind} mph.`,
          rows: [{ k: "Starts", v: "Mon. 6 PM" }, { k: "Ends", v: "Tue. 6 AM" }, { k: "Gusts", v: `Up to ${state.wind} mph` }],
          note: "Before 6 PM, secure loose items outside and charge your phone and devices.",
        },
      },
    ],
    outage: [
      {
        icon: ZapOffIcon, label: "Status", value: "Power Out", color: "var(--high-ink)", power: "out",
        detail: {
          summary: "Your power has been out since 9:40 PM Monday. About 1,240 homes on your line are affected, so you don’t need to report it.",
          rows: [{ k: "Out since", v: "Mon. 9:40 PM" }, { k: "Cause", v: "Fallen trees" }, { k: "Damage", v: dmg }],
          safety: true,
          action: seeStatus,
        },
      },
      {
        icon: ClockIcon, label: "Likely Back", value: compactRange, color: "var(--foreground)",
        detail: {
          summary: `Your power will most likely be back ${t.likely}, ${t.range}. Plan to be without power until ${t.plan}.`,
          rows: steps,
          note: confText(m),
          action: seeStatus,
        },
      },
      {
        icon: HouseIcon, label: "Homes Out Nearby", value: "1,240", color: "var(--foreground)",
        detail: {
          summary: "About 1,240 homes on your line lost power at the same time. It isn’t just your home, and AEP already knows.",
          rows: [{ k: "Homes out", v: "1,240" }, { k: "Your line", v: m.P.circuit }, { k: "Need to report it?", v: "No" }],
          action: seeStatus,
        },
      },
      {
        icon: TruckIcon, label: "Crews", value: "2 Assigned", color: "var(--foreground)",
        detail: {
          summary: "2 crews are assigned to your line and heading to the damage.",
          rows: [{ k: "Crews assigned", v: "2" }, { k: "Repairing", v: dmg }, { k: "Road access", v: tc(state.access) }],
          note: "Repair time depends on how fast crews can reach the damage and what they find there.",
          action: seeStatus,
        },
      },
    ],
    restoring: [
      {
        icon: ClockIcon, label: "New Estimate", value: tc(when(m.start + m.mid)), color: "var(--brand-ink)",
        detail: {
          summary: `Crews are on site, so we updated the estimate: most likely back ${t.likely}, ${t.range}.`,
          rows: [{ k: "Window", v: compactRange }, ...steps],
          action: seeStatus,
        },
      },
      {
        icon: HouseIcon, label: "Still Out", value: "410 Homes", color: "var(--foreground)",
        detail: {
          summary: "Power has been rerouted to 830 homes upstream of you. About 410 homes, including yours, are still out.",
          rows: [{ k: "Restored", v: "830 homes" }, { k: "Still out", v: "410 homes" }, { k: "Total affected", v: "1,240 homes" }],
          action: seeStatus,
        },
      },
      {
        icon: TruckIcon, label: "Crews", value: "3 On Site", color: "var(--foreground)",
        detail: {
          summary: "3 crews are on site near your street, working on the last repairs before your power comes back.",
          rows: [{ k: "Crews on site", v: "3" }, { k: "Repairing", v: dmg }, { k: "On site since", v: fmt(m.nowH, true) }],
          action: seeStatus,
        },
      },
      {
        icon: ZapIcon, label: "Your Power", value: "Restoring", color: "var(--brand-ink)", power: "restoring",
        detail: {
          summary: "Your power isn’t back yet, but crews are fixing the damage near your street.",
          rows: [{ k: "Out since", v: "Mon. 9:40 PM" }, { k: "Most likely back", v: tc(t.likely) }],
          safety: true,
          action: seeStatus,
        },
      },
    ],
    restored: [
      {
        icon: ZapIcon, label: "Back On", value: restoredAt(m), color: "var(--low-ink)", power: "restored",
        detail: {
          summary: `AEP confirmed your power came back at ${restoredAt(m)}.`,
          rows: [{ k: "Went out", v: "Mon. 9:40 PM" }, { k: "Back on", v: restoredAt(m) }, { k: "Repaired", v: dmg }],
          note: "Still out? The wire to your home may need its own repair. Report it from the home screen.",
        },
      },
      {
        icon: TargetIcon, label: "Our Estimate", value: "On Target", color: "var(--foreground)",
        detail: {
          summary: estimateLine(m, sc),
          rows: [{ k: "We estimated", v: compactRange }, { k: "Power came back", v: restoredAt(m) }],
          action: seeStatus,
        },
      },
    ],
  };

  const shown = active && sets[sc].find((k) => k.label === active.label);
  const onOpenChange = (open: boolean) => {
    if (!open) close();
  };

  return (
    <>
      <SectionHeader>Status Overview</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        {sets[sc].map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => setActive({ label: k.label, open: true })}
            className="flex cursor-pointer flex-col gap-1.5 rounded-[14px] bg-card px-3.5 py-3 text-left text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted"
          >
            <KpiLabel k={k} />
            <span className="text-xl leading-tight font-semibold tracking-[-0.02em] text-pretty" style={{ color: k.color }}>
              {k.value}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!active?.open && isDesktop} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">{shown && <KpiDetailBody k={shown} titleAs={DialogTitle} />}</DialogContent>
      </Dialog>
      <Drawer open={!!active?.open && !isDesktop} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[20px] shadow-[var(--shadow-lg)]">
          <div className="flex shrink-0 justify-center pt-2">
            <span className="h-[5px] w-11 rounded-full bg-muted" />
          </div>
          <div className="min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{shown && <KpiDetailBody k={shown} titleAs={DrawerTitle} />}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function KpiLabel({ k }: { k: Kpi }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {k.chance ? (
        <ChanceBattery level={k.chance} className="-my-1" />
      ) : k.power ? (
        <PowerBattery state={k.power} className="-my-1" />
      ) : (
        <k.icon size={13} aria-hidden />
      )}
      {k.label}
    </span>
  );
}

function KpiDetailBody({ k, titleAs: Title }: { k: Kpi; titleAs: React.ElementType }) {
  const d = k.detail;
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1.5 pr-8">
        <KpiLabel k={k} />
        <Title className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-pretty" style={{ color: k.color }}>
          {k.value}
        </Title>
      </div>
      <p className="text-pretty">{d.summary}</p>
      {d.rows.length > 0 && (
        <dl className="flex flex-col rounded-[12px] bg-muted/60 px-3.5">
          {d.rows.map((r) => (
            <div key={r.k} className="flex items-baseline gap-3 border-t py-2.5 text-[13px] first:border-t-0">
              <dt className="flex-1 text-pretty text-muted-foreground">{r.k}</dt>
              <dd className="text-right font-semibold tabular-nums">{r.v}</dd>
            </div>
          ))}
        </dl>
      )}
      {d.note && (
        <div className="flex gap-2 text-[13px] text-muted-foreground">
          <InfoIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span className="text-pretty">{d.note}</span>
        </div>
      )}
      {d.safety && <SafetyNote />}
      {d.action && (
        <Button variant="outline" onClick={d.action.run} className="h-11 justify-between px-3.5">
          {d.action.label}
          <ArrowRightIcon />
        </Button>
      )}
    </div>
  );
}

export function Weather() {
  const { state } = useConcierge();
  const wx = weather(state.scenario, state.wind);
  return (
    <>
      <SectionHeader>Weather</SectionHeader>
      <Panel className="flex-row items-center gap-3 px-4 py-3">
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon name={wx.icon} size={16} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-muted-foreground">Conditions</span>
          <span className="font-medium">{wx.label}</span>
        </div>
      </Panel>
    </>
  );
}

export function SafetyNote() {
  return (
    <div className="flex gap-2.5 rounded-[10px] bg-high-bg px-3 py-2.5 text-high-ink">
      <TriangleAlertIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span className="text-pretty">
        <strong className="font-semibold">Safety:</strong> Stay 30 feet from downed wires, even if they look dead. Call 911.
      </span>
    </div>
  );
}

export function WhatHappened() {
  const { state } = useConcierge();
  const sc = state.scenario;
  if (sc !== "outage" && sc !== "restoring") return null;
  return (
    <>
      <SectionHeader>What Happened</SectionHeader>
      <Panel className="gap-2.5 p-4">
        <ConfirmedBadge scenario={sc} />
        <div className="text-[17px] leading-snug font-semibold text-pretty">
          {sc === "restoring" ? "Crews Are Fixing the Damage Near Your Street" : "Fallen Trees Brought Down Wires on Your Line"}
        </div>
        <p className="text-pretty text-muted-foreground">
          {sc === "restoring"
            ? "Power has been rerouted to homes upstream of you. The remaining repairs are the last step before your power comes back."
            : `About 1,240 homes are out, so it isn’t just you, and you don’t need to report it. Crews have reported ${damageText(DEF)}.`}
        </p>
        <SafetyNote />
      </Panel>
    </>
  );
}

export function NeedHelp() {
  const { state, flash } = useConcierge();
  if (state.scenario !== "restored") return null;
  return (
    <>
      <SectionHeader>Need Help?</SectionHeader>
      <Panel className="gap-2.5 p-4">
        <div className="text-base font-semibold">Still in the Dark?</div>
        <p className="text-pretty text-muted-foreground">
          If your neighbors have power and you don’t, the wire to your house may be damaged. That needs its own repair, so let us know.
        </p>
        <Button variant="outline" onClick={() => flash("Got it. A crew will check the line to your home.")} className="h-11 self-start px-3.5">
          Report My Home Is Still Out
          <ArrowRightIcon />
        </Button>
      </Panel>
    </>
  );
}

function AccordionRow({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <CollapsibleTrigger className="group/acc flex w-full cursor-pointer items-center gap-2 border-t px-4 py-3 text-left font-medium">
      {icon}
      <span className="flex-1">{children}</span>
      <ChevronDownIcon size={16} className="transition-transform duration-200 group-data-panel-open/acc:rotate-180" aria-hidden />
    </CollapsibleTrigger>
  );
}

export function OutageRisk() {
  const { state, m, set } = useConcierge();
  const sc = state.scenario;
  if (sc !== "normal" && sc !== "watch") return null;
  const B = RISK[m.level];
  const list = factors(m, sc);
  return (
    <>
      <SectionHeader>Outage Risk</SectionHeader>
      <Panel>
        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] font-medium text-muted-foreground">
              {sc === "normal" ? "Your Outage Chance This Week" : "Will I Lose Power Monday Night?"}
            </span>
          </div>
          <div className="text-2xl leading-[1.15] font-semibold tracking-[-0.025em] text-pretty">
            {sc === "normal" ? "Very Unlikely: No Storms in the Forecast" : B.label}
          </div>
          <RiskScale level={m.level} />
          <p className="text-[13px] text-pretty text-muted-foreground">
            {sc === "normal"
              ? "We’ll message you as soon as a storm heads your way."
              : B.detail}
          </p>
        </div>
        <Collapsible open={state.factorsOpen} onOpenChange={(open) => set({ factorsOpen: open })}>
          <AccordionRow icon={sc !== "normal" ? <LightbulbIcon size={15} aria-hidden /> : undefined}>
            {sc === "normal" ? "Your Line at a Glance" : "Why We Think So"}
          </AccordionRow>
          <CollapsibleContent>
            {list.map((f) => (
              <div key={f.t} className="flex gap-3 border-t px-4 py-3">
                <span
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-lg"
                  style={{ background: f.up ? "var(--high-bg)" : "var(--low-bg)", color: f.up ? "var(--high-ink)" : "var(--low-ink)" }}
                >
                  <Icon name={f.icon} size={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="leading-snug font-medium text-pretty">
                    {f.t}
                    <span className="sr-only"> ({f.effect})</span>
                  </span>
                  <span className="text-[13px] text-pretty text-muted-foreground">{f.d}</span>
                </div>
              </div>
            ))}
            <div className="flex gap-2 border-t px-4 pt-3 pb-3.5 text-[13px] text-muted-foreground">
              <GaugeIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span className="text-pretty">{confText(m)}</span>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Panel>
    </>
  );
}

export function RestorationEstimate() {
  const { state, m, set } = useConcierge();
  const sc = state.scenario;
  if (sc !== "watch" && sc !== "outage" && sc !== "restoring") return null;
  const t = timeText(m);
  const segs = segments(m, state);
  const hasDelta = Math.abs(m.delta) >= 0.5;
  const later = m.delta > 0;
  const active = whatIfActive(state);
  const moves = movers(m, state);
  return (
    <>
      <SectionHeader>Restoration Estimate</SectionHeader>
      <Panel>
        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] font-medium text-muted-foreground">
              {sc === "watch" ? "If the Power Goes Out" : sc === "restoring" ? "Updated Estimate" : "When Will It Be Back?"}
            </span>
            <ModelEstimateBadge whatIf={active} />
          </div>
          <div className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-pretty">Plan to Be Without Power Until {t.plan}</div>
          <p className="text-[13px] text-pretty text-muted-foreground">
            Most likely back {t.likely}, {t.range} (about {t.hours}).
          </p>
          <SegmentBar segs={segs} />
          {segs.map((sg) => (
            <div key={sg.label} className="flex items-start gap-2.5 text-[13px]">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: sg.color, opacity: sg.op }} />
              <span className="flex-1 text-pretty">{sg.label}</span>
              <span className="font-semibold tabular-nums">{sg.hText}</span>
            </div>
          ))}
          {hasDelta && (
            <div
              className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium"
              style={{ background: later ? "var(--high-bg)" : "var(--low-bg)", color: later ? "var(--high-ink)" : "var(--low-ink)" }}
            >
              <Icon name={later ? "trending-up" : "trending-down"} size={15} />
              {Math.round(Math.abs(m.delta)) || "<1"} h {later ? "later" : "sooner"} than {sc === "watch" ? "with typical damage" : "with the reported damage"}
            </div>
          )}
          {m.e.stepped && <p className="text-[13px] text-pretty text-muted-foreground">{stepText(m, state)}</p>}
        </div>
        {moves.length > 0 && (
          <div className="flex flex-col gap-2 border-t px-4 pt-3 pb-3.5">
            <span className="text-[13px] font-medium text-muted-foreground">What Could Change It</span>
            {moves.map((mv) => (
              <div key={mv.t} className="flex items-center gap-2.5 text-[13px]">
                <Icon name={mv.icon} size={15} className="text-muted-foreground" />
                <span className="flex-1 text-pretty">{mv.t}</span>
                <span className="font-semibold tabular-nums" style={{ color: mv.h > 0 ? "var(--high-ink)" : "var(--low-ink)" }}>
                  {moveText(mv.h)}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => set({ screen: "help", helpFrom: "home" })}
          className="flex w-full cursor-pointer items-center gap-2 border-t px-4 py-3 text-left font-medium transition-colors hover:bg-muted"
        >
          <CalculatorIcon size={15} aria-hidden />
          <span className="flex-1">How We Calculated This</span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
      </Panel>
    </>
  );
}

/** Customer-facing scenario explorer: change the damage, crews or roads and watch the estimate respond. */
export function RestorationExplorer() {
  const { state, m } = useConcierge();
  const sc = state.scenario;
  if (sc !== "watch" && sc !== "outage" && sc !== "restoring") return null;
  const t = timeText(m);
  const active = whatIfActive(state);
  const hasDelta = Math.abs(m.delta) >= 0.5;
  const later = m.delta > 0;
  return (
    <>
      <SectionHeader>Restoration Explorer</SectionHeader>
      <Panel>
        {/* Live result, so the response is visible next to the controls without scrolling back up. */}
        <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3" aria-live="polite">
          <div className="flex items-center gap-2">
            <SlidersHorizontalIcon size={15} className="text-muted-foreground" aria-hidden />
            <span className="flex-1 text-[13px] font-medium text-muted-foreground">{active ? "With Your Changes" : "Starting Point"}</span>
            <ModelEstimateBadge whatIf={active} />
          </div>
          <div className="text-[19px] leading-tight font-semibold tracking-[-0.01em] text-pretty">Back {t.range}</div>
          <p className="text-[13px] text-pretty text-muted-foreground">
            About {t.hours}
            {hasDelta && (
              <>
                {" · "}
                <span className="font-medium" style={{ color: later ? "var(--high-ink)" : "var(--low-ink)" }}>
                  {Math.round(Math.abs(m.delta)) || "<1"} h {later ? "later" : "sooner"}
                </span>
              </>
            )}
          </p>
        </div>
        <WhatIfControls />
      </Panel>
    </>
  );
}

export function Footnote() {
  return (
    <div className="flex gap-2 px-1 text-xs text-muted-foreground">
      <InfoIcon size={14} className="mt-px shrink-0" aria-hidden />
      <span className="text-pretty">Estimates come from a model using past storms and AEP’s labor standards. Your home is shown only as an approximate area.</span>
    </div>
  );
}

/** Everything on the home screen below the map. */
export function DashboardSections() {
  return (
    <>
      <StatusOverview />
      <Weather />
      <WhatHappened />
      <NeedHelp />
      <OutageRisk />
      <RestorationEstimate />
      <RestorationExplorer />
      <Footnote />
    </>
  );
}
