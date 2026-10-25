# AI Outage Concierge: Voiceover Script

**Runtime:** 2:38, in 10 sections. **Spoken words:** 365, about 2:31 at 145 words per minute. That leaves roughly a second of air at each section boundary.

**Recording tips**

- **One take per section.** Record each section as its own file, then drop it on the timeline at the section's start time. If a take runs long, re-record that section only.
- **Pace:** calm and conversational, about 145 words per minute. Every section is at or under its word budget, so you never need to rush. If you're ahead, slow down. Don't add words.
- **Breathe at the boundaries.** Leave about half a second of silence at the start and end of each take. Neighboring sections overlap by a second on the timeline, and the silence fills that gap.
- **Within a section,** pause briefly at each full stop. The short questions in sections 2 and 4 ("For how long?", "Damage on a nearby branch?") work best with a small beat after them.
- **Say it this way:** AEP = "A-E-P". HackOHI/O = "hack-oh-high-oh". 911 = "nine-one-one". CSV = "C-S-V". JSON = "jay-son".
- **Speakers rotate:** Adib (1, 4, 7, 10), Gautham (2, 5, 8), Ornab (3, 6, 9). Each person speaks about 120 words.

---

### 1 · Title and team (0:00–0:11, 24 words, budget ~25) — Speaker: Adib

We're Adib, Ornab and Gautham. This is the AI Outage Concierge. It turns AEP's storm data into plain, honest answers for a single home.

*Rubric: Communication (introduces the team and the idea).*

### 2 · Your storm, at a glance (0:11–0:23, 26 words, budget ~28) — Speaker: Gautham

A storm's coming. Customers want four answers. Will I lose power? For how long? What should I do? Will you tell me? One screen answers them.

*Rubric: Impact (the four customer questions we designed around).*

### 3 · Will I lose power? (0:22–0:40, 40 words, budget ~42) — Speaker: Ornab

We asked: do overhead wires alone predict outages? On past storms, that did worse than a coin flip. Nearby past damage pointed the wrong way; we dropped it. What survived is a five-level chance, with reasons, confidence, and what's missing.

