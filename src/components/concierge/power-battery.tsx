"use client";

import * as React from "react";

import type { RiskLevel } from "@/lib/concierge/risk";
import { cn } from "@/lib/utils";

/** What the battery shows. Each state has its own color and motion. */
export type PowerState = "on" | "at-risk" | "critical" | "out" | "restoring" | "restored";

const STATES: Record<PowerState, { label: string; c: string; ink: string }> = {
  on: { label: "Power on", c: "var(--low)", ink: "var(--low-ink)" },
  "at-risk": { label: "Power on, at risk", c: "var(--mid)", ink: "var(--mid-ink)" },
  critical: { label: "Power on, critical outage chance", c: "var(--high)", ink: "var(--high-ink)" },
  out: { label: "Power out", c: "var(--high)", ink: "var(--high-ink)" },
  restoring: { label: "Power being restored", c: "var(--brand)", ink: "var(--brand-ink)" },
  restored: { label: "Power restored", c: "var(--low)", ink: "var(--low-ink)" },
};

/** Five cells inside the 36×20 battery body. Lit width at n cells: 4n + (n - 1). */
const CELLS = [4, 9, 14, 19, 24];
const CELL_W = 4;
const LIT = "0;4;9;14;19;24;24";

/** Lit cells and color for each outage-chance level: the higher the chance, the emptier the battery. */
const CHANCE: Record<RiskLevel, { lit: number; c: string; ink: string; label: string }> = {
  minimal: { lit: 5, c: "var(--low)", ink: "var(--low-ink)", label: "Minimal" },
  low: { lit: 4, c: "var(--low)", ink: "var(--low-ink)", label: "Low" },
  medium: { lit: 2, c: "var(--mid)", ink: "var(--mid-ink)", label: "Medium" },
  high: { lit: 1, c: "var(--high)", ink: "var(--high-ink)", label: "High" },
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function useReducedMotion() {
  return React.useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
}

/** Battery glyph for the outage chance: charge drops as the chance rises. Static, so no motion to reduce. */
export function ChanceBattery({ level, className }: { level: RiskLevel; className?: string }) {
  const s = CHANCE[level];
  return (
    <svg viewBox="0 0 36 20" role="img" aria-label={`Outage chance: ${s.label}`} className={cn("h-[18px] w-8 shrink-0", className)} style={{ color: s.ink }}>
      <rect x={1} y={1} width={30} height={18} rx={4.5} fill="none" stroke="currentColor" strokeWidth={1.75} />
      <rect x={32.5} y={6.5} width={2.5} height={7} rx={1.25} fill="currentColor" />
      {CELLS.map((x, i) => (
        <rect key={x} x={x} y={4} width={CELL_W} height={12} rx={1.5} fill={i < s.lit ? s.c : "currentColor"} opacity={i < s.lit ? 1 : 0.14} />
      ))}
    </svg>
  );
}

/**
 * Battery glyph for the power state. Full and green when on, a flickering top cell before
 * a storm, empty with a warning when out, charging while crews restore, filling up once restored.
 */
export function PowerBattery({ state, className }: { state: PowerState; className?: string }) {
  const s = STATES[state];
  const still = useReducedMotion();
  const clipId = `pb-${React.useId().replace(/[^\w-]/g, "")}`;
  const filled = state === "on" || state === "at-risk" || state === "critical" || state === "restored";
  const clipped = state === "restoring" || (state === "restored" && !still);

  return (
    <svg
      // Remount on change so the SMIL timeline (charge loop, fill sweep) restarts.
      key={`${state}-${still}`}
      viewBox="0 0 36 20"
      role="img"
      aria-label={s.label}
      className={cn("h-[18px] w-8 shrink-0", className)}
      style={{ color: s.ink }}
    >
      <rect x={1} y={1} width={30} height={18} rx={4.5} fill="none" stroke="currentColor" strokeWidth={1.75} />
      <rect x={32.5} y={6.5} width={2.5} height={7} rx={1.25} fill="currentColor" />

      {/* Empty cell track. */}
      {!filled && CELLS.map((x) => <rect key={x} x={x} y={4} width={CELL_W} height={12} rx={1.5} fill="currentColor" opacity={0.14} />)}

      {clipped && (
        <clipPath id={clipId}>
          <rect x={4} y={4} width={state === "restoring" && still ? 9 : 0} height={12}>
            {state === "restoring" && !still && <animate attributeName="width" values={LIT} dur="2.4s" calcMode="discrete" repeatCount="indefinite" />}
            {state === "restored" && <animate attributeName="width" from="0" to="24" begin="0.15s" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />}
          </rect>
        </clipPath>
      )}

      {state !== "out" && (
        <g clipPath={clipped ? `url(#${clipId})` : undefined}>
          {CELLS.map((x, i) => (
            <rect key={x} x={x} y={4} width={CELL_W} height={12} rx={1.5} fill={s.c}>
              {(state === "at-risk" || state === "critical") && i === CELLS.length - 1 && !still && (
                <animate attributeName="opacity" values="1;0.2;1" dur={state === "critical" ? "0.8s" : "1.6s"} repeatCount="indefinite" />
              )}
            </rect>
          ))}
        </g>
      )}

      {state === "restoring" && (
        <path d="M17.6 2.8 11.4 11h4.1l-1.1 6.2L20.6 9h-4.1z" fill="currentColor" stroke="var(--card)" strokeWidth={1.25} strokeLinejoin="round" paintOrder="stroke" />
      )}

      {state === "out" && (
        <g fill={s.c}>
          {!still && <animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite" />}
          <rect x={15.1} y={4.5} width={1.8} height={7} rx={0.9} />
          <circle cx={16} cy={14.4} r={1.15} />
        </g>
      )}
    </svg>
  );
}
