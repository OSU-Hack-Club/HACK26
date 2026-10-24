// Outage-chance assessment. A list of weighted indicators each scores one
// signal from 0 to 1; the weighted sum is bucketed into a qualitative level.
// To change how the chance is calculated, add/remove/reweight INDICATORS or
// move THRESHOLDS. Nothing outside this file depends on the raw math.

export type RiskLevel = "minimal" | "low" | "medium" | "high";

export interface RiskContext {
  /** Is a storm in the forecast? With none, the level is always "minimal". */
  storm: boolean;
  /** Forecast gust speed, mph. */
  wind: number;
  overhead: boolean;
  /** Tree cover near the line, 0–1. */
  tree: number;
  /** One line feeds the street, no backup route. */
  single: boolean;
  /** Outages caused by the last `hitsOf` big storms. */
  hits: number;
  hitsOf: number;
}

export interface RiskIndicator {
  id: string;
  label: string;
  /** Share of the total score this indicator can contribute. */
  weight: number;
  /** Signal strength, 0–1. */
  value: (c: RiskContext) => number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Storm strength, 0 at 25 mph gusts and 1 at 80 mph. */
export const windStrength = (wind: number) => clamp01((wind - 25) / 55);

export const BASELINE = 0.05;

export const INDICATORS: RiskIndicator[] = [
  { id: "wind", label: "Storm winds on exposed lines", weight: 0.5, value: (c) => windStrength(c.wind) * (c.overhead ? 1 : 0.35) },
  { id: "trees", label: "Trees near the line", weight: 0.18, value: (c) => c.tree * windStrength(c.wind) },
  { id: "single", label: "No backup feed", weight: 0.07, value: (c) => (c.single ? 1 : 0) },
  { id: "history", label: "Past storm outages", weight: 0.15, value: (c) => (c.hitsOf ? c.hits / c.hitsOf : 0) },
];

/** Lower bound of each level's score range, highest first. */
export const THRESHOLDS: [RiskLevel, number][] = [
  ["high", 0.65],
  ["medium", 0.4],
  ["low", 0.2],
  ["minimal", 0],
];

export interface RiskContribution { id: string; label: string; value: number; points: number }
export interface RiskAssessment { level: RiskLevel; score: number; contributions: RiskContribution[] }

export function assessRisk(c: RiskContext, indicators: RiskIndicator[] = INDICATORS): RiskAssessment {
  const contributions = indicators.map((i) => {
    const value = clamp01(i.value(c));
    return { id: i.id, label: i.label, value, points: value * i.weight };
  });
  const score = clamp01(BASELINE + contributions.reduce((a, x) => a + x.points, 0));
  const level = c.storm ? (THRESHOLDS.find(([, min]) => score >= min)?.[0] ?? "minimal") : "minimal";
  return { level, score, contributions };
}

export const RISK_ORDER: RiskLevel[] = ["minimal", "low", "medium", "high"];

export interface RiskLevelInfo {
  /** "High" */
  short: string;
  /** "High Chance" */
  label: string;
  /** One-line explanation. */
  detail: string;
  c: string;
  bg: string;
  ink: string;
  fg: string;
}

const tone = (k: "low" | "mid" | "high") => ({ c: `var(--${k})`, bg: `var(--${k}-bg)`, ink: `var(--${k}-ink)`, fg: `var(--${k}-fg)` });

export const RISK: Record<RiskLevel, RiskLevelInfo> = {
  minimal: { short: "Minimal", label: "Minimal Chance", detail: "Homes like yours almost never lose power in conditions like these.", ...tone("low") },
  low: { short: "Low", label: "Low Chance", detail: "Most homes like yours keep their power through a storm like this.", ...tone("low") },
  medium: { short: "Medium", label: "Medium Chance", detail: "Some homes like yours lose power in a storm like this. It’s worth getting ready.", ...tone("mid") },
  high: { short: "High", label: "High Chance", detail: "Many homes like yours lose power in a storm like this. Plan for an outage.", ...tone("high") },
};

/** Levels that warrant a pre-storm alert. */
export const alertWorthy = (level: RiskLevel) => level === "medium" || level === "high";
