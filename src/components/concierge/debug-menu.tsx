"use client";

import * as React from "react";
import { BugIcon, ChevronDownIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { ORDER, PREMISES, SC, TONE, WHERE, timeText, type Access, type DamageWhere } from "@/lib/concierge/model";
import { RISK, RISK_ORDER, type RiskLevel } from "@/lib/concierge/risk";
import { useConcierge, type Screen } from "@/components/concierge/store";

/**
 * Dev-only control strip for previewing every state of the app. Shown in development,
 * or in a production build when NEXT_PUBLIC_DEBUG_MENU=1.
 */
export const DEBUG_MENU = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MENU === "1";

const SCENARIO_SHORT = { normal: "All Clear", watch: "Watch Alert", outage: "Power Outage", restoring: "Restoring", restored: "Restored" } as const;
const ACCESS: { id: Access; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "limited", label: "Debris" },
  { id: "blocked", label: "Trees Down" },
];
const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "settings", label: "Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "location", label: "Location" },
  { id: "help", label: "Help" },
];
const UNKNOWN_ID = "X-00000";

function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex items-baseline gap-1.5 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        {label}
        {hint && <span className="font-normal tracking-normal text-zinc-500 normal-case">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

function Seg<T extends string>({ value, options, onChange, dots }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; dots?: Partial<Record<T, string>> }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
              on ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
            )}
          >
            {dots?.[o.id] && <span className="size-1.5 rounded-full" style={{ background: dots[o.id] }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-2 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        checked ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
      )}
    >
      <span className={cn("size-1.5 rounded-full", checked ? "bg-emerald-500" : "bg-zinc-500")} />
      {label}
    </button>
  );
}

function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = "flex size-7 cursor-pointer items-center justify-center rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
      <span className="mr-0.5 text-xs text-zinc-300">{label}</span>
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
        <MinusIcon size={12} />
      </button>
      <span className="w-5 text-center text-xs font-semibold tabular-nums">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
        <PlusIcon size={12} />
      </button>
    </div>
  );
}

function ActionButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn("inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 text-xs font-medium whitespace-nowrap text-zinc-200 transition-colors hover:bg-zinc-700", className)}
      {...props}
    />
  );
}

