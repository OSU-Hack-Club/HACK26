// Builds src/data/risk-features.json, the per-premise feature set behind the outage-chance score.
//
//   npm run data:risk            (needs the extracted shapefiles, see AEP-Challenge-Materials/data/README.md)
//
// Reads (all from the AEP challenge package):
//   Data1/Customer_Clip            premises: circuit, overhead/underground service, service point
//   matched_upstream.txt           premise → transformer → fuses/reclosers → circuit breaker
//   Data1/Primary_ExportFeatures   overhead primary length per circuit
//   Data2/Switch_Clip              normally-open switches = tie points to another circuit (backup route)
//   Data1/arcos_prod_damage_*      historical damage reports, grouped into storm events
//   Data1/Pole_Clip                pole install dates (age)
//
// Writes only aggregated, anonymized features for the demo premises in config.mjs: no premise numbers,
// addresses, coordinates, device IDs, or life-support flags leave this script.
// The score itself is computed by src/lib/concierge/risk.ts, imported here for the report and backtest.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { assessConfidence, assessRisk, NORM_KEYS } from "../../src/lib/concierge/risk.ts";
import { CONFIG, DEMO_PREMISES } from "./config.mjs";
import { readDbf, readLayer } from "./lib/shapefile.mjs";

const D = CONFIG.dataDir;
const FILES = {
  customers: `${D}/Data1/Customer_Clip`,
  topology: `${D}/matched_upstream/matched_upstream.txt`,
  primary: `${D}/Data1/Primary_ExportFeatures`,
  switches: `${D}/Data2/Switch_Clip`,
  damage: `${D}/Data1/arcos_prod_damage_09_28_Clip`,
  poles: `${D}/Data1/Pole_Clip`,
};
for (const p of Object.values(FILES)) {
  const f = p.endsWith(".txt") ? p : `${p}.dbf`;
  if (!existsSync(f)) {
    console.error(`Missing ${f}. Extract the challenge archives first (AEP-Challenge-Materials/data/README.md).`);
    process.exit(1);
  }
}

const t0 = Date.now();
const log = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

// ---------------------------------------------------------------------------
// Geometry helpers: local equirectangular km around the service territory.

const LAT0 = 37.27;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 110.57;
const toKm = (lng, lat) => ({ x: lng * KX, y: lat * KY });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class Grid {
  constructor(cell) {
    this.cell = cell;
    this.cells = new Map();
  }
  key(ix, iy) {
    return `${ix},${iy}`;
  }
  add(p) {
    const k = this.key(Math.floor(p.x / this.cell), Math.floor(p.y / this.cell));
    let a = this.cells.get(k);
    if (!a) this.cells.set(k, (a = []));
    a.push(p);
  }
  /** Items in the cells overlapping a radius (or the 3×3 block when r is omitted). */
  around(p, r = this.cell) {
    const n = Math.ceil(r / this.cell);
    const ix = Math.floor(p.x / this.cell);
    const iy = Math.floor(p.y / this.cell);
    const out = [];
    for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) {
      const a = this.cells.get(this.key(ix + dx, iy + dy));
      if (a) for (const q of a) out.push(q);
    }
    return out;
  }
  within(p, r) {
    return this.around(p, r).filter((q) => dist(p, q) <= r);
  }
}

const circuitName = (id) => (id && /^\d+$/.test(id) ? `CIR${Number(id)}` : null);
const ymd = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const median = (a) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

// ---------------------------------------------------------------------------
// 1. Premises

const premises = [];
const byPn = new Map();
for (const r of readDbf(`${FILES.customers}.dbf`, { pick: ["premise_nu", "circuit_id", "kind_of_se", "service_po", "service__1"] })) {
  if (!r.premise_nu || byPn.has(r.premise_nu) || !r.service_po || !r.service__1) continue;
  const p = {
    pn: r.premise_nu,
    circuit: circuitName(r.circuit_id),
    overhead: r.kind_of_se === "Overhead" ? true : r.kind_of_se === "Underground" ? false : null,
    ...toKm(r.service_po, r.service__1),
  };
  premises.push(p);
  byPn.set(p.pn, p);
}
log(`premises: ${premises.length}`);

// ---------------------------------------------------------------------------
// 2. Topology: each premise's upstream chain, nearest device first.

const kindOf = (cls, type) =>
  cls === "eo_circuit" ? "breaker" : cls === "eo_power_xfrmr_inst" ? (type === "Step" ? "step" : "xfmr") : type.startsWith("Recloser") ? "recloser" : type === "Fuse" ? "fuse" : "device";

