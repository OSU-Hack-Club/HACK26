"use client";

import { ArrowRightIcon, SparklesIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LEGENDS, SC, estimateLine, facts, statusLabel, timeline } from "@/lib/concierge/model";
import { OutageMap } from "@/components/concierge/outage-map";
import { useMapTheme } from "@/components/concierge/home";
import { ConfirmedBadge, Dot, Icon, Legend, Panel, SectionHeader, toneOf } from "@/components/concierge/primitives";
import { useConcierge } from "@/components/concierge/store";

export function StatusHeader({ titleAs: Title = "span" }: { titleAs?: React.ElementType }) {
  const { state, m, closeSheets } = useConcierge();
  const sc = state.scenario;
  const tone = toneOf(sc);
  return (
    <div className="flex shrink-0 items-start gap-2.5 border-b pt-2 pr-2 pb-3 pl-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="inline-flex h-6 items-center gap-1.5 self-start rounded-full px-2.5 text-xs font-semibold" style={{ background: tone.bg, color: tone.ink }}>
          <Dot color={tone.c} />
          {statusLabel(sc)}
        </span>
        <Title className="text-xl leading-tight font-semibold tracking-[-0.02em] text-pretty">{SC[sc].title}</Title>
        <span className="text-xs text-muted-foreground">Updated {timeline(m, sc)[0].t}</span>
      </div>
      <Button variant="ghost" size="icon" className="size-10 rounded-[10px]" onClick={closeSheets} aria-label="Close">
        <XIcon className="size-[18px]" />
      </Button>
    </div>
  );
}

/** Body of the status sheet: map, confirmed facts, model estimate, timeline. */
export function StatusBody({ showMap = true }: { showMap?: boolean }) {
  const { state, m, ask } = useConcierge();
  const sc = state.scenario;
  const theme = useMapTheme();
  const tone = toneOf(sc);
  const events = timeline(m, sc);
  const askAbout = () =>
    sc === "normal" || sc === "watch"
      ? ask("Will I lose power?", "risk")
      : ask(sc === "restored" ? "When did it come back?" : "When will it be back?", "time");

  return (
    <div className="flex flex-col gap-3 p-3">
      {showMap && (
        <>
          <SectionHeader className="pt-0">Outage Map</SectionHeader>
          <Panel className="overflow-hidden">
            {/* Let the map own drag gestures instead of the drawer's swipe-to-close. */}
            <div data-base-ui-swipe-ignore="">
              <OutageMap scenario={sc} theme={theme} view="circuit" interactive className="h-[300px]" />
            </div>
            <Legend items={LEGENDS[sc]} className="gap-x-3.5 border-t px-3.5 py-2.5" />
          </Panel>
        </>
      )}

      <div className="flex items-center gap-2.5 px-1 pt-2.5">
        <ConfirmedBadge scenario={sc} large />
        <span className="h-px flex-1 bg-border" />
      </div>
      <Panel className="overflow-hidden">
        {facts(m, state).map((f, i) => (
          <div key={i} className="flex gap-3 border-t px-3.5 py-2.5 first:border-t-0">
            <Icon name={f.icon} size={16} className="mt-0.5" />
            <span className="flex-1 text-pretty">{f.v}</span>
          </div>
        ))}
      </Panel>

      <SectionHeader>Our Estimate</SectionHeader>
      <div className="flex flex-col gap-1 rounded-[14px] bg-brand-soft p-3.5 text-brand-ink">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <SparklesIcon size={13} aria-hidden />
          Model Estimate
        </span>
        <span className="text-base leading-snug font-semibold text-pretty">{estimateLine(m, sc)}</span>
      </div>

      <SectionHeader>Updates</SectionHeader>
      <Panel className="px-3.5 pt-3.5 pb-1">
        <ol>
          {events.map((ev, i) => (
            <li key={ev.title} className="flex gap-3">
              <div className="flex w-3 shrink-0 flex-col items-center">
                <span
                  className="mt-[5px] size-2.5 rounded-full"
                  style={{ background: i === 0 ? tone.c : "var(--chart-1)", boxShadow: `0 0 0 3px ${i === 0 ? tone.bg : "transparent"}` }}
                />
                {i < events.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border" />}
              </div>
              <div className="flex flex-1 flex-col pb-3">
                <span className={i === 0 ? "font-semibold" : undefined}>{ev.title}</span>
                <span className="text-xs text-muted-foreground">{ev.t}</span>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Button onClick={askAbout} className="h-[46px] justify-start gap-2 rounded-[10px] bg-brand px-3.5 text-white hover:bg-brand-hover">
        <SparklesIcon />
        <span className="flex-1 text-left">Ask About This</span>
        <ArrowRightIcon />
      </Button>
    </div>
  );
}
