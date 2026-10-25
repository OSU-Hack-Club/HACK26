# Judging Rubric Answers: AI Outage Concierge

Prepared answers to the HackOHI/O judging rubric questions, based on what's in this repo. Product overview: [`overview.md`](overview.md). Model details: [`DEVELOPMENT.md`](DEVELOPMENT.md).

Items marked **[you fill in]** need the team's own story. Don't claim research or testing we didn't do.

---

## 1. Innovation: Analyze Accepted Solutions

> How did your team challenge commonly accepted ideas, and what did you do differently in your project?

- **Restoration times.** Utility outage tools usually give one time ("back by 6 PM") or just "assessing", and only after the power is already out. We challenged that in three ways:
  - **Before the outage:** we predict a home's outage chance before the storm arrives, from that home's own line and its history in past storms.
  - **A range, not a promise:** we never give one time. The range is wider when we're less sure, and we show what would move it ("Fallen trees block the roads, +6 h").
  - **Built from the work involved:** instead of a flat guess, the estimate comes from AEP's own labor standards (`Install_Labor_HackOHIO.xlsx`). We count each part replaced, apply the workbook's 4.5 multiplier for travel and setup, then account for crews working in parallel, blocked roads, and whether crews can switch the home back on before the repair is finished.
- **"What happened" vs. "what we think":** most apps blur these. Ours labels everything as **Confirmed by AEP**, **Model Estimate** or **What-If Estimate**.
- **Alternatives we explored and measured:**
  - **Risk model:** we backtested by hiding one past storm at a time. Our model scored an AUC of 0.60–0.63, against 0.46–0.47 for a simple "overhead lines are risky" rule.
  - **Repair durations:** the first plan was to learn them from ARCOS repair dates. Those dates are day-level only, so we switched to the labor-standard approach.

**Likely score: 4–5.** To lock in 5, add one slide comparing current utility outage apps (single restore time, no pre-storm risk, no explanation) with ours. **[you fill in: which apps you looked at]**

---

## 2. Curiosity: Demonstrate Curiosity

> Can you share some examples of questions your team asked while exploring possibilities? Show us something unique, beautiful or clever in your project.

**Questions we asked, and what we did about each:**

- **"Can we trust ARCOS dates for repair times?"** No: they're day-level, and open repairs carry placeholder dates. So we used the labor workbook instead, and used ARCOS only for how often damage sites were hard to reach (about 32%).
- **"Does nearby damage or pole age actually predict outages?"** We tested both. Both made the backtest *worse*, because they mostly track dense, older city areas, which the February 2025 storm hit less. We dropped them and documented why in `risk.ts`.
- **"If the customer changes the damage, is it still AEP's information?"** No. So confirmed facts always use the reported damage, and the badge switches to "What-If Estimate".
- **"Why would more crews help if there's only one damage site?"** They wouldn't, so the model assigns crews to sites and tells the customer when extra crews don't help.
- **"Can we show hospitals without revealing sensitive locations?"** We snap them to a grid of about 1 km.
- **"How do we serve people the alerts usually miss?"** Customers can declare mobility, hearing, vision or critical-facility needs. Deaf customers get texts instead of calls, and blind customers get calls. Nothing is guessed from utility data.

**Something to show off:**

- The **Restoration Explorer**: change "Where is the damage?" from *Your street* to *Nearby branch*, and the estimate drops from about 12.5 h to about 5.6 h. That's because crews can cut that branch off and switch the home back on in about an hour.
- The **liquid-glass bottom nav**, with a lens that slides between tabs.

**Likely score: 5.** Every question above led to a change in the app.

---

## 3. Communication: Concepts and Visual Representations

> What part of your presentation shows off your work best? Can you show me your prototype and how it explains your concept?

A working prototype that follows one customer through five storm stages: All Clear → Watch Alert → Power Outage → Restoring → Restored. It runs on phone and desktop, with:

- a draggable outage map
- the outage chance and its confidence level
- the restoration estimate, shown as a bar of wait, road-clearing and repair time
- the Restoration Explorer
- an AI chat
- the alerts inbox
- a Help page explaining every assumption

The judges' demo menu switches the stage, wind and damage live, so they can watch every answer change.

**Likely score: 4–5.** A 5 needs a functional prototype *plus* diagrams. We have the prototype, but the only diagram is a text pipeline diagram in `DEVELOPMENT.md`. Before judging, make:

- **one architecture diagram:** challenge data → build scripts → JSON files → risk and restoration models → app and AI chat
- **one customer-journey slide:** the six demo steps mapped to screens

---

## 4. Project Breadth and Complexity: Integrate Information

> How did you use information from two different areas to explore a new idea? What was the most complicated piece to build? What changes if this project is scaled to 10× the people?

**Areas combined:**

- **Power-grid engineering:** circuit maps, protective devices, upstream-equipment relationships, tie switches, restoring power in steps.
- **Operations:** STORMS labor hours, the indirect labor multiplier, crew scheduling across damage sites.
- **Data science and GIS:**
  - shapefile parsing
  - spatial joins
  - storm clustering
  - a leave-one-storm-out backtest
