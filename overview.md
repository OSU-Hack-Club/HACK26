# AI Outage Concierge: Overview

**HackOHI/O 2026 · AEP Challenge.** Brief: [`Main-Challenge.pdf`](Main-Challenge.pdf). Setup and code layout: [`README.md`](README.md). Model and data details: [`DEVELOPMENT.md`](DEVELOPMENT.md).

## What it is

A major storm is coming. AEP has damage history, circuit maps, network topology and labor standards. Customers have none of that. They just want to know four things:

- "Will I lose power?"
- "How long could restoration take?"
- "What should I do to prepare?"
- "Do I qualify for outage alerts?"

The AI Outage Concierge is a mobile-first web app that answers those questions for one home. Every answer is in plain language, shows how sure it is, and keeps AEP's confirmed facts apart from our model's estimates.

It follows a customer through a whole storm in five stages: **All Clear → Watch Alert → Power Outage → Restoring → Restored**. At each stage the home screen, map, alerts inbox and chat change to match.

## The customer journey (Minimum Viable Demonstration)

| # | What the brief asks for | What the customer does in the app |
| --- | --- | --- |
| 1 | Select or enter an anonymized location | Pick a demo premise (Maple Grove, Riverside, Ridge Road) or type a premise or circuit ID. If the optional DynamoDB lookup is set up, a real premise is fetched server-side by a hashed ID. |
| 2 | Outage-risk prediction with confidence and explanation | See a five-level chance of losing power (Minimal → Critical) with a confidence indicator. Tap it to see what raises or lowers the chance and what data is missing. |
| 3 | Explore scenarios and get a restoration range | Use the **Restoration Explorer** section below the Restoration Estimate card. Change broken poles, downed spans, transformer damage, where the damage is, restoring in steps, crews and road access. The range updates live. |
| 4 | Preparation actions and alert eligibility | Get preparation steps that fit the predicted length of the outage and any needs the customer has declared, plus a clear yes or no on alerts. |
| 5 | At least one proactive communication | See ready-to-send messages for before the storm, outage confirmed, estimate updated and power restored, plus a notification inbox that fills as the storm moves on. |
| 6 | Show how privacy, safety, uncertainty and limits are handled | Model Estimate badges, a **Help & How It Works** page, safety labels and a fallback for questions it can't answer reliably. See the last section below. |

## How it meets the five requirements

### 1. Outage risk prediction

- **Input:** an anonymized premise, its circuit, or a premise ID.
- **Output:** a risk band with five levels (Minimal, Low, Medium, High, Critical), shown as a scale and a battery-style gauge.
- **Signals used**, each weighted in `risk.ts`. The data is built from the challenge shapefiles by `npm run data:risk`.
  - wind exposure (overhead vs. underground service)
  - number of devices upstream
  - how rural the area is
  - trees
  - overhead length of the feeder
  - whether there's a tie switch
  - how often the circuit and the customer's own power path were damaged in past storms (ARCOS)
- **Explanation:** the top factors, each marked as raising or lowering the chance, in plain words. For example: "The line feeding you was damaged in 3 of the last 11 storms."
- **Uncertainty:** confidence is 1–3 with reasons, such as "storms this strong are rare in the records" or "some inputs are assumed". Inputs that are missing are listed.
- **Sanity check:** a backtest that holds out past storms gives an AUC of about 0.60–0.63. An overhead-only baseline gets about 0.46.

### 2. Restoration-time estimate

- **Output:** always a range (e.g. "9–17 hours", "Plan to be without power until Tue. 2 PM"), never a single promised time. The range is wider when confidence is lower.
- **Damage type and quantity:** labor hours for each part come from AEP's `Install_Labor_HackOHIO.xlsx`, counting install and removal. A broken pole is about 5.3 person-hours, a wire span about 0.9 and a transformer about 3.2.
- **Travel and nonproductive time:** every hour is multiplied by the workbook's indirect labor multiplier (4.5). Road access adds the workbook's per-site adders. Crew arrival time grows with storm strength and with rural areas.
- **Crews and sequencing:** each damage site gets its own crew, and crews work in parallel. Adding crews beyond the number of sites doesn't help, and the app says so.
- **Upstream dependencies and step restoration:** the customer chooses where the damage is: their street, a nearby branch, or the main line.
  - Damage on a branch can be cut off so the customer is switched back on in about an hour.
  - Main-line damage can only be bypassed if the circuit has a tie switch to another circuit.
- **Updates live** when damage, crews, access or network assumptions change. A "What Could Change It" list shows the inputs that would move the estimate most, in hours.
- **Model vs. confirmed:**
  - "Confirmed by AEP" items always describe the damage AEP reported, never the customer's what-if.
  - Estimates carry a **Model Estimate** badge, which switches to **What-If Estimate** once the customer changes an input.