*Rubric: Curiosity (a question we asked), Innovation (we tested the obvious assumption and it failed), Navigating Challenges (we dropped a signal that didn't hold up), Breadth and Complexity (statistics and backtesting on utility data).*

### 4 · How long could it take? (0:39–0:58, 44 words, budget ~45) — Speaker: Adib

One exact time sounds precise. Storms aren't. We always show a range, from AEP's own labor standards. A broken pole or downed trees stretch it. Damage on a nearby branch? Crews can isolate it and restore you sooner. Repair hours trace to real parts.

*Rubric: Innovation (a range instead of a single time), Breadth and Complexity (STORMS labor standards, network topology for step restoration, structure drawings for parts).*

### 5 · Through the whole storm (0:57–1:10, 27 words, budget ~30) — Speaker: Gautham

One app follows the customer through the whole storm: all clear, watch, outage, restoring, restored. Throughout, what AEP has confirmed stays apart from what our model estimates.

*Rubric: Innovation (confirmed facts kept apart from estimates), Impact (guidance before, during and after).*

### 6 · Before, during and after (1:09–1:20, 23 words, budget ~26) — Speaker: Ornab

We send four messages, from storm warning to power restored. Customers declare medical equipment themselves; then alerts come earlier, with a welfare check.

*Rubric: Impact (customers who rely on medical equipment), Breadth and Complexity (privacy: needs are declared by the customer, never inferred).*

### 7 · No guessing when it matters (1:19–1:33, 31 words, budget ~33) — Speaker: Adib

Some questions never reach the AI. A downed wire gets a fixed safety card: call 911. Staff are alerted. When data is thin, we say we don't know, instead of guessing.

*Rubric: Innovation (we say "we don't know" instead of guessing), Breadth and Complexity (AI with guardrails), Impact (customer safety).*

### 8 · Every decision, accountable (1:32–2:00, 63 words, budget ~65) — Speaker: Gautham

AEP staff get their own console. Its risk board rests on our hardest piece: tracing eleven storms of damage through the network to the homes it would cut off. Anything the system shouldn't decide alone, like a medical escalation, a downed-wire report, or a suspicious AI answer, goes to a person. They approve, override or escalate, with a note, and that's logged too.

*Rubric: Breadth and Complexity (the hardest piece: ARCOS damage joined to GIS and topology; human review over the AI), Impact (accountability for AEP staff).*

### 9 · Tamper-evident audit trail (1:59–2:26, 60 words, budget ~62) — Speaker: Ornab

Every action becomes an entry: who acted, what was decided, the inputs, and the model version. Each entry stores the hash of the one before. Customer text is redacted first. It exports to CSV or JSON, and at AEP scale would stream to write-once storage. Edit one entry, and the chain breaks right there. Nobody can rewrite the record unnoticed.

*Rubric: Breadth and Complexity (privacy filters, tamper-evident logging, what changes at 10x scale), Impact (accountability for AEP).*

> Timing cue: say "Edit one entry" as the edited block starts to shake, so "breaks right there" lands on the break.

### 10 · Thank you (2:25–2:38, 27 words, budget ~28) — Speaker: Adib

Predict. Explain. Prepare. Communicate. Customers get honest answers, and AEP gets a record of every one. Thank you to AEP and the judges. We'd love your questions.

*Rubric: Communication (closing line and handoff to Q&A).*

---

## Rubric coverage

| Criterion | Answered in the video | Question it answers |
| --- | --- | --- |
| Innovation | 3, 4, 5, 7 | How did we challenge accepted ideas? The "overhead wires = risky" assumption failed our backtest (3). We give a range, never a single time (4). Confirmed facts stay apart from estimates (5). We say "we don't know" instead of guessing (7). |
| Curiosity | 3 (lightly) | A question we asked: do overhead wires alone predict outages? More examples are in Q&A below. |
| Communication | 1, 10, and the video itself | The video is the visual. "Show me your prototype" is left for Q&A. |
| Project Breadth and Complexity | 3, 4, 6, 7, 8, 9 | How we combined areas: statistics and backtesting (3); STORMS labor standards, topology and structure drawings (4); privacy (6, 9); AI with guardrails and human review (7, 8). Hardest piece: tracing storm damage through the network (8). Scale: write-once audit storage (9). |
| Impact | 2, 5, 6, 7, 8, 9 | Who it helps: customers asking four questions (2), customers who rely on medical equipment (6), safety (7), AEP staff who need accountability (8, 9). |
| Navigating Challenges | 3 | Something that didn't work: the nearby-damage signal pointed the wrong way in the backtest, so we dropped it. The ARCOS repair-date limit is in Q&A. |

---

## Saved for Q&A

These are the short rubric questions we deliberately left out of the video. All answers come from `PRESENTATION.md`, `overview.md` and `DEVELOPMENT.md`.

**How accurate is it? (Impact / Navigating Challenges)**
We held out the two biggest storms and predicted which homes would be hit. The model ranks an affected home above an unaffected one 63% and 60% of the time (AUC 0.63 and 0.60). The "overhead wires = risky" baseline scores 0.46. We tuned the weights while watching those numbers, so we call it a sanity check, not an independent validation.

**How did you test your ideas and change them based on the results? (Navigating Challenges)**
Every signal had to hold up in the leave-one-storm-out backtest. Nearby damage and pole age both pointed the wrong way, so neither is scored. Nearby damage tracks dense city areas, which the February 2025 storm hit less. On the software side, 42 unit tests cover the audit chain, tamper detection, the review queue, privacy filters, the reliability fallback and the materials list. There are no browser tests.

**Name another thing that didn't work. (Navigating Challenges)**
ARCOS repair dates only go down to the day, and open repairs carry a placeholder date, so we couldn't calibrate restoration hours against them. We use ARCOS for damage patterns and access problems (32% of sites were hard to reach). The hours come bottom-up from the labor workbook, and the app says the estimate isn't calibrated.

**Did you get feedback from your target audience? (Impact)**
*The docs don't record any customer or AEP feedback, so answer this one from what actually happened.* If there was none, say so plainly. We designed against the four customer questions in AEP's brief and the brief's needs for medical, accessibility and critical-facility customers. Testing with real customers and AEP storm staff would be our next step.

**Can you show me your prototype? (Communication)**
Yes, it runs live. Use the two-minute path in `PRESENTATION.md`: risk card and Why We Think So, then Restoration Explorer with Trees Down, then the downed-wire question, then switch to Staff, then Reviews, then tamper the audit log.

**What part of the presentation shows off your work best? (Communication)**
The Restoration Explorer. Change any input (poles, trees, damage location, crews) and the range moves. Every repair hour traces back to AEP's labor workbook and the structure drawings.

**Show us something unique or clever. (Curiosity)**
Step restoration from the topology. If damage is on a neighboring branch, crews can open that branch's fuse and switch this home back on before the repair is done. Damage on the main line can only be bypassed if the circuit has a tie switch. The tamper demo is another good pick: edit one audit entry and the check names the exact entry.

**What other questions did your team ask? (Curiosity)**
Does a signal that sounds right actually hold up on storms the model hasn't seen? What should the app do when it doesn't know? Which customers need different timing or channels, and how do we serve them without guessing who they are? (These are framings of decisions the docs describe. Swap in the questions the team actually asked.)

**What changes at 10x scale? (Breadth and Complexity)**
The feature contract (`features.ts`) doesn't care where data comes from, and the optional DynamoDB lookup already fetches a real premise server-side by a hashed ID. The audit log would move from browser storage to write-once storage behind staff login. With more storms and real wind data, we would refit the weights.

**How do you handle privacy? (Breadth and Complexity / Impact)**
We use anonymized premise IDs only. No addresses, names or coordinates leave the data build. The home marker is offset about 250 m, and hospitals and fire stations are snapped to a 1 km grid. Customers declare their own needs. We never infer them, and they never appear on a map. Phone numbers, emails, addresses and account numbers are redacted from customer text before it's logged or sent to the AI.

**Isn't the AI going to make things up? (Breadth and Complexity)**
The four core answers aren't generated. They come straight from the model code. Claude only handles off-script questions. It sees only the current estimate, it's told never to promise times, and it never handles safety or numbers we can't support. Every AI answer is logged, and suspicious ones go to staff review.

**What data did you use? (Breadth and Complexity)**
All of it came from the challenge package: 1,659 ARCOS damage records across 11 storms, 116 circuits from GIS, 117,595 homes linked through the upline topology, the STORMS labor workbook (pole about 5.3, wire span 0.9, transformer 3.2 person-hours), the 4.5x indirect labor multiplier, priority locations and the structure drawings.

**What are the known limits? (Navigating Challenges)**
The storms are scripted; the homes, network and history are real challenge data. There is no tree data, so the trees indicator uses a stated assumption and the app tells the customer. Crew size, arrival and switching times are stated assumptions. The staff view has no login, and the audit log lives in the browser for the demo.