let linked = 0;
for (const line of readFileSync(FILES.topology, "utf8").split(/\r?\n/)) {
  if (!line) continue;
  const [pn, ...toks] = line.split("\t");
  const p = byPn.get(pn);
  if (!p) continue;
  p.chain = toks.map((t) => {
    const [cls, id, type, loc] = t.split("*");
    return { key: `${cls}:${id}`, kind: kindOf(cls, type ?? ""), loc };
  });
  const breaker = p.chain.find((d) => d.kind === "breaker");
  if (!p.circuit && breaker) p.circuit = circuitName(breaker.loc);
  linked++;
}
log(`topology linked: ${linked}`);

// ---------------------------------------------------------------------------
// 3. Circuits: overhead primary length, tie switches, premise counts.

const circuits = new Map();
const circuit = (name) => {
  let c = circuits.get(name);
  if (!c) circuits.set(name, (c = { overheadFt: 0, totalFt: 0, ties: 0, premises: 0, events: new Set() }));
  return c;
};
for (const r of readDbf(`${FILES.primary}.dbf`, { pick: ["circuit_id", "mounting", "report_len"] })) {
  const name = circuitName(r.circuit_id);
  if (!name) continue;
  const c = circuit(name);
  c.totalFt += r.report_len ?? 0;
  if (r.mounting === "Overhead") c.overheadFt += r.report_len ?? 0;
}
for (const r of readDbf(`${FILES.switches}.dbf`, { pick: ["circuit_id", "normal_sta"] })) {
  const name = circuitName(r.circuit_id);
  if (name && r.normal_sta === "Open") circuit(name).ties++;
}
for (const p of premises) if (p.circuit) circuit(p.circuit).premises++;
log(`circuits: ${circuits.size}`);

// ---------------------------------------------------------------------------
// 4. ARCOS damage → storm events.

const damage = [];
for (const r of readDbf(`${FILES.damage}.dbf`, { pick: ["Circuit", "Report_Tim", "Asset_Type", "Longitude", "Latitude"] })) {
  if (!r.Longitude || !r.Latitude || !r.Report_Tim) continue;
  damage.push({ circuit: r.Circuit || null, date: r.Report_Tim, asset: r.Asset_Type, ...toKm(r.Longitude, r.Latitude) });
}
const dates = [...new Set(damage.map((d) => d.date))].sort();
const perDate = new Map(dates.map((d) => [d, damage.filter((x) => x.date === d).length]));
const storms = [];
let run = [];
const flush = () => {
  const records = run.reduce((a, d) => a + perDate.get(d), 0);
  if (run.length && records >= CONFIG.storm.minRecords) {
    const iso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    storms.push({ id: iso(run[0]), start: iso(run[0]), end: iso(run.at(-1)), records, dates: new Set(run) });
  }
  run = [];
};
for (const d of dates) {
  if (run.length && (ymd(d) - ymd(run.at(-1))) / 864e5 > CONFIG.storm.maxGapDays) flush();
  run.push(d);
}
flush();
for (const d of damage) d.event = storms.find((s) => s.dates.has(d.date))?.id ?? null;
log(`damage records: ${damage.length}, storm events: ${storms.map((s) => `${s.id} (${s.records})`).join(", ")}`);

// Dependency-aware impact: snap each storm damage report to the nearest premise (same circuit preferred)
// and take the protective device that would clear it. Every premise downstream of that device is affected.
const premGrid = new Grid(CONFIG.path.snapKm);
for (const p of premises) if (p.chain) premGrid.add(p);
const SERVICE_ASSETS = new Set(["Transformer", "secondary", "Light"]);
let snapped = 0;
for (const d of damage) {
  if (!d.event) continue;
  const near = premGrid.within(d, CONFIG.path.snapKm);
  const pool = near.some((p) => p.circuit === d.circuit) ? near.filter((p) => p.circuit === d.circuit) : near;
  let best = null;
  for (const p of pool) if (!best || dist(d, p) < dist(d, best)) best = p;
  if (!best) continue;
  const chain = best.chain;
  // Service-level damage only takes out that transformer; line/pole/device damage trips the first protective device.
  d.device = SERVICE_ASSETS.has(d.asset)
    ? chain[0].key
    : (chain.find((x) => x.kind === "fuse" || x.kind === "recloser") ?? chain.find((x) => x.kind === "breaker") ?? chain[0]).key;
  snapped++;
}
log(`damage snapped to the network: ${snapped} of ${damage.filter((d) => d.event).length} storm reports`);

