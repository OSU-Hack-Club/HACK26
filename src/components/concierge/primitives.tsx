"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import {
  AccessibilityIcon,
  BadgeCheckIcon,
  BatteryChargingIcon,
  BellIcon,
  Building2Icon,
  CableIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  ClockIcon,
  CloudLightningIcon,
  CloudSunIcon,
  EarOffIcon,
  EyeOffIcon,
  GitCommitHorizontalIcon,
  GitForkIcon,
  GaugeIcon,
  HeartPulseIcon,
  HistoryIcon,
  HospitalIcon,
  HouseIcon,
  ListIcon,
  MoonIcon,
  MountainIcon,
  NetworkIcon,
  PhoneIcon,
  RefrigeratorIcon,
  RouteIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TargetIcon,
  TreeDeciduousIcon,
  TreePineIcon,
  TreesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  TruckIcon,
  UtilityPoleIcon,
  WindIcon,
  WrenchIcon,
  ZapIcon,
  ZapOffIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RISK, RISK_ORDER, SC, TONE, type RiskLevel, type Tone, type IconName, type LegendItem, type Scenario, type Segment } from "@/lib/concierge/model";

const ICONS: Record<IconName, LucideIcon> = {
  zap: ZapIcon,
  "zap-off": ZapOffIcon,
  gauge: GaugeIcon,
  bell: BellIcon,
  clock: ClockIcon,
  truck: TruckIcon,
  house: HouseIcon,
  target: TargetIcon,
  "badge-check": BadgeCheckIcon,
  sparkles: SparklesIcon,
  list: ListIcon,
  "trending-up": TrendingUpIcon,
  "trending-down": TrendingDownIcon,
  "battery-charging": BatteryChargingIcon,
  refrigerator: RefrigeratorIcon,
  moon: MoonIcon,
  "heart-pulse": HeartPulseIcon,
  "triangle-alert": TriangleAlertIcon,
  settings: SettingsIcon,
  "circle-check": CircleCheckIcon,
  "cloud-sun": CloudSunIcon,
  wind: WindIcon,
  "tree-pine": TreePineIcon,
  wrench: WrenchIcon,
  "circle-help": CircleHelpIcon,
  "cloud-lightning": CloudLightningIcon,
  sun: SunIcon,
  star: StarIcon,
  trees: TreesIcon,
  "tree-deciduous": TreeDeciduousIcon,
  "utility-pole": UtilityPoleIcon,
  cable: CableIcon,
  "git-commit-horizontal": GitCommitHorizontalIcon,
  "git-fork": GitForkIcon,
  history: HistoryIcon,
  network: NetworkIcon,
  mountain: MountainIcon,
  "building-2": Building2Icon,
  route: RouteIcon,
  accessibility: AccessibilityIcon,
  "ear-off": EarOffIcon,
  "eye-off": EyeOffIcon,
  phone: PhoneIcon,
  hospital: HospitalIcon,
  "shield-check": ShieldCheckIcon,
};

export function Icon({ name, size = 16, className, strokeWidth }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  const C = ICONS[name];
  return <C size={size} strokeWidth={strokeWidth} className={cn("shrink-0", className)} aria-hidden />;
}

export const toneOf = (sc: Scenario) => TONE[SC[sc].tone];

/** Section title followed by a hairline rule. */
export function SectionHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-1 pt-2.5", className)}>
      <span className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Concierge card: 14px radius, hairline ring. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10", className)} {...props} />;
}

export function Dot({ color, size = 7, className }: { color: string; size?: number; className?: string }) {
  return <span className={cn("shrink-0 rounded-full", className)} style={{ width: size, height: size, background: color }} />;
}

/**
 * Background layers for a glowing pill: a blurred, filled halo behind an opaque fill.
 * The halo has no hard ring, so nothing shows between it and the pill as it pulses.
 * Needs a `relative isolate` parent with a transparent background and border.
 */
