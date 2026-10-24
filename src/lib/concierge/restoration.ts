// Restoration-time estimate: labor standards from the challenge workbook (src/data/restoration.json, built by
// `npm run data:restoration`) plus the stated assumptions below. Pure functions only.
// See DEVELOPMENT.md › Restoration estimate before changing a constant.

import data from "@/data/restoration.json";

export type JobId = "pole" | "span" | "xfmr" | "fuse";
export type Access = "clear" | "limited" | "blocked";
/** Where the damage sits relative to the customer's power path. */
export type DamageWhere = "street" | "branch" | "main";

export interface LaborPart { name: string; qty: number; hours: number }
export interface LaborJob { label: string; hours: number; parts: LaborPart[] }

export interface RestorationDataset {
  version: 1;
  generatedAt: string;
  sources: string[];
  /** Indirect Labor Multiplier: drive time, safety briefings, setup. Multiplies every labor hour. */
  ilm: number;
  /** Person-hours to repair one item of each damage type (install + removal of its parts). */
  jobs: Record<JobId, LaborJob>;
  /** Person-hours added per damage site when road access is limited or blocked. */
  adders: Record<Exclude<Access, "clear">, number>;
  /** ARCOS: share of past damage reports with access issues or needing special equipment. */
  history: { reports: number; accessIssueShare: number; specialEquipmentShare: number };
}

export const LABOR = data as unknown as RestorationDataset;

/**
 * Challenge assumptions: not in the data package, so the UI discloses them.
 * CU hours are person-hours; a storm crew is `crewSize` line workers working one site at a time.
 */
export const ASSUME = {
  crewSize: 3,
  /** Hours to isolate damage and switch a healthy section back on (step restoration). */
  switchHours: 1,
  /** Hours to clear trees and debris before work starts. */
  roadHours: { clear: 0, limited: 1, blocked: 4 } satisfies Record<Access, number>,
  /** Crew arrival: base hours, plus up to `storm` more as wind strength rises (0–1), plus `rural` for remote areas. */
  wait: { base: 1, storm: 6, rural: 1.5 },
} as const;

export interface RestorationInput {
  poles: number;
  spans: number;
  xfmr: boolean;
  crews: number;
  access: Access;
  where: DamageWhere;
  /** Crews restore in steps: isolate the damage and switch healthy sections back on before repairing. */
  reroute: boolean;
}

export interface NetworkContext {
  /** 0–1 storm strength (risk.ts windStrength). */
  storm: number;
  rural: boolean;
  /** The circuit has a tie switch, so a neighboring circuit can feed it while the main line is repaired. */
  backfeed: boolean;
}

export interface Site { job: JobId; label: string; hours: number }

export interface Estimate {
  /** Waiting for a crew to reach you. */
  wait: number;
  /** Clearing roads to the damage. */
  road: number;
  /** Crew-hours until every repair is done (with the crews working in parallel). */
  repair: number;
  /** Hours to switch you back on when crews restore in steps; 0 when you wait for the repair. */
  switch: number;
  /** You get power back before the repair is finished. */
  stepped: boolean;
  /** Step restoration could apply to this damage location on this line. */
  canStep: boolean;
  sites: Site[];
  /** Crews that have a site to work on (more crews than sites don't help). */
  working: number;
  /** Total person-hours including the indirect multiplier. */
  personHours: number;
  /** Hours until your power is back, from the moment it went out. */
  mid: number;
}

/** Whether crews can bring you back before the repair, given where the damage is. */
export function canStepRestore(where: DamageWhere, net: NetworkContext) {
  // Damage on a nearby branch: crews open that branch's fuse and re-close the device you share.
  if (where === "branch") return true;
  // Main-line damage upstream of you: only a tie switch to another circuit can feed you around it.
  if (where === "main") return net.backfeed;
  // Damage on your own street: nothing can bypass it.
  return false;
}

/** Damage sites: each pole and the transformer is its own site; downed spans are one stretch of line. A tripped fuse alone is one site. */
export function damageSites(o: RestorationInput): Site[] {
  const J = LABOR.jobs;
  const sites: Site[] = [];
  for (let i = 0; i < o.poles; i++) sites.push({ job: "pole", label: J.pole.label, hours: J.pole.hours });
  if (o.spans > 0) sites.push({ job: "span", label: `${J.span.label} ×${o.spans}`, hours: J.span.hours * o.spans });
  if (o.xfmr) sites.push({ job: "xfmr", label: J.xfmr.label, hours: J.xfmr.hours });
  if (!sites.length) sites.push({ job: "fuse", label: J.fuse.label, hours: J.fuse.hours });
  return sites;
}

/** Longest-first assignment of sites to crews; returns when the last crew finishes. */
function makespan(siteHours: number[], crews: number) {
  const load = new Array<number>(Math.max(1, crews)).fill(0);
  for (const h of [...siteHours].sort((a, b) => b - a)) {
    const i = load.indexOf(Math.min(...load));
    load[i] += h;
  }
  return Math.max(...load);
}

export function estimate(o: RestorationInput, net: NetworkContext): Estimate {
  const sites = damageSites(o);
  const adder = o.access === "clear" ? 0 : LABOR.adders[o.access];
  // Crew-hours per site: (labor + access adder) × indirect multiplier, shared by the crew's workers.
  const crewHours = sites.map((s) => ((s.hours + adder) * LABOR.ilm) / ASSUME.crewSize);
  const repair = makespan(crewHours, o.crews);
  const wait = ASSUME.wait.base + ASSUME.wait.storm * net.storm + (net.rural ? ASSUME.wait.rural : 0);
  const road = ASSUME.roadHours[o.access];
  const canStep = canStepRestore(o.where, net);
  const stepped = o.reroute && canStep;
  const sw = stepped ? ASSUME.switchHours : 0;
  return {
    wait,
    road,
    repair,
    switch: sw,
    stepped,
    canStep,
    sites,
    working: Math.min(o.crews, sites.length),
    personHours: sites.reduce((a, s) => a + (s.hours + adder) * LABOR.ilm, 0),
    mid: wait + road + (stepped ? sw : repair),
  };
}
