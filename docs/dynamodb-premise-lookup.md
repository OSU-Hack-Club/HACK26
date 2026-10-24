# DynamoDB premise lookup

Lets a customer enter their **real premise number** and get an estimate built from that premise's own
features, instead of only the three demo IDs. The feature is **optional**: with no DynamoDB configured,
the app falls back to the static demo premises in `src/data/risk-features.json` and behaves exactly as before.

This document is the handoff for the `feature/dynamodb-setup` branch. It pairs with
[`DEVELOPMENT.md`](../DEVELOPMENT.md), whose *Making the data dynamic* and *Privacy rules* sections
this implementation follows.

## How it fits together

```
scripts/data/build-risk-features.mjs      existing ETL; now importable (see "Importability" below)
        │  npm run data:export            → AEP-Challenge-Materials/data/exported/ (git-ignored)
        │     premises.jsonl  one anonymized PremiseRecord per line, id = HMAC(premise_nu)
        │     snapshot.json   norms + storms + count for this build
        ▼
        │  npm run data:load              → DynamoDB table (AWS SDK, parallel BatchWrite)
        ▼
DynamoDB  <DYNAMODB_TABLE>  (us-east-2)
        items:  id = PX<hmac40>        { snapshot, area, kind, features }
                id = SNAPSHOT#<snap>   { norms, storms, count, generatedAt }
                id = ACTIVE            { snapshot, count }     ← flipped last, after all records load
        ▼  server only
src/lib/concierge/dynamo-source.ts        lookupPremise(number): hash → GetItem → PremiseRecord + norms
src/app/api/premise/route.ts              POST { premise } → { premise, norms, storms } | 404 | 503
        ▼  browser
src/components/concierge/store.tsx        unknown typed ID → POST /api/premise → state.premiseOverride
src/lib/concierge/model.ts                model(state) uses premiseOverride (+ its norms) when present
```

## Privacy (enforced, per DEVELOPMENT.md › Privacy rules)

- The export emits an **allow-list** of fields only: the `PremiseFeatures` keys plus `circuit`, `area`,
  `kind`. A forbidden-field backstop (`premise_nu`, coordinates, device IDs/locations, `critical_c`)
  fails the export if any slips in.
- The premise number is replaced by `PX` + a **keyed HMAC-SHA256** (not a plain hash — premise numbers
  are guessable). The real number never leaves the build machine and cannot be derived from the stored ID.
- Lookup is **server-only** (`import "server-only"`); the full table is never shipped to the browser.
- Real premises display `area = "Your area"` plus the already-anonymized circuit name.

## Running it

Prerequisites: extracted shapefiles (`npm run data:extract`), a `.env.local` (below), AWS credentials,
and Node 22.18+ (the data scripts import `risk.ts` via type stripping and use `--env-file-if-exists`;
developed on Node 24).

```bash
npm run data:export    # writes the anonymized JSONL + snapshot (git-ignored); ~15 s
npm run data:load      # loads them into DynamoDB and flips ACTIVE last; minutes (sandbox throttles writes)
npm run build && npm start
```

Both data scripts read `.env.local` themselves (`--env-file-if-exists`), so no shell exports are needed.
`LOAD_CONCURRENCY` (default 20) sets how many 25-item batches are written in parallel.

Check a lookup against the running server (use a real premise number from `Customer_Clip`; never paste
one into a commit, issue, or chat):

```bash
curl -s -X POST http://localhost:3000/api/premise -H "Content-Type: application/json" -d '{"premise":"<premise number>"}'
```

Expect `200` with `premise.id` = `PX…`, `404` for an unknown number, and `503` when `DYNAMODB_TABLE` or
`PREMISE_HASH_SECRET` is unset (the UI then falls back to "unknown ID"). `/api/health` reports
`configured.premiseLookup`.

If a lookup that should work returns 404, first confirm the server you're hitting is the one you just
started: a leftover `next start` holding port 3000 makes new servers exit with `EADDRINUSE`, and the old one
keeps answering with its old secret and build.

## Environment

Add to `.env.local` (all server-only; documented in `.env.example`):

| Var | Purpose |
| --- | --- |
| `DYNAMODB_TABLE` | Table name (e.g. `hack26-premises`). Unset → lookup disabled, demo premises used |
| `AWS_REGION` | Defaults to `us-east-2` |
| `PREMISE_HASH_SECRET` | Keys the premise-ID HMAC. **Every teammate and every environment must use the same value**, or lookups 404. Share out-of-band; never commit it |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

The scripts and the server read AWS credentials from the standard provider chain; locally that is the
`sandbox` CLI profile via `AWS_PROFILE=sandbox`.

