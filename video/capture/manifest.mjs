// Records each capture's pixel size in src/captures.json so compositions keep aspect ratios and card corners exact.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/captures");
const out = {};
for (const theme of fs.readdirSync(root)) {
  out[theme] = {};
  for (const f of fs.readdirSync(path.join(root, theme))) {
    if (!f.endsWith(".png")) continue;
    const b = fs.readFileSync(path.join(root, theme, f));
    out[theme][f.slice(0, -4)] = [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
}
fs.writeFileSync("src/captures.json", JSON.stringify(out, null, 1));
console.log(`manifest: ${Object.keys(out.light ?? {}).length} captures per theme`);
