// Loads the exported premise records (scripts/data/export-premises.mjs) into DynamoDB.
//
//   npm run data:export        # writes AEP-Challenge-Materials/data/exported/
//   npm run data:load          # then loads them here
//
// Design (docs/dynamodb-premise-lookup.md): each record carries its snapshot id, the snapshot manifest
// (norms + storms) is stored as one item, and the ACTIVE pointer is flipped to the new snapshot only after
// every record is written. The app only returns records whose snapshot matches ACTIVE, so it never mixes
// data from two loads. Caveat: items are keyed by hashed id alone, so a reload under the SAME secret
// overwrites records in place, and lookups for already-overwritten premises return 404 until ACTIVE flips.
//
// Reads AWS credentials from the standard provider chain (the `sandbox` profile via AWS_PROFILE, or env vars)
// and DYNAMODB_TABLE / AWS_REGION from .env.local (npm script passes --env-file-if-exists) or the shell.
// Nothing here is privacy-sensitive: premises.jsonl is already anonymized by the export step.

import { readFileSync } from "node:fs";
import { env, exit } from "node:process";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = env.DYNAMODB_TABLE || "hack26-premises";
const REGION = env.AWS_REGION || "us-east-2";
const DIR = "AEP-Challenge-Materials/data/exported";
const BATCH = 25; // DynamoDB BatchWriteItem hard limit.
const CONCURRENCY = Number(env.LOAD_CONCURRENCY || 20); // batches in flight at once; on-demand tables absorb this fine.

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });

function readSnapshot() {
  try {
    return JSON.parse(readFileSync(`${DIR}/snapshot.json`, "utf8"));
  } catch {
    console.error(`Missing ${DIR}/snapshot.json. Run \`npm run data:export\` first.`);
    exit(1);
  }
}

function readRecords() {
  let text;
  try {
    text = readFileSync(`${DIR}/premises.jsonl`, "utf8");
  } catch {
    console.error(`Missing ${DIR}/premises.jsonl. Run \`npm run data:export\` first.`);
    exit(1);
  }
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

/** Writes a chunk of up to 25 items, retrying any the service returns as unprocessed (with backoff). */
async function writeChunk(items) {
  let request = items.map((Item) => ({ PutRequest: { Item } }));
  for (let attempt = 0; attempt < 6 && request.length; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2 ** attempt * 50));
    const res = await doc.send(new BatchWriteCommand({ RequestItems: { [TABLE]: request } }));
    request = res.UnprocessedItems?.[TABLE] ?? [];
  }
  if (request.length) throw new Error(`${request.length} items still unprocessed after retries`);
}

async function main() {
  const snapshot = readSnapshot();
  const records = readRecords();
  console.log(`Loading ${records.length} premises into ${TABLE} (${REGION}), snapshot ${snapshot.snapshot}.`);

  // 1. Snapshot manifest (norms + storms the app needs for consistent scaling).
  await doc.send(new PutCommand({ TableName: TABLE, Item: { id: `SNAPSHOT#${snapshot.snapshot}`, type: "snapshot", ...snapshot } }));

  // 2. All premise records, written in parallel pools of CONCURRENCY batches (each batch = 25 items).
  //    On-demand tables scale to absorb this, cutting a sequential ~20 min load to a couple of minutes.
  const chunks = [];
  for (let i = 0; i < records.length; i += BATCH) chunks.push(records.slice(i, i + BATCH));

  let written = 0;
  let nextLog = 10000;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const pool = chunks.slice(i, i + CONCURRENCY);
    await Promise.all(pool.map((c) => writeChunk(c)));
    written += pool.reduce((n, c) => n + c.length, 0);
    if (written >= nextLog) {
      console.log(`  ${written}/${records.length}`);
      nextLog += 10000;
    }
  }

  // 3. Flip the ACTIVE pointer last, so readers only ever see a fully loaded snapshot.
  await doc.send(new PutCommand({ TableName: TABLE, Item: { id: "ACTIVE", type: "pointer", snapshot: snapshot.snapshot, count: records.length, updatedAt: new Date().toISOString() } }));

  console.log(`Done. ${written} premises written; ACTIVE → ${snapshot.snapshot}.`);
}

main().catch((e) => {
  console.error("Load failed:", e.message ?? e);
  exit(1);
});