- **Weather:** wind strength drives both risk and how long crews take to arrive.
- **Human factors and accessibility** (not computing):
  - plain-language writing (no odds, no jargon)
  - declared needs
  - safety messaging
- **Responsible AI and privacy:**
  - prompt-injection defenses
  - multiple AI providers (Anthropic, OpenAI, local Ollama), with built-in answers when AI is off
  - hashed premise IDs
  - grid-snapped locations
  - an allow-list of fields that may leave the data build
- **Cloud:** optional DynamoDB lookup for real premises.

**Hardest part:** making the restoration estimate honest and responsive at once. That meant:

- reading the labor workbook with our own reader, no extra libraries
- turning part-level labor hours into crew-hours per site
- assigning crews to sites in parallel
- modeling when step restoration is possible: always for branch damage, only with a tie switch for main-line damage, never on the customer's own street
- keeping all of that separate from what AEP confirmed

**At 10× scale:**

- The app already doesn't depend on the static demo data. Premises can come from DynamoDB by hashed ID, and the build scripts run on the full extract.
- To scale up, we would:
  - replace the scenario wind with a live National Weather Service feed
  - rebuild the data on a schedule
  - put rate limits on the chat and premise APIs
  - send alerts through a real messaging service
- The models are pure functions, so they're cheap to run per customer and easy to put behind an API.

**Likely score: 5.** Several fields combined, including the human-factors work, which isn't computing.

---

## 5. Impact: Create Value

> What does your project improve or who might it help? What user needs did you keep in mind? Did you get any feedback from your target audience?

- **Residential customers:** they know *before* the storm whether to charge batteries, fill water jugs, or plan to stay elsewhere. The guidance is sized to how long the outage could last, not generic.
- **Vulnerable customers:** medical-equipment users get alerts 48 hours ahead and a welfare check after 4 hours. Mobility, hearing, vision and critical-facility needs change both the advice and how we contact people. Only the customer can turn these on.
- **AEP:**
  - fewer "is my power out?" calls (the outage message says "you don't need to report it")
  - fewer complaints about missed restore times, because we show ranges and explain what moved them
  - an alert design that sends only when it matters: Medium chance or higher, or a declared need
- **Feasibility:** it uses AEP's own data and labor standards, works with no AI configured, and has a path to real premises.

**Likely score: 4–5.** "Detailed, justified and feasible" fits. The gap is feedback from real users. **[you fill in: if anyone tried it, even classmates or family, give one concrete change you made because of it.]** If nobody did, say so, and explain which user needs came straight from the challenge brief.

---

## 6. Navigating Challenges: Learn from Failure

> Name one thing you struggled with or that didn't work, and how you pivoted. How did you test your ideas and make changes based on the results?

**Pivots that happened in this project:**

1. **The first restoration model was too simple.** It cut repair time by a flat 40% whenever rerouting was on, which gave about 7.6 h. We replaced it with the labor-standard, crew-scheduling and step-restoration model, which gives about 12.5 h for the reported damage, shown as a 9–17 h range. The new estimate is longer but defensible.
2. **ARCOS dates couldn't calibrate durations.** We used the dates only for access statistics and labor standards for the hours, and documented the limitation.
3. **Two risk indicators ran backwards in testing** (nearby damage, pole age). We removed them based on the backtest instead of keeping them because they sounded right.
4. **Privacy problems found in our own audit:**
   - Facility markers were accurate to about a metre, so we snapped them to a ~1 km grid.
   - Accessibility support only covered medical needs, so we added four more declared needs.
5. **UX pivot:** what-if controls buried inside the estimate card read like an operator tool. We moved them into a separate Restoration Explorer with a live result, and moved the methodology to a Help page.
6. **Tooling:** with no npm packages available for reading spreadsheets, we wrote our own reader for the labor workbook.

**How we tested:**

- the leave-one-storm-out backtest
- checking the restoration model against hand-worked cases (e.g. Maple Grove: blocked roads 18.5 h, nearby branch 5.6 h, one crew 24.4 h)
- a requirement-by-requirement audit against the challenge brief

**Likely score: 5.** Several alternatives produced a better solution, with evidence.

---

## Score summary and quickest gains

| Criterion | Likely score | What would raise it |
| --- | --- | --- |
| Innovation | 4–5 | Comparison slide: current outage apps vs. ours |
| Curiosity | 5 | Rehearse the Explorer "nearby branch" demo |
| Communication | 4–5 | **Architecture diagram and journey slide** (needed for 5) |
| Breadth and complexity | 5 | Practice the 10× answer |
| Impact | 4–5 | **Any real user feedback**, even informal |
| Navigating challenges | 5 | Tell the 7.6 h → 12.5 h story with numbers |

**Before judging:**

- Run `npm run typecheck && npm run lint` and click through every stage. A broken demo costs points everywhere.
- Fix the what-if leak found in the audit before demoing the Explorer. Right now, if a judge changes the damage and then opens the inbox, a "sent" AEP message repeats the customer's made-up damage. That undercuts the "confirmed vs. model" story above.