// ---------------------------------------------------------------------------
// 5. Poles: median age around each premise.

const poleGrid = new Grid(CONFIG.poleCellKm);
for (const r of readLayer(FILES.poles, { pick: ["date_insta"] })) {
  const y = r.date_insta ? +r.date_insta.slice(0, 4) : NaN;
  if (!r.geom || !(y >= 1910 && y <= CONFIG.asOfYear)) continue; // 1900-01-01 is a placeholder
  poleGrid.add({ ...toKm(r.geom[0], r.geom[1]), age: CONFIG.asOfYear - y });
}
const poleAgeCache = new Map();
const poleAge = (p) => {
  const k = `${Math.floor(p.x / CONFIG.poleCellKm)},${Math.floor(p.y / CONFIG.poleCellKm)}`;
  if (!poleAgeCache.has(k)) {
    const ages = poleGrid.around(p).map((q) => q.age);
    poleAgeCache.set(k, ages.length >= 5 ? median(ages) : null);
  }
  return poleAgeCache.get(k);
};
log(`poles with a usable install date: ${[...poleGrid.cells.values()].reduce((a, c) => a + c.length, 0)}`);

// ---------------------------------------------------------------------------
// 6. Features (optionally holding out one storm event, for the backtest).

const densGrid = new Grid(CONFIG.densityCellKm);
for (const p of premises) densGrid.add(p);
const dmgGrid = new Grid(CONFIG.nearbyDamageKm);
for (const d of damage) dmgGrid.add(d);

function computeFeatures(holdout = null) {
  const deviceEvents = new Map();
  for (const c of circuits.values()) c.events = new Set();
  for (const d of damage) {
    if (!d.event || d.event === holdout) continue;
    if (d.circuit && circuits.has(d.circuit)) circuits.get(d.circuit).events.add(d.event);
    if (d.device) {
      let s = deviceEvents.get(d.device);
      if (!s) deviceEvents.set(d.device, (s = new Set()));
      s.add(d.event);
    }
  }
  const stormsTotal = storms.filter((s) => s.id !== holdout).length;
  const densityArea = (3 * CONFIG.densityCellKm) ** 2;
  const out = new Map();
  for (const p of premises) {
    if (!p.chain || !p.circuit) continue;
    const c = circuits.get(p.circuit);
    const path = new Set();
    for (const dev of p.chain) for (const e of deviceEvents.get(dev.key) ?? []) path.add(e);
    out.set(p.pn, {
      circuit: p.circuit,
      overhead: p.overhead,
      upstreamDevices: p.chain.filter((d) => d.kind === "fuse" || d.kind === "recloser").length,
      reclosersUpstream: p.chain.filter((d) => d.kind === "recloser").length,
      hasTie: c ? c.ties > 0 : null,
      circuitOverheadKm: c && c.totalFt ? +((c.overheadFt * 0.3048) / 1000).toFixed(1) : null,
      circuitPremises: c?.premises ?? 0,
      stormsTotal,
      circuitStormHits: c?.events.size ?? 0,
      pathStormHits: path.size,
      nearbyDamage: dmgGrid.within(p, CONFIG.nearbyDamageKm).filter((d) => holdout === null || d.event !== holdout).length,
      poleAgeYears: poleAge(p),
      premiseDensity: Math.round(densGrid.around(p).length / densityArea),
      vegetation: null, // no tree-cover layer in the challenge package yet
    });
  }
  return out;
}

const features = computeFeatures();
log(`features built: ${features.size}`);

function norms(fs) {
  const n = {};
  for (const k of NORM_KEYS) {
    const v = [...fs.values()].map((f) => f[k]).filter((x) => x != null).sort((a, b) => a - b);
    n[k] = { p10: quantile(v, 0.1), p50: quantile(v, 0.5), p90: quantile(v, 0.9) };
  }
  return n;
}
const N = norms(features);

// ---------------------------------------------------------------------------
// 7. Report: level mix at a few storm strengths, and a leave-one-storm-out backtest.

