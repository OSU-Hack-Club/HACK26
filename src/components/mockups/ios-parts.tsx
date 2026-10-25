"use client";

// iOS surfaces for the AEP Outage app: notifications, Live Activity, Dynamic Island, widgets,
// Scheduled Summary and the Messages thread. All copy comes from MockData (mock-data.ts).

import * as React from "react";
import Image from "next/image";
import {
  BellOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  MessageCircleQuestionIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/concierge/primitives";
import { RISK_ORDER, restoredAt } from "@/lib/concierge/model";
import type { Notice } from "@/lib/concierge/notifications";
import { relTime, type Level, type MockData } from "@/components/mockups/mock-data";

/** iOS notification material: frosted, follows light/dark. */
export const MATERIAL = "bg-white/70 text-black backdrop-blur-2xl backdrop-saturate-[1.8] dark:bg-[#1c1c1e]/70 dark:text-white";
const SECONDARY = "text-black/50 dark:text-white/55";
const IOS_RED = "text-[#ff3b30] dark:text-[#ff453a]";

/* ----------------------------------------------------------------------------------------------
 * App icon
 * --------------------------------------------------------------------------------------------*/

export function AepIcon({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden bg-white shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.14)]", className)}
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
    >
      <Image src="/aep-logo-light.png" alt="" width={471} height={248} draggable={false} style={{ width: size * 0.84, height: "auto" }} />
    </span>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Notifications
 * --------------------------------------------------------------------------------------------*/

function LevelTag({ level }: { level: Level }) {
  if (level === "critical")
    return (
      <span className={cn("flex items-center gap-1 text-[11px] font-semibold tracking-[0.04em] uppercase", IOS_RED)}>
        <TriangleAlertIcon size={11} strokeWidth={2.6} aria-hidden />
        Critical Alert
      </span>
    );
  if (level === "time-sensitive")
    return (
      <span className={cn("flex items-center gap-1 text-[11px] font-semibold tracking-[0.04em] uppercase", SECONDARY)}>
        <ClockIcon size={11} strokeWidth={2.6} aria-hidden />
        Time Sensitive
      </span>
    );
  return null;
}

export interface CardProps {
  title: string;
  body: string;
  time: string;
  level?: Level;
  /** Older notifications grouped under this one. */
  stack?: number;
  lines?: number;
  /** Banner over an app or the Home Screen: stronger shadow. */
  banner?: boolean;
  className?: string;
  /** App name in the header (Messages notifications show the sender instead). */
  app?: React.ReactNode;
  icon?: React.ReactNode;
}

export function NotificationCard({ title, body, time, level = "active", stack = 0, lines = 4, banner = false, className, app, icon }: CardProps) {
  return (
    <div className={cn("relative", stack > 0 && "pb-[14px]", className)}>
      {stack > 1 && <span aria-hidden className={cn("absolute inset-x-[22px] bottom-0 h-10 rounded-[18px] opacity-60", MATERIAL)} />}
      {stack > 0 && <span aria-hidden className={cn("absolute inset-x-[11px] bottom-[7px] h-10 rounded-[20px] opacity-85", MATERIAL)} />}
      <div
        className={cn(
          "relative flex gap-[11px] rounded-[23px] px-[14px] py-[12px]",
          MATERIAL,
          banner && "bg-white/85 shadow-[0_12px_40px_-8px_rgb(0_0_0/0.35)] dark:bg-[#1c1c1e]/85",
          level === "critical" && "ring-[1.5px] ring-[#ff3b30]/70",
        )}
      >
        <span className="mt-[2px]">{icon ?? <AepIcon size={38} />}</span>
        <div className="min-w-0 flex-1">
          {level === "critical" || level === "time-sensitive" ? (
            <div className="mb-px">
              <LevelTag level={level} />
            </div>
          ) : null}
          {app && <div className={cn("text-[13px] font-medium", SECONDARY)}>{app}</div>}
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] leading-[20px] font-semibold tracking-[-0.015em]">{title}</p>
            <span className={cn("shrink-0 text-[13px]", SECONDARY)}>{time}</span>
          </div>
          <p className="text-[15px] leading-[20px] tracking-[-0.015em]" style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {body}
          </p>
          {stack > 0 && <p className={cn("mt-0.5 text-[13px]", SECONDARY)}>{stack} more notification{stack > 1 ? "s" : ""}</p>}
        </div>
      </div>
    </div>
  );
}

