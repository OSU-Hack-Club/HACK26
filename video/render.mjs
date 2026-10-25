// Renders every b-roll composition (or those matching the arguments) to out/<Clip>/<id>.mp4.
//
//   node render.mjs                 # everything
//   node render.mjs Hero Safety     # ids containing "Hero" or "Safety"
//   node render.mjs dark-clean      # one variant of every clip
//
// Frames are drawn on the GPU (ANGLE) and encoded on the NVIDIA GPU (NVENC) when there is one.
// NVENC can't take a CRF, so it gets a high fixed bitrate instead. HW=0 forces x264 at CRF 16.

import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const filters = process.argv.slice(2);
const gl = process.env.GL ?? "angle";
// Port 3000 is usually taken by the app's dev server.
const port = Number(process.env.REMOTION_PORT ?? 3300);
const hw = process.env.HW !== "0";
const quality = hw ? { hardwareAcceleration: "if-possible", videoBitrate: process.env.BITRATE ?? "16M" } : { crf: 16 };
const concurrency = Number(process.env.CONCURRENCY ?? Math.max(2, Math.floor(os.cpus().length * 0.75)));

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const all = await getCompositions(serveUrl, { chromiumOptions: { gl }, port });
const todo = all.filter((c) => !filters.length || filters.some((f) => c.id.includes(f)));
console.log(`rendering ${todo.length} of ${all.length} compositions`);

for (const [i, composition] of todo.entries()) {
  const clip = composition.id.split("-")[0];
  // Never overwrite an earlier render: add -1, -2, … to the name instead.
  const base = path.resolve("out", clip, composition.id);
  let outputLocation = `${base}.mp4`;
  for (let n = 1; fs.existsSync(outputLocation); n++) outputLocation = `${base}-${n}.mp4`;
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    ...quality,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    concurrency,
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
  console.log(`\r[${i + 1}/${todo.length}] ${path.relative(".", outputLocation)} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
