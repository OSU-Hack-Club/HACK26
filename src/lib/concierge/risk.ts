// Outage-chance assessment. Each weighted indicator turns premise features (src/lib/concierge/features.ts)
// into a 0–1 signal; storm-driven indicators are then scaled by wind strength. The weighted sum is
// bucketed into a qualitative level. To change the math, add/remove/reweight INDICATORS or move
// THRESHOLDS, then rerun `npm run data:risk` to see the level mix and backtest. See DEVELOPMENT.md.
//
// Keep this file free of runtime imports (type-only imports are fine): the Node build script imports it directly.

import type { FeatureNorms, NormKey, PremiseFeatures } from "@/lib/concierge/features";

export type RiskLevel = "minimal" | "low" | "medium" | "high" | "critical";

export interface RiskContext {
  /** Is a storm in the forecast? With none, the level is always "minimal". */
  storm: boolean;
  /** Forecast gust speed, mph. */
  wind: number;
  features: PremiseFeatures;
  norms: FeatureNorms;
}

export type IndicatorId = "wind" | "trees" | "line" | "rural" | "feeder" | "single" | "history" | "path";

export interface RiskIndicator {
  id: IndicatorId;
  label: string;
  /** Share of the total score this indicator can contribute. */
  weight: number;
  /** Feature-only signal, 0–1, before any storm scaling. null = the input data is missing. */
  signal: (c: RiskContext) => number | null;
  /** Signal assumed when the data is missing. Shown to the customer as an assumption. */
  prior: number;
  /** Turns the signal into the indicator's value (0–1). Defaults to the signal itself. */
  value?: (c: RiskContext, signal: number) => number;
}

/** Numeric features scaled against the population; the build script writes their percentiles. */
export const NORM_KEYS: NormKey[] = ["circuitOverheadKm", "nearbyDamage", "poleAgeYears", "premiseDensity", "upstreamDevices"];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Storm strength, 0 at 25 mph gusts and 1 at 80 mph. */
export const windStrength = (wind: number) => clamp01((wind - 25) / 55);

/** A feature placed between the population's 10th (0) and 90th (1) percentile. null stays null. */
export function scale(c: Pick<RiskContext, "features" | "norms">, key: NormKey): number | null {
  const v = c.features[key];
  if (v == null) return null;
  const { p10, p90 } = c.norms[key];
  return p90 === p10 ? 0.5 : clamp01((v - p10) / (p90 - p10));
}

const share = (hits: number, of: number) => (of > 0 ? hits / of : null);
/** Storm-driven indicators: signal × wind strength. */
const stormScaled = (c: RiskContext, s: number) => s * windStrength(c.wind);

export const BASELINE = 0.05;

// Weights are hand-set, then sanity-checked with the leave-one-storm-out backtest in the build script.
// nearbyDamage and poleAgeYears are in the dataset but not scored: both ran backwards in the backtest
// (they track dense, older city areas, which the Feb 2025 storm hit less).
export const INDICATORS: RiskIndicator[] = [
  // Underground service still hangs off overhead primary upstream, so it only damps wind exposure partly.
  { id: "wind", label: "Storm winds on your service line", weight: 0.3, prior: 0.8, signal: (c) => (c.features.overhead == null ? null : c.features.overhead ? 1 : 0.6), value: stormScaled },
  { id: "line", label: "Many branches between you and the substation", weight: 0.14, prior: 0.5, signal: (c) => scale(c, "upstreamDevices"), value: stormScaled },
  { id: "rural", label: "Rural area with long lines", weight: 0.1, prior: 0.5, signal: (c) => { const d = scale(c, "premiseDensity"); return d == null ? null : 1 - d; }, value: stormScaled },
  { id: "trees", label: "Trees near the line", weight: 0.08, prior: 0.5, signal: (c) => c.features.vegetation, value: stormScaled },
  { id: "feeder", label: "Long overhead circuit", weight: 0.05, prior: 0.5, signal: (c) => scale(c, "circuitOverheadKm"), value: stormScaled },
  { id: "single", label: "No backup feed", weight: 0.04, prior: 0.5, signal: (c) => (c.features.hasTie == null ? null : c.features.hasTie ? 0 : 1) },
  { id: "history", label: "Past storm damage on your circuit", weight: 0.14, prior: 0.4, signal: (c) => share(c.features.circuitStormHits, c.features.stormsTotal) },
  { id: "path", label: "Past storm damage on your path", weight: 0.1, prior: 0.2, signal: (c) => share(c.features.pathStormHits, c.features.stormsTotal) },
];

