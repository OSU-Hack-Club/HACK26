// Renders every b-roll composition (or those matching the arguments) to out/<Clip>/<id>.mp4.
//
//   node render.mjs                 # everything
//   node render.mjs Hero Safety     # ids containing "Hero" or "Safety"
//   node render.mjs dark-clean      # one variant of every clip
//
// Frames are drawn on the GPU (ANGLE) and encoded on the NVIDIA GPU (NVENC) when there is one.
// NVENC can't take a CRF, so it gets a high fixed bitrate instead. HW=0 forces x264 at CRF 16.
//
// Compositions are split across PARALLEL render processes (default 2) sharing CONCURRENCY browser tabs
// (default 32). One process has a single coordinating thread, which was the bottleneck, so two finish sooner.

import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filters = process.argv.slice(2);
const gl = process.env.GL ?? "angle";
// Port 3000 is usually taken by the app's dev server.
const port = Number(process.env.REMOTION_PORT ?? 3300);
const hw = process.env.HW !== "0";
const quality = hw ? { hardwareAcceleration: "if-possible", videoBitrate: process.env.BITRATE ?? "16M" } : { crf: 16 };
const cores = os.cpus().length;
const totalConcurrency = Number(process.env.CONCURRENCY ?? 32);
const parallel = Number(process.env.PARALLEL ?? 2);
// Set by the parent for each child process: which compositions to render, from which bundle.
const childIds = process.env.RENDER_IDS?.split(",");

const serveUrl = process.env.SERVE_URL ?? (await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") }));
const all = await getCompositions(serveUrl, { chromiumOptions: { gl }, port });
const todo = childIds ? all.filter((c) => childIds.includes(c.id)) : all.filter((c) => !filters.length || filters.some((f) => c.id.includes(f)));

if (!childIds && parallel > 1 && todo.length > 1) {
  const groups = Array.from({ length: Math.min(parallel, todo.length) }, () => []);
  todo.forEach((c, i) => groups[i % groups.length].push(c.id));
  // Remotion caps each process at the number of CPU cores.
  const each = Math.min(cores, Math.max(1, Math.floor(totalConcurrency / groups.length)));
  console.log(`rendering ${todo.length} of ${all.length} compositions in ${groups.length} processes × ${each} tabs`);
  const codes = await Promise.all(
    groups.map(
      (ids, k) =>
        new Promise((resolve) => {
          const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
            env: { ...process.env, RENDER_IDS: ids.join(","), SERVE_URL: serveUrl, CONCURRENCY: String(each), REMOTION_PORT: String(port + 1 + k) },
            stdio: "inherit",
          });
          child.on("exit", resolve);
        }),
    ),
  );
  process.exit(codes.some((c) => c !== 0) ? 1 : 0);
}

const concurrency = Math.min(cores, totalConcurrency);
if (!childIds) console.log(`rendering ${todo.length} of ${all.length} compositions × ${concurrency} tabs`);

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
        console.log(`[${composition.id}] ${pct}%`);
      }
    },
  });
  console.log(`[${i + 1}/${todo.length}] ${path.relative(".", outputLocation)} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
