"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowLeftRightIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleIcon,
  FileDownIcon,
  FingerprintIcon,
  InfoIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LockIcon,
  MessageSquareTextIcon,
  OctagonAlertIcon,
  ScrollTextIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldUserIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  UndoIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ACTOR_LABEL,
  CATEGORY_LABEL,
  DECISION_LABEL,
  MODEL_VERSION,
  SEVERITY_LABEL,
  decisions,
  reviewQueue,
  toCsv,
  verifyChain,
  type AuditCategory,
  type AuditEntry,
  type AuditSeverity,
  type ReviewDecision,
} from "@/lib/concierge/audit";
import { DEF, PREMISES, RISK, SC, TONE, damageText, eligibility, estimateLine, fallbackKind, materials, model, statusLabel, timeText } from "@/lib/concierge/model";
import { INDICATORS, THRESHOLDS } from "@/lib/concierge/risk";
import { REDACTION_LABEL } from "@/lib/concierge/privacy";
import { DemoPanel, SHOW_DEMO } from "@/components/concierge/demo-controls";
import { Dot, Panel, RiskScale, SectionHeader } from "@/components/concierge/primitives";
import { DESKTOP, useConcierge, useMediaQuery } from "@/components/concierge/store";

type StaffTab = "overview" | "reviews" | "audit" | "controls";

const TABS: { id: StaffTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "reviews", label: "Reviews", icon: ListChecksIcon },
  { id: "audit", label: "Audit Trail", icon: ScrollTextIcon },
  { id: "controls", label: "Controls", icon: SlidersHorizontalIcon },
];

// Status colors always ship with an icon and a label, never color alone.
const SEVERITY: Record<AuditSeverity, { icon: LucideIcon; c: string; bg: string; ink: string }> = {
  info: { icon: CircleIcon, c: "var(--muted-foreground)", bg: "var(--muted)", ink: "var(--muted-foreground)" },
  notice: { icon: InfoIcon, ...pick("brand") },
  warning: { icon: TriangleAlertIcon, ...pick("mid") },
  critical: { icon: OctagonAlertIcon, ...pick("high") },
};
function pick(k: keyof typeof TONE) {
  return { c: TONE[k].c, bg: TONE[k].bg, ink: TONE[k].ink };
}

const DECISION_STYLE: Record<ReviewDecision, string> = {
  approved: "bg-low-bg text-low-ink",
  escalated: "bg-high-bg text-high-ink",
  overridden: "bg-mid-bg text-mid-ink",
};

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
const stamp = (at: number) => new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Small pieces

