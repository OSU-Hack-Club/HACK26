"use client";

import { ShieldUserIcon, UserIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ORDER, SC, TONE } from "@/lib/concierge/model";
import { Dot, Panel } from "@/components/concierge/primitives";
import { useConcierge, type Role } from "@/components/concierge/store";

/** Show the judges' demo controls (scenario + account view). Hide them in production with NEXT_PUBLIC_HIDE_DEMO=1. */
export const SHOW_DEMO = process.env.NEXT_PUBLIC_HIDE_DEMO !== "1";

const pill = (on: boolean) =>
  cn(
    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
    on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
  );

const ROLES: { id: Role; label: string; icon: LucideIcon }[] = [
  { id: "customer", label: "Customer", icon: UserIcon },
  { id: "staff", label: "AEP Staff", icon: ShieldUserIcon },
];

export function AccountViewSwitch() {
  const { role, setRole, set } = useConcierge();
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Account view">
      {ROLES.map(({ id, label, icon: I }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={role === id}
          onClick={() => {
            if (role === id) return;
            set({ screen: "home", statusOpen: false, chatOpen: false, inboxOpen: false });
            setRole(id);
          }}
          className={pill(role === id)}
        >
          <I size={14} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

export function ScenarioSwitch({ goHome = true }: { goHome?: boolean }) {
  const { state, set } = useConcierge();
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Demo scenario">
      {ORDER.map((id) => (
        <button key={id} type="button" role="radio" aria-checked={id === state.scenario} onClick={() => set(goHome ? { scenario: id, screen: "home" } : { scenario: id })} className={pill(id === state.scenario)}>
          <Dot color={TONE[SC[id].tone].c} />
          {SC[id].label}
        </button>
      ))}
    </div>
  );
}

/** The Demo panel shown in customer Settings and in the staff console's Controls tab. */
export function DemoPanel({ goHome = true }: { goHome?: boolean }) {
  return (
    <Panel className="gap-4 p-3.5">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">Account View</span>
          <span className="text-xs text-pretty text-muted-foreground">Swap between the customer app and the AEP staff console (audit trail and review queue).</span>
        </div>
        <AccountViewSwitch />
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">Demo Scenario</span>
          <span className="text-xs text-muted-foreground">For judging. Switches the outage map and every status in the app.</span>
        </div>
        <ScenarioSwitch goHome={goHome} />
      </div>
    </Panel>
  );
}
