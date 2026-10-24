// Tunables for scripts/data/build-risk-features.mjs. Change these, rerun `npm run data:risk`,
// and commit the regenerated src/data/risk-features.json. See DEVELOPMENT.md › Risk data.

export const CONFIG = {
  /** Extracted challenge shapefiles (see AEP-Challenge-Materials/data/README.md). */
  dataDir: "AEP-Challenge-Materials/data/extracted",
  out: "src/data/risk-features.json",
  /** Pole ages are measured from this year. */
  asOfYear: 2026,

  /** ARCOS report dates are grouped into storm events: consecutive dates no more than maxGapDays apart, with at least minRecords damage reports in total. */
  storm: { maxGapDays: 2, minRecords: 10 },

  /** ARCOS damage is snapped to the nearest premise within snapKm (same circuit preferred) to find the protective device that would operate. */
  path: { snapKm: 0.25 },
  /** Radius for counting historical damage reports near a premise. */
  nearbyDamageKm: 1,
  /** Grid cell size for the pole-age neighborhood (3×3 cells around the premise). */
  poleCellKm: 0.3,
  /** Grid cell size for premise density (3×3 cells around the premise). */
  densityCellKm: 0.5,

  /** Storm wind (mph) used for the level-distribution report and backtest. */
  reportWinds: [40, 58, 75],
  /** Leave-one-storm-out backtest over this many of the largest storms. */
  backtestStorms: 2,
};

/**
 * Restoration labor (scripts/data/build-restoration.mjs → src/data/restoration.json). Each job is the bill of
 * materials for one kind of storm damage. A part names a block in the labor workbook by its title cell
 * (sheet "Labor time material related" unless `sheet` is set), optionally the row to use (`row`: header → value),
 * how many units, and whether the old unit is removed first (`removal`, default true: a storm repair replaces it).
 */
export const RESTORATION = {
  xlsx: "AEP-Challenge-Materials/data/Install_Labor_HackOHIO.xlsx",
  out: "src/data/restoration.json",
  jobs: {
    pole: {
      label: "Replace a broken pole",
      parts: [
        { name: "Pole, 40–55 ft", block: "Pole CU Average Hours by Size", row: { "Size Group": "Medium" }, qty: 1 },
        { name: "Crossarm", block: "Crossarm CU Average Hours", qty: 1 },
        { name: "Insulators", block: "Insulator CU Average Hours", qty: 3 },
        { name: "Insulator pins", block: "Pin CU Average Hours", qty: 3 },
        { name: "Grounding", block: "Grounding CU Average Hours", qty: 1 },
      ],
    },
    span: {
      label: "Re-hang one span of downed wire",
      parts: [
        { name: "Dead-ends", block: "Dead-End CU Average Hours", qty: 2 },
        { name: "Connectors", block: "Connector CU Average Hours", sheet: "CNC", qty: 2 },
      ],
    },
    xfmr: {
      label: "Replace a pole-mounted transformer",
      parts: [
        { name: "Transformer, 25 kVA", block: "Transformer CU Average Hours by Size", row: { "Size (kVA)": 25 }, qty: 1 },
        { name: "Fuse cutout", block: "Fuse Cutout Average Hours", qty: 1 },
        { name: "Equipment leads", block: "Equipment Lead CU Average Hours", qty: 1 },
      ],
    },
    fuse: {
      label: "Replace a blown fuse",
      parts: [{ name: "Fuse cutout", block: "Fuse Cutout Average Hours", qty: 1, removal: false }],
    },
  },
  /** Per-site labor adders ("Labor only work" sheet, column A) for each road-access what-if. */
  adders: { limited: "Access Constraint Adder", blocked: "Remote Location Adder" },
};

/**
 * Demo premises shipped to the app. Each binds a public demo ID and a fictional area name to one
 * real (never exported) premise picked by rule, so the profile is real but the identity is not.
 * `pick` filters candidates, `rank` orders them (highest wins). `n(key)` is the 0–1 scaled feature and
 * `score` the outage-chance score at the 58 mph reference storm (risk.ts thresholds: medium 0.32, high 0.4).
 */
export const DEMO_PREMISES = [
  {
    id: "P-20417",
    area: "Maple Grove",
    kind: "Suburb, overhead lines",
    // A recloser upstream gives the "reroute" what-if something to do (step restoration).
    pick: (f, n) => f.overhead === true && f.hasTie === false && f.reclosersUpstream >= 1 && f.upstreamDevices >= 2 && n("premiseDensity") > 0.3 && n("premiseDensity") < 0.8,
    // Middle of the medium band: a typical storm-exposed suburb.
    rank: (f, n, score) => -Math.abs(score - 0.36),
  },
  {
    id: "P-33810",
    area: "Riverside",
    kind: "Downtown, buried lines",
    pick: (f, n) => f.overhead === false && f.hasTie === true && n("premiseDensity") >= 0.8,
    rank: (f, n, score) => -score,
  },
  {
    id: "P-51122",
    area: "Ridge Road",
    kind: "Rural, long overhead line",
    pick: (f, n) => f.overhead === true && n("premiseDensity") <= 0.1 && n("circuitOverheadKm") >= 0.7,
    rank: (f, n, score) => score,
  },
];