export function SeverityBadge({ severity, className }: { severity: AuditSeverity; className?: string }) {
  const s = SEVERITY[severity];
  const I = s.icon;
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap", className)} style={{ background: s.bg, color: s.ink }}>
      <I size={12} aria-hidden fill={severity === "info" ? "currentColor" : "none"} className={severity === "info" ? "size-2" : undefined} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function CategoryTag({ category }: { category: AuditCategory }) {
  return <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap text-muted-foreground">{CATEGORY_LABEL[category]}</span>;
}

function DecisionTag({ decision }: { decision: ReviewDecision }) {
  return <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap", DECISION_STYLE[decision])}>{DECISION_LABEL[decision]}</span>;
}

function StatTile({ icon: I, label, value, sub, tone }: { icon: LucideIcon; label: string; value: number | string; sub: string; tone?: AuditSeverity }) {
  const s = tone ? SEVERITY[tone] : null;
  return (
    <Panel className="gap-1.5 p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <I size={14} aria-hidden style={s ? { color: s.ink } : undefined} />
        {label}
      </span>
      <span className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
      <span className="text-xs text-pretty text-muted-foreground">{sub}</span>
    </Panel>
  );
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    // Scrolls sideways on phones instead of wrapping into a tall block.
    <div role="radiogroup" aria-label={label} className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
            o.id === value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compact clickable audit row, used on phones and in the overview feed. */
function EntryCard({ e, decision, onOpen }: { e: AuditEntry; decision?: AuditEntry; onOpen: (e: AuditEntry) => void }) {
  return (
    <button type="button" onClick={() => onOpen(e)} className="flex w-full cursor-pointer items-start gap-3 border-t px-3.5 py-3 text-left transition-colors first:border-t-0 hover:bg-muted">
      <span className="mt-1.5">
        <Dot color={SEVERITY[e.severity].c} size={8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{e.action}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{clock(e.at)}</span>
        </span>
        <span className="line-clamp-2 text-[13px] text-pretty text-muted-foreground">{e.summary}</span>
        <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <CategoryTag category={e.category} />
          {e.severity !== "info" && <SeverityBadge severity={e.severity} />}
          {e.review && !decision && <span className="inline-flex h-[22px] items-center rounded-full bg-mid-bg px-2 text-xs font-medium text-mid-ink">Open review</span>}
          {decision?.decision && <DecisionTag decision={decision.decision} />}
          <span className="font-mono text-[11px] text-muted-foreground">
            #{e.seq} · {ACTOR_LABEL[e.actor]}
          </span>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail sheet

function EntryDetail({ e, onClose }: { e: AuditEntry; onClose: () => void }) {
  const { audit } = useConcierge();
  const decision = decisions(audit).get(e.id);
  const target = e.target ? audit.find((x) => x.id === e.target) : undefined;
  const rows: [string, React.ReactNode][] = [
    ["Time", stamp(e.at)],
    ["Actor", ACTOR_LABEL[e.actor]],
    ["Category", CATEGORY_LABEL[e.category]],
    ["Premise", <span key="p" className="font-mono">{e.premise}</span>],
    ["Event Status", SC[e.scenario].label],
  ];
  return (
    <div className="flex flex-col gap-3 px-4 pt-1 pb-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={e.severity} />
        <CategoryTag category={e.category} />
        {decision?.decision && <DecisionTag decision={decision.decision} />}
      </div>
      <p className="text-[15px] text-pretty">{e.summary}</p>
      {e.review && (
        <div className="flex gap-2.5 rounded-[12px] bg-mid-bg px-3 py-2.5 text-[13px] text-mid-ink">
          <ShieldAlertIcon size={16} className="mt-px shrink-0" aria-hidden />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Why this needs a human</span>
            <span className="text-pretty">{e.review}</span>
            {decision && (
              <span className="pt-1 text-pretty">
                {DECISION_LABEL[decision.decision!]} by staff at {clock(decision.at)} (#{decision.seq}){decision.note ? `: “${decision.note}”` : "."}
              </span>
            )}
          </span>
        </div>
      )}
      {target && (
        <p className="text-[13px] text-muted-foreground">
          Reviews entry #{target.seq}, “{target.action}”.
        </p>
      )}

      <Panel className="overflow-hidden text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-t px-3.5 py-2 first:border-t-0">
            <span className="text-muted-foreground">{k}</span>
            <span className="break-words">{v}</span>
          </div>
        ))}
      </Panel>

      {Object.keys(e.details).length > 0 && (
        <>
          <SectionHeader className="pt-1">Details</SectionHeader>
          <Panel className="overflow-hidden text-[13px]">
            {Object.entries(e.details).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-t px-3.5 py-2 first:border-t-0">
                <span className="text-muted-foreground">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</span>
                <span className="break-words">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</span>
              </div>
            ))}
          </Panel>
        </>
      )}

      <SectionHeader className="pt-1">Integrity</SectionHeader>
      <Panel className="gap-1.5 p-3.5 font-mono text-[11px] text-muted-foreground">
        <span className="break-all">
          <span className="font-sans text-xs font-medium text-foreground">Entry #{e.seq}</span> {e.id}
        </span>
        <span className="break-all">prev {e.prevHash}</span>
        <span className="break-all">hash {e.hash}</span>
      </Panel>
      <Button variant="outline" className="h-10 rounded-[10px]" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function DetailSurface({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  const isDesktop = useMediaQuery(DESKTOP);
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const title = entry ? `#${entry.seq} · ${entry.action}` : "";
  return (
    <>
      <Drawer open={!!entry && !isDesktop} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[20px]" style={{ "--drawer-content-height": "88dvh", "--drawer-content-max-height": "88dvh" } as React.CSSProperties}>
          <div className="flex shrink-0 justify-center pt-2">
            <span className="h-[5px] w-11 rounded-full bg-muted" />
          </div>
          <DrawerTitle className="px-4 pt-3 pb-2 text-lg font-semibold tracking-[-0.01em]">{title}</DrawerTitle>
          <ScrollArea className="min-h-0 flex-1">{entry && <EntryDetail e={entry} onClose={onClose} />}</ScrollArea>
        </DrawerContent>
      </Drawer>
      <Sheet open={!!entry && isDesktop} onOpenChange={onOpenChange}>
        <SheetContent side="right" showCloseButton={false} className="w-[480px] gap-0 p-0 data-[side=right]:sm:max-w-[480px]">
          <div className="flex items-start gap-2 border-b py-3 pr-2 pl-4">
            <SheetTitle className="flex-1 pt-1.5 text-lg font-semibold tracking-[-0.01em]">{title}</SheetTitle>
            <Button variant="ghost" size="icon" className="size-10 rounded-[10px]" onClick={onClose} aria-label="Close">
              <XIcon className="size-[18px]" />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="pt-3">{entry && <EntryDetail e={entry} onClose={onClose} />}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Overview

function IntegrityCard({ compact = false }: { compact?: boolean }) {
  const { audit } = useConcierge();
  const check = React.useMemo(() => verifyChain(audit), [audit]);
  const last = audit.at(-1);
  return (
    <div className={cn("flex items-start gap-3 rounded-[14px] p-3.5 ring-1 ring-foreground/10", check.ok ? "bg-low-bg text-low-ink" : "bg-high-bg text-high-ink")}>
      {check.ok ? <ShieldCheckIcon size={20} className="shrink-0" aria-hidden /> : <ShieldAlertIcon size={20} className="shrink-0" aria-hidden />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{check.ok ? "Audit Chain Verified" : "Audit Chain Broken"}</span>
        <span className="text-[13px] text-pretty">
          {check.ok
            ? `${check.checked} entries, each linked to the one before. Any edit or deletion would show here.`
            : `Entry #${check.brokenAt?.seq} doesn’t match its recorded hash. It was changed after it was written.`}
        </span>
        {!compact && last && <span className="truncate pt-0.5 font-mono text-[11px] opacity-80">head {last.hash}</span>}
      </span>
    </div>
  );
}

function PremiseBoard() {
  const { state } = useConcierge();
  const storm = state.scenario !== "normal";
  const rows = Object.values(PREMISES).map((p) => {
    // Every premise is scored on the damage AEP reported, not the customer's what-if.
    const m = model({ ...DEF, premise: p.id, scenario: state.scenario, wind: state.wind });
    return { p, m, t: timeText(m), active: p.id === state.premise && !state.unknownId && !state.premiseOverride };
  });
  return (
    <Panel className="overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_90px_100px] gap-3 border-b px-3.5 py-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Premise</span>
        <span>Outage Chance</span>
        <span>Confidence</span>
        <span className="text-right">Restoration</span>
      </div>
      {rows.map(({ p, m, t, active }) => (
        <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t px-3.5 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_90px_100px] sm:items-center">
          <span className="flex min-w-0 flex-col max-sm:col-start-1 max-sm:row-start-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{p.area}</span>
              {active && <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-brand-soft px-1.5 text-[11px] font-medium text-brand-ink">Live session</span>}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {p.id} · {p.circuit}
            </span>
          </span>
          <span className="col-span-2 flex flex-col gap-1.5 max-sm:row-start-2 sm:col-span-1">
            <span className="text-[13px] font-medium" style={{ color: RISK[m.level].ink }}>
              {storm ? RISK[m.level].label : "No storm"}
            </span>
            <RiskScale level={m.level} compact />
          </span>
          <span className="text-right text-[13px] max-sm:col-start-2 max-sm:row-start-1 sm:text-left">
            <span className="text-muted-foreground sm:hidden">Conf. </span>
            {["", "Low", "Medium", "High"][m.conf]}
            {m.confidence.missing.length > 0 && <span className="block text-xs text-muted-foreground">{m.confidence.missing.length} assumed</span>}
            {storm && <span className="block text-xs text-muted-foreground tabular-nums sm:hidden">{t.hours}</span>}
          </span>
          <span className="hidden text-right text-[13px] tabular-nums sm:block">{storm ? t.hours : "—"}</span>
        </div>
      ))}
    </Panel>
  );
}

function Overview({ onOpen, go }: { onOpen: (e: AuditEntry) => void; go: (t: StaffTab) => void }) {
  const { state, m, audit } = useConcierge();
  const queue = React.useMemo(() => reviewQueue(audit), [audit]);
  const done = React.useMemo(() => decisions(audit), [audit]);
  const sc = state.scenario;
  const count = (f: (e: AuditEntry) => boolean) => audit.filter(f).length;
  const sent = count((e) => e.category === "communication" && (e.action.startsWith("Message sent") || e.action.startsWith("Estimate-updated")));
  const escalations = count((e) => e.category === "escalation");
  const asked = count((e) => e.category === "assistant");
  const fallbacks = count((e) => e.category === "assistant" && e.action.startsWith("Fallback"));
  const redactions = count((e) => e.category === "privacy");
  const el = eligibility(m, state);
  const tone = TONE[SC[sc].tone];
  const recent = audit.slice(-8).reverse();
  const comms = audit.filter((e) => e.category === "communication" || e.category === "escalation").slice(-5).reverse();

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel className="gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold" style={{ background: tone.bg, color: tone.ink }}>
              <Dot color={tone.c} />
              {statusLabel(sc, m)}
            </span>
            <span className="text-xs text-muted-foreground">{sc === "normal" ? "Calm" : `${state.wind} mph gusts`}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Live customer session</span>
            <span className="text-lg leading-tight font-semibold tracking-[-0.01em]">{state.unknownId ? "Unknown location (fallback shown)" : `${m.P.area} · ${m.P.id}`}</span>
          </div>
          <div className="rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-pretty">
            <span className="font-medium">Customer sees: </span>
            {fallbackKind(state, m) ? "The “can’t make a confident call” fallback card. No chance or time." : estimateLine(m, sc)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[13px]">
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className="font-medium">{["", "Low", "Medium", "High"][m.conf]}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">Alerts</span>
              <span className="font-medium">{el.ok ? "Eligible" : "Outage only"}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">Estimate</span>
              <span className="font-medium tabular-nums">{sc === "normal" ? "—" : m.confidence.reliable ? timeText(m).hours : "Withheld"}</span>
            </span>
          </div>
          {sc !== "normal" && !state.unknownId && (
            <div className="flex flex-col gap-1.5 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Crew materials for the reported damage ({damageText(DEF)}), from the structure drawings and labor workbook
              </span>
              <span className="flex flex-wrap gap-1.5">
                {materials(DEF).map((x) => (
                  <span key={x.name} className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-xs tabular-nums">
                    {x.qty} × {x.name}
                  </span>
                ))}
              </span>
            </div>
          )}
        </Panel>
        <div className="flex flex-col gap-3">
          <IntegrityCard />
          {queue.open.length > 0 && (
            <button type="button" onClick={() => go("reviews")} className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-mid-bg p-3.5 text-left text-mid-ink ring-1 ring-foreground/10 transition-opacity hover:opacity-90">
              <ShieldAlertIcon size={20} className="shrink-0" aria-hidden />
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">
                  {queue.open.length} decision{queue.open.length > 1 ? "s" : ""} waiting for review
                </span>
                <span className="text-[13px]">Low confidence, escalations, overrides and safety reports.</span>
              </span>
              <ChevronRightIcon size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ShieldAlertIcon} label="Open Reviews" value={queue.open.length} sub={`${queue.resolved.length} resolved`} tone={queue.open.length ? "warning" : undefined} />
        <StatTile icon={OctagonAlertIcon} label="Escalations" value={escalations} sub="Priority needs and safety reports" tone={escalations ? "critical" : undefined} />
        <StatTile icon={MessageSquareTextIcon} label="Messages Sent" value={sent} sub="Status and estimate updates" />
        <StatTile icon={BotIcon} label="Assistant Answers" value={asked} sub={`${fallbacks} fallback · ${redactions} redacted`} />
      </div>

      <SectionHeader>Premise Risk Board</SectionHeader>
      <PremiseBoard />
      <p className="-mt-1 px-1 text-xs text-pretty text-muted-foreground">Scored on the damage AEP reported, not any customer’s what-if. Anonymized IDs only; declared needs are never shown here.</p>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionHeader>Communications &amp; Escalations</SectionHeader>
          <Panel className="overflow-hidden">
            {comms.length ? comms.map((e) => <EntryCard key={e.id} e={e} decision={done.get(e.id)} onOpen={onOpen} />) : <Empty text="No messages yet. Switch the demo scenario to send one." />}
          </Panel>
        </div>
        <div className="flex flex-col gap-3">
          <SectionHeader>Recent Activity</SectionHeader>
          <Panel className="overflow-hidden">
            {recent.length ? recent.map((e) => <EntryCard key={e.id} e={e} decision={done.get(e.id)} onOpen={onOpen} />) : <Empty text="Nothing logged yet." />}
            <button type="button" onClick={() => go("audit")} className="flex h-11 w-full cursor-pointer items-center justify-center gap-1 border-t text-[13px] font-medium text-brand-ink hover:bg-muted">
              Full audit trail
              <ChevronRightIcon size={14} aria-hidden />
            </button>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">{text}</div>;
}

// ---------------------------------------------------------------------------
// Review queue

function ReviewCard({ e, onOpen }: { e: AuditEntry; onOpen: (e: AuditEntry) => void }) {
  const { review, flash } = useConcierge();
  const [note, setNote] = React.useState("");
  const decide = (d: ReviewDecision) => {
    review(e, d, note);
    flash(`#${e.seq} ${DECISION_LABEL[d].toLowerCase()}`);
  };
  const s = SEVERITY[e.severity];
  return (
    <Panel className="gap-3 p-3.5" style={{ boxShadow: `inset 3px 0 0 ${s.c}` }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={e.severity} />
        <CategoryTag category={e.category} />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          #{e.seq} · {clock(e.at)}
        </span>
      </div>
      <button type="button" onClick={() => onOpen(e)} className="flex cursor-pointer flex-col gap-1 text-left">
        <span className="font-semibold">{e.action}</span>
        <span className="text-[13px] text-pretty text-muted-foreground">{e.summary}</span>
      </button>
      <div className="flex gap-2 rounded-[10px] bg-muted px-3 py-2 text-[13px] text-pretty">
        <ShieldAlertIcon size={15} className="mt-px shrink-0 text-mid-ink" aria-hidden />
        {e.review}
      </div>
      <Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add a note (optional)" aria-label={`Note for entry ${e.seq}`} maxLength={280} className="h-11 rounded-[10px] text-base md:text-sm" />
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => decide("approved")} className="h-11 gap-1 rounded-[10px] bg-low text-white hover:bg-low/90">
          <CheckIcon />
          Approve
        </Button>
        <Button variant="outline" onClick={() => decide("overridden")} className="h-11 gap-1 rounded-[10px]">
          <UndoIcon />
          Override
        </Button>
        <Button variant="outline" onClick={() => decide("escalated")} className="h-11 gap-1 rounded-[10px] text-high-ink">
          <OctagonAlertIcon />
          Escalate
        </Button>
      </div>
    </Panel>
  );
}

function Reviews({ onOpen }: { onOpen: (e: AuditEntry) => void }) {
  const { audit } = useConcierge();
  const queue = React.useMemo(() => reviewQueue(audit), [audit]);
  return (
    <>
      <p className="px-1 text-[13px] text-pretty text-muted-foreground">
        The system sends a decision here when it shouldn’t act alone: low-confidence predictions, priority-customer escalations, safety reports, manual overrides, large estimate swings and AI answers that tripped a guard. Every decision is
        logged as a new audit entry.
      </p>
      <SectionHeader>Waiting ({queue.open.length})</SectionHeader>
      {queue.open.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {queue.open.map((e) => (
            <ReviewCard key={e.id} e={e} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <Panel>
          <Empty text="Nothing to review. Try a Power Outage with a declared medical need, or ask the concierge about a downed wire." />
        </Panel>
      )}
      {queue.resolved.length > 0 && (
        <>
          <SectionHeader>Resolved ({queue.resolved.length})</SectionHeader>
          <Panel className="overflow-hidden">
            {queue.resolved.map(({ entry, decision }) => (
              <EntryCard key={entry.id} e={entry} decision={decision} onOpen={onOpen} />
            ))}
          </Panel>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Audit trail

type CatFilter = AuditCategory | "all";
type SevFilter = "all" | "review" | "critical";

function AuditTrail({ onOpen }: { onOpen: (e: AuditEntry) => void }) {
  const { audit } = useConcierge();
  const done = React.useMemo(() => decisions(audit), [audit]);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<CatFilter>("all");
  const [sev, setSev] = React.useState<SevFilter>("all");
  const needle = q.trim().toLowerCase();
  const rows = audit
    .filter((e) => (cat === "all" || e.category === cat) && (sev === "all" || (sev === "review" ? !!e.review : e.severity === "critical")))
    .filter((e) => !needle || `${e.action} ${e.summary} ${e.premise} #${e.seq}`.toLowerCase().includes(needle))
    .reverse();
  const cats = (Object.keys(CATEGORY_LABEL) as AuditCategory[]).filter((c) => audit.some((e) => e.category === c));

  return (
    <>
      <IntegrityCard compact />
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, premises, #seq" aria-label="Search the audit trail" className="h-10 rounded-[10px] pl-9 text-base md:text-sm" />
          </div>
          <Button variant="outline" className="h-10 gap-1.5 rounded-[10px]" onClick={() => download(`audit-${Date.now()}.csv`, "text/csv", toCsv(audit))}>
            <FileDownIcon />
            CSV
          </Button>
          <Button variant="outline" className="hidden h-10 gap-1.5 rounded-[10px] sm:inline-flex" onClick={() => download(`audit-${Date.now()}.json`, "application/json", JSON.stringify(audit, null, 2))}>
            <FileDownIcon />
            JSON
          </Button>
        </div>
        <Chips<CatFilter> label="Category" value={cat} onChange={setCat} options={[{ id: "all", label: "All" }, ...cats.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))]} />
        <Chips<SevFilter>
          label="Severity"
          value={sev}
          onChange={setSev}
          options={[
            { id: "all", label: "Any severity" },
            { id: "review", label: "Flagged for review" },
            { id: "critical", label: "Critical only" },
          ]}
        />
        <span className="px-1 text-xs text-muted-foreground">
          Showing {rows.length} of {audit.length} entries, newest first
        </span>
      </div>

      {/* Phones: cards. Desktop: a dense table. */}
      <Panel className="overflow-hidden lg:hidden">{rows.length ? rows.map((e) => <EntryCard key={e.id} e={e} decision={done.get(e.id)} onOpen={onOpen} />) : <Empty text="No entries match." />}</Panel>
      <Panel className="hidden overflow-hidden lg:flex">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-14 px-3.5 py-2 font-medium">#</th>
              <th className="w-28 py-2 font-medium">Time</th>
              <th className="w-28 py-2 font-medium">Actor</th>
              <th className="w-32 py-2 font-medium">Category</th>
              <th className="py-2 font-medium">Event</th>
              <th className="w-24 py-2 font-medium">Premise</th>
              <th className="w-36 py-2 pr-3.5 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const d = done.get(e.id);
              return (
                <tr key={e.id} onClick={() => onOpen(e)} className="cursor-pointer border-t align-top transition-colors first:border-t-0 hover:bg-muted">
                  <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{e.seq}</td>
                  <td className="py-2.5 text-muted-foreground tabular-nums">{clock(e.at)}</td>
                  <td className="py-2.5">{ACTOR_LABEL[e.actor]}</td>
                  <td className="py-2.5">
                    <CategoryTag category={e.category} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <button type="button" className="flex cursor-pointer flex-col gap-0.5 text-left" onClick={() => onOpen(e)}>
                      <span className="font-medium">{e.action}</span>
                      <span className="line-clamp-1 text-muted-foreground">{e.summary}</span>
                    </button>
                  </td>
                  <td className="py-2.5 font-mono text-xs">{e.premise}</td>
                  <td className="py-2.5 pr-3.5">
                    <span className="flex flex-col items-start gap-1">
                      <SeverityBadge severity={e.severity} />
                      {d?.decision ? <DecisionTag decision={d.decision} /> : e.review ? <span className="text-xs text-mid-ink">Open review</span> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <Empty text="No entries match." />}
      </Panel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Controls

function useHealth() {
  const [h, setH] = React.useState<{ configured: Record<string, boolean>; ai: { selected: string | null; model: string } } | null>(null);
  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then(setH)
      .catch(() => {});
  }, []);
  return h;
}

const REVIEW_RULES = [
  "Prediction confidence is Low (storm stronger than most on record, or key inputs missing).",
  "A customer-declared medical, mobility or critical-facility need meets a confirmed outage.",
  "A customer asks about a hazard (downed wire, sparks, fire, injury). They get the fixed 911 card, never an AI answer.",
  "Anyone forces the outage chance away from the model’s level.",
  "A live estimate moves 6 hours or more at once.",
  "An AI answer trips the prompt-injection guard, or the assistant falls back to “can’t answer reliably”.",
  "A customer enters an ID we can’t match (the ID is masked in the log).",
];

function Controls() {
  const { audit, clearAudit, flash } = useConcierge();
  const health = useHealth();
  const [confirm, setConfirm] = React.useState(false);
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionHeader>Model</SectionHeader>
          <Panel className="gap-3 p-3.5 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Outage-risk model</span>
              <span className="font-mono text-xs text-muted-foreground">{MODEL_VERSION}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {INDICATORS.map((i) => (
                <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_88px_36px] items-center gap-2">
                  <span className="truncate">{i.label}</span>
                  <span className="h-1.5 rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(i.weight / 0.3) * 100}%` }} />
                  </span>
                  <span className="text-right text-muted-foreground tabular-nums">{Math.round(i.weight * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t pt-3">
              {THRESHOLDS.map(([lvl, at]) => (
                <span key={lvl} className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs">
                  <Dot color={RISK[lvl].c} />
                  {RISK[lvl].short} ≥ {at}
                </span>
              ))}
            </div>
          </Panel>

          <SectionHeader>Human Review Rules</SectionHeader>
          <Panel className="overflow-hidden text-[13px]">
            {REVIEW_RULES.map((r) => (
              <div key={r} className="flex gap-2.5 border-t px-3.5 py-2.5 first:border-t-0">
                <ShieldAlertIcon size={15} className="mt-px shrink-0 text-mid-ink" aria-hidden />
                <span className="text-pretty">{r}</span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>Privacy Filters</SectionHeader>
          <Panel className="gap-2.5 p-3.5 text-[13px]">
            <p className="text-pretty">Customer text is redacted before it’s logged or sent to the AI. The audit trail stores anonymized premise IDs, levels, ranges and yes/no flags only.</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(REDACTION_LABEL).map((l) => (
                <span key={l} className="inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-xs">
                  <LockIcon size={11} aria-hidden />
                  {l}
                </span>
              ))}
            </div>
            <p className="text-xs text-pretty text-muted-foreground">Never logged: names, addresses, coordinates, crew or employee details, device IDs, life-support flags. Declared needs are self-reported and never inferred.</p>
          </Panel>

          <SectionHeader>AI Assistant</SectionHeader>
          <Panel className="gap-2 p-3.5 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Free-text answers</span>
              <span className={cn("inline-flex h-[22px] items-center rounded-full px-2 text-xs font-medium", health?.configured.conciergeAi ? "bg-low-bg text-low-ink" : "bg-muted text-muted-foreground")}>
                {health ? (health.configured.conciergeAi ? `On · ${health.ai.selected ?? "auto"}` : "Off · built-in only") : "Checking…"}
              </span>
            </div>
            <p className="text-pretty text-muted-foreground">Hardened system prompt, injection guard, output cleanup, and a fixed fallback card. Safety questions skip the AI entirely.</p>
          </Panel>

          <SectionHeader>Audit Log</SectionHeader>
          <Panel className="gap-3 p-3.5 text-[13px]">
            <p className="text-pretty">
              {audit.length} entries, hash-chained and stored in this browser for the demo. In production, the same entries would stream to write-once storage.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-10 gap-1.5 rounded-[10px]" onClick={() => download(`audit-${Date.now()}.json`, "application/json", JSON.stringify(audit, null, 2))}>
                <FileDownIcon />
                Export JSON
              </Button>
              <Button
                variant="outline"
                className={cn("h-10 gap-1.5 rounded-[10px]", confirm && "border-destructive text-destructive")}
                onClick={() => {
                  if (!confirm) {
                    setConfirm(true);
                    return;
                  }
                  clearAudit();
                  setConfirm(false);
                  flash("Started a new audit chain");
                }}
                onBlur={() => setConfirm(false)}
              >
                <FingerprintIcon />
                {confirm ? "Tap again to start a new chain" : "Start new chain"}
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {SHOW_DEMO && (
        <>
          <SectionHeader>Demo</SectionHeader>
          <DemoPanel goHome={false} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell

function StaffLogo() {
  const props = { width: 61, height: 32, priority: true } as const;
  return (
    <span className="flex h-8 w-[61px] shrink-0 items-center">
      <Image src="/aep-logo-light.png" alt="American Electric Power" {...props} className="size-full object-contain object-left dark:hidden" />
      <Image src="/aep-logo-dark.png" alt="American Electric Power" {...props} className="hidden size-full object-contain object-left dark:block" />
    </span>
  );
}

function CustomerViewButton() {
  const { setRole, set } = useConcierge();
  if (!SHOW_DEMO) return null;
  return (
    <Button
      variant="outline"
      className="h-9 gap-1.5 rounded-full px-3"
      onClick={() => {
        set({ screen: "home" });
        setRole("customer");
      }}
    >
      <ArrowLeftRightIcon />
      <span className="hidden sm:inline">Customer view</span>
      <span className="sm:hidden">Customer</span>
    </Button>
  );
}

const TITLES: Record<StaffTab, { title: string; sub: string }> = {
  overview: { title: "Storm Operations", sub: "Live session, premise risk and recent decisions" },
  reviews: { title: "Review Queue", sub: "Decisions the system won’t make alone" },
  audit: { title: "Audit Trail", sub: "Every prediction, message and answer, hash-chained" },
  controls: { title: "Controls", sub: "Model, review rules, privacy and demo settings" },
};

export function StaffApp() {
  const { audit } = useConcierge();
  const [tab, setTab] = React.useState<StaffTab>("overview");
  const [open, setOpen] = React.useState<AuditEntry | null>(null);
  const openCount = React.useMemo(() => reviewQueue(audit).open.length, [audit]);
  const scroller = React.useRef<HTMLDivElement>(null);
  const go = (t: StaffTab) => {
    setTab(t);
    scroller.current?.closest<HTMLElement>("[data-slot=scroll-area-viewport]")?.scrollTo({ top: 0 });
  };
  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-page"
      style={{ "--staff-nav": "calc(max(10px, env(safe-area-inset-bottom)) + 64px)" } as React.CSSProperties}
    >
      <header className="flex shrink-0 flex-col border-b bg-background pt-[max(6px,env(safe-area-inset-top))] lg:pt-0">
        <div className="flex h-[52px] items-center gap-3 px-3 lg:h-16 lg:px-5">
          <StaffLogo />
          <span aria-hidden className="h-7 w-px bg-border" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
              <ShieldUserIcon size={15} aria-hidden className="text-brand-ink" />
              Staff Console
            </span>
            <span className="truncate text-xs text-muted-foreground">AEP Storm Ops · demo account</span>
          </span>
          <CustomerViewButton />
        </div>
        {/* Desktop tabs. Phones use the bottom nav. */}
        <nav aria-label="Staff" className="hidden gap-1 px-4 lg:flex">
          {TABS.map(({ id, label, icon: I }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "relative flex h-11 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                tab === id ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <I size={16} aria-hidden />
              {label}
              {id === "reviews" && openCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-mid px-1 text-[11px] font-semibold text-black tabular-nums">{openCount}</span>}
            </button>
          ))}
        </nav>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div ref={scroller} aria-hidden />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 pt-4 pb-[calc(var(--staff-nav)+1.25rem)] lg:px-6 lg:pt-6 lg:pb-10">
          <div className="flex flex-col gap-0.5 px-1">
            <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{TITLES[tab].title}</h1>
            <p className="text-[13px] text-muted-foreground">{TITLES[tab].sub}</p>
          </div>
          {tab === "overview" && <Overview onOpen={setOpen} go={go} />}
          {tab === "reviews" && <Reviews onOpen={setOpen} />}
          {tab === "audit" && <AuditTrail onOpen={setOpen} />}
          {tab === "controls" && <Controls />}
        </main>
      </ScrollArea>

      {/* Phone bottom nav: the same liquid-glass capsule as the customer app. */}
      <nav aria-label="Staff" className="glass absolute inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 mx-auto h-16 max-w-md rounded-full p-1 lg:hidden">
        <div className="relative flex h-full">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 transition-transform duration-500 ease-[cubic-bezier(0.3,1.35,0.5,1)] motion-reduce:transition-none"
            style={{ width: `${100 / TABS.length}%`, transform: `translateX(${index * 100}%)` }}
          >
            <span
              key={tab}
              className="block size-full animate-[lens-squish_500ms_ease-out] rounded-full border border-white/70 bg-brand-soft/75 shadow-[inset_0_1px_0_rgb(255_255_255/0.75),inset_0_-1px_2px_rgb(0_0_0/0.06),0_6px_16px_-6px_rgb(0_0_0/0.3)] backdrop-blur-md backdrop-saturate-200 motion-reduce:animate-none dark:border-white/15 dark:bg-white/12 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_6px_16px_-6px_rgb(0_0_0/0.6)]"
            />
          </span>
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id;
            const badge = id === "reviews" ? openCount : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                aria-label={badge ? `${label}, ${badge} open` : label}
                className={cn(
                  "relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-[color,transform] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95",
                  active ? "text-brand-ink" : "text-muted-foreground",
                )}
              >
                <span className="relative flex items-center justify-center">
                  <I size={21} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {!!badge && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-high px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {id === "audit" ? "Audit" : label}
              </button>
            );
          })}
        </div>
      </nav>

      <DetailSurface entry={open} onClose={() => setOpen(null)} />
    </div>
  );
}
