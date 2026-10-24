// MapLibre v6 locates its web worker relative to its own module URL, which a
// bundler rewrites. Serve a copy from /public and point setWorkerUrl() at it.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
mkdirSync("public", { recursive: true });
copyFileSync(path.join(pkgDir, "dist", "maplibre-gl-worker.mjs"), path.join("public", "maplibre-gl-worker.mjs"));