## Current AWS state (sandbox account 577483323147, us-east-2)

- Table **`hack26-premises`**, on-demand billing, key schema: partition key `id` (string), no sort key.
  Tags `Project=HACK26`, `ManagedBy=Kiro`.
- ACTIVE snapshot `2026-10-24T20-42-15-577Z`, **117,595** premise records.
- **Cleanup owed:** an earlier load under a since-rotated secret left ~117,595 orphaned items
  (snapshot `2026-10-24T20-22-00-780Z`). They are unreachable (their secret is gone) and should be
  deleted to reclaim storage. The loader has no prune step yet (see Follow-ups).

## Design notes

- **Single table, `id`-only key.** The one access pattern is "get a premise by its hashed ID", so no sort
  key or GSI is needed. The ACTIVE pointer + per-snapshot metadata item give consistent reads across reloads.
- **Snapshot consistency.** `norms` and `storms` travel with the snapshot and are returned alongside the
  record, so the model always scales features against the matching build (DEVELOPMENT.md › step 1). The
  loader flips `ACTIVE` only after every record is written, and the lookup only returns records whose
  snapshot matches `ACTIVE`, so it never mixes two loads. **Caveat:** items are keyed by hashed id alone, so
  a reload under the *same* secret overwrites records in place; until `ACTIVE` flips, already-overwritten
  premises answer 404. Acceptable for the demo; see Follow-ups for the side-by-side alternative.
- **`dynamo-source.ts` caches ACTIVE for 60 s** and re-reads once on a snapshot mismatch, so a running
  server picks up a reload without a restart.
- **Importability.** `build-risk-features.mjs` now exports `features` / `norms` / `stormEvents` and only
  writes `risk-features.json` when run directly (`RUN_DIRECTLY`, Windows-case-safe). `export-premises.mjs`
  imports it, so there is one source of truth for the feature math. Verified: a direct run reproduces the
  committed JSON byte-for-byte; an import does not rewrite it.
- **`model()` wiring.** Rather than a module-level `source`, an optional `premiseOverride` (record + its
  norms) lives in `ConciergeProvider` state and is threaded through `model()` and `greeting()`
  (DEVELOPMENT.md › step 2: no mutation of the module-level source). `notifications.ts` already falls back to
  `m.P`, and the debug menu reads the override's area. Demo IDs and the static JSON remain the default and
  the fallback, so nothing changes when the DB is absent. Picking a demo premise clears the override.
- **Known UI nits.** Real premises read "Your area" in copy (e.g. "the live estimate for Your area"), and
  the debug menu's Location control highlights nothing for them. Changing the stored `area` needs a reload.

## Security

`/api/premise` is **unauthenticated**. It returns only anonymized data, but it lets anyone probe premise
numbers. For the hackathon: strict zod validation, a uniform 404, and the input is never logged or echoed.
Before any real deployment, add auth or rate limiting, and give the server an IAM role scoped to
`dynamodb:GetItem` on this one table instead of long-lived keys.

## Verification done

- `npm run build` passes (compile + TypeScript); `/api/premise` registered as dynamic.
- ESLint clean on every changed file, including both data scripts.
- Live smoke test against a fresh server: real premise → `200`, correct hashed id, circuit `CIR27`,
  norms present, `area="Your area"`.
- Pipeline unchanged: a direct `data:risk` run rewrites `risk-features.json` with a zero-line content diff,
  and importing the script (as `export-premises.mjs` does) leaves the file untouched.
- Privacy: 0 forbidden-field matches in the exported JSONL.

Not yet tested: the 503 and DB-down fallbacks in the UI, and `npm run dev` with a real premise loaded.

## Follow-ups (not done)

1. **Delete the orphaned `2026-10-24T20-22-00-780Z` items** from DynamoDB.
2. Add a `--prune` (or TTL) step to `load-dynamo.mjs` so old snapshots are removed after `ACTIVE` flips.
3. Consider keying items as `PX<hash>#<snapshot>` so reloads write side-by-side and "flip ACTIVE last"
   holds even under the same secret.
4. Decide whether to fold any of this into `DEVELOPMENT.md` (its Files/pipeline tables don't yet list the
   new scripts, route, or env vars). Left to the team, since that file is theirs.
5. No automated tests yet; `dynamo-source.ts` and the export allow-list are good unit-test targets.
6. The loader isn't resumable: if sandbox credentials expire mid-load, rerun it (writes are idempotent
   puts; `ACTIVE` only flips at the end).
7. Coordinate the table name and key schema with the team's own table-creation guide, if one is written.
