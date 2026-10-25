# Presenting the AI Outage Concierge

A guide for the judging session: what to say, what to click, and how to answer the hard questions. For full detail, see [`overview.md`](overview.md) (requirement by requirement) and [`DEVELOPMENT.md`](DEVELOPMENT.md) (model and data).

---

## 1. The pitch (30 seconds)

> A big storm is coming. AEP has damage history, circuit maps, network topology and labor standards. The customer has none of that. They just want to know: *Will I lose power? For how long? What should I do? Will you tell me?*
>
> The AI Outage Concierge answers those four questions for one home, in plain language. It always shows how sure it is. It keeps what AEP has **confirmed** apart from what our model **estimates**. And it refuses to guess when the data can't support an answer.
>
> Behind it, AEP staff get a console where every prediction, message and AI answer is logged in a tamper-evident audit trail. Anything the system shouldn't decide alone goes to a human.

**One line:** *Predict, explain, prepare, communicate. And every decision is accountable.*

---

## 2. Before you present (checklist)

- [ ] `npm run dev` and open http://localhost:3000. The debug menu (yellow **DEBUG** bar) only shows in dev, or with `NEXT_PUBLIC_DEBUG_MENU=1`.
- [ ] Check http://localhost:3000/api/health. `conciergeAi: true` means free-text chat goes to Claude. If it's `false`, chat still works but only answers the built-in questions. Mention that if asked.
- [ ] Debug menu → **Reset everything**. Then switch to the staff view → Controls → **Start new chain**. This clears earlier test activity from the audit log, which lives in this browser.
- [ ] If you ran the tamper demo while practicing, the chain will show **Broken** until you start a new chain.
- [ ] Phone demo: open the same URL on a phone (`npm run tunnel` gives a public URL), or narrow the browser below 1024 px.
- [ ] Optional: `npm test` (42 passing) to show on screen if someone asks about testing.

---

## 3. Demo script (about 6 minutes)

The app opens on **Maple Grove (P-20417)**, status **Watch Alert**, 58 mph gusts.

### Act 1: The customer before the storm (2 min)

| Click | What to say |
| --- | --- |
| Home screen | "This is one customer's home, identified only by an anonymized premise ID. The storm hits Monday night." |
| **Outage Risk** card → **Why We Think So** | "Medium chance, on a five-level scale. Here's why, in plain words: overhead wires and this storm's wind push it up, and a circuit that's held up well in past storms pulls it down. Each factor says whether it raises or lowers the chance. Below that is our confidence, and what data we're missing. We had no tree data, so we say so." |
| **Restoration Estimate** card | "Never a single time. Always a range: 9 to 17 hours. It's built from AEP's own labor standards, about 5.3 person-hours per broken pole, then multiplied by 4.5 for travel and setup." |
| **Restoration Explorer**: add a pole, set Roads to **Trees Down**, set Damage Location to **Nearby Branch** | "Judges can change any input and watch it move. Fallen trees add hours. Damage on a nearby branch means crews can cut it off and switch this home back on in about an hour. That's step restoration, from the network topology. The badge now says **What-If Estimate**, because this is the customer's scenario, not AEP's crew plan." |
| **How We Calculated This** → *What Crews May Replace* | "Each damage type maps to the parts from AEP's structure drawings: a pole, crossarm, three insulators and so on. That's where the hours come from." |

### Act 2: Preparation and alerts (1 min)

| Click | What to say |
| --- | --- |
| Ask: **"What should I do?"** | "Prep steps that fit the expected length of the outage. The safety message is always labeled: 30 feet from downed wires, call 911." |
| Settings → Notifications → turn on **I Rely on Powered Medical Equipment** | "Customers declare needs themselves. We never infer them from account or network data. Turning this on moves the alert to 48 hours ahead, adds a phone call, and adds a welfare check if the outage passes 4 hours." |
| Scroll to **Message Previews** | "These are the messages it sends: before the storm, outage confirmed, estimate updated, power restored. Each shows its channel, its timing and its text length." |

### Act 3: The storm hits, and what the system won't do (1 min)

| Click | What to say |
| --- | --- |
| Settings → Demo → **Power Outage** | "The outage is confirmed. Everything updates: status, map, inbox." |
| Ask: **"There's a downed wire sparking near my house"** | "Hazard questions never go to the AI. The customer gets a fixed 911 safety card, and staff are alerted." |
| Settings → Location → **Cedar Hollow (limited data)** | "This premise has one storm on record and missing network data. Instead of inventing a number, we say we can't make a confident call. Chat and messages hold back the numbers too, but alerts stay on to be safe." Then switch back to **Maple Grove**. |

### Act 4: The staff side (2 min)

