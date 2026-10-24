// Extracts the challenge archives into AEP-Challenge-Materials/data/extracted (git-ignored).
// Uses `unzip` when available, else `tar` (bsdtar on Windows and macOS reads zip files). Existing files are kept.

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const ROOT = "AEP-Challenge-Materials/data";
const ARCHIVES = ["Data1", "Data2", "matched_upstream"];

const has = (cmd) => {
  try {
    execFileSync(cmd, ["--help"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const useUnzip = has("unzip");

for (const name of ARCHIVES) {
  const dest = `${ROOT}/extracted/${name}`;
  mkdirSync(dest, { recursive: true });
  const zip = `${ROOT}/raw/${name}.zip`;
  if (useUnzip) execFileSync("unzip", ["-nq", zip, "-d", dest], { stdio: "inherit" });
  else execFileSync("tar", ["-xkf", zip, "-C", dest], { stdio: "inherit" });
  console.log(`extracted ${zip} → ${dest}`);
}
