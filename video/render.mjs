// Renders every b-roll composition (or those matching the arguments) to out/<Clip>/<id>.mp4.
//
//   node render.mjs                 # everything
//   node render.mjs Hero Safety     # ids containing "Hero" or "Safety"
//   node render.mjs dark-clean      # one variant of every clip

import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const filters = process.argv.slice(2);
const gl = process.env.GL ?? "angle";
// Port 3000 is usually taken by the app's dev server.
const port = Number(process.env.REMOTION_PORT ?? 3300);

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const all = await getCompositions(serveUrl, { chromiumOptions: { gl }, port });
const todo = all.filter((c) => !filters.length || filters.some((f) => c.id.includes(f)));
console.log(`rendering ${todo.length} of ${all.length} compositions`);

for (const [i, composition] of todo.entries()) {
  const clip = composition.id.split("-")[0];
  const outputLocation = path.resolve("out", clip, `${composition.id}.mp4`);
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    concurrency: Math.max(2, Math.floor(os.cpus().length / 2)),
    chromiumOptions: { gl },
    port,
    outputLocation,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        process.stdout.write(`\r[${i + 1}/${todo.length}] ${composition.id} ${pct}%   `);
      }
    },
  });
  console.log(`\r[${i + 1}/${todo.length}] ${composition.id} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
