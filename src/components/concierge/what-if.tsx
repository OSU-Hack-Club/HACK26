"use client";

import * as React from "react";
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DEF, WHERE, accessHistoryText, stepText, whatIfActive, type Access, type DamageWhere, type WhatIf } from "@/lib/concierge/model";
import { TouchSwitch } from "@/components/concierge/primitives";
import { useConcierge } from "@/components/concierge/store";

const ACCESS: { id: Access; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "limited", label: "Some Debris" },
  { id: "blocked", label: "Trees Down" },
];
const WHERES: DamageWhere[] = ["street", "branch", "main"];

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3">
      <div className="flex items-center gap-3">
        <label htmlFor={htmlFor} className="flex-1 font-medium">
          {label}
        </label>
        {children}
      </div>
      {hint && <p className="text-[13px] text-pretty text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <Button variant="outline" size="icon" className="size-9" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label.toLowerCase()}`}>
        <MinusIcon />
      </Button>
      <output aria-live="polite" className="w-6 text-center text-base font-semibold tabular-nums">
        {value}
      </output>
      <Button variant="outline" size="icon" className="size-9" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label.toLowerCase()}`}>
        <PlusIcon />
      </Button>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
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
              "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Customer-facing what-if controls for the restoration estimate: damage, where it is, crews, road access,
 * and step restoration. Every change re-runs the estimate; "Reset" returns to the reported damage.
 */
export function WhatIfControls() {
  const { state, m, set } = useConcierge();
  const xfmrId = React.useId();
  const stepId = React.useId();
  const active = whatIfActive(state);
  const patch = (p: Partial<WhatIf>) => set(p);

  return (
    <div className="flex flex-col">
      <p className="px-4 pb-3 text-[13px] text-pretty text-muted-foreground">
        {state.scenario === "watch"
          ? "We assumed damage like a typical storm on your line. Change it to see how the estimate moves."
          : "We started from the damage crews reported. Change it to see how the estimate moves."}{" "}
        These are what-ifs, not AEP’s crew plan.
      </p>
      <Row label="Broken Poles">
        <Stepper label="Broken poles" value={state.poles} min={0} max={6} onChange={(poles) => patch({ poles })} />
      </Row>
      <Row label="Downed Wire Spans">
        <Stepper label="Downed wire spans" value={state.spans} min={0} max={10} onChange={(spans) => patch({ spans })} />
      </Row>
      <Row label="Damaged Transformer" htmlFor={xfmrId}>
        <TouchSwitch id={xfmrId} checked={state.xfmr} onCheckedChange={(xfmr) => patch({ xfmr })} />
      </Row>
      <div className="flex flex-col gap-2 border-t px-4 py-3">
        <span className="font-medium">Where Is the Damage?</span>
        <Choice label="Where is the damage" value={state.where} options={WHERES.map((id) => ({ id, label: WHERE[id].label }))} onChange={(where) => patch({ where })} />
        <p className="text-[13px] text-pretty text-muted-foreground">{WHERE[state.where].hint}</p>
      </div>
      <Row label="Restore in Steps" htmlFor={stepId} hint={stepText(m, state)}>
        <TouchSwitch id={stepId} checked={state.reroute && m.e.canStep} disabled={!m.e.canStep} onCheckedChange={(reroute) => patch({ reroute })} />
      </Row>
      <Row label="Crews Assigned" hint={m.input.crews > m.e.working ? `Only ${m.e.sites.length} damage site${m.e.sites.length > 1 ? "s" : ""}, so more crews won’t speed this up.` : undefined}>
        <Stepper label="Crews" value={state.crews} min={1} max={6} onChange={(crews) => patch({ crews })} />
      </Row>
      <div className="flex flex-col gap-2 border-t px-4 py-3">
        <span className="font-medium">Roads to the Damage</span>
        <Choice label="Roads to the damage" value={state.access} options={ACCESS} onChange={(access) => patch({ access })} />
        <p className="text-[13px] text-pretty text-muted-foreground">{accessHistoryText()}</p>
      </div>
      <div className="border-t px-4 pt-3 pb-4">
        <Button
          variant="outline"
          disabled={!active}
          onClick={() => patch({ poles: DEF.poles, spans: DEF.spans, xfmr: DEF.xfmr, crews: DEF.crews, access: DEF.access, where: DEF.where, reroute: DEF.reroute })}
          className="h-10 px-3.5"
        >
          <RotateCcwIcon />
          {state.scenario === "watch" ? "Back to Typical Damage" : "Back to Reported Damage"}
        </Button>
      </div>
    </div>
  );
}