export function DebugMenu() {
  const { state, m, set, openStatus, openChat, pickPremise, resetAll } = useConcierge();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  const sc = state.scenario;
  const calc = m.risk.level;
  const t = timeText(m);
  const glowing = sc !== "normal" && state.seen !== sc;
  const location = state.unknownId ? "unknown" : state.premise;

  const summary = [
    SCENARIO_SHORT[sc],
    `${RISK[m.level].label}${state.riskOverride ? " (forced)" : ""}`,
    sc === "normal" ? "calm" : `${state.wind} mph`,
    // A real premise from /api/premise has a hashed id that isn't in the demo PREMISES map.
    state.unknownId ? `ID ${state.unknownId}` : (state.premiseOverride?.record.area ?? PREMISES[state.premise]?.area ?? "Unknown"),
    `back ${t.hours}`,
  ];

  return (
    <section aria-label="Debug menu" className="shrink-0 border-b border-zinc-800 bg-zinc-950 text-zinc-100" style={{ colorScheme: "dark" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-8 w-full cursor-pointer items-center gap-2 px-3 text-left text-xs"
      >
        <span className="inline-flex items-center gap-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-950 uppercase">
          <BugIcon size={11} />
          Debug
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap text-zinc-300">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: TONE[SC[sc].tone].c }} />
          <span className="truncate">{summary.join(" · ")}</span>
        </span>
        <ChevronDownIcon size={14} className={cn("shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="max-h-[55dvh] overflow-y-auto border-t border-zinc-800 px-3 pt-3 pb-3.5">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Scenario" className="sm:col-span-2">
              <Seg
                value={sc}
                options={ORDER.map((id) => ({ id, label: SCENARIO_SHORT[id] }))}
                dots={Object.fromEntries(ORDER.map((id) => [id, TONE[SC[id].tone].c]))}
                onChange={(scenario) => set({ scenario })}
              />
            </Field>

            <Field label="Outage chance" hint={`calculated: ${RISK[calc].short} (score ${m.risk.score.toFixed(2)})`} className="sm:col-span-2">
              <Seg<RiskLevel | "auto">
                value={state.riskOverride ?? "auto"}
                options={[{ id: "auto", label: `Auto · ${RISK[calc].short}` }, ...RISK_ORDER.map((id) => ({ id, label: RISK[id].label }))]}
                dots={Object.fromEntries(RISK_ORDER.map((id) => [id, RISK[id].c]))}
                onChange={(v) => set({ riskOverride: v === "auto" ? null : v })}
              />
            </Field>

            <Field label="Wind gusts" hint={sc === "normal" ? "ignored in All Clear (calm 18 mph)" : undefined}>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={state.wind}
                  onChange={(e) => set({ wind: Number(e.target.value) })}
                  aria-label="Wind gusts in mph"
                  className="h-7 min-w-0 flex-1 cursor-pointer accent-amber-400"
                />
                <span className="w-14 text-right text-xs font-semibold tabular-nums">{state.wind} mph</span>
              </div>
            </Field>

            <Field label="Location">
              <Seg
                value={location}
                options={[...Object.values(PREMISES).map((p) => ({ id: p.id, label: p.area })), { id: "unknown", label: "Unknown ID" }]}
                onChange={(id) => (id === "unknown" ? set({ unknownId: UNKNOWN_ID }) : pickPremise(id))}
              />
            </Field>

            <Field label="Damage & crews" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Num label="Poles" value={state.poles} min={0} max={6} onChange={(poles) => set({ poles })} />
                <Num label="Wires" value={state.spans} min={0} max={10} onChange={(spans) => set({ spans })} />
                <Num label="Crews" value={state.crews} min={1} max={6} onChange={(crews) => set({ crews })} />
                <Toggle label="Transformer" checked={state.xfmr} onChange={(xfmr) => set({ xfmr })} />
                <Toggle label="Restore in steps" checked={state.reroute} onChange={(reroute) => set({ reroute })} />
              </div>
            </Field>

            <Field label="Road access">
              <Seg value={state.access} options={ACCESS} onChange={(access) => set({ access })} />
            </Field>

            <Field label="Damage location" hint={m.e.stepped ? "step restore" : undefined}>
              <Seg<DamageWhere>
                value={state.where}
                options={(["street", "branch", "main"] as const).map((id) => ({ id, label: WHERE[id].label }))}
                onChange={(where) => set({ where })}
              />
            </Field>

            <Field label="Customer">
              <div className="flex flex-wrap gap-1">
                <Toggle label="Medical equipment" checked={state.medical} onChange={(medical) => set({ medical })} />
                <Toggle label="Mobility" checked={state.needs.mobility} onChange={(mobility) => set((s) => ({ needs: { ...s.needs, mobility } }))} />
                <Toggle label="Hearing" checked={state.needs.hearing} onChange={(hearing) => set((s) => ({ needs: { ...s.needs, hearing } }))} />
                <Toggle label="Vision" checked={state.needs.vision} onChange={(vision) => set((s) => ({ needs: { ...s.needs, vision } }))} />
                <Toggle label="Critical facility" checked={state.needs.facility} onChange={(facility) => set((s) => ({ needs: { ...s.needs, facility } }))} />
                <Toggle label="Texts" checked={state.ch.sms} onChange={(sms) => set((s) => ({ ch: { ...s.ch, sms } }))} />
                <Toggle label="Push" checked={state.ch.push} onChange={(push) => set((s) => ({ ch: { ...s.ch, push } }))} />
              </div>
            </Field>

            <Field label="Screen" className="sm:col-span-2">
              <Seg value={state.screen} options={SCREENS} onChange={(screen) => set({ screen, statusOpen: false, chatOpen: false, inboxOpen: false })} />
            </Field>

            <Field label="Theme">
              <Seg
                value={(theme ?? "system") as "light" | "dark" | "system"}
                options={[
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "system", label: "System" },
                ]}
                onChange={setTheme}
              />
            </Field>

            <Field label="Panels & effects">
              <div className="flex flex-wrap gap-1">
                {/* The pill glows while the current status is unseen; All Clear never glows. */}
                <Toggle label="Pill glow" checked={glowing} onChange={(on) => set((s) => ({ seen: on ? "normal" : s.scenario }))} />
                <Toggle label="Why we think so" checked={state.factorsOpen} onChange={(factorsOpen) => set({ factorsOpen })} />
              </div>
            </Field>

            <Field label="Actions" className="sm:col-span-2 xl:col-span-4">
              <div className="flex flex-wrap gap-1">
                <ActionButton onClick={openStatus}>Open status</ActionButton>
                <ActionButton onClick={openChat}>Open chat</ActionButton>
                <ActionButton onClick={() => set((s) => ({ chat: s.chat.slice(0, 1), typing: false }))}>Clear chat</ActionButton>
                <ActionButton onClick={() => resetAll()} className="bg-red-950 text-red-200 hover:bg-red-900">
                  <RotateCcwIcon size={12} />
                  Reset everything
                </ActionButton>
              </div>
            </Field>
          </div>
        </div>
      )}
    </section>
  );
}
