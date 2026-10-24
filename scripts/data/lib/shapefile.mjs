// Minimal, dependency-free readers for the challenge shapefiles (.dbf attributes + .shp geometry).
// Covers what the AEP extracts use: dBASE III tables and Point / PolyLine shapes (with or without Z/M).
// Records are yielded lazily so the 100 MB tables don't have to be materialized as objects.

import { readFileSync, existsSync } from "node:fs";

/** Field list of a .dbf file: [{ name, type, length, decimals }]. */
export function dbfFields(path) {
  return readDbfHeader(readFileSync(path)).fields;
}

function readDbfHeader(buf) {
  const count = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  const fields = [];
  let offset = 1; // byte 0 of each record is the deletion flag
  for (let p = 32; p < headerLength - 1 && buf[p] !== 0x0d; p += 32) {
    const raw = buf.subarray(p, p + 11);
    const name = raw.subarray(0, raw.indexOf(0) === -1 ? 11 : raw.indexOf(0)).toString("latin1");
    const type = String.fromCharCode(buf[p + 11]);
    const length = buf[p + 16];
    const decimals = buf[p + 17];
    fields.push({ name, type, length, decimals, offset });
    offset += length;
  }
  return { count, headerLength, recordLength, fields };
}

/**
 * Iterates .dbf records as plain objects. `pick` limits parsing to the named fields (much faster on wide tables).
 * Numbers become numbers (or null when blank), dates stay "YYYYMMDD" strings, text is trimmed.
 */
export function* readDbf(path, { pick } = {}) {
  const buf = readFileSync(path);
  const { count, headerLength, recordLength, fields } = readDbfHeader(buf);
  const wanted = pick ? fields.filter((f) => pick.includes(f.name)) : fields;
  if (pick) {
    const missing = pick.filter((n) => !fields.some((f) => f.name === n));
    if (missing.length) throw new Error(`${path}: missing fields ${missing.join(", ")}`);
  }
  for (let i = 0; i < count; i++) {
    const start = headerLength + i * recordLength;
    if (buf[start] === 0x2a) continue; // "*" = deleted
    const rec = {};
    for (const f of wanted) {
      const s = buf.toString("utf8", start + f.offset, start + f.offset + f.length).trim();
      if (f.type === "N" || f.type === "F") rec[f.name] = s === "" ? null : Number(s);
      else if (f.type === "L") rec[f.name] = /^[YyTt]$/.test(s);
      else rec[f.name] = s;
    }
    rec.__index = i;
    yield rec;
  }
}

const POINT_TYPES = new Set([1, 11, 21]);
const LINE_TYPES = new Set([3, 13, 23, 5, 15, 25]);

/**
 * Iterates .shp geometries in file order (same order as the .dbf rows).
 * Yields null for null shapes, [x, y] for points, and [[x, y], ...][] (parts) for polylines/polygons.
 */
export function* readShp(path) {
  const buf = readFileSync(path);
  let p = 100;
  while (p + 8 <= buf.length) {
    const contentBytes = buf.readInt32BE(p + 4) * 2;
    const c = p + 8;
    const type = buf.readInt32LE(c);
    if (type === 0) yield null;
    else if (POINT_TYPES.has(type)) yield [buf.readDoubleLE(c + 4), buf.readDoubleLE(c + 12)];
    else if (LINE_TYPES.has(type)) {
      const numParts = buf.readInt32LE(c + 36);
      const numPoints = buf.readInt32LE(c + 40);
      const partsAt = c + 44;
      const ptsAt = partsAt + numParts * 4;
      const parts = [];
      for (let k = 0; k < numParts; k++) {
        const from = buf.readInt32LE(partsAt + k * 4);
        const to = k + 1 < numParts ? buf.readInt32LE(partsAt + (k + 1) * 4) : numPoints;
        const part = [];
        for (let j = from; j < to; j++) part.push([buf.readDoubleLE(ptsAt + j * 16), buf.readDoubleLE(ptsAt + j * 16 + 8)]);
        parts.push(part);
      }
      yield parts;
    } else throw new Error(`${path}: unsupported shape type ${type}`);
    p = c + contentBytes;
  }
}

/** True when the layer's .prj is Web Mercator (meters) rather than WGS84 degrees. */
export function isWebMercator(shpPath) {
  const prj = shpPath.replace(/\.shp$/i, ".prj");
  return existsSync(prj) && /Mercator/i.test(readFileSync(prj, "utf8"));
}

/** Web Mercator meters → [lng, lat]. */
export const mercatorToLngLat = ([x, y]) => [
  (x / 6378137) * (180 / Math.PI),
  (Math.atan(Math.exp(y / 6378137)) * 2 - Math.PI / 2) * (180 / Math.PI),
];

/**
 * Joins a layer's attributes and geometry: yields { ...attrs, geom } with geometry in [lng, lat].
 * `pick` is forwarded to readDbf.
 */
export function* readLayer(basePath, opts = {}) {
  const merc = isWebMercator(`${basePath}.shp`);
  const shapes = readShp(`${basePath}.shp`);
  const toLL = (g) => (g == null ? null : typeof g[0] === "number" ? (merc ? mercatorToLngLat(g) : g) : g.map((part) => part.map((pt) => (merc ? mercatorToLngLat(pt) : pt))));
  let row = 0;
  for (const rec of readDbf(`${basePath}.dbf`, opts)) {
    // Deleted dbf rows still occupy a .shp record; advance until the indexes line up.
    let g = null;
    while (row <= rec.__index) {
      g = shapes.next().value;
      row++;
    }
    yield { ...rec, geom: toLL(g) };
  }
}