function GlowLayers({ tone, glowing, pulse = false }: { tone: Tone; glowing: boolean; pulse?: boolean }) {
  return (
    <>
      {glowing && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute -z-20 rounded-full", pulse ? "-inset-px blur-[9px]" : "inset-0 opacity-60 blur-[7px]")}
          style={{ background: tone.c, animation: pulse ? "pill-glow 1.8s ease-in-out infinite" : undefined }}
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-full"
        style={{ background: tone.bg, boxShadow: glowing ? undefined : `inset 0 0 0 1px ${tone.edge}` }}
      />
    </>
  );
}

/**
 * Header status pill. Glows and pings until the current status has been opened.
 * `compact` tightens the type and padding so the full label fits beside a phone header's logo.
 */
export function StatusPill({ scenario, label, glowing, onClick, compact = false, className }: { scenario: Scenario; label: string; glowing: boolean; onClick: () => void; compact?: boolean; className?: string }) {
  const tone = toneOf(scenario);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open status: ${label}`}
      className={cn(
        "relative isolate flex h-9 max-w-full min-w-0 cursor-pointer items-center rounded-full border border-transparent font-semibold whitespace-nowrap",
        compact ? "gap-1.5 pr-2 pl-2.5 text-xs" : "gap-2 pr-2.5 pl-3 text-[13px]",
        className,
      )}
      style={{ color: tone.ink }}
    >
      <GlowLayers tone={tone} glowing={glowing} pulse />
      <span className="relative size-2 shrink-0">
        {glowing && (
          <span aria-hidden className="absolute inset-0 rounded-full" style={{ background: tone.c, animation: "dot-ping 1.4s cubic-bezier(0,0,.2,1) infinite" }} />
        )}
        <span className="absolute inset-0 rounded-full" style={{ background: tone.c }} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      <ChevronDownIcon size={compact ? 12 : 14} aria-hidden className="shrink-0" />
    </button>
  );
}

/** "Confirmed by AEP · {Tag}" badge. Always kept apart from model estimates. */
export function ConfirmedBadge({ scenario, large = false }: { scenario: Scenario; large?: boolean }) {
  const t = toneOf(scenario);
  return (
    <span
      className={cn(
        "relative isolate inline-flex items-center gap-1.5 self-start rounded-full px-2.5 font-semibold whitespace-nowrap",
        large ? "h-[26px] text-[13px]" : "h-6 text-xs",
      )}
      style={{ color: t.ink }}
    >
      <GlowLayers tone={t} glowing />
      <BadgeCheckIcon size={large ? 14 : 13} aria-hidden />
      Confirmed by AEP · {SC[scenario].tag}
    </span>
  );
}

/** Marks model output. `whatIf` = built from inputs the customer changed, not the reported damage. */
export function ModelEstimateBadge({ whatIf = false }: { whatIf?: boolean }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-brand-soft px-2 text-xs font-medium whitespace-nowrap text-brand-ink">
      <SparklesIcon size={12} aria-hidden />
      {whatIf ? "What-If Estimate" : "Model Estimate"}
    </span>
  );
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1.5", className)}>
      {items.map((lg) => (
        <span key={lg.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 rounded-full" style={{ width: lg.line ? 16 : 9, height: lg.line ? 4 : 9, background: lg.c }} />
          {lg.label}
        </span>
      ))}
    </div>
  );
}

export function SegmentBar({ segs }: { segs: Segment[] }) {
  return (
    <div className="flex h-2.5 gap-[3px]">
      {segs.map((sg) => (
        <span key={sg.label} className="rounded-full" style={{ width: sg.pct, background: sg.color, opacity: sg.op }} />
      ))}
    </div>
  );
}

/** Five-step outage-chance scale (Minimal → Critical), filled up to the current level. */
export function RiskScale({ level, compact = false }: { level: RiskLevel; compact?: boolean }) {
  const B = RISK[level];
  const at = RISK_ORDER.indexOf(level);
  return (
    <div className={cn("grid grid-cols-5", compact ? "gap-[3px]" : "gap-1")} role="img" aria-label={`Outage chance: ${B.label}`}>
      {RISK_ORDER.map((k, i) => (
        <span key={k} className={cn("rounded-full", compact ? "h-1.5" : "h-2")} style={{ background: i <= at ? B.c : "var(--muted)" }} />
      ))}
    </div>
  );
}

/** The shadcn Switch (Base UI) sized up for touch: 36×20 track, 16px white thumb, brand when on. */
export function TouchSwitch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-input transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-brand data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[left] duration-150 data-checked:left-[18px]" />
    </SwitchPrimitive.Root>
  )
}

export function Chip({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-full border bg-background px-3 text-[13px] font-medium whitespace-nowrap transition-colors hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function ToastCheck() {
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-low text-white">
      <CheckIcon size={12} strokeWidth={3} />
    </span>
  );
}
