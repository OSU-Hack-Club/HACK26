// Renders preview stills for a quick visual check: node stills.mjs Hero-dark-text:150 Safety-light-clean:120
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const port = Number(process.env.REMOTION_PORT ?? 3300);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
for (const arg of process.argv.slice(2)) {
  const [id, frame = "60"] = arg.split(":");
  const composition = await selectComposition({ serveUrl, id, port, chromiumOptions: { gl: "angle" } });
  const output = path.resolve("out/stills", `${id}-${frame}.png`);
  await renderStill({ composition, serveUrl, frame: Number(frame), output, port, chromiumOptions: { gl: "angle" } });
  console.log(output);
}
