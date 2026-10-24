// Premise features: the contract between the data pipeline and the outage-chance model.
// Today the dataset is the static JSON built by scripts/data/build-risk-features.mjs. A live source
// (API, database) only has to return the same RiskDataset shape; nothing downstream changes.
// See DEVELOPMENT.md › Risk data before adding or renaming a field.

import dataset from "@/data/risk-features.json";

/** Everything the risk model knows about one premise. `null` = no data; the model then uses a stated assumption and says so. */
export interface PremiseFeatures {
  /** Anonymized circuit name from the challenge data, e.g. "CIR60". */
  circuit: string;
  /** Service drop is overhead (true) or underground (false). Customer_Clip.kind_of_se. */
  overhead: boolean | null;
  /** Fuses and reclosers between the premise and the circuit breaker. matched_upstream.txt. */
  upstreamDevices: number;
  /** Reclosers on that path; they let crews restore the line in steps. */
  reclosersUpstream: number;
  /** The circuit has a normally-open tie switch, i.e. a backup route. Switch_Clip. */
  hasTie: boolean | null;
  /** Overhead primary on the circuit, km. Primary_ExportFeatures. */
  circuitOverheadKm: number | null;
  /** Premises on the circuit. */
  circuitPremises: number;
  /** Storm events on record (the denominator for the two hit counts). */
  stormsTotal: number;
  /** Storm events with any ARCOS damage on the circuit. */
  circuitStormHits: number;
  /** Storm events with damage that would trip a device on this premise's upstream path. */
  pathStormHits: number;
  /** ARCOS damage reports within 1 km, all dates. */
  nearbyDamage: number;
  /** Median install age of nearby poles, years. Pole_Clip. */
  poleAgeYears: number | null;
  /** Premises per km² around the premise (low = rural). */
  premiseDensity: number;
  /** Tree cover near the lines, 0–1. Not in the challenge package yet, so always null for now. */
  vegetation: number | null;
}

/** Numeric features the model scales against the population (10th–90th percentile → 0–1). */
export type NormKey = "circuitOverheadKm" | "nearbyDamage" | "poleAgeYears" | "premiseDensity" | "upstreamDevices";
export interface FeatureNorm { p10: number; p50: number; p90: number }
export type FeatureNorms = Record<NormKey, FeatureNorm>;

export interface StormEvent { id: string; start: string; end: string; records: number }

export interface PremiseRecord {
  /** Public demo ID, never a real premise number. */
  id: string;
  /** Display-only area name (fictional for the demo premises). */
  area: string;
  kind: string;
  features: PremiseFeatures;
}

export interface RiskDataset {
  version: 1;
  generatedAt: string;
  sources: string[];
  storms: StormEvent[];
  norms: FeatureNorms;
  premises: Record<string, PremiseRecord>;
  /** Build-time diagnostics (level mix, backtest). Not used at runtime. */
  report?: unknown;
}

export interface FeatureSource {
  dataset: RiskDataset;
  get(id: string): PremiseRecord | null;
  list(): PremiseRecord[];
}

export function createFeatureSource(d: RiskDataset): FeatureSource {
  const list = Object.values(d.premises);
  return { dataset: d, get: (id) => d.premises[id] ?? null, list: () => list };
}

/** The source the app reads today. Swap for a fetched dataset when the data goes live. */
export const featureSource = createFeatureSource(dataset as unknown as RiskDataset);
