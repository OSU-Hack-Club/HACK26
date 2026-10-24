// Builds src/data/restoration.json, the labor standards behind the restoration-time estimate.
//
//   npm run data:restoration     (needs the extracted ARCOS layer, see AEP-Challenge-Materials/data/README.md)
//
// Reads (all from the AEP challenge package):
//   Install_Labor_HackOHIO.xlsx    CU install/removal hours, labor-only adders, Indirect Labor Multiplier
//   Data1/arcos_prod_damage_*      how often past damage had access issues or needed special equipment
//
// Writes only labor averages and aggregate shares: no locations, circuits, or record IDs.
// The estimate itself is computed by src/lib/concierge/restoration.ts.

import { existsSync, writeFileSync } from "node:fs";

import { CONFIG, RESTORATION } from "./config.mjs";
import { readDbf } from "./lib/shapefile.mjs";
import { readXlsx } from "./lib/xlsx.mjs";

const DAMAGE = `${CONFIG.dataDir}/Data1/arcos_prod_damage_09_28_Clip.dbf`;
for (const f of [RESTORATION.xlsx, DAMAGE]) {
  if (!existsSync(f)) {
    console.error(`Missing ${f}. Extract the challenge archives first (AEP-Challenge-Materials/data/README.md).`);
    process.exit(1);
  }
}

const r3 = (x) => Math.round(x * 1000) / 1000;
const sheets = readXlsx(RESTORATION.xlsx);
const sheet = (name) => {
  if (!sheets[name]) throw new Error(`Workbook has no sheet "${name}"`);
  return sheets[name];
};

// 1. Blocks: a title cell, a header row under it, then data rows until the first blank row.
function block(sheetName, title) {
  const s = sheet(sheetName);
  let at = null;
  for (const [key, v] of s.cells) {
    if (v === title) {
      const [row, col] = key.split(",").map(Number);
      at = { row, col };
      break;
    }
  }
  if (!at) throw new Error(`Sheet "${sheetName}" has no block titled "${title}"`);
  const headers = [];
  for (let c = at.col; s.get(at.row + 1, c) !== null; c++) headers.push(s.get(at.row + 1, c));
  const rows = [];
  for (let r = at.row + 2; headers.some((_h, i) => s.get(r, at.col + i) !== null); r++) {
    rows.push(Object.fromEntries(headers.map((h, i) => [h, s.get(r, at.col + i)])));
  }
  if (!rows.length) throw new Error(`Block "${title}" has no rows`);
  return rows;
}

const num = (v, what) => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${what}: expected a number, got ${JSON.stringify(v)}`);
  return v;
};

// 2. Jobs: hours per damage item = Σ qty × (install + removal) over its parts.
const jobs = {};
for (const [id, job] of Object.entries(RESTORATION.jobs)) {
  const parts = job.parts.map((p) => {
    const rows = block(p.sheet ?? "Labor time material related", p.block);
    const row = p.row ? rows.find((r) => Object.entries(p.row).every(([k, v]) => r[k] === v)) : rows[0];
    if (!row) throw new Error(`Block "${p.block}" has no row matching ${JSON.stringify(p.row)}`);
    const install = num(row["Avg Install Hours"], `${p.block} install`);
    const removal = p.removal === false ? 0 : num(row["Avg Removal Hours"], `${p.block} removal`);
    return { name: p.name, qty: p.qty, hours: r3(p.qty * (install + removal)) };
  });
  jobs[id] = { label: job.label, hours: r3(parts.reduce((a, p) => a + p.hours, 0)), parts };
}

// 3. Adders and the Indirect Labor Multiplier.
const labor = sheet("Labor only work");
const adder = (name) => {
  for (let r = 1; r < 200; r++) if (labor.get(r, 1) === name) return num(labor.get(r, 4), name);
  throw new Error(`"Labor only work" has no row "${name}"`);
};
const adders = Object.fromEntries(Object.entries(RESTORATION.adders).map(([k, name]) => [k, adder(name)]));
const ilm = num(sheet("Indirect Labor Multiplier").get(1, 2), "Indirect Labor Multiplier");

// 4. History: how often past storm damage had access trouble or needed special equipment (ARCOS).
let reports = 0;
let access = 0;
let special = 0;
for (const d of readDbf(DAMAGE, { pick: ["Access_Iss", "Special_Eq"] })) {
  if (!d.Access_Iss) continue;
  reports++;
  if (d.Access_Iss === "Yes") access++;
  if (d.Special_Eq) special++;
}

const out = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  sources: ["Install_Labor_HackOHIO.xlsx", "arcos_prod_damage_09_28_Clip"],
  ilm,
  jobs,
  adders,
  history: { reports, accessIssueShare: r3(access / reports), specialEquipmentShare: r3(special / reports) },
};
writeFileSync(RESTORATION.out, JSON.stringify(out, null, 2) + "\n");

console.log(`wrote ${RESTORATION.out}`);
for (const [id, j] of Object.entries(jobs)) console.log(`  ${id.padEnd(5)} ${j.hours.toFixed(2)} labor h  (${j.parts.map((p) => `${p.name} ${p.hours}`).join(", ")})`);
console.log(`  ILM ${ilm} · adders ${JSON.stringify(adders)}`);
console.log(`  ARCOS ${reports} reports · access issues ${(out.history.accessIssueShare * 100).toFixed(0)}% · special equipment ${(out.history.specialEquipmentShare * 100).toFixed(0)}%`);
