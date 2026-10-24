"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import {
  BellIcon,
  BellOffIcon,
  BellRingIcon,
  CalculatorIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CloudLightningIcon,
  ClockIcon,
  HeartPulseIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  MinusIcon,
  MoonIcon,
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
  RISK,
  ORDER,
  PREMISES,
  SC,
  TONE,
  channelList,
  channelOn,
  eligibility,
  previewMessages,
  type Channels,
  type PreviewMessage,
} from "@/lib/concierge/model";
import { Dot, Panel, SectionHeader, TouchSwitch } from "@/components/concierge/primitives";
import { useConcierge, type Screen } from "@/components/concierge/store";

/** Show the judges' scenario switcher. Hide it in production. */
const SHOW_DEMO = process.env.NEXT_PUBLIC_HIDE_DEMO !== "1";

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
              {el.ok ? "Storm alerts on" : "Outage alerts only"} · {channelList(state.ch, state.medical)}
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
        <label htmlFor={darkId} className={rowClass}>
          <IconTile icon={MoonIcon} />
          <span className="flex-1 font-medium">Dark Mode</span>
          <DarkModeSwitch id={darkId} />
        </label>
      </Panel>

      {SHOW_DEMO && (
        <>
          <SectionHeader>Demo</SectionHeader>
          <Panel className="gap-2.5 p-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Demo Scenario</span>
              <span className="text-xs text-muted-foreground">For judging. Switches the outage map and every status in the app.</span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Demo scenario">
              {ORDER.map((id) => {
                const on = id === state.scenario;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set({ scenario: id, screen: "home" })}
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                    )}
                  >
                    <Dot color={TONE[SC[id].tone].c} />
                    {SC[id].label}
                  </button>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      <SectionHeader>About</SectionHeader>
      <div className="flex flex-col gap-1.5 rounded-[14px] border border-dashed px-4 py-3.5 text-[13px]">
        <div className="flex items-center gap-1.5 font-medium">
          <CalculatorIcon size={14} aria-hidden />
          How We Estimate
        </div>
        <span className="text-pretty text-muted-foreground">
          Outage chance compares your line with how it held up in past storms (including February 2025), adjusted for the forecast. Repair hours come from AEP’s labor standards, multiplied by 4.5 for travel, safety briefings and setup. We never show other customers, crew names or exact equipment locations.
        </span>
      </div>
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
  const chId = React.useId();

  const toggleChannel = (k: keyof Channels) => {
    if (k === "call" && state.medical) {
      flash("Phone calls stay on while medical equipment is declared");
      return;
    }
    set((s) => ({ ch: { ...s.ch, [k]: !s.ch[k] } }));
  };

  const rules = [
    { ok: el.riskOk, t: "Outage Chance Is Medium or High", d: sc === "normal" ? "No storm in the forecast." : `Yours is ${B.label}.` },
    { ok: state.medical, t: "Medical Equipment Declared", d: state.medical ? "Earlier alerts and a phone call if it runs long." : "Optional. Turn on above if it applies to you." },
    { ok: true, t: "Phone Number on File", d: "Needed for texts and calls." },
  ];
  const timing = [
    { k: "Before a Storm", v: el.ok ? (state.medical ? "48 hours ahead." : "24 hours ahead.") : "Only when your chance is Medium or High." },
    { k: "If It Goes Out", v: "Within 5 minutes of AEP confirming the outage." },
    { k: "Updates", v: "Whenever our estimate moves by 2 hours or more, or every 6 hours if nothing changes." },
    {
      k: "Escalate",
      v: state.medical ? "If the outage passes 4 hours, we call you and flag your home for a welfare check." : "If the outage passes 24 hours, we send a list of warming and cooling centers.",
      warn: state.medical,
    },
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
            ? state.medical
              ? "Because you rely on medical equipment, we’ll alert you earlier and call you if an outage runs long."
              : "We’ll warn you before a storm, confirm any outage, and keep you updated until power is back."
            : "Your outage chance is low, so there’s no pre-storm alert right now."}
        </p>
      </div>

      <SectionHeader>Medical Needs</SectionHeader>
      <label htmlFor={medId} className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-card p-3.5 text-card-foreground ring-1 ring-foreground/10">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-high-bg text-high-ink">
          <HeartPulseIcon size={17} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">I Rely on Powered Medical Equipment</span>
          <span className="text-xs text-pretty text-muted-foreground">
            Only you can turn this on. We use it to alert you earlier and call you. It’s never shared or shown on any map.
          </span>
        </span>
        <TouchSwitch id={medId} checked={state.medical} onCheckedChange={(medical) => set({ medical })} />
      </label>

      <SectionHeader>How We Reach You</SectionHeader>
      <Panel className="overflow-hidden">
        {CHANNELS.map((c) => {
          const id = `${chId}-${c.k}`;
          return (
            <label key={c.k} htmlFor={id} className="flex min-h-[54px] cursor-pointer items-center gap-3 border-t px-3.5 py-2.5 first:border-t-0">
              <c.icon size={18} className="shrink-0" aria-hidden />
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{c.k === "call" && state.medical ? "On because of medical equipment" : c.sub}</span>
              </span>
              <TouchSwitch id={id} checked={channelOn(state.ch, state.medical, c.k)} onCheckedChange={() => toggleChannel(c.k)} />
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
        {Object.values(PREMISES).map((p) => {
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