const levelMix = {};
for (const wind of CONFIG.reportWinds) {
  const mix = { minimal: 0, low: 0, medium: 0, high: 0, critical: 0 };
  const conf = { 1: 0, 2: 0, 3: 0 };
  for (const f of features.values()) {
    const ctx = { storm: true, wind, features: f, norms: N };
    const r = assessRisk(ctx);
    mix[r.level]++;
    conf[assessConfidence(ctx, r).level]++;
  }
  const pct = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +((100 * v) / features.size).toFixed(1)]));
  const scores = [...features.values()].map((f) => assessRisk({ storm: true, wind, features: f, norms: N }).score).sort((a, b) => a - b);
  const q = Object.fromEntries([0.1, 0.5, 0.9].map((p) => [`p${p * 100}`, +quantile(scores, p).toFixed(3)]));
  levelMix[wind] = { levels: pct(mix), confidence: pct(conf), score: q };
  log(`wind ${wind} mph → levels % ${JSON.stringify(levelMix[wind].levels)} · confidence % ${JSON.stringify(levelMix[wind].confidence)} · score ${JSON.stringify(q)}`);
}

/** Probability that a random affected premise outscores a random unaffected one. */
function auc(scored) {
  const s = scored.slice().sort((a, b) => a.score - b.score);
  let rank = 0, pos = 0, sumPos = 0;
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j < s.length && s[j].score === s[i].score) j++;
    const avg = (i + 1 + j) / 2; // average 1-based rank for ties
    for (let k = i; k < j; k++) if (s[k].label) { pos++; sumPos += avg; }
    rank = j;
    i = j;
  }
  const neg = rank - pos;
  return pos && neg ? (sumPos - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}

// Hold out each of the largest storms in turn: rebuild the history features without it, score every
// premise, and check whether the premises it actually affected scored higher.
const backtest = [];
for (const holdout of storms.slice().sort((a, b) => b.records - a.records).slice(0, CONFIG.backtestStorms)) {
  const train = computeFeatures(holdout.id);
  const trainNorms = norms(train);
  const wind = 58;
  const scored = [];
  const windOnly = [];
  for (const [pn, f] of train) {
    // Label: damage that would have tripped a device on this premise's path during the held-out storm.
    const label = features.get(pn).pathStormHits > f.pathStormHits;
    scored.push({ score: assessRisk({ storm: true, wind, features: f, norms: trainNorms }).score, label });
    windOnly.push({ score: f.overhead ? 1 : 0, label });
  }
  const positives = scored.filter((x) => x.label).length;
  const r = {
    holdout: holdout.id,
    wind,
    premises: scored.length,
    affectedShare: +(positives / scored.length).toFixed(3),
    auc: +auc(scored).toFixed(3),
    aucOverheadOnly: +auc(windOnly).toFixed(3),
  };
  backtest.push(r);
  log(`backtest, holding out ${r.holdout}: AUC ${r.auc} (overhead-only ${r.aucOverheadOnly}); ${(100 * r.affectedShare).toFixed(1)}% of premises affected`);
}

// ---------------------------------------------------------------------------
// 8. Demo premises: real profiles bound to public demo IDs.

const scaled = (f) => (k) => {
  const { p10, p90 } = N[k];
  return f[k] == null || p90 === p10 ? 0.5 : Math.max(0, Math.min(1, (f[k] - p10) / (p90 - p10)));
};
const out = {};
const used = new Set();
for (const demo of DEMO_PREMISES) {
  let best = null;
  for (const [pn, f] of features) {
    if (used.has(pn) || !demo.pick(f, scaled(f))) continue;
    const r = demo.rank(f, scaled(f), assessRisk({ storm: true, wind: 58, features: f, norms: N }).score);
    if (!best || r > best.r || (r === best.r && pn < best.pn)) best = { pn, f, r };
  }
  if (!best) {
    console.error(`No premise matches demo ${demo.id}; loosen its pick() in scripts/data/config.mjs.`);
    process.exit(1);
  }
  used.add(best.pn);
  out[demo.id] = { id: demo.id, area: demo.area, kind: demo.kind, features: best.f };
  const r = assessRisk({ storm: true, wind: 58, features: best.f, norms: N });
  log(`${demo.id} ${demo.area}: ${best.f.circuit}, ${r.level} at 58 mph (score ${r.score.toFixed(2)})`);
}

const dataset = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  sources: ["Customer_Clip", "matched_upstream.txt", "Primary_ExportFeatures", "Switch_Clip", "arcos_prod_damage_09_28_Clip", "Pole_Clip"],
  storms: storms.map(({ id, start, end, records }) => ({ id, start, end, records })),
  norms: N,
  premises: out,
  report: { levelMix, backtest },
};
writeFileSync(CONFIG.out, JSON.stringify(dataset, null, 2) + "\n");
log(`wrote ${CONFIG.out}`);