/** A Notice as a card, timed relative to `now`. */
export function NoticeCard({ n, now, level, ...rest }: { n: Notice; now: number; level: Level } & Partial<CardProps>) {
  return <NotificationCard title={n.title} body={n.body} time={relTime(n.h, now, n.t)} level={level} {...rest} />;
}

/* ----------------------------------------------------------------------------------------------
 * Status helpers shared by widgets and Live Activities
 * --------------------------------------------------------------------------------------------*/

function restoredTime(d: MockData) {
  return restoredAt(d.m).split(" ").slice(1).join(" ");
}

/** Kicker, big value and caption for the current status. */
export function headline(d: MockData): { kicker: string; big: string; sub: string } {
  const day = d.eta.split(" ")[0];
  switch (d.sc) {
    case "normal":
      return { kicker: "No Outages", big: "All Clear", sub: `${d.risk.label} this week` };
    case "watch":
      return { kicker: "Watch Alert", big: d.risk.short, sub: d.reliable ? "Chance of an outage" : "Not enough data" };
    case "outage":
      return { kicker: "Power Outage", big: d.reliable ? d.etaTime : "Pending", sub: d.reliable ? `Likely back ${day}` : "Estimate after assessment" };
    case "restoring":
      return { kicker: "Crews On Site", big: d.reliable ? d.etaTime : "Pending", sub: d.reliable ? `Likely back ${day}` : "Estimate after assessment" };
    case "restored":
      return { kicker: "Power Restored", big: "Back On", sub: `Since ${restoredTime(d)}` };
  }
}

const STEPS = ["Detected", "Crews Assigned", "On Site", "Restored"];

