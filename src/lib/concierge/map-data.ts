import raw from "@/data/map-data.json";

// Derives the outage-map GeoJSON from the CIR2 extract (AEP-Challenge-Materials Data1.zip):
// simplified primary lines + ARCOS damage points from the Feb 2025 storm.
// Production should build this from the shapefiles plus matched_upstream.txt for real topology.

type LngLat = [number, number];

interface RawData {
  lines: { u: number; o: number; g: LngLat[] }[];
  dmg: { x: number; y: number; t: string; r: number; d: string; a: number }[];
  fac: { x: number; y: number; k: string }[];
  bbox: [number, number, number, number];
}

export interface MapData {
  home: LngLat;
  bbox: [number, number, number, number];
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString, { dh: number; risk: 0 | 1 | 2 }>;
  dmg: GeoJSON.FeatureCollection<GeoJSON.Point, { dh: number; t: string; storm: 0 | 1 }>;
  fac: { x: number; y: number; k: string }[];
  zoneOut: LngLat[] | null;
  zoneRest: LngLat[] | null;
  area: LngLat[];
}

const km = (a: LngLat, b: LngLat) =>
  Math.hypot((a[0] - b[0]) * 111.32 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110.57);

/** Snap to a 0.01° grid (~1 km): hospitals, fire and ambulance stations are shown as general areas, never exact pins. */
const coarse = (v: number) => Math.round(v * 100) / 100;

function hull(input: LngLat[]): LngLat[] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: LngLat, a: LngLat, b: LngLat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: LngLat[] = [];
  const up: LngLat[] = [];
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  h.push(h[0]);
  return h;
}

function circle(c: LngLat, rkm: number): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    out.push([c[0] + (rkm / (111.32 * Math.cos((c[1] * Math.PI) / 180))) * Math.cos(a), c[1] + (rkm / 110.57) * Math.sin(a)]);
  }
  return out;
}

let cached: MapData | null = null;

export function getMapData(): MapData {
  if (cached) return cached;
  const d = raw as unknown as RawData;

  // "Home" = densest Feb-2025 damage cluster, offset ~250 m so no real asset is pinpointed.
  const storm = d.dmg.filter((p) => p.d.startsWith("202502"));
  let best = storm[0];
  let bc = -1;
  for (const p of storm) {
    let c = 0;
    for (const q of storm) if (km([p.x, p.y], [q.x, q.y]) < 0.8) c++;
    if (c > bc) {
      bc = c;
      best = p;
    }
  }
  const home: LngLat = [best.x + 0.0024, best.y - 0.0015];

  const lines = d.lines.map((l) => {
    let dh = 1e9;
    for (const v of l.g) dh = Math.min(dh, km(v, home));
    const mid = l.g[Math.floor(l.g.length / 2)];
    let dens = 0;
    for (const p of d.dmg) if (km(mid, [p.x, p.y]) < 0.7) dens++;
    return {
      type: "Feature" as const,
      properties: { dh: +dh.toFixed(3), risk: (dens < 2 ? 0 : dens < 6 ? 1 : 2) as 0 | 1 | 2 },
      geometry: { type: "LineString" as const, coordinates: l.g },
    };
  });

  const dmg = d.dmg.map((p) => ({
    type: "Feature" as const,
    properties: { dh: +km([p.x, p.y], home).toFixed(3), t: p.t, storm: (p.d.startsWith("202502") ? 1 : 0) as 0 | 1 },
    geometry: { type: "Point" as const, coordinates: [p.x, p.y] },
  }));

  const zone = (r: number) => {
    const pts: LngLat[] = [];
    for (const f of lines) if (f.properties.dh < r) for (const c of f.geometry.coordinates) pts.push(c);
    return pts.length > 2 ? hull(pts) : null;
  };

  cached = {
    home,
    bbox: d.bbox,
    lines: { type: "FeatureCollection", features: lines },
    dmg: { type: "FeatureCollection", features: dmg },
    fac: d.fac.map((f) => ({ ...f, x: coarse(f.x), y: coarse(f.y) })),
    zoneOut: zone(2.5),
    zoneRest: zone(1.2),
    area: circle(home, 0.45),
  };
  return cached;
}
