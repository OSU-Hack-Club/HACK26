// Privacy filters shared by the client (audit log) and the server (/api/chat). Pure functions only.
//
// Free text from customers can carry personal details the app never needs: phone numbers, emails,
// street addresses, coordinates, account or premise numbers. redactPII() masks them before the text
// is logged or handed to an LLM, and reports what it removed so the audit trail can say so.

export type RedactionKind = "email" | "coordinates" | "phone" | "address" | "number";

const RULES: { kind: RedactionKind; re: RegExp; mask: string }[] = [
  { kind: "email", re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, mask: "[email]" },
  { kind: "coordinates", re: /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/g, mask: "[coordinates]" },
  // Needs separators or parentheses; a bare run of digits is masked as a number below.
  { kind: "phone", re: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g, mask: "[phone]" },
  {
    kind: "address",
    re: /\b\d{1,6}\s+(?:[a-z0-9]+\s+){0,3}(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|pl|place|pike|hwy|highway|cir|circle|ter|terrace)\b\.?/gi,
    mask: "[address]",
  },
  // Account, meter and real premise numbers are long digit runs.
  { kind: "number", re: /\b\d{6,}\b/g, mask: "[number]" },
];

export const REDACTION_LABEL: Record<RedactionKind, string> = {
  email: "email address",
  coordinates: "coordinates",
  phone: "phone number",
  address: "street address",
  number: "account or premise number",
};

export interface Redaction {
  text: string;
  /** How many of each kind were masked. */
  found: Partial<Record<RedactionKind, number>>;
  total: number;
}

export function redactPII(raw: string): Redaction {
  const found: Redaction["found"] = {};
  let total = 0;
  let text = raw;
  for (const r of RULES) {
    text = text.replace(r.re, () => {
      found[r.kind] = (found[r.kind] ?? 0) + 1;
      total++;
      return r.mask;
    });
  }
  return { text, found, total };
}

/** "1 phone number and 2 street addresses". */
export function redactionText(found: Redaction["found"]) {
  const parts = (Object.entries(found) as [RedactionKind, number][]).map(([k, n]) => `${n} ${REDACTION_LABEL[k]}${n > 1 ? (k === "address" ? "es" : "s") : ""}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "nothing");
}

/** Masks an identifier the customer typed that we couldn't match, so a real premise number never lands in a log: "P•••17". */
export const maskId = (id: string) => (id.length <= 3 ? "•••" : `${id.slice(0, 1)}•••${id.slice(-2)}`);

/** Words that mean a customer may be in danger. These questions are always routed to a human. */
const SAFETY_RE =
  /\b(downed|down(ed)?\s+(wire|line|pole)s?|(wire|line|pole)s?\s+(is\s+|are\s+)?down|sparks?|sparking|smoke|fire|burning|injur\w*|hurt|emergency|911|carbon monoxide|can'?t breathe|oxygen|ventilator|life support|electrocut\w*|shock(ed)?)\b/i;

export const isSafetyQuestion = (text: string) => SAFETY_RE.test(text);
