"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  ClockIcon,
  GaugeIcon,
  HouseIcon,
  InfoIcon,
  LightbulbIcon,
  MapPinIcon,
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
import {
  RISK,
  LEGENDS,
  SC,
  confText,
  estimateLine,
  factors,
  fmt,
  segments,
  tc,
  timeText,
  restoredAt,
  damageText,
  weather,
  when,
} from "@/lib/concierge/model";
import { OutageMap } from "@/components/concierge/outage-map";
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
import { useConcierge } from "@/components/concierge/store";

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
        "flex cursor-pointer flex-col gap-2.5 rounded-2xl bg-background p-3.5 text-left shadow-[0_0_0_1px_var(--ring-card),var(--shadow-lg)] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        openStatus();
      }}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPinIcon size={13} aria-hidden />
        {m.P.area} · {m.P.id}
      </div>
      <div className="text-xl leading-tight font-semibold tracking-[-0.02em] text-pretty">{SC[sc].title}</div>
      <div className="text-[13px] text-pretty text-muted-foreground">{estimateLine(m, sc)}</div>
      <Legend items={LEGENDS[sc]} />
    </button>
  );
}

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
    <div ref={heroRef} className="relative -mx-3 -mt-3.5 h-[500px] bg-muted">
      <OutageMap scenario={state.scenario} theme={theme} view="event" interactive="gestures" className="absolute inset-0" />
      {/* Sits above the map attribution (bottom-right, ~34px tall) so the two never overlap. */}
      <EventCard className="absolute inset-x-3 bottom-11" />
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

interface Kpi {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  color: string;
  onClick: () => void;
}

export function StatusOverview() {
  const { state, m, set, openStatus } = useConcierge();
  const sc = state.scenario;
  const B = RISK[m.level];
  const wx = weather(sc, state.wind);
  const t = timeText(m);
  const range = `${fmt(m.start + m.lo)}–${fmt(m.start + m.hi).slice(4)}`;
  const rangeStart = fmt(m.start + m.lo);
  const rangeEnd = fmt(m.start + m.hi);
  const [rangeDay, rangeStartTime] = rangeStart.split(" ");
  const [, rangeEndTime] = rangeEnd.split(" ");
  const rangeStartAmPm = rangeStartTime.slice(-2);
  const rangeEndAmPm = rangeEndTime.slice(-2);
  const compactRange = rangeStart.slice(0, 3) === rangeEnd.slice(0, 3)
    ? `${rangeDay}, ${rangeStartTime.slice(0, -3)}${rangeStartAmPm === rangeEndAmPm ? "" : ` ${rangeStartAmPm}`}–${rangeEndTime}`
    : `${rangeStart}–${rangeEnd}`;
  const openFactors = () => set({ factorsOpen: true });

  const sets: Record<typeof sc, Kpi[]> = {
    normal: [
      { icon: GaugeIcon, label: "Outage Chance", value: RISK.minimal.short, sub: "No storms this week", color: "var(--low-ink)", onClick: openFactors },
      { icon: ZapIcon, label: "Your Power", value: "On", sub: "No outages on your line", color: "var(--low-ink)", onClick: openStatus },
    ],
    watch: [
      { icon: GaugeIcon, label: "Outage Chance", value: B.short, sub: B.label, color: B.ink, onClick: openFactors },
      { icon: ClockIcon, label: "If It Goes Out", value: `Until ${fmt(m.start + m.hi)}`, sub: `About ${t.hours}`, color: "var(--foreground)", onClick: openStatus },
      { icon: TruckIcon, label: "Crews Ready", value: "6 Crews", sub: "Staged nearby Monday", color: "var(--foreground)", onClick: openStatus },
      { icon: WindIcon, label: "Storm Arrives", value: "Mon 6 PM", sub: "Through Tue 6 AM", color: "var(--mid-ink)", onClick: openStatus },
    ],
    outage: [
      { icon: ZapOffIcon, label: "Status", value: "Power Out", sub: "Since Mon 9:40 PM", color: "var(--high-ink)", onClick: openStatus },
      { icon: ClockIcon, label: "Likely Back", value: compactRange, sub: m.conf === 3 ? "Quite sure" : m.conf === 2 ? "Fairly sure" : "Less sure", color: "var(--foreground)", onClick: openStatus },
      { icon: HouseIcon, label: "Homes Out Nearby", value: "1,240", sub: "On your line", color: "var(--foreground)", onClick: openStatus },
      { icon: TruckIcon, label: "Crews", value: "2 Assigned", sub: "Heading to the damage", color: "var(--foreground)", onClick: openStatus },
    ],
    restoring: [
      { icon: ClockIcon, label: "New Estimate", value: tc(when(m.start + m.mid)), sub: range, color: "var(--brand-ink)", onClick: openStatus },
      { icon: HouseIcon, label: "Still Out", value: "410 Homes", sub: "830 restored so far", color: "var(--foreground)", onClick: openStatus },
      { icon: TruckIcon, label: "Crews", value: "3 On Site", sub: "Near your street", color: "var(--foreground)", onClick: openStatus },
      { icon: ZapOffIcon, label: "Status", value: "Power Out", sub: "Since Mon 9:40 PM", color: "var(--high-ink)", onClick: openStatus },
    ],
    restored: [
      { icon: ZapIcon, label: "Back On", value: restoredAt(m), sub: "Confirmed by AEP", color: "var(--low-ink)", onClick: openStatus },
      { icon: TargetIcon, label: "Our Estimate", value: "On Target", sub: `We said ${range}`, color: "var(--foreground)", onClick: openStatus },
    ],
  };

  return (
    <>
      <SectionHeader>Status Overview</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        {sets[sc].map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            className="flex min-h-[104px] cursor-pointer flex-col gap-0.5 rounded-[14px] bg-card px-3.5 py-3 text-left text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <k.icon size={13} aria-hidden />
              {k.label}
            </span>
            <span className="mt-auto text-xl leading-tight font-semibold tracking-[-0.02em] text-pretty" style={{ color: k.color }}>
              {k.value}
            </span>
            <span className="text-xs text-muted-foreground">{k.sub}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Icon name={wx.icon} size={14} aria-hidden />
        <span><span className="font-medium text-foreground">Conditions</span> · {wx.label}</span>
      </div>
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
            : `About 1,240 homes are out, so it isn’t just you, and you don’t need to report it. Crews have reported ${damageText(state)}.`}
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
                  <Icon name={f.up ? "trending-up" : "trending-down"} size={15} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="leading-snug font-medium text-pretty">{f.t}</span>
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
  const { state, m } = useConcierge();
  const sc = state.scenario;
  if (sc !== "watch" && sc !== "outage" && sc !== "restoring") return null;
  const t = timeText(m);
  const segs = segments(m, state);
  const hasDelta = Math.abs(m.delta) >= 0.5;
  const later = m.delta > 0;
  return (
    <>
      <SectionHeader>Restoration Estimate</SectionHeader>
      <Panel>
        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] font-medium text-muted-foreground">
              {sc === "watch" ? "If the Power Goes Out" : sc === "restoring" ? "Updated Estimate" : "When Will It Be Back?"}
            </span>
            <ModelEstimateBadge />
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
              {Math.round(Math.abs(m.delta)) || "<1"} h {later ? "later" : "sooner"} than the starting estimate
            </div>
          )}
        </div>
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
      <WhatHappened />
      <NeedHelp />
      <OutageRisk />
      <RestorationEstimate />
      <Footnote />
    </>
  );
}
