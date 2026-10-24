// Exports every premise as an anonymized record for the DynamoDB load (scripts/data/load-dynamo.mjs).
//
//   npm run data:export      (reads PREMISE_HASH_SECRET from .env.local or the shell environment)
//
// Reuses the pipeline in build-risk-features.mjs (imported, so it does not rewrite the committed JSON),
// so the records are derived exactly like the demo premises. See DEVELOPMENT.md › Making the data dynamic.
//
// Privacy (DEVELOPMENT.md › Privacy rules): the real premise number is replaced by a keyed hash (HMAC) and
// never written. Only the allow-listed PremiseFeatures fields leave this script — no premise_nu, addresses,
// service-point coordinates, device IDs/locations, or life-support flags. The hash is keyed so the public IDs
// cannot be reproduced (and premise numbers brute-forced back) without the secret.

import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { env, exit } from "node:process";

import { features, norms, stormEvents } from "./build-risk-features.mjs";

// The only fields allowed out, matching PremiseFeatures in src/lib/concierge/features.ts. Anything the
// pipeline adds later is dropped unless it is added here on purpose — a deliberate allow-list, not a denylist.
const FEATURE_FIELDS = [
  "circuit", "overhead", "upstreamDevices", "reclosersUpstream", "hasTie",
  "circuitOverheadKm", "circuitPremises", "stormsTotal", "circuitStormHits",
  "pathStormHits", "nearbyDamage", "poleAgeYears", "premiseDensity", "vegetation",
];
// Fields that must never appear in an exported record, even transitively. Checked below as a backstop.
const FORBIDDEN = ["premise_nu", "pn", "service_po", "service__1", "lat", "lng", "x", "y", "critical_c", "loc", "chain"];

const OUT_DIR = "AEP-Challenge-Materials/data/exported";

const secret = env.PREMISE_HASH_SECRET;
if (!secret) {
  console.error("Set PREMISE_HASH_SECRET before exporting (any long random string; keep it in .env.local). It keys the premise-ID hash so IDs cannot be reversed.");
  exit(1);
}

/** Stable, non-reversible public ID for a premise number. Keyed HMAC, truncated to 160 bits. */
const publicId = (premiseNumber) => "PX" + createHmac("sha256", secret).update(String(premiseNumber)).digest("hex").slice(0, 40);

function pickFeatures(f) {
  const out = {};
  for (const k of FEATURE_FIELDS) out[k] = f[k] ?? null;
  return out;
}

const snapshotId = new Date().toISOString().replace(/[:.]/g, "-");
const records = [];
let skipped = 0;
for (const [premiseNumber, f] of features) {
  // Match the model's requirement: a premise needs a circuit to be scored (see build-risk-features.mjs §6).
  if (!f.circuit) {
    skipped++;
    continue;
  }
  records.push({
    id: publicId(premiseNumber),
    snapshot: snapshotId,
    // Real premises have no safe public area name, so the UI shows a generic label + the anonymized circuit.
    area: "Your area",
    kind: "Service address",
    features: pickFeatures(f),
  });
}

// Backstop over every record: fail loudly if a forbidden key slipped in or an id isn't a hashed public ID.
const ALLOWED_TOP = new Set(["id", "snapshot", "area", "kind", "features"]);
for (const r of records) {
  for (const k of Object.keys(r)) {
    if (!ALLOWED_TOP.has(k)) {
      console.error(`Refusing to export: unexpected field "${k}" on a record. Fix export-premises.mjs.`);
      exit(1);
    }
  }
  for (const bad of FORBIDDEN) {
    if (bad in r.features) {
      console.error(`Refusing to export: forbidden field "${bad}" present in a record. Fix FEATURE_FIELDS in export-premises.mjs.`);
      exit(1);
    }
  }
  // Hashed ids are "PX" + 40 hex chars; anything else could be a raw premise number.
  if (!/^PX[0-9a-f]{40}$/.test(r.id)) {
    console.error("Refusing to export: an id is not a hashed public ID.");
    exit(1);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const jsonl = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
writeFileSync(`${OUT_DIR}/premises.jsonl`, jsonl);

const snapshot = {
  snapshot: snapshotId,
  generatedAt: new Date().toISOString(),
  count: records.length,
  skippedNoCircuit: skipped,
  // norms and storms travel with the snapshot so the app's scaling and denominators match these records.
  norms,
  storms: stormEvents,
};
writeFileSync(`${OUT_DIR}/snapshot.json`, JSON.stringify(snapshot, null, 2) + "\n");

console.log(`exported ${records.length} premises (skipped ${skipped} without a circuit) to ${OUT_DIR}/premises.jsonl`);
console.log(`snapshot ${snapshotId} → ${OUT_DIR}/snapshot.json`);