/**
 * Lower bound of each level's score range, highest first. Set against the build report's score spread:
 * at 58 mph gusts the median premise scores ~0.33 and the top 10% above ~0.41; at 75 mph the top 10% pass ~0.57.
 */
export const THRESHOLDS: [RiskLevel, number][] = [
  ["critical", 0.55],
  ["high", 0.4],
  ["medium", 0.32],
  ["low", 0.2],
  ["minimal", 0],
];

export interface RiskContribution {
  id: IndicatorId;
  label: string;
  /** Feature-only signal, 0–1 (the prior when missing). */
  signal: number;
  /** Signal after storm scaling, 0–1. */
  value: number;
  /** value × weight: what this indicator added to the score. */
  points: number;
  /** The input data was missing and the prior was used. */
  missing: boolean;
}
export interface RiskAssessment { level: RiskLevel; score: number; contributions: RiskContribution[] }

export function assessRisk(c: RiskContext, indicators: RiskIndicator[] = INDICATORS): RiskAssessment {
  const contributions = indicators.map((i) => {
    const raw = i.signal(c);
    const missing = raw == null;
    const signal = clamp01(raw ?? i.prior);
    const value = clamp01(i.value ? i.value(c, signal) : signal);
    return { id: i.id, label: i.label, signal, value, points: value * i.weight, missing };
  });
  const score = clamp01(BASELINE + contributions.reduce((a, x) => a + x.points, 0));
  const level = c.storm ? (THRESHOLDS.find(([, min]) => score >= min)?.[0] ?? "minimal") : "minimal";
  return { level, score, contributions };
}

// ---------------------------------------------------------------------------
// Confidence: how much to trust the level. Rules, not statistics; each rule that fires adds a reason.

/** Gusts above this are rare in the storm history, so the model is extrapolating. Assumption: ARCOS has no wind data. */
export const RARE_WIND = 70;
/** Score points resting on assumed (missing) data before confidence drops a step. */
export const MISSING_POINTS_LIMIT = 0.03;

export type ConfidenceReason = "rare-storm" | "missing-data" | "exposed-lines" | "thin-history";
export interface Confidence { level: 1 | 2 | 3; reasons: ConfidenceReason[]; missing: IndicatorId[] }

export function assessConfidence(c: RiskContext, r: RiskAssessment): Confidence {
  const reasons: ConfidenceReason[] = [];
  const missing = r.contributions.filter((x) => x.missing).map((x) => x.id);
  const missingPoints = r.contributions.filter((x) => x.missing).reduce((a, x) => a + x.points, 0);
  if (c.storm && c.wind > RARE_WIND) reasons.push("rare-storm");
  if (missingPoints >= MISSING_POINTS_LIMIT) reasons.push("missing-data");
  if (c.storm && c.features.overhead !== false && c.wind >= 45) reasons.push("exposed-lines");
  if (c.features.stormsTotal < 3) reasons.push("thin-history");
  const level = reasons.includes("rare-storm") ? 1 : reasons.length ? 2 : 3;
  return { level, reasons, missing };
}

export const RISK_ORDER: RiskLevel[] = ["minimal", "low", "medium", "high", "critical"];

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

const tone = (k: "low" | "mid" | "high" | "crit") => ({ c: `var(--${k})`, bg: `var(--${k}-bg)`, ink: `var(--${k}-ink)`, fg: `var(--${k}-fg)` });

export const RISK: Record<RiskLevel, RiskLevelInfo> = {
  minimal: { short: "Minimal", label: "Minimal Chance", detail: "Homes like yours almost never lose power in conditions like these.", ...tone("low") },
  low: { short: "Low", label: "Low Chance", detail: "Most homes like yours keep their power through a storm like this.", ...tone("low") },
  medium: { short: "Medium", label: "Medium Chance", detail: "Some homes like yours lose power in a storm like this. It’s worth getting ready.", ...tone("mid") },
  high: { short: "High", label: "High Chance", detail: "Many homes like yours lose power in a storm like this. Plan for an outage.", ...tone("high") },
  critical: { short: "Critical", label: "Critical Chance", detail: "Most homes like yours lose power in a storm like this, and outages can run long. Get ready now.", ...tone("crit") },
};

/** Levels that warrant a pre-storm alert. */
export const alertWorthy = (level: RiskLevel) => level === "medium" || level === "high" || level === "critical";