| Click | What to say |
| --- | --- |
| Settings → Demo → Account View → **AEP Staff** | "Same app, staff account. Everything we just did as the customer was logged." |
| **Overview** | "The live session, what the customer currently sees, KPIs, and the risk board across premises. The audit chain is verified." |
| **Reviews** | "These are decisions the system won't make alone: the medical-needs escalation and the downed-wire report. Staff approve, override or escalate, with a note. The decision becomes a new audit entry. Nothing is ever edited." |
| **Audit Trail** → tap an entry | "Every entry records who acted, what was decided, the inputs, and the model version. Each one is chained to the previous entry's hash. Customer text is redacted before it's stored. It exports to CSV and JSON." |
| Debug → **Tamper audit log** | "If anyone edits an entry after the fact, the chain breaks and we can see exactly which entry." |
| (Optional) Shrink to phone width | "The staff console works on a phone too, for supervisors in the field." |

**Closing line:** *"Customers get honest answers. AEP gets a record of every one."*

### Short version (2 minutes)

Risk card + Why We Think So → Restoration Explorer (Trees Down) → downed-wire question → switch to Staff → Reviews → Tamper.

---

## 4. Requirement → where to show it

| Brief requirement | Show this |
| --- | --- |
| 1. Risk prediction with factors and uncertainty | Outage Risk card → Why We Think So; confidence and missing data |
| 2. Restoration range that updates | Restoration Estimate card + Restoration Explorer + What Could Change It |
| 2. Damage, dependencies, step restoration, labor, travel | Help › How We Calculated This; damage location; Restore in Steps |
| 2. Model output vs. confirmed info | **Confirmed by AEP** vs. **Model Estimate** / **What-If Estimate** badges |
| 3. Preparation and safety guidance, adapted to declared needs | Ask "What should I do?"; Settings › Notifications › Your Needs |
| 4. Alert eligibility, timing, channel, escalation | Settings › Notifications (Alert Rules, When We'll Message You) |
| 4. Four message types | Settings › Notifications › Message Previews; Alerts inbox |
| 5. Explainability and responsible use | Help & How It Works; fallback card; safety card; staff Controls tab |
| Controls: validation, confidence thresholds, escalation, privacy filters, audit trail | Staff console: Reviews, Audit Trail, Controls |
| Data: ARCOS, GIS, topology, labor, priority locations, structure drawings | See section 5 |

---

## 5. How it works, in plain terms

### The data (all from the challenge package)

| Source | What we use it for |
| --- | --- |
| **ARCOS damage** (1,659 records, 11 storms) | How often each circuit and each power path were damaged in past storms; how often sites were hard to reach (32%) |
| **Circuit GIS** (116 circuits) | Overhead line length, tie switches (backup routes), the map |
| **Upline topology** (117,595 premises linked) | Devices between each home and the substation; which damage would cut this home off |
| **STORMS labor workbook** | Person-hours per part: pole about 5.3 h, wire span about 0.9 h, transformer about 3.2 h |
| **Indirect labor** | 4.5× multiplier for travel, safety briefings and setup; per-site road adders |
| **Priority locations** | Fire and ambulance areas on the Services page, snapped to about 1 km |
| **Structure drawings** | The parts list for each damage type |

The data pipeline (`npm run data:risk`, `npm run data:restoration`) turns the shapefiles and the workbook into small anonymized JSON files. The app never reads raw data.

### The risk model

- **A weighted score, not a black box.** Eight indicators, each 0–1, each with a stated weight: service-line exposure 30%, upstream branch points 14%, circuit storm history 14%, power-path storm history 10%, rural area 10%, trees 8%, feeder length 5%, no backup feed 4%. Storm-driven indicators scale with wind.
- **Five bands:** Minimal, Low, Medium, High, Critical.
- **Backtest:** we held out the two biggest storms and predicted which premises would be hit. AUC is **0.63 and 0.60**. A naive "overhead wires = risky" baseline scores **0.46**, which is worse than a coin flip.
- **Confidence, 1 to 3, with reasons:** the storm is stronger than most on record (over 70 mph), inputs are assumed, or the storm history is thin.
- **Fallback:** with fewer than 3 storms on record plus missing data, or 35%+ of the score resting on assumptions, we show no number at all. On the real data that's about 0.2–0.3% of premises.

### The restoration estimate

Time = crew arrival (longer in big storms and rural areas) + road clearing + repair or switching time.
Repair = parts × person-hours × 4.5 ÷ crew size. Crews work damage sites in parallel. Extra crews beyond the number of sites don't help, and the app says so. The range widens when confidence is lower.

### The AI

- **Built-in answers first.** The four core questions are answered by deterministic code from the model, not generated text.
- **Claude handles everything else,** with a hardened system prompt. It only sees the current estimate, it's told never to promise times, and personal details are redacted before the question is sent.
- **The AI never handles:** safety hazards (fixed 911 card), or numbers we can't support (it's told the estimate is unavailable).

### The audit trail

