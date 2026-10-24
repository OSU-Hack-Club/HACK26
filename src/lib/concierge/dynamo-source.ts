// Server-only premise lookup backed by DynamoDB (loaded by scripts/data/load-dynamo.mjs).
//
// A premise number from the customer is hashed with the same keyed HMAC the export step used, so the
// real number never travels and cannot be derived from the stored ID. The lookup returns the same
// PremiseRecord shape as the static source (features.ts), so model.ts treats both identically.
//
// This module must never be imported into client code: it reads PREMISE_HASH_SECRET and AWS credentials.
// Keep it behind the /api/premise route. See DEVELOPMENT.md › Making the data dynamic and › Privacy rules.

import "server-only";

import { createHmac } from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

import { env, requireEnv } from "@/env";
import type { FeatureNorms, PremiseFeatures, PremiseRecord, StormEvent } from "@/lib/concierge/features";

/** Same public ID derivation as scripts/data/export-premises.mjs. Keep the two in sync. */
function publicId(premiseNumber: string): string {
  const secret = requireEnv("PREMISE_HASH_SECRET");
  return "PX" + createHmac("sha256", secret).update(premiseNumber).digest("hex").slice(0, 40);
}

let client: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  if (!client) {
    client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.AWS_REGION }));
  }
  return client;
}

interface Snapshot { snapshot: string; norms: FeatureNorms; storms: StormEvent[] }
/** How long the ACTIVE snapshot (pointer + norms) is reused before it is read again. */
const SNAPSHOT_TTL_MS = 60_000;
let snapshotCache: { value: Snapshot; loadedAt: number } | null = null;

/** True when the DynamoDB lookup is configured. The route falls back to the static source otherwise. */
export function dynamoConfigured(): boolean {
  return Boolean(env.DYNAMODB_TABLE && env.PREMISE_HASH_SECRET);
}

/**
 * Loads the norms/storms for the currently ACTIVE snapshot. Cached for SNAPSHOT_TTL_MS so a reload
 * (scripts/data/load-dynamo.mjs flips ACTIVE) is picked up without restarting the server.
 * `force` skips the cache. Errors propagate so the route can answer 502 rather than a misleading 404.
 */
async function activeSnapshot(table: string, force = false): Promise<Snapshot | null> {
  if (!force && snapshotCache && Date.now() - snapshotCache.loadedAt < SNAPSHOT_TTL_MS) return snapshotCache.value;
  const pointer = await doc().send(new GetCommand({ TableName: table, Key: { id: "ACTIVE" } }));
  const snapId = pointer.Item?.snapshot as string | undefined;
  if (!snapId) return null;
  const snap = await doc().send(new GetCommand({ TableName: table, Key: { id: `SNAPSHOT#${snapId}` } }));
  if (!snap.Item) return null;
  const value: Snapshot = { snapshot: snapId, norms: snap.Item.norms as FeatureNorms, storms: (snap.Item.storms ?? []) as StormEvent[] };
  snapshotCache = { value, loadedAt: Date.now() };
  return value;
}

export interface PremiseLookup {
  record: PremiseRecord;
  norms: FeatureNorms;
  storms: StormEvent[];
}

/**
 * Looks up a real premise by its number. Returns null when the premise is unknown or the lookup is
 * not configured. The record's `id` is the hashed public ID, never the input number.
 */
export async function lookupPremise(premiseNumber: string): Promise<PremiseLookup | null> {
  if (!dynamoConfigured()) return null;
  const table = env.DYNAMODB_TABLE as string;

  let snapshot = await activeSnapshot(table);
  if (!snapshot) return null;

  const id = publicId(premiseNumber.trim());
  const res = await doc().send(new GetCommand({ TableName: table, Key: { id } }));
  const item = res.Item;
  if (!item || item.type === "pointer" || item.type === "snapshot") return null;
  // The record may come from a load that finished after the cached pointer was read. Re-read ACTIVE once
  // before rejecting it, so a reload never leaves a running server answering 404 for every premise.
  if (item.snapshot !== snapshot.snapshot) {
    snapshot = await activeSnapshot(table, true);
    if (!snapshot) return null;
  }
  // Only return records from the active snapshot, so a lookup never mixes data from different loads.
  if (item.snapshot !== snapshot.snapshot) return null;

  const record: PremiseRecord = {
    id: item.id as string,
    area: (item.area as string) ?? "Your area",
    kind: (item.kind as string) ?? "Service address",
    features: item.features as PremiseFeatures,
  };
  return { record, norms: snapshot.norms, storms: snapshot.storms };
}