### 3. Personalized preparation guidance

- Steps follow the risk and the expected length of the outage:
  - charge phones and battery packs
  - food safety
  - water and somewhere to stay overnight when the outage could be long
- **Safety messages are labeled clearly**: stay 30 feet from downed wires, call 911, and run generators outside only.
- **Declared needs adapt the guidance.** In Settings → Notifications → Your Needs, the customer can declare any of these. Each one adds its own preparation step:
  - **Powered medical equipment:** backup batteries and a place to go.
  - **Hard to leave home quickly** (stairs, wheelchair, no car): someone to check in, a ride lined up early, and the manual release for elevators and garage doors.
  - **Deaf or hard of hearing:** texts instead of calls, and phone emergency alerts with vibration and flash.
  - **Blind or low vision:** phone calls for key updates, and essentials kept in one spot that can be found by touch.
  - **Critical facility** (school, water treatment, care home, shelter): test generators and check fuel, and confirm who decides to close or move people.
- Only the customer can turn these on. The app never guesses them from account, network or ARCOS data, and never shows them on a map.

### 4. Alerts and proactive communications

- **Eligibility rule:** the customer gets pre-storm alerts when their chance is Medium or higher, or they declared medical equipment, a mobility need, or a critical facility. Everyone gets alerted once an outage is confirmed.
- **Timing and escalation:**
  - before the storm: 24 hours ahead, or 48 hours ahead with a medical, mobility or facility need
  - outage confirmed: within 5 minutes
  - estimate updated: whenever the estimate moves 2 or more hours
  - power restored: as soon as crews finish
  - long outages: after 4 hours a welfare check (medical) or a hand-off to AEP's critical-facility team (facility); after 12 hours a check-in (mobility); otherwise warming and cooling centers after 24 hours
  - a phone call is added for medical, vision or facility needs. Customers who are deaf or hard of hearing get texts instead, and the text channel stays on
- **Channels:** push, text, email and phone call, chosen by the customer. Text messages show their length in characters and how many texts they take.
- **Messages:** short, plain-language drafts for pre-storm, outage-confirmed, estimate-updated and restoration-complete. The inbox also carries weather advisories, downed-wire warnings, crew updates and a follow-up survey.

### 5. Explainability and responsible use

- **Reasons in plain words** for the risk, the estimate and each recommendation, in the home cards and the chat.
- **Disclosed:** confidence, what assumptions were made, which data is missing, and what could change the answer. The **Help & How It Works** page (from Settings, or "How We Calculated This" on the estimate card) lists every restoration assumption.
- **Privacy:**
  - No premise numbers, addresses, coordinates, device IDs, employee details or life-support flags leave the data build.
  - Area names are fictional, and the home marker on the map is offset from real equipment. Hospital, fire and ambulance markers are snapped to a ~1 km grid, so they show a general area, not an exact spot.
  - Real-premise lookup happens server-side with hashed IDs.
- **Fallback:** questions the built-in answers don't cover go to an LLM (Claude). It is limited to the current context, told never to promise times, and told to keep AEP-confirmed facts apart from estimates. If the AI isn't configured or can't answer reliably, the customer gets a clear "I can't answer that one reliably, contact AEP customer service" card.

## How it's built

- **App:** Next.js 16, React 19, TypeScript, Tailwind v4 and shadcn/ui. It has a mobile layout and a desktop layout, a map that can be dragged and zoomed, a chat, an alerts inbox and settings.
- **Data pipeline:** dependency-free Node scripts read the challenge shapefiles and the labor workbook. They write small anonymized JSON files (`src/data/risk-features.json`, `src/data/restoration.json`). The app never reads raw data at runtime.
- **Models:** plain TypeScript functions: `risk.ts` scores outage risk and confidence, and `restoration.ts` builds the restoration estimate. `model.ts` turns both into the customer-facing text.
- **APIs:**
  - `/api/chat` (LLM fallback)
  - `/api/premise` (optional DynamoDB lookup)
  - `/api/map` (outage-map data)
  - `/api/outage` (demo event feed)
  - `/api/health` (shows which integrations are configured)

## Limits and assumptions

This is a focused prototype, not an outage-management system.

- **Storms are simulated.** The five stages and the reported damage are a scripted demo storm.
- **Stated assumptions, not data:** crew size (3), crew arrival time, road-clearing and switching times, the 70 mph "rare storm" cutoff, and the tree indicator (there's no tree data in the package).
- **ARCOS repair dates are day-level only**, so restoration durations aren't calibrated against them. ARCOS is used for damage patterns and how often sites were hard to reach.
- **Damage location is a what-if input**, not traced from a real fault on the network.
- **The map area** is not tied to the selected demo premise.
- **There are no automated tests yet.**
