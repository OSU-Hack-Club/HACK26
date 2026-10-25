"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import {
  BellIcon,
  BellOffIcon,
  BellRingIcon,
  Building2Icon,
  CalculatorIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CloudLightningIcon,
  ClockIcon,
  HeartPulseIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  MinusIcon,
  MoonIcon,
  PackageIcon,
  PhoneIcon,
  SendIcon,
  ShieldCheckIcon,
  ZapOffIcon,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ASSUME_TEXT,
  RISK,
  LIMITED_SAMPLE,
  damageText,
  materials,
  whatIfActive,
  PREMISES,
  NEED_INFO,
  channelList,
  channelOn,
  eligibility,
  escalation,
  forcedChannel,
  laborText,
  needsAlertText,
  previewMessages,
  priorityNeed,
  type Channels,
  type Needs,
  type PreviewMessage,
} from "@/lib/concierge/model";
import { ConfirmedBadge, Icon, ModelEstimateBadge, Panel, SectionHeader, TouchSwitch } from "@/components/concierge/primitives";
import { useConcierge, type Screen } from "@/components/concierge/store";
import { DemoPanel, SHOW_DEMO } from "@/components/concierge/demo-controls";

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

function IconTile({ icon: I, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink", className)}>
      <I size={16} aria-hidden />
    </span>
  );
}

/** Matches the TouchSwitch thumb slide (duration-150). */
const THUMB_MS = 150;

/**
 * The theme provider disables CSS transitions while the theme class flips, so the thumb
 * would snap. Slide the thumb first, then crossfade the page into the new theme.
 */
function DarkModeSwitch({ id }: { id: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = React.useState<boolean | null>(null);
  const timer = React.useRef<number>(undefined);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (on: boolean) => {
    setPending(on);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const apply = () => {
        // flushSync commits the theme (and next-themes' class effect) inside the transition.
        flushSync(() => {
          setTheme(on ? "dark" : "light");
          setPending(null);
        });
      };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.startViewTransition && !reduce) document.startViewTransition(apply);
      else apply();
    }, THUMB_MS);
  };

  return <TouchSwitch id={id} checked={pending ?? resolvedTheme === "dark"} onCheckedChange={toggle} />;
}

const rowClass ="flex min-h-14 w-full cursor-pointer items-center gap-3 border-t px-3.5 py-2.5 text-left transition-colors first:border-t-0 hover:bg-muted";

export function SettingsScreen({ hideBack = false }: { hideBack?: boolean }) {
  const { state, m, set } = useConcierge();
  const el = eligibility(m, state);
  const darkId = React.useId();
  return (
    <>
      {!hideBack && <BackButton to="home" label="Home" />}
      <PageTitle>Settings</PageTitle>

      <SectionHeader>Preferences</SectionHeader>
      <Panel className="overflow-hidden">
        <button type="button" className={rowClass} onClick={() => set({ screen: "notifications" })}>
          <IconTile icon={BellIcon} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Notifications</span>
            <span className="text-xs text-muted-foreground">
              {el.ok ? "Storm alerts on" : "Outage alerts only"} · {channelList(state.ch, state)}
            </span>
          </span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
        <button type="button" className={rowClass} onClick={() => set({ screen: "location" })}>
          <IconTile icon={MapPinIcon} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Location</span>
            <span className="text-xs text-muted-foreground">{state.unknownId ?? `${m.P.area} · ${m.P.id}`}</span>
          </span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
        <button type="button" className={rowClass} onClick={() => set({ screen: "services", servicesFrom: "settings" })}>
          <IconTile icon={Building2Icon} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Services</span>
            <span className="text-xs text-muted-foreground">
              {state.needs.facility ? "Critical facility playbook" : "Nearby help & emergency areas"}
            </span>
          </span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
        <label htmlFor={darkId} className={rowClass}>
          <IconTile icon={MoonIcon} />
          <span className="flex-1 font-medium">Dark Mode</span>
          <DarkModeSwitch id={darkId} />
        </label>
      </Panel>

      {SHOW_DEMO && (
        <>
          <SectionHeader>Demo</SectionHeader>
          <DemoPanel />
        </>
      )}

      <SectionHeader>About</SectionHeader>
      <Panel className="overflow-hidden">
        <button type="button" className={rowClass} onClick={() => set({ screen: "help", helpFrom: "settings" })}>
          <IconTile icon={CircleHelpIcon} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Help &amp; How It Works</span>
            <span className="text-xs text-muted-foreground">How we calculate your estimates, and what the labels mean</span>
          </span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
      </Panel>
    </>
  );
}

