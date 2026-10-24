# DEVELOPMENT

Working notes for anyone (human or agent) changing the Outage Concierge. Read the section for the area you touch before editing. `README.md` covers setup; `AGENTS.md` covers Next.js and map UI rules; the challenge brief is `Main-Challenge.pdf`.

- [Risk data: how the outage chance is calculated](#risk-data-how-the-outage-chance-is-calculated)
- [Restoration estimate](#restoration-estimate)
- [Challenge data reference](#challenge-data-reference)
- [Changing the model safely](#changing-the-model-safely)
- [Making the data dynamic](#making-the-data-dynamic)
- [Privacy rules](#privacy-rules)
- [Known gaps](#known-gaps)

---

## Risk data: how the outage chance is calculated

```
AEP-Challenge-Materials/data/raw/*.zip
  │  npm run data:extract          (scripts/data/extract.mjs)
  ▼
AEP-Challenge-Materials/data/extracted/   (git-ignored, ~500 MB)
  │  npm run data:risk             (scripts/data/build-risk-features.mjs + config.mjs)
  │    reads shapefiles with scripts/data/lib/shapefile.mjs (no dependencies)
  │    scores every premise with src/lib/concierge/risk.ts → prints level mix + backtest
  ▼
src/data/risk-features.json       (committed, ~3 KB, anonymized demo premises only)
  │  src/lib/concierge/features.ts  → featureSource (the data contract)
  ▼
src/lib/concierge/risk.ts         assessRisk() → level + score + per-indicator contributions
                                  assessConfidence() → 1/2/3 + reasons + missing inputs
  ▼
src/lib/concierge/model.ts        model() → Model.risk / level / confidence / conf
                                  factors(), confText(), missingText() → copy shown to the customer
  ▼
UI (home.tsx factors sheet, status cards, chat answers, inbox)
```

### Quick start

```bash
npm run data:extract   # once; unzips the three archives (unzip, or tar on Windows)
npm run data:risk      # ~5 s; rewrites src/data/risk-features.json and prints the report
npm run typecheck && npm run lint
```

Commit `src/data/risk-features.json` whenever you change the pipeline, `config.mjs`, or the indicators/thresholds in `risk.ts`. The app never reads the shapefiles at runtime.

### Files

| File | Role |
| --- | --- |
| `scripts/data/lib/shapefile.mjs` | Dependency-free `.dbf`/`.shp` readers. `readDbf(path, { pick })` streams rows; `readLayer(base)` joins attributes with geometry and converts Web Mercator layers to lng/lat. |
| `scripts/data/config.mjs` | All tunables (radii, storm clustering, report winds) and the demo-premise selection rules. |
| `scripts/data/build-risk-features.mjs` | The ETL. Numbered sections 1–8 match the steps below. |
| `scripts/data/extract.mjs` | Unzips the raw archives. |
| `src/data/risk-features.json` | Output. Shape = `RiskDataset` in `features.ts`. `report` holds build diagnostics only. |
| `src/lib/concierge/features.ts` | `PremiseFeatures`, `RiskDataset`, `FeatureSource`, and `featureSource` (the static source). |
| `src/lib/concierge/risk.ts` | Indicators, weights, thresholds, confidence rules, level copy. **No runtime imports allowed** (Node imports it directly through type stripping; `import type` is fine). |
| `src/lib/concierge/model.ts` | Builds `PREMISES` from the feature source, runs the assessment, turns contributions into customer copy. |

### Pipeline steps (build-risk-features.mjs)

1. **Premises:** `Customer_Clip`, deduplicated by `premise_nu`. Keeps the circuit, overhead/underground service (`kind_of_se`), and service point. The service point is used only for spatial joins and is never written out.
2. **Topology:** `matched_upstream.txt` gives each premise its chain (transformer → fuses/reclosers → breaker).
3. **Circuits:** overhead primary length from `Primary_ExportFeatures` (`report_len` is in feet). Tie switches are `Switch_Clip` rows with `normal_sta = "Open"`.
4. **Storm events:** ARCOS report dates are grouped into events (gap ≤ 2 days, ≥ 10 reports). The current data gives 11 events, dominated by 2025-02-12 (1,254 reports) and 2024-09-26 (194). **Dependency-aware impact:** each storm damage report is snapped to the nearest premise within 250 m (same circuit preferred). Damage to a transformer, secondary, or light hits that transformer. Any other damage trips the first fuse/recloser on that premise's chain, or the breaker if there is none. A premise is affected when that device is on its own chain.
5. **Poles:** median install age in a 3×3 grid of 300 m cells. `1900-01-01` dates are placeholders and are dropped.
6. **Features:** see the table below. `computeFeatures(holdout)` can rebuild every history feature without one storm.
7. **Report:** level and confidence mix at 40/58/75 mph, score percentiles, and a leave-one-storm-out backtest over the two largest storms. AUC = how often a premise the held-out storm actually affected outscored one it didn't.
8. **Demo premises:** each `DEMO_PREMISES` entry binds a public ID and a fictional area to the best-ranked real premise that matches `pick`. `rank(f, n, score)` receives the 58 mph score so you can target a level.

### The feature contract (`PremiseFeatures`)

`null` means no data. The model then uses the indicator's `prior` and **tells the customer** (confText / the "why" answer).

| Field | Source | Meaning | Scored by |
| --- | --- | --- | --- |
| `circuit` | Customer_Clip / breaker token | Anonymized circuit name, e.g. `CIR60` | (display, ID lookup) |
| `overhead` | Customer_Clip.kind_of_se | Overhead service drop | `wind` |
| `upstreamDevices` | matched_upstream | Fuses + reclosers between premise and breaker | `line` |
| `reclosersUpstream` | matched_upstream | Reclosers on that path | restoration (`Premise.upstream`) |
| `hasTie` | Switch_Clip | Circuit has a normally-open tie switch | `single`, restoration |
| `circuitOverheadKm` | Primary_ExportFeatures | Overhead primary on the circuit | `feeder` |
| `circuitPremises` | Customer_Clip | Premises on the circuit | not scored |
| `stormsTotal` | ARCOS | Storm events on record (denominator) | `history`, `path` |
| `circuitStormHits` | ARCOS | Events with damage on the circuit | `history` |
| `pathStormHits` | ARCOS + topology | Events with damage that would trip a device on this premise's path | `path` |
| `nearbyDamage` | ARCOS | Reports within 1 km, all dates | **not scored** (ran backwards in backtest) |
| `poleAgeYears` | Pole_Clip | Median nearby pole age | **not scored** (ran backwards in backtest) |
| `premiseDensity` | Customer_Clip | Premises per km² | `rural`, restoration (`Premise.remote`) |
| `vegetation` | none yet | Tree cover 0–1 | `trees` (always the prior today) |

Numeric features in `NORM_KEYS` (risk.ts) are scaled to 0–1 between the population's 10th and 90th percentile. The percentiles are written to `norms` in the dataset, so a new dataset brings its own scaling.

### Indicators (risk.ts)

score = `BASELINE` (0.05) + Σ weight × value. Storm-scaled indicators use value = signal × `windStrength(wind)` (0 at 25 mph, 1 at 80 mph). The others use value = signal.

| id | Weight | Signal | Storm-scaled | Prior |
| --- | --- | --- | --- | --- |
| `wind` | 0.30 | overhead 1, underground 0.6 | yes | 0.8 |
| `line` | 0.14 | scaled `upstreamDevices` | yes | 0.5 |
| `rural` | 0.10 | 1 − scaled `premiseDensity` | yes | 0.5 |
| `trees` | 0.08 | `vegetation` | yes | 0.5 |
| `feeder` | 0.05 | scaled `circuitOverheadKm` | yes | 0.5 |
| `single` | 0.04 | no tie switch = 1 | no | 0.5 |
| `history` | 0.14 | `circuitStormHits / stormsTotal` | no | 0.4 |
| `path` | 0.10 | `pathStormHits / stormsTotal` | no | 0.2 |

**Levels** (`THRESHOLDS`, five steps in `RISK_ORDER`): critical ≥ 0.55, high ≥ 0.40, medium ≥ 0.32, low ≥ 0.20, else minimal. With no storm (`scenario = normal`) the level is always minimal. Medium and above warrant a pre-storm alert (`alertWorthy`). The UI renders one bar per level (`RiskScale`) and one battery cell per level (`ChanceBattery`: minimal 5 lit → critical 1). Critical uses the `--crit*` color tokens in `globals.css`. Adding or removing a level means touching `RiskLevel`, `RISK_ORDER`, `THRESHOLDS`, `RISK`, `alertWorthy`, `CHANCE` in power-battery.tsx, the `mix` object in the build script, and the level list in the `/api/chat` system prompt.

**Confidence** (`assessConfidence`): wind > 70 mph → 1, because storms that strong are rare in the records (assumption: ARCOS has no wind data). Any of the following → 2: assumed data contributing ≥ 0.03 points, overhead service in ≥ 45 mph gusts, or fewer than 3 storms on record. Otherwise → 3. Each rule that fires is listed in `reasons`. Missing inputs are listed in `missing`.

**Current report** (2026-10-24 data):

| | minimal | low | medium | high | critical |
| --- | --- | --- | --- | --- | --- |
| 40 mph | 53% | 47% | 0% | 0% | 0% |
| 58 mph | 1% | 42% | 43% | 14% | 0% |
| 75 mph | 0% | 4% | 21% | 61% | 14% |

Backtest AUC: 0.626 holding out 2025-02-12 (30% of premises affected) and 0.600 holding out 2024-09-26 (7%). An overhead-only baseline scores 0.46–0.47. The weights were hand-tuned while watching these numbers, so the backtest is a sanity check, not an independent validation.

Demo premises: P-20417 Maple Grove (CIR22, medium), P-33810 Riverside (CIR85, minimal), P-51122 Ridge Road (CIR31, high at score 0.53; it tips into critical at about 62 mph), all at the 58 mph default.

---

## Restoration estimate

```
AEP-Challenge-Materials/data/Install_Labor_HackOHIO.xlsx  +  ARCOS (extracted Data1)
  │  npm run data:restoration      (scripts/data/build-restoration.mjs + RESTORATION in config.mjs)
  │    reads the workbook with scripts/data/lib/xlsx.mjs (no dependencies)
  ▼
src/data/restoration.json          (committed, ~1 KB: labor averages and aggregate shares only)
  ▼
src/lib/concierge/restoration.ts   estimate() → wait / road / repair / switch / mid, damage sites, crews working
  ▼
src/lib/concierge/model.ts         model().e, segments(), movers(), stepText(), laborText(), ASSUME_TEXT
  ▼
UI: Restoration Estimate card (home.tsx) with "Try a What-If" (what-if.tsx), chat "how long" answer, messages
```

**Labor (from the workbook).** Each damage type is a bill of materials in `RESTORATION.jobs` (config.mjs). A part points at a block in the workbook by its title cell, e.g. `"Pole CU Average Hours by Size"` row `Size Group = Medium`. Hours per part = qty × (avg install + avg removal), because a storm repair replaces the broken unit. Current values: broken pole 5.29 h (pole 40–55 ft, crossarm, 3 insulators, 3 pins, grounding), downed wire span 0.86 h (2 dead-ends, 2 connectors), transformer 3.23 h (25 kVA, cutout, leads), fuse only 0.26 h. Access adders come from "Labor only work": limited = Access Constraint Adder (0.5 h per site), blocked = Remote Location Adder (1.312 h per site). Every labor hour is multiplied by the Indirect Labor Multiplier (4.5).

**ARCOS.** Report and repair dates are day-level only, and open repairs carry a placeholder date, so they can't calibrate hours. The build keeps only aggregate shares: 32% of reports had access issues and 17% needed special equipment. The UI shows the first next to the road-access what-if.

**Assumptions** (`ASSUME` in restoration.ts; all disclosed in the card under "How We Calculated This"):

| Constant | Value | Meaning |
| --- | --- | --- |
| `crewSize` | 3 | CU hours are person-hours. A crew is 3 line workers and works one site at a time. |
| `wait` | 1 + 6 × storm strength (+1.5 rural) | Hours until a crew reaches you. |
| `roadHours` | 0 / 1 / 4 | Clearing debris or fallen trees before work starts. |
| `switchHours` | 1 | Isolating the damage and switching a healthy section back on. |

**Sites and crews.** Each broken pole and the transformer is its own site, and all downed spans count as one stretch of line. With no damage entered, a blown fuse is one site. Sites are assigned longest-first to the least-loaded crew, and the repair time is when the last crew finishes. This means extra crews beyond the number of sites don't help, and the UI says so.

**Upstream dependencies and step restoration** (`canStepRestore`). The `where` input places the damage relative to the customer:
- `street`: on the customer's own branch. Only the repair restores power.
- `branch`: on a neighboring branch that tripped a device the customer shares. Crews open that branch's fuse and re-close, so the customer is back after `switchHours`.
- `main`: upstream on the main line. Only a tie switch (`hasTie`, `Premise.backfeed`) can feed the customer from another circuit. Otherwise they wait for the repair.

When `reroute` ("Restore in steps") is on and step restoration applies, `mid = wait + road + switchHours`, and the card says repairs continue afterward.

**Confirmed vs model.** `DEF` is the reported damage (or typical damage before the storm). Confirmed copy (`facts()`, What Happened) always uses `DEF`. The estimate card uses the customer's inputs and shows a "What-If Estimate" badge whenever they differ from `DEF` (`whatIfActive`).

**Change a constant:** edit `RESTORATION` in config.mjs (bill of materials, adders) and run `npm run data:restoration`, or edit `ASSUME` in restoration.ts. Keep `ASSUME_TEXT` in model.ts in sync, because it is the customer-facing disclosure.

---

## Challenge data reference

Everything below was checked against the extracted files. Field names are truncated to 10 characters by the dBASE format.

**Join keys**
- Premise: `Customer_Clip.premise_nu` = first column of `matched_upstream.txt` (117,595 of 117,642 match). `Customer_Clip.id` does **not** match.
- Circuit: `circuit_id` `"0000060"` (Customer, Primary, devices, breaker token) = `aep_circui` / ARCOS `Circuit` `"CIR60"`. Convert with `CIR${Number(id)}`.
- Topology line: `premise_nu \t token \t token …`, nearest first. Token = `class*id*type*location`, e.g. `eo_isolating_eqpt_inst*106806731*Recloser (Hydraulic)*37800343D00129`. Classes: `eo_power_xfrmr_inst` (Distribution / Step), `eo_isolating_eqpt_inst` (Fuse, Recloser), `eo_circuit` (Circuit Breaker; its location is the circuit_id). `location` matches `location_n` in the device layers.

**Layers** (Data1 = customers, poles, primary, fuses, ARCOS, priority locations; Data2 = secondary, transformers, switches, reclosers)

| Layer | Rows | Useful fields | Gotchas |
| --- | --- | --- | --- |
| Customer_Clip | 117,642 | premise_nu, circuit_id, kind_of_se (Overhead/Underground/Unknown), service_po/service__1 (lng/lat), critical_c | `critical_c = "LS Life Support"` on 113 rows: **sensitive, never export** |
| arcos_prod_damage_09_28_Clip | 1,659 | Circuit, Substation, Report_Tim, Repaired_D, Asset_Type, Inform_Wor (damage type), Access_Iss, Special_Eq, Longitude/Latitude | Outage_Num, Incident_W, District, Crew_Area, Status are empty; Event is always "Default" |
| Primary_ExportFeatures | 62,788 | circuit_id, mounting, usage (Backbone/Primary/Lateral), report_len (ft) | |
| Pole_Clip | 107,013 | date_insta, material, class, height | about half have a placeholder or no date |
| Fuse_Bank / Recloser_Bank / Switch_Clip | 7,616 / 331 / 900 | location_n, upstream_l, normal_sta, aep_custom (customers served) | Open switches = tie points |
| Transformer_Clip | 26,959 | location_n, upstream_l, aep_custom, mounting | |
| Secondary_ExportFeatures | 127,403 | mounting, report_len | not used yet |
| Hospitals / Fire_Stations / Ambulance | 5 / 37 / 10 | NAME, ADDRESS | **Web Mercator** .prj (readLayer converts); public data, but don't pin them precisely in customer UI |

`Install_Labor_HackOHIO.xlsx` sheets: CNC, Labor time material related, Labor only work, Indirect Labor Multiplier, CU Group descriptions. Read by `npm run data:restoration` (see [Restoration estimate](#restoration-estimate)).

---

## Changing the model safely

**Add or reweight an indicator**
1. Edit `INDICATORS` in `risk.ts`. Keep `IndicatorId` in sync. Storm-driven indicators define `value`, and `factors()` uses that to decide what counts as storm-driven.
2. Add entries to `FACTOR_COPY` and `MISSING_COPY` in `model.ts`. Both are `Record<IndicatorId, …>`, so TypeScript fails until you do. Set `UP_AT` if 0.5 is the wrong "raises the chance" cutoff for the signal.
3. Run `npm run data:risk`. Check that the level mix still makes sense and the backtest AUC didn't drop, then commit the JSON.

**Add a feature**
1. Compute it in `computeFeatures()` (build script) and add it to `PremiseFeatures` (features.ts) with a doc comment naming its source.
2. Scale it against the population by adding it to `NormKey` (features.ts) and `NORM_KEYS` (risk.ts), then use `scale(c, key)`.
3. Use `null` for "no data", never 0. Zero means a measured zero.
4. Add it to the feature table above.

**Move the thresholds:** retune `THRESHOLDS` against the score percentiles in the report, not against individual demo premises. Thresholds are absolute on purpose: a new dataset should not silently reshuffle what "High" means.

**Change the demo premises:** edit `DEMO_PREMISES` in `config.mjs`. The IDs `P-20417`, `P-33810`, `P-51122` are referenced in `store.tsx` (initial premise) and appear in the UI and copy. Keep them, or update those references. The first entry is the fallback (`DEFAULT_PREMISE`).

**Invariants to keep**
- `risk.ts` stays importable by plain Node: no `@/` runtime imports, no enums or other non-erasable TypeScript.
- Factors are built from `m.risk.contributions`, never from hand-set premise flags, so the explanation always matches the score.
- Every missing input is disclosed through `missingText()`. Don't drop that sentence from confText or the "why" answer.
- `riskOverride` (debug menu) only replaces `Model.level`. Confidence and factors still come from the real assessment.

---

## Making the data dynamic

The UI only depends on the `RiskDataset` shape (features.ts) and the scenario inputs (wind, damage, crews). To go live:

1. Produce the same shape from a live source: an API route (e.g. `src/app/api/risk/route.ts`) that runs the pipeline steps against fresh extracts, or a database query. Include `norms` and `stormsTotal` from the same snapshot, so scaling and denominators stay consistent.
2. Create a source with `createFeatureSource(dataset)`. Today `model.ts` reads the module-level `featureSource` once. For runtime data, load the dataset in `ConciergeProvider` (`store.tsx`), keep it in state, and pass it into `model()`. Add a `source` parameter rather than mutating the module-level source, so React re-renders when it changes.
3. Live weather should replace the `wind` scenario input (and `RARE_WIND` once real wind history exists). Keep the what-if controls, because judges need to change an input and watch the result.
4. A full premise lookup (beyond the demo IDs) belongs server-side only: hash the premise number, never ship the full table to the browser.

---

## Privacy rules

- Nothing that identifies a premise leaves the build script: no `premise_nu`, addresses, service-point coordinates, device IDs or location numbers, or life-support flags. Only aggregated counts and anonymized circuit names (`CIR…`, already anonymized in the challenge data).
- Medical equipment and the other needs (`Needs` in `model.ts`: mobility, hearing, vision, critical facility) are **declared by the customer** in Settings. Never infer them from `critical_c` or any account or network field. They change guidance, alert timing, channels and escalation (`priorityNeed`, `forcedChannel`, `escalation`), and reach `/api/chat` only as yes/no flags.
- Demo area names are fictional. The map "home" is offset ~250 m from real assets (`map-data.ts`). Hospitals, fire and ambulance stations are snapped to a 0.01° (~1 km) grid in both `src/data/map-data.json` and `getMapData()`, so the map shows a general area, never an exact pin.
- Customer copy may cite counts ("3 of the last 11 storms damaged your circuit") but not crew names, device IDs, or exact equipment locations.

---

## Known gaps

- **Restoration estimate:** crew size, arrival time, road-clearing and switching times are stated assumptions, not data. ARCOS repair dates are day-level, so durations aren't calibrated against them. The damage location is a what-if input, not traced from a real fault on the topology.
- **Map location** (`map-data.ts`, `src/data/map-data.json`) is a separate, older derivation (densest Feb 2025 cluster) and is not tied to the selected demo premise.
- **No vegetation or wind history** in the package. `trees` always uses its prior, and the 70 mph "rare storm" cutoff is an assumption.
- **Damage-to-device snapping** is approximate. Backbone damage snapped to a lateral premise is credited to the lateral fuse, not the upstream recloser.
- **Storm copy** still mentions "February 2025" by name in the "why" answer. It's true for this dataset, but make it data-driven before swapping datasets.
- No automated tests yet. `risk.ts`, `features.ts`, and the copy builders in `model.ts` are pure and easy to test.