- Every decision is an entry: who acted (system, customer, AI or staff), what was decided, the inputs, and the model version.
- Entries are append-only and hash-chained. Edits and deletions are detectable.
- **What goes to human review:**
  - low-confidence predictions
  - fallbacks
  - priority-need escalations
  - safety reports
  - manual overrides
  - estimate jumps of 6 hours or more
  - AI answers that tripped the injection guard

---

## 6. Judge Q&A

**"How accurate is it?"**
On held-out storms, it ranks affected premises above unaffected ones about 60–63% of the time (AUC). That beats the obvious baseline (0.46). It's a credible prototype, not a calibrated production model, and the app says so with confidence levels and ranges.

**"Isn't the AI going to make things up?"**
The core answers aren't generated. They come straight from the model. Claude only handles off-script questions, inside guardrails. It never handles safety or unsupported numbers. Every AI answer is logged, and suspicious ones go to staff review.

**"What happens when you don't know?"**
Three layers. An unknown ID gets a "can't make a confident call" card. Thin data gets the same card, with no numbers. An unanswerable question gets "contact AEP customer service". We'd rather say "we don't know" than guess.

**"How do you handle privacy?"**
Anonymized premise IDs only; no addresses, names or coordinates leave the data build. The home marker is offset about 250 m. Hospitals and fire stations are snapped to a 1 km grid. Declared needs are self-reported, never inferred, and never shown on a map. Customer text is redacted (phones, emails, addresses, account numbers) before it's logged or sent to the AI.

**"How would this scale to production?"**
- The feature contract (`features.ts`) is source-agnostic. The DynamoDB lookup already shows a real premise fetched server-side by a hashed ID.
- The audit log would stream to write-once storage behind staff login, instead of browser storage.
- The model weights would be refit on more storms with wind data.

**"Why should we trust the restoration time?"**
It's built bottom-up from AEP's own labor standards and multipliers, so every hour is traceable. It's always a range. The "What Could Change It" list shows which assumptions move it most. ARCOS repair dates only go down to the day, so we haven't calibrated it against real durations, and we say that.

**"What about critical facilities and medical customers?"**
- Customers declare these needs themselves.
- They change alert timing (48 hours instead of 24), channels (a phone call is added), and escalation (a welfare check or a facility-team hand-off after 4 hours).
- Staff see the escalation in the review queue. We never infer needs from account data.

**"Did you test it?"**
42 unit tests cover the audit chain, tamper detection, review queue, privacy filters, the reliability fallback and the materials list. We also backtested the risk model against past storms.

---

## 7. Known limits (be upfront about these)

| Limit | What to say |
| --- | --- |
| Storms are simulated | "The five stages are a scripted storm. The premises, network and history are real challenge data." |
| No tree data | "The trees indicator uses a stated assumption, and the app tells the customer." |
| Nearby-damage signal not used | "It ran backwards in the backtest. It tracks dense city areas, which the February 2025 storm hit less. So we dropped it rather than ship a misleading signal." |
| Restoration not calibrated | "ARCOS repair dates are day-level only. We use them for damage patterns, not durations." |
| Staff view has no login; audit log lives in the browser | "It's a demo account. In production, staff login and write-once storage." |
| Crew size, arrival and switching times | "Stated assumptions, all listed on the Help page." |

---

## 8. Key numbers

| | |
| --- | --- |
| Premises modeled | 117,595 |
| Circuits | 116 |
| ARCOS damage records / storms | 1,659 / 11 |
| Backtest AUC (Feb 2025 / Sep 2024 held out) | 0.63 / 0.60 (baseline 0.46) |
| Risk indicators | 8, five bands |
| Labor: pole / wire span / transformer | about 5.3 / 0.9 / 3.2 person-hours |
| Indirect labor multiplier | 4.5× |
| Crew size | 3 |
| Damage sites hard to reach (ARCOS) | 32% |
| Fallback rate on real data | about 0.2–0.3% of premises |
| Escalation: medical or facility / mobility / everyone | 4 h / 12 h / 24 h |
| Pre-storm alert: priority need / standard | 48 h / 24 h |
| Unit tests | 42 passing |

---

## 9. Where things live (if a judge asks to see code)

| What | File |
| --- | --- |
| Risk model and confidence/fallback rules | `src/lib/concierge/risk.ts` |
| Restoration estimate | `src/lib/concierge/restoration.ts` |
| Customer-facing text, messages, chat answers | `src/lib/concierge/model.ts` |
| Audit trail and review queue | `src/lib/concierge/audit.ts` |
| Privacy filters and safety detection | `src/lib/concierge/privacy.ts` |
| AI guardrails | `src/lib/concierge/llm.ts` |
| Staff console | `src/components/concierge/staff.tsx` |
| Data pipeline | `scripts/data/` |
| Tests | `src/lib/concierge/*.test.ts` |
