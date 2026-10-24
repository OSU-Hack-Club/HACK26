"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  Building2Icon,
  ChevronLeftIcon,
  MapPinIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  emergencyServices,
  facilityPlaybook,
  servicesSummary,
  stormCenters,
  type FacilityStep,
  type NearbyService,
} from "@/lib/concierge/services";
import { Icon, Panel, SectionHeader } from "@/components/concierge/primitives";
import { useConcierge, type Screen } from "@/components/concierge/store";

function BackButton({ to, label }: { to: Screen; label: string }) {
  const { set } = useConcierge();
  return (
    <Button variant="ghost" onClick={() => set({ screen: to })} className="h-9 gap-0.5 self-start rounded-[10px] pr-2.5 pl-1.5 text-sm">
      <ChevronLeftIcon className="size-[18px]" />
      {label}
    </Button>
  );
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="px-1 text-[26px] font-semibold tracking-[-0.025em]">{children}</h1>;
}

function ServiceRow({ s }: { s: NearbyService }) {
  return (
    <div className="flex items-start gap-3 border-t px-3.5 py-3 first:border-t-0">
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink">
        <Icon name={s.icon} size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-pretty">{s.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon size={12} aria-hidden />
          {s.area} · {s.distance}
        </span>
        {s.hours && <span className="text-xs text-pretty text-muted-foreground">{s.hours}</span>}
        <span className="text-xs text-pretty text-muted-foreground">{s.note}</span>
        {s.fromData && (
          <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            From challenge data · ~1 km area
          </span>
        )}
      </span>
    </div>
  );
}

function PlaybookRow({ step, highlight }: { step: FacilityStep; highlight: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 border-t px-3.5 py-3 first:border-t-0", highlight && "bg-brand-soft/40")}>
      <span
        className={cn(
          "flex size-[34px] shrink-0 items-center justify-center rounded-[10px]",
          highlight ? "bg-brand text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon name={step.icon} size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-pretty">{step.title}</span>
          {highlight && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">Now</span>
          )}
        </span>
        <span className="text-xs text-pretty text-muted-foreground">{step.detail}</span>
      </span>
    </div>
  );
}

/** Home teaser that opens the Services screen. */
export function ServicesTeaser({ className }: { className?: string }) {
  const { state, m, set } = useConcierge();
  const sc = state.scenario;
  if (sc === "normal" && !state.needs.facility && !state.medical && !state.needs.mobility) return null;
  const summary = servicesSummary(state, sc, m.P.area);
  const IconTile: LucideIcon = state.needs.facility ? Building2Icon : MapPinIcon;
  return (
    <>
      <SectionHeader>Nearby Help</SectionHeader>
      <button
        type="button"
        onClick={() => set({ screen: "services", servicesFrom: "home" })}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-[14px] bg-card p-3.5 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted",
          className,
        )}
      >
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink">
          <IconTile size={17} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{summary.title}</span>
          <span className="text-xs text-pretty text-muted-foreground">{summary.body}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-ink">
            Open Services
            <ArrowRightIcon size={13} aria-hidden />
          </span>
        </span>
      </button>
    </>
  );
}

export function ServicesScreen() {
  const { state, m, set, ask } = useConcierge();
  const sc = state.scenario;
  const summary = servicesSummary(state, sc, m.P.area);
  const emergency = emergencyServices();
  const centers = stormCenters(m.P.area, sc);
  const playbook = state.needs.facility ? facilityPlaybook(sc) : [];
  const phase = sc === "normal" || sc === "watch" ? "before" : sc === "restored" ? "after" : "during";
  const back =
    state.servicesFrom === "settings"
      ? { to: "settings" as const, label: "Settings" }
      : state.servicesFrom === "notifications"
        ? { to: "notifications" as const, label: "Notifications" }
        : { to: "home" as const, label: "Home" };

  return (
    <>
      <BackButton to={back.to} label={back.label} />
      <PageTitle>Services</PageTitle>

      <div className="flex flex-col gap-2 rounded-[14px] bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2Icon size={15} aria-hidden />
          {summary.title}
        </div>
        <p className="text-[13px] text-pretty text-muted-foreground">{summary.body}</p>
        {!state.needs.facility && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-9 self-start"
            onClick={() => set({ screen: "notifications", servicesFrom: "home" })}
          >
            Declare a Critical Facility
            <ArrowRightIcon />
          </Button>
        )}
      </div>

      {state.needs.facility && (
        <>
          <SectionHeader>Critical Facility Playbook</SectionHeader>
          <Panel className="overflow-hidden">
            {playbook.map((step) => (
              <PlaybookRow key={step.id} step={step} highlight={step.when === phase} />
            ))}
          </Panel>
          <p className="-mt-1 px-1 text-xs text-pretty text-muted-foreground">
            Declared by you in Notifications. Never inferred from account or life-support fields, and never shown on the map.
          </p>
        </>
      )}

      {centers.length > 0 && (
        <>
          <SectionHeader>Warming &amp; Cooling Centers</SectionHeader>
          <Panel className="overflow-hidden">
            {centers.map((s) => (
              <ServiceRow key={s.id} s={s} />
            ))}
          </Panel>
        </>
      )}

      <SectionHeader>Emergency Services Nearby</SectionHeader>
      <Panel className="overflow-hidden">
        {emergency.length ? (
          emergency.map((s) => <ServiceRow key={s.id} s={s} />)
        ) : (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No public emergency areas in this extract.</p>
        )}
      </Panel>

      <SectionHeader>Privacy</SectionHeader>
      <Panel className="gap-2 px-4 py-3.5 text-[13px] text-pretty">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheckIcon size={15} aria-hidden />
          What We Never Show
        </div>
        <p className="text-muted-foreground">
          Hospitals, fire and ambulance appear only as general ~1 km areas from public priority-location data. We never plot life-support
          customers, exact facility addresses, or crew locations.
        </p>
      </Panel>

      <div className="flex flex-wrap gap-2 px-1 pt-1">
        <Button variant="outline" className="h-10" onClick={() => ask("What should I do?", "prep")}>
          Preparation Steps
        </Button>
        <Button variant="outline" className="h-10" onClick={() => set({ screen: "notifications", servicesFrom: "home" })}>
          Advanced Alerts
        </Button>
      </div>
    </>
  );
}
