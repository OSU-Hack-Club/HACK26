// Minimal, dependency-free .xlsx reader for the challenge workbook (Install_Labor_HackOHIO.xlsx).
// Reads the zip central directory, inflates the parts it needs with node:zlib, and returns each sheet's
// cell values (numbers as numbers, shared and inline strings as text). Formulas yield their cached value.

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/** Zip entries by name → raw bytes (stored or deflated). */
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    files.set(name, () => (method === 0 ? raw : inflateRawSync(raw)));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescape = (s) =>
  s.replace(/&(lt|gt|amp|quot|apos|#(\d+)|#x([0-9a-f]+));/gi, (_m, e, d, h) =>
    d ? String.fromCodePoint(Number(d)) : h ? String.fromCodePoint(parseInt(h, 16)) : { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" }[e.toLowerCase()],
  );

/** Concatenated text of every <t> run inside an XML fragment. */
const textOf = (xml) => unescape([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/** "AB12" → { col: 27, row: 12 } (1-based). */
export function cellRef(ref) {
  const [, letters, digits] = /^([A-Z]+)(\d+)$/.exec(ref);
  let col = 0;
  for (const ch of letters) col = col * 26 + ch.charCodeAt(0) - 64;
  return { col, row: Number(digits) };
}

/**
 * Reads every sheet. Returns { [sheetName]: { cells: Map<"row,col", value>, get(row, col) } } with 1-based rows/cols.
 * Blank cells are absent; `get` returns null for them.
 */
export function readXlsx(path) {
  const files = unzip(readFileSync(path));
  const read = (name) => {
    const f = files.get(name);
    if (!f) throw new Error(`${path}: missing ${name}`);
    return f().toString("utf8");
  };
  const shared = files.has("xl/sharedStrings.xml") ? [...read("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const rels = new Map(
    [...read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [/Id="([^"]+)"/.exec(m[0])[1], /Target="([^"]+)"/.exec(m[0])[1]]),
  );
  const sheets = {};
  for (const m of read("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescape(/name="([^"]+)"/.exec(m[0])[1]);
    const target = rels.get(/r:id="([^"]+)"/.exec(m[0])[1]).replace(/^\/?(xl\/)?/, "");
    const cells = new Map();
    for (const c of read(`xl/${target}`).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const body = c[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = null;
      if (type === "s") value = v === undefined ? null : shared[Number(v)];
      else if (type === "inlineStr") value = textOf(body);
      else if (type === "str" || type === "e") value = v === undefined ? null : unescape(v);
      else if (type === "b") value = v === "1";
      else if (v !== undefined) value = Number(v);
      if (typeof value === "string") value = value.trim();
      if (value === null || value === "") continue;
      const { row, col } = cellRef(ref);
      cells.set(`${row},${col}`, value);
    }
    sheets[name] = { cells, get: (row, col) => cells.get(`${row},${col}`) ?? null };
  }
  return sheets;
}