function ProgressTrack({ d, labels = true, dark = false }: { d: MockData; labels?: boolean; dark?: boolean }) {
  const pct = d.sc === "restored" ? 100 : Math.round(d.progress * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("relative h-[6px] rounded-full", dark ? "bg-white/15" : "bg-black/8 dark:bg-white/12")}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: d.tone.c }} />
        {STEPS.map((s, i) => (
          <span
            key={s}
            aria-hidden
            className={cn("absolute top-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2", dark ? "ring-[#1a1a1c]" : "ring-white dark:ring-[#1c1c1e]")}
            style={{ left: `${(i / (STEPS.length - 1)) * 100}%`, background: i < d.step ? d.tone.c : dark ? "#555" : "var(--muted-foreground)" }}
          />
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-[10.5px] font-medium">
          {STEPS.map((s, i) => (
            <span key={s} className={cn(i < d.step ? "" : "opacity-45")}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskBars({ d, dark = false }: { d: MockData; dark?: boolean }) {
  const at = RISK_ORDER.indexOf(d.m.level);
  return (
    <div className="grid grid-cols-5 gap-[3px]" role="img" aria-label={`Outage chance: ${d.risk.label}`}>
      {RISK_ORDER.map((k, i) => (
        <span key={k} className="h-[6px] rounded-full" style={{ background: i <= at ? d.risk.c : dark ? "rgb(255 255 255/0.15)" : "var(--muted)" }} />
      ))}
    </div>
  );
}

function EstimateTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", className)}>
      <SparklesIcon size={11} aria-hidden />
      Model Estimate
    </span>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Live Activity + Dynamic Island
 * --------------------------------------------------------------------------------------------*/

export function LiveActivity({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-[#141416]/80 px-4 pt-3.5 pb-4 text-white backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <AepIcon size={22} />
        <span className="text-[13px] font-semibold text-white/60">AEP Outage · {d.area}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: d.tone.c }}>
          <Icon name={d.icon} size={13} />
          {h.kicker}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] leading-tight font-semibold tracking-[-0.015em]">{d.title}</p>
          <p className="mt-0.5 text-[13px] text-white/60">{d.sc === "restored" ? `Back on at ${restoredTime(d)}` : d.reliable ? `Likely ${d.range}` : "Estimate once crews assess"}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">{d.sc === "restored" ? "Restored" : "Back by"}</p>
          <p className="text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums" style={{ color: d.tone.c }}>
            {d.sc === "restored" ? restoredTime(d) : h.big}
          </p>
        </div>
      </div>
      <ProgressTrack d={d} dark />
      {d.sc !== "restored" && <EstimateTag className="text-white/50" />}
    </div>
  );
}

export function IslandCompact({ d }: { d: MockData }) {
  return (
    <div className="flex h-full items-center justify-between pr-3.5 pl-2.5">
      <span className="grid size-[24px] place-items-center rounded-full" style={{ background: `color-mix(in oklch, ${d.tone.c} 30%, transparent)`, color: d.tone.c }}>
        <Icon name={d.icon} size={14} strokeWidth={2.4} />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] tabular-nums" style={{ color: d.tone.c }}>
        {d.sc === "restored" ? "On" : headline(d).big}
      </span>
    </div>
  );
}

export function IslandMinimal({ d }: { d: MockData }) {
  return (
    <span className="grid size-full place-items-center" style={{ color: d.tone.c }}>
      <Icon name={d.icon} size={16} strokeWidth={2.4} />
    </span>
  );
}

export function IslandExpanded({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <div className="flex h-full flex-col justify-between px-5 pt-3.5 pb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[38px] place-items-center rounded-full" style={{ background: `color-mix(in oklch, ${d.tone.c} 28%, transparent)`, color: d.tone.c }}>
            <Icon name={d.icon} size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-white/55">{d.area}</p>
            <p className="text-[16px] leading-tight font-semibold">{h.kicker}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold text-white/55">{d.sc === "restored" ? "Since" : "Back by"}</p>
          <p className="text-[24px] leading-none font-bold tracking-[-0.03em] tabular-nums" style={{ color: d.tone.c }}>
            {d.sc === "restored" ? restoredTime(d) : h.big}
          </p>
        </div>
      </div>
      <ProgressTrack d={d} dark labels={false} />
      <p className="text-[12px] text-white/60">{d.sc === "restored" ? "Restored inside our estimate." : d.reliable ? `Likely ${d.range}` : "Estimate once crews assess the damage"}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Home Screen widgets (iPhone 16: small 158², medium 338 × 158, large 338 × 354)
 * --------------------------------------------------------------------------------------------*/

function WidgetShell({ size, className, children }: { size: "small" | "medium" | "large"; className?: string; children: React.ReactNode }) {
  const dims = { small: [158, 158], medium: [338, 158], large: [338, 354] }[size];
  return (
    <div
      className={cn("relative flex shrink-0 flex-col overflow-hidden rounded-[22px] bg-white p-[15px] text-black shadow-[0_2px_10px_rgb(0_0_0/0.12)] dark:bg-[#1c1c1e] dark:text-white", className)}
      style={{ width: dims[0], height: dims[1] }}
    >
      {children}
    </div>
  );
}

function Kicker({ d, text }: { d: MockData; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: d.tone.ink }}>
      <span className="size-[7px] rounded-full" style={{ background: d.tone.c }} />
      {text}
    </span>
  );
}

export function SmallWidget({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <WidgetShell size="small">
      <div className="flex items-center justify-between">
        <AepIcon size={24} />
        <span className="grid size-[26px] place-items-center rounded-full" style={{ background: d.tone.bg, color: d.tone.ink }}>
          <Icon name={d.icon} size={14} strokeWidth={2.2} />
        </span>
      </div>
      <div className="mt-auto">
        <Kicker d={d} text={h.kicker} />
        <p className="mt-0.5 text-[28px] leading-[1.05] font-bold tracking-[-0.035em] tabular-nums">{h.big}</p>
        <p className={cn("mt-0.5 truncate text-[12px]", SECONDARY)}>{h.sub}</p>
      </div>
    </WidgetShell>
  );
}

function StatusFooter({ d }: { d: MockData }) {
  if (d.sc === "watch") return <RiskBars d={d} />;
  if (d.out || d.sc === "restored") return <ProgressTrack d={d} labels={false} />;
  return (
    <span className={cn("flex items-center gap-1.5 text-[12px]", SECONDARY)}>
      <Icon name={d.weather.icon} size={13} />
      {d.weather.label}
    </span>
  );
}

export function MediumWidget({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <WidgetShell size="medium">
      <div className="flex items-center gap-2">
        <AepIcon size={22} />
        <span className={cn("text-[12px] font-semibold", SECONDARY)}>{d.area}</span>
        <span className="ml-auto">
          <Kicker d={d} text={d.label} />
        </span>
      </div>
      <div className="mt-2.5 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[16px] leading-tight font-semibold tracking-[-0.015em]">{d.title}</p>
          <p className={cn("mt-1 text-[12.5px] leading-snug", SECONDARY)} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {d.line}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-[11px] font-semibold tracking-wide uppercase", SECONDARY)}>{d.out ? "Back by" : d.sc === "watch" ? "Chance" : d.sc === "restored" ? "Since" : "Status"}</p>
          <p className="text-[26px] leading-none font-bold tracking-[-0.035em] tabular-nums" style={{ color: d.sc === "normal" ? undefined : d.sc === "watch" ? d.risk.c : d.tone.c }}>
            {d.sc === "restored" ? restoredTime(d) : d.sc === "normal" ? "Clear" : h.big}
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <StatusFooter d={d} />
      </div>
    </WidgetShell>
  );
}

export function LargeWidget({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <WidgetShell size="large">
      <div className="flex items-center gap-2">
        <AepIcon size={24} />
        <div className="min-w-0">
          <p className="text-[13px] leading-tight font-semibold">AEP Outage</p>
          <p className={cn("text-[11px] leading-tight", SECONDARY)}>{d.area}</p>
        </div>
        <span className="ml-auto">
          <Kicker d={d} text={d.label} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">{d.title}</p>
          <p className={cn("mt-1 text-[13px] leading-snug", SECONDARY)} style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {d.line}
          </p>
        </div>
        <p className="shrink-0 text-[34px] leading-none font-bold tracking-[-0.04em] tabular-nums" style={{ color: d.sc === "normal" ? d.tone.c : d.sc === "watch" ? d.risk.c : d.tone.c }}>
          {d.sc === "restored" ? restoredTime(d) : h.big}
        </p>
      </div>
      <div className="mt-3.5">
        {d.sc === "watch" ? (
          <div className="flex flex-col gap-1.5">
            <RiskBars d={d} />
            <span className={cn("text-[11px] font-medium", SECONDARY)}>{d.risk.label} of losing power</span>
          </div>
        ) : d.out || d.sc === "restored" ? (
          <ProgressTrack d={d} />
        ) : (
          <span className={cn("flex items-center gap-1.5 text-[12px]", SECONDARY)}>
            <Icon name="shield-check" size={13} />
            Checked just now
          </span>
        )}
      </div>
      <div className="mt-3.5 h-px bg-black/8 dark:bg-white/10" />
      <ul className="mt-2.5 flex flex-col gap-2">
        {d.timeline.slice(0, 3).map((e, i) => (
          <li key={e.title} className="flex items-center gap-2.5">
            <span className="size-[7px] shrink-0 rounded-full" style={{ background: i === 0 ? d.tone.c : "var(--muted-foreground)", opacity: i === 0 ? 1 : 0.5 }} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{e.title}</span>
            <span className={cn("shrink-0 text-[12px]", SECONDARY)}>{e.t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 text-[12px]", SECONDARY)}>
          <Icon name={d.weather.icon} size={13} />
          {d.weather.label}
        </span>
        {d.sc !== "normal" && d.sc !== "restored" ? <EstimateTag className="text-brand-ink" /> : null}
      </div>
    </WidgetShell>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Lock Screen accessory widgets (vibrant, monochrome)
 * --------------------------------------------------------------------------------------------*/

function ringValue(d: MockData) {
  if (d.sc === "watch") return (RISK_ORDER.indexOf(d.m.level) + 1) / RISK_ORDER.length;
  if (d.sc === "normal") return 0.08;
  return d.sc === "restored" ? 1 : d.progress;
}

const RING_RISK: Record<(typeof RISK_ORDER)[number], string> = { minimal: "MIN", low: "LOW", medium: "MED", high: "HIGH", critical: "CRIT" };

export function AccessoryCircular({ d }: { d: MockData }) {
  const v = ringValue(d);
  const r = 29;
  const C = 2 * Math.PI * r;
  return (
    <span className="relative grid size-[72px] place-items-center rounded-full bg-white/15 backdrop-blur-xl">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255/0.25)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * v} ${C}`} />
      </svg>
      <span className="flex flex-col items-center">
        <Icon name={d.icon} size={17} strokeWidth={2.4} />
        <span className="text-[11px] leading-tight font-semibold">{d.sc === "watch" ? RING_RISK[d.m.level] : d.out ? d.etaTime.replace(" ", "") : d.sc === "restored" ? "On" : "OK"}</span>
      </span>
    </span>
  );
}

export function AccessoryRect({ d }: { d: MockData }) {
  const h = headline(d);
  return (
    <span className="flex h-[72px] w-[158px] flex-col justify-center text-left text-white">
      <span className="flex items-center gap-1 text-[13px] font-semibold">
        <Icon name={d.icon} size={13} strokeWidth={2.4} />
        {h.kicker}
      </span>
      <span className="text-[19px] leading-tight font-bold tracking-[-0.02em]">{d.sc === "watch" ? `${d.risk.short} Chance` : d.out ? `Back ~${h.big}` : h.big}</span>
      <span className="truncate text-[12px] text-white/70">{d.out ? h.sub : d.sc === "watch" ? "Winds Mon. 6 PM" : d.area}</span>
    </span>
  );
}

export function accessoryInline(d: MockData) {
  const text = { normal: "All Clear", watch: "Watch 6 PM", outage: `Back ~${d.etaTime}`, restoring: `Back ~${d.etaTime}`, restored: "Power On" }[d.sc];
  return (
    <>
      <Icon name={d.icon} size={16} strokeWidth={2.4} />
      {text}
    </>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Expanded notification (long press) and Scheduled Summary
 * --------------------------------------------------------------------------------------------*/

export function ExpandedNotification({ n, d, level }: { n: Notice; d: MockData; level: Level }) {
  const h = headline(d);
  const actions: { label: string; icon: React.ReactNode }[] = [
    { label: n.action?.label ?? "View Status", icon: <ExternalLinkIcon size={18} aria-hidden /> },
    { label: "Ask the Concierge", icon: <MessageCircleQuestionIcon size={18} aria-hidden /> },
    ...(d.out || d.sc === "restored" ? [{ label: "Still Out? Tell Us", icon: <Icon name="zap-off" size={18} /> }] : []),
    { label: "Mute for 1 Hour", icon: <BellOffIcon size={18} aria-hidden /> },
    { label: "Notification Settings", icon: <SettingsIcon size={18} aria-hidden /> },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className={cn("overflow-hidden rounded-[26px]", MATERIAL)}>
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <AepIcon size={22} />
          <span className={cn("text-[13px] font-semibold", SECONDARY)}>AEP Outage</span>
          <span className={cn("ml-auto text-[13px]", SECONDARY)}>{relTime(n.h, d.now, n.t)}</span>
        </div>
        <div className="px-4 pt-2 pb-3">
          <LevelTag level={level} />
          <p className="text-[17px] leading-snug font-semibold tracking-[-0.02em]">{n.title}</p>
          <p className="mt-0.5 text-[15px] leading-[20px] tracking-[-0.015em]">{n.body}</p>
        </div>
        <div className="mx-3 mb-3 rounded-[18px] bg-white/75 p-3.5 dark:bg-white/8">
          <div className="flex items-start justify-between">
            <div>
              <Kicker d={d} text={d.label} />
              <p className="mt-1 text-[15px] font-semibold">{d.title}</p>
              <p className={cn("text-[12.5px]", SECONDARY)}>{d.area}</p>
            </div>
            <p className="text-[28px] leading-none font-bold tracking-[-0.035em] tabular-nums" style={{ color: d.sc === "watch" ? d.risk.c : d.tone.c }}>
              {d.sc === "restored" ? restoredTime(d) : h.big}
            </p>
          </div>
          <div className="mt-3">{d.sc === "watch" ? <RiskBars d={d} /> : d.out || d.sc === "restored" ? <ProgressTrack d={d} /> : <StatusFooter d={d} />}</div>
          {d.sc !== "normal" && d.sc !== "restored" && <EstimateTag className="mt-2.5 text-brand-ink" />}
        </div>
      </div>
      <div className={cn("w-[250px] self-start overflow-hidden rounded-[16px] ml-1", MATERIAL)}>
        {actions.map((a, i) => (
          <div key={a.label} className={cn("flex h-[44px] items-center justify-between px-4 text-[16px] tracking-[-0.02em]", i > 0 && "border-t border-black/10 dark:border-white/10", i === actions.length - 2 && "")}>
            {a.label}
            <span className="opacity-80">{a.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduledSummary({ items, now, title = "Evening Summary", date }: { items: Notice[]; now: number; title?: string; date: string }) {
  const [lead, ...rest] = items;
  return (
    <div className={cn("overflow-hidden rounded-[26px] p-4", MATERIAL)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-[13px] font-semibold", SECONDARY)}>{date}</p>
          <p className="text-[24px] leading-tight font-bold tracking-[-0.03em]">{title}</p>
        </div>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black/10 px-2 text-[13px] font-semibold dark:bg-white/15">{items.length}</span>
      </div>
      {lead && (
        <div className="mt-3 flex gap-3">
          <AepIcon size={44} />
          <div className="min-w-0">
            <p className="text-[15px] leading-snug font-semibold">{lead.title}</p>
            <p className="text-[14px] leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {lead.body}
            </p>
          </div>
        </div>
      )}
      <ul className="mt-3 flex flex-col gap-2.5 border-t border-black/10 pt-3 dark:border-white/10">
        {rest.slice(0, 3).map((n) => (
          <li key={n.id} className="flex gap-3">
            <AepIcon size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{n.title}</p>
                <span className={cn("shrink-0 text-[12px]", SECONDARY)}>{relTime(n.h, now, n.t)}</span>
              </div>
              <p className={cn("truncate text-[13px]", SECONDARY)}>{n.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {rest.length > 3 && <p className={cn("mt-2.5 text-[13px] font-medium", SECONDARY)}>+{rest.length - 3} more from AEP Outage</p>}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Messages (SMS channel)
 * --------------------------------------------------------------------------------------------*/

export function MessagesIcon({ size = 38 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center bg-[linear-gradient(180deg,#5af575,#21c046)] text-white" style={{ width: size, height: size, borderRadius: size * 0.225 }}>
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="currentColor" aria-hidden>
        <path d="M12 3C6.5 3 2 6.6 2 11.1c0 2.6 1.5 4.9 3.9 6.4-.2 1.2-.9 2.5-2.1 3.4 2.1 0 4-.8 5.3-1.9.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8.2S17.5 3 12 3Z" />
      </svg>
    </span>
  );
}

export interface Sms {
  t: string;
  text: string;
  /** Sent by the customer (right-hand blue bubble). */
  me?: boolean;
}

export function MessagesThread({ messages }: { messages: Sms[] }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-white text-black dark:bg-black dark:text-white">
      <div className="relative z-10 flex flex-col items-center border-b border-black/10 bg-[#f6f6f6]/90 pt-[56px] pb-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/90">
        <ChevronLeftIcon size={30} className="absolute top-[64px] left-2 text-[#007aff]" aria-hidden />
        <span className="grid size-[52px] place-items-center rounded-full bg-[linear-gradient(180deg,#a5aab6,#858a96)] text-[19px] font-semibold text-white">AEP</span>
        <span className="mt-1 flex items-center gap-0.5 text-[12px] font-medium">
          AEP Alerts
          <ChevronRightIcon size={11} className="opacity-40" aria-hidden />
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-3">
        <p className="mb-1 text-center text-[11px] font-medium text-black/45 dark:text-white/45">Text Message · SMS</p>
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <p className="mt-2 text-center text-[11px] font-medium text-black/45 dark:text-white/45">{msg.t}</p>
            <div
              className={cn(
                "max-w-[78%] rounded-[19px] px-3 py-[7px] text-[16px] leading-[21px] tracking-[-0.02em]",
                msg.me ? "self-end bg-[#34c759] text-white" : "self-start bg-[#e9e9eb] dark:bg-[#26252a]",
              )}
            >
              {msg.text}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 pb-[38px]">
        <span className="grid size-[34px] place-items-center rounded-full bg-black/6 text-black/50 dark:bg-white/12 dark:text-white/60">
          <PlusIcon size={20} aria-hidden />
        </span>
        <span className="flex h-[36px] flex-1 items-center justify-between rounded-full border border-black/15 pr-3 pl-3.5 text-[16px] text-black/35 dark:border-white/20 dark:text-white/35">
          Text Message · SMS
          <MicIcon size={17} aria-hidden />
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Notification Center
 * --------------------------------------------------------------------------------------------*/

export function ClearButton() {
  return (
    <span className="grid size-[26px] place-items-center rounded-full bg-black/25 text-white backdrop-blur-xl">
      <XIcon size={14} strokeWidth={2.6} aria-hidden />
    </span>
  );
}