function HelpCard({ icon: I, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <Panel className="gap-2 px-4 py-3.5 text-[13px] text-pretty">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <I size={15} aria-hidden />
        {title}
      </div>
      {children}
    </Panel>
  );
}

/** Help page: how the estimates are calculated, what the labels mean, and what we never show. */
export function HelpScreen() {
  const { state, m } = useConcierge();
  const from = state.helpFrom === "home" ? { to: "home" as const, label: "Home" } : { to: "settings" as const, label: "Settings" };
  const storm = state.scenario !== "normal";
  return (
    <>
      <BackButton to={from.to} label={from.label} />
      <PageTitle>Help &amp; How It Works</PageTitle>

      <SectionHeader>How We Calculated Your Restoration Estimate</SectionHeader>
      <HelpCard icon={CalculatorIcon} title="Repair Time">
        {storm ? <p>{laborText(m)}</p> : <p>When a storm is on the way, we estimate how long repairs would take from the damage typical for your line.</p>}
        <ul className="flex list-disc flex-col gap-1 pl-4 text-muted-foreground">
          {ASSUME_TEXT.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="text-muted-foreground">
          We show a range, not a single time. It’s wider when we’re less sure about the storm. Use the Restoration Explorer on the home screen to see how damage, crews or blocked roads would move it.
        </p>
      </HelpCard>
      {storm && (
        <HelpCard icon={PackageIcon} title="What Crews May Replace">
          <p className="text-muted-foreground">
            For {damageText(m.input)} ({whatIfActive(m.input) ? "your what-if" : "the damage AEP reported"}), based on AEP’s distribution structure drawings and labor standards:
          </p>
          <ul className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            {materials(m.input).map((x) => (
              <li key={x.name} className="contents">
                <span className="text-right font-medium tabular-nums">{x.qty} ×</span>
                <span>{x.name}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">Each part has its own install and removal time, which is what adds up to the repair time above.</p>
        </HelpCard>
      )}

      <SectionHeader>How We Estimate Your Outage Chance</SectionHeader>
      <HelpCard icon={CloudLightningIcon} title="Outage Chance">
        <p>
          We compare your line with how it held up in the last {m.P.features.stormsTotal} storms on record (including February 2025), then adjust for this storm’s wind. Overhead wires, long lines, trees, and past
          damage on your circuit raise the chance. A backup feed from another circuit lowers it.
        </p>
        <p className="text-muted-foreground">Confidence is lower when the storm is stronger than most on record or when some of your line’s data is missing.</p>
      </HelpCard>

      <SectionHeader>What the Labels Mean</SectionHeader>
      <Panel className="overflow-hidden text-[13px]">
        {[
          { badge: <ConfirmedBadge scenario="outage" />, d: "Something AEP crews or systems have confirmed, like the damage they found." },
          { badge: <ModelEstimateBadge />, d: "Our best guess from past storms and AEP’s labor standards. Not a promise." },
          { badge: <ModelEstimateBadge whatIf />, d: "An estimate from changes you made in the Restoration Explorer, not AEP’s crew plan." },
        ].map((x, i) => (
          <div key={i} className="flex flex-col items-start gap-1.5 border-t px-4 py-3 first:border-t-0">
            {x.badge}
            <span className="text-pretty text-muted-foreground">{x.d}</span>
          </div>
        ))}
      </Panel>

      <SectionHeader>Your Privacy and Safety</SectionHeader>
      <HelpCard icon={ShieldCheckIcon} title="What We Never Show">
        <p className="text-muted-foreground">
          We never show other customers, crew names, or exact equipment locations. Your home appears only as an approximate area, and hospitals and fire stations as general areas. Needs you declare are never
          shared or shown on a map.
        </p>
        <p className="font-medium text-destructive">Stay at least 30 feet from downed wires, even if they look dead, and call 911.</p>
        <p className="text-muted-foreground">If something here doesn’t answer your question, contact AEP customer service.</p>
      </HelpCard>
    </>
  );
}

const CHANNELS: { k: keyof Channels; label: string; icon: LucideIcon; sub: string }[] = [
  { k: "push", label: "App Notifications", icon: BellIcon, sub: "Fastest" },
  { k: "sms", label: "Text Message", icon: MessageSquareTextIcon, sub: "(•••) •••-0412" },
  { k: "email", label: "Email", icon: MailIcon, sub: "j•••@gmail.com" },
  { k: "call", label: "Phone Call", icon: PhoneIcon, sub: "For urgent updates only" },
];

const PREVIEW_ICON: Record<PreviewMessage["icon"], LucideIcon> = {
  "cloud-lightning": CloudLightningIcon,
  "zap-off": ZapOffIcon,
  clock: ClockIcon,
  "circle-check": CircleCheckIcon,
};

export function NotificationsScreen() {
  const { state, m, set, flash } = useConcierge();
  const sc = state.scenario;
  const el = eligibility(m, state);
  const B = RISK[m.level];
  const medId = React.useId();
  const needId = React.useId();
  const chId = React.useId();
  const priority = priorityNeed(state);
  const esc = escalation(state);

  const toggleChannel = (k: keyof Channels) => {
    const forced = forcedChannel(state, k);
    if (forced) {
      flash(forced.replace(/^On /, "Stays on "));
      return;
    }
    set((s) => ({ ch: { ...s.ch, [k]: !s.ch[k] } }));
  };
  const setNeed = (k: keyof Needs, v: boolean) => set((s) => ({ needs: { ...s.needs, [k]: v } }));

  const rules = [
    { ok: el.riskOk, t: "Outage Chance Is Medium or High", d: sc === "normal" ? "No storm in the forecast." : m.confidence.reliable ? `Yours is ${B.label}.` : "We can’t estimate yours reliably, so we alert you to be safe." },
    {
      ok: priority,
      t: "Medical, Mobility, or Facility Need Declared",
      d: priority ? "Earlier alerts and a check-in if it runs long." : "Optional. Turn on above if it applies to you.",
    },
    { ok: true, t: "Phone Number on File", d: "Needed for texts and calls." },
  ];
  const timing = [
    { k: "Before a Storm", v: el.ok ? (priority ? "48 hours ahead." : "24 hours ahead.") : "Only when your chance is Medium or High." },
    { k: "If It Goes Out", v: "Within 5 minutes of AEP confirming the outage." },
    { k: "Updates", v: "Whenever our estimate moves by 2 hours or more, or every 6 hours if nothing changes." },
    { k: "Escalate", v: esc.v, warn: esc.warn },
  ];

  return (
    <>
      <BackButton to="settings" label="Settings" />
      <PageTitle>Notifications</PageTitle>

      <SectionHeader>Alert Status</SectionHeader>
      <div
        className={cn("flex flex-col gap-2 rounded-[14px] p-4 ring-1 ring-foreground/10", el.ok ? "bg-low-bg text-low-ink" : "bg-card text-foreground")}
      >
        {el.ok ? <BellRingIcon size={22} aria-hidden /> : <BellOffIcon size={22} aria-hidden />}
        <div className="text-[19px] leading-tight font-semibold tracking-[-0.01em] text-pretty">{el.ok ? "You Qualify for Storm Alerts" : "Outage Alerts Only"}</div>
        <p className="text-pretty">
          {el.ok
            ? (needsAlertText(state) ?? "We’ll warn you before a storm, confirm any outage, and keep you updated until power is back.")
            : "Your outage chance is low, so there’s no pre-storm alert right now."}
        </p>
      </div>

      <SectionHeader>Your Needs</SectionHeader>
      <Panel className="overflow-hidden">
        <label htmlFor={medId} className="flex cursor-pointer items-center gap-3 p-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-high-bg text-high-ink">
            <HeartPulseIcon size={17} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">I Rely on Powered Medical Equipment</span>
            <span className="text-xs text-pretty text-muted-foreground">We alert you earlier and call you if an outage runs long.</span>
          </span>
          <TouchSwitch id={medId} checked={state.medical} onCheckedChange={(medical) => set({ medical })} />
        </label>
        {(Object.keys(NEED_INFO) as (keyof Needs)[]).map((k) => {
          const n = NEED_INFO[k];
          const id = `${needId}-${k}`;
          return (
            <label key={k} htmlFor={id} className="flex cursor-pointer items-center gap-3 border-t p-3.5">
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink">
                <Icon name={n.icon} size={17} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{n.t}</span>
                <span className="text-xs text-pretty text-muted-foreground">{n.d}</span>
              </span>
              <TouchSwitch id={id} checked={state.needs[k]} onCheckedChange={(v) => setNeed(k, v)} />
            </label>
          );
        })}
      </Panel>
      <p className="-mt-1 px-1 text-xs text-pretty text-muted-foreground">
        Only you can turn these on. We never guess them from your account or the grid, and they’re never shared or shown on any map.
      </p>

      <SectionHeader>How We Reach You</SectionHeader>
      <Panel className="overflow-hidden">
        {CHANNELS.map((c) => {
          const id = `${chId}-${c.k}`;
          return (
            <label key={c.k} htmlFor={id} className="flex min-h-[54px] cursor-pointer items-center gap-3 border-t px-3.5 py-2.5 first:border-t-0">
              <c.icon size={18} className="shrink-0" aria-hidden />
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{forcedChannel(state, c.k) ?? c.sub}</span>
              </span>
              <TouchSwitch id={id} checked={channelOn(state.ch, state, c.k)} onCheckedChange={() => toggleChannel(c.k)} />
            </label>
          );
        })}
      </Panel>

      <SectionHeader>Alert Rules</SectionHeader>
      <Panel className="overflow-hidden">
        {rules.map((r) => (
          <div key={r.t} className="flex items-start gap-3 border-t px-3.5 py-2.5 first:border-t-0">
            <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full", r.ok ? "bg-low text-white" : "bg-secondary text-muted-foreground")}>
              {r.ok ? <CheckIcon size={13} strokeWidth={3} aria-label="Met" /> : <MinusIcon size={13} strokeWidth={3} aria-label="Not met" />}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-medium text-pretty">{r.t}</span>
              <span className="text-xs text-muted-foreground">{r.d}</span>
            </span>
          </div>
        ))}
      </Panel>

      <SectionHeader>When We’ll Message You</SectionHeader>
      <Panel className="overflow-hidden">
        {timing.map((tm) => (
          <div key={tm.k} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t px-3.5 py-2.5 first:border-t-0">
            <span className={cn("pt-px text-xs font-medium", tm.warn ? "text-high-ink" : "text-muted-foreground")}>{tm.k}</span>
            <span className="text-pretty">{tm.v}</span>
          </div>
        ))}
      </Panel>

      <SectionHeader>Advanced Notifications</SectionHeader>
      <Panel className="overflow-hidden">
        <label htmlFor={`${chId}-heartbeat`} className="flex cursor-pointer items-center gap-3 p-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink">
            <ClockIcon size={17} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">Status Heartbeat Every 6 Hours</span>
            <span className="text-xs text-pretty text-muted-foreground">If nothing changes during an outage, we still check in so you know we’re watching.</span>
          </span>
          <TouchSwitch
            id={`${chId}-heartbeat`}
            checked={state.alertPrefs.heartbeat}
            onCheckedChange={(heartbeat) => set((s) => ({ alertPrefs: { ...s.alertPrefs, heartbeat } }))}
          />
        </label>
        <label htmlFor={`${chId}-centers`} className="flex cursor-pointer items-center gap-3 border-t p-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink">
            <MapPinIcon size={17} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">Send Center List on Escalation</span>
            <span className="text-xs text-pretty text-muted-foreground">When a long outage escalates, include warming and cooling center areas (approximate only).</span>
          </span>
          <TouchSwitch
            id={`${chId}-centers`}
            checked={state.alertPrefs.centerList}
            onCheckedChange={(centerList) => set((s) => ({ alertPrefs: { ...s.alertPrefs, centerList } }))}
          />
        </label>
        <label htmlFor={`${chId}-digest`} className="flex cursor-pointer items-center gap-3 border-t p-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-high-bg text-high-ink">
            <Building2Icon size={17} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">Critical Facility Ops Digest</span>
            <span className="text-xs text-pretty text-muted-foreground">
              {state.needs.facility
                ? "Short ops updates for staff while your site is without power."
                : "Turn on “This Account Is a Critical Facility” above to enable."}
            </span>
          </span>
          <TouchSwitch
            id={`${chId}-digest`}
            checked={state.alertPrefs.facilityDigest && state.needs.facility}
            onCheckedChange={(facilityDigest) => {
              if (!state.needs.facility) {
                flash("Declare a critical facility in Your Needs first");
                return;
              }
              set((s) => ({ alertPrefs: { ...s.alertPrefs, facilityDigest } }));
            }}
          />
        </label>
      </Panel>
      <p className="-mt-1 px-1 text-xs text-pretty text-muted-foreground">
        Escalation timing: medical or facility at 4 hours, mobility at 12 hours, otherwise centers at 24 hours.{" "}
        <button type="button" className="font-medium text-brand-ink underline-offset-2 hover:underline" onClick={() => set({ screen: "services", servicesFrom: "notifications" })}>
          Open Services
        </button>
      </p>

      <SectionHeader>Message Previews</SectionHeader>
      {previewMessages(m, state).map((ms) => {
        const I = PREVIEW_ICON[ms.icon];
        return (
          <div key={ms.key} className={cn("flex flex-col gap-2.5 rounded-[14px] bg-card p-3.5", ms.current ? "ring-2 ring-brand" : "ring-1 ring-foreground/10")}>
            <div className="flex items-center gap-2">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-muted">
                <I size={15} aria-hidden />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{ms.title}</span>
                <span className="text-xs text-muted-foreground">{ms.meta}</span>
              </span>
              <span
                className={cn(
                  "inline-flex h-[22px] items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
                  ms.current ? "bg-brand text-white" : ms.status === "Sent" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {ms.status}
              </span>
            </div>
            <div className="max-w-[94%] self-start rounded-[16px_16px_16px_4px] bg-muted px-3 py-2.5 text-sm leading-[1.45] text-pretty">{ms.text}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{ms.count}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => flash(`Test “${ms.title}” sent to your phone`)}
                className="h-[30px] px-2.5 text-[13px] text-brand-ink hover:bg-brand-soft hover:text-brand-ink"
              >
                Send Me a Test
                <SendIcon />
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function LocationScreen() {
  const { state, submitId, pickPremise } = useConcierge();
  const [draft, setDraft] = React.useState("");
  return (
    <>
      <BackButton to="settings" label="Settings" />
      <PageTitle>Location</PageTitle>

      <SectionHeader>Choose Your Location</SectionHeader>
      <Panel className="p-1.5">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sample Locations (Anonymized)</div>
        {[...Object.values(PREMISES), LIMITED_SAMPLE.record].map((p) => {
          const on = p.id === state.premise && !state.unknownId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPremise(p.id)}
              aria-current={on || undefined}
              className={cn("flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent", on && "bg-accent")}
            >
              {on ? <CircleCheckIcon size={16} aria-hidden /> : <MapPinIcon size={16} aria-hidden />}
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{p.area}</span>
                <span className="text-xs text-muted-foreground">{p.kind}</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
            </button>
          );
        })}
        <div className="-mx-1.5 my-1.5 h-px bg-border" />
        <form
          className="flex gap-1.5 px-0.5 pt-1 pb-0.5"
          onSubmit={(e) => {
            e.preventDefault();
            submitId(draft);
            setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Premise or circuit ID"
            aria-label="Premise or circuit ID"
            className="h-11 min-w-0 flex-1 rounded-[10px] px-2.5 text-base md:text-base"
          />
          <Button type="submit" className="h-11 rounded-[10px] bg-brand px-3.5 text-white hover:bg-brand-hover">
            Check
          </Button>
        </form>
      </Panel>
      <div className="flex gap-2 px-1 text-xs text-muted-foreground">
        <ShieldCheckIcon size={14} className="mt-px shrink-0" aria-hidden />
        <span className="text-pretty">We use an anonymized ID, never your address. On the map your home appears only as a rough area.</span>
      </div>
    </>
  );
}
