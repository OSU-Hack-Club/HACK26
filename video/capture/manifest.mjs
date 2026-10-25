// Records each capture's pixel size in src/captures.json so compositions keep aspect ratios and card corners exact,
// and collects the screen layouts (<name>.layout.json, CSS px) into src/layouts.json.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/captures");
const out = {};
const layouts = {};
for (const theme of fs.readdirSync(root)) {
  out[theme] = {};
  layouts[theme] = {};
  for (const f of fs.readdirSync(path.join(root, theme))) {
    if (f.endsWith(".layout.json")) {
      layouts[theme][f.slice(0, -".layout.json".length)] = JSON.parse(fs.readFileSync(path.join(root, theme, f), "utf8"));
      continue;
    }
    if (!f.endsWith(".png")) continue;
    const b = fs.readFileSync(path.join(root, theme, f));
    out[theme][f.slice(0, -4)] = [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
}
fs.writeFileSync("src/captures.json", JSON.stringify(out, null, 1));
fs.writeFileSync("src/layouts.json", JSON.stringify(layouts, null, 1));
console.log(`manifest: ${Object.keys(out.light ?? {}).length} captures per theme`);
