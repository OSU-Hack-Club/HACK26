"use client";

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { AmbulanceIcon, FlameIcon, HospitalIcon, TruckIcon, type LucideIcon } from "lucide-react";
import type { ExpressionSpecification, LngLatBoundsLike, Map as MLMap, Marker, PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { cn } from "@/lib/utils";
import type { Scenario } from "@/lib/concierge/model";
import type { MapData } from "@/lib/concierge/map-data";

// MapLibre GL + CARTO basemaps, drawn from the AEP challenge GIS extract.
// The customer's home is only ever shown as an approximate area.

const STYLE = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};
// MapLibre can't parse oklch, so map colors are hex mirrors of the tone tokens.
const C = {
  light: { n: "#9aa3af", low: "#1f9d55", mid: "#e8a100", high: "#e0393e", past: "#8b5cf6", brand: "#1f5fbf", halo: "#ffffff" },
  dark: { n: "#5f6773", low: "#34c172", mid: "#f2b630", high: "#ff5a5f", past: "#a78bfa", brand: "#5b9bff", halo: "#171717" },
};

type Theme = "light" | "dark";
export type MapView = "event" | "circuit";

let mlPromise: Promise<typeof import("maplibre-gl")> | null = null;
let dataPromise: Promise<MapData> | null = null;
const loadML = () =>
  (mlPromise ??= import("maplibre-gl").then((ml) => {
    // Copied into /public by scripts/copy-maplibre-worker.mjs (predev / prebuild).
    ml.setWorkerUrl("/maplibre-gl-worker.mjs");
    return ml;
  }));
const loadData = () =>
  (dataPromise ??= fetch("/api/map").then((r) => {
    if (!r.ok) throw new Error(`map data ${r.status}`);
    return r.json() as Promise<MapData>;
  }));

const km = (a: number[], b: number[]) =>
  Math.hypot((a[0] - b[0]) * 111.32 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110.57);

const LAYERS = ["om-heat", "om-zone-f", "om-zone-l", "om-area-f", "om-area-l", "om-lines-c", "om-lines", "om-dmg"];
const SOURCES = ["om-heat", "om-zone", "om-area", "om-lines", "om-dmg"];

interface OutageMapProps {
  scenario: Scenario;
  theme: Theme;
  view: MapView;
  /**
   * true: drag to pan, pinch/scroll to zoom, plus zoom buttons.
   * "gestures": the same without zoom buttons, for small maps with their own overlays.
   */
  interactive?: boolean | "gestures";
  /** Camera padding for view="event" (keeps the zone clear of overlay cards). */
  eventPadding?: PaddingOptions;
  className?: string;
}

const DEFAULT_EVENT_PADDING: PaddingOptions = { top: 60, bottom: 250, left: 24, right: 24 };
const LOCATION_ZOOM = 12.7;
const FIT_ZOOM_BIAS = 0.6;

export function OutageMap({ scenario, theme, view, interactive = false, eventPadding = DEFAULT_EVENT_PADDING, className }: OutageMapProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MLMap | null>(null);
  const dataRef = React.useRef<MapData | null>(null);
  const markersRef = React.useRef<{ marker: Marker; root?: Root }[]>([]);
  const [visible, setVisible] = React.useState(false);
  const [ready, setReady] = React.useState(0); // bumps when a map finishes loading its style
  const [failed, setFailed] = React.useState(false);

  // Latest props for event handlers that outlive a render.
  const propsRef = React.useRef({ scenario, theme, view, eventPadding });
  React.useEffect(() => {
    propsRef.current = { scenario, theme, view, eventPadding };
  });

  // Only build when the container has a size: the desktop and mobile layouts are
  // both in the DOM, and the hidden one shouldn't spin up a WebGL context.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const has = el.clientWidth > 0 && el.clientHeight > 0;
      setVisible(has);
      if (has) mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clearMarkers = React.useCallback(() => {
    for (const { marker, root } of markersRef.current) {
      marker.remove();
      // Unmount after the current render to avoid React's sync-unmount warning.
      if (root) queueMicrotask(() => root.unmount());
    }
    markersRef.current = [];
  }, []);

  const camera = React.useCallback((instant: boolean) => {
    const m = mapRef.current;
    const d = dataRef.current;
    if (!m || !d) return;
    const { scenario: sc, view: v, eventPadding: pad } = propsRef.current;
    if (v === "event" && sc === "normal") {
      m.jumpTo({ center: [d.home[0] - 0.004, d.home[1] + 0.002], zoom: LOCATION_ZOOM });
      return;
    }
    const ring = sc === "outage" || sc === "restoring" || sc === "restored" ? d.zoneOut : null;
    let b: LngLatBoundsLike;
    if (ring) {
      const xs = ring.map((p) => p[0]);
      const ys = ring.map((p) => p[1]);
      b = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
    } else b = [[d.bbox[0], d.bbox[1]], [d.bbox[2], d.bbox[3]]];
    const target = m.cameraForBounds(b, { padding: v === "event" ? pad : 28 });
    if (!target) return;
    const camera = { ...target, zoom: (target.zoom ?? m.getZoom()) + FIT_ZOOM_BIAS };
    if (instant) m.jumpTo(camera);
    else m.easeTo({ ...camera, duration: 600 });
  }, []);

  // Build (or rebuild on theme change) the map.
  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    Promise.all([loadML(), loadData()])
      .then(([ml, data]) => {
        if (cancelled || !rootRef.current) return;
        dataRef.current = data;
        const map = new ml.Map({
          container: rootRef.current,
          style: STYLE[theme],
          center: data.home,
          zoom: LOCATION_ZOOM,
          interactive: interactive !== false,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          fadeDuration: 0,
        });
        map.on("error", (e) => console.warn("outage-map:", e.error?.message));
        if (interactive) map.touchZoomRotate.disableRotation();
        if (interactive === true) map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => setReady((n) => n + 1));
        mapRef.current = map;
      })
      .catch((e) => {
        console.warn("outage-map:", e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      clearMarkers();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible, theme, interactive, clearMarkers]);

  // Paint layers for the current scenario.
  React.useEffect(() => {
    const m = mapRef.current;
    const d = dataRef.current;
    if (!ready || !m || !d || !m.isStyleLoaded()) return;
    for (const id of LAYERS) if (m.getLayer(id)) m.removeLayer(id);
    for (const id of SOURCES) if (m.getSource(id)) m.removeSource(id);
    clearMarkers();

    const sc = scenario;
    const k = C[theme];
    const fc = <T extends GeoJSON.Geometry>(features: GeoJSON.Feature<T>[]) => ({
      type: "geojson" as const,
      data: { type: "FeatureCollection" as const, features },
    });
    const poly = (r: [number, number][] | null) =>
      fc(r ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [r] } }] : []);

    if (sc === "watch") {
      m.addSource("om-heat", fc(d.dmg.features));
      m.addLayer({
        id: "om-heat",
        type: "heatmap",
        source: "om-heat",
        paint: {
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 28],
          "heatmap-intensity": 0.7,
          "heatmap-opacity": 0.5,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, k.past, 0.8, k.past],
        },
      });
    }
    const zr = sc === "outage" ? d.zoneOut : sc === "restoring" ? d.zoneRest : null;
    m.addSource("om-zone", poly(zr));
    m.addLayer({ id: "om-zone-f", type: "fill", source: "om-zone", paint: { "fill-color": k.high, "fill-opacity": 0.1 } });
    m.addLayer({ id: "om-zone-l", type: "line", source: "om-zone", paint: { "line-color": k.high, "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [2, 2] } });

    const color: string | ExpressionSpecification = {
      normal: k.n,
      watch: ["match", ["get", "risk"], 0, k.low, 1, k.mid, k.high] as ExpressionSpecification,
      outage: ["case", ["<", ["get", "dh"], 2.5], k.high, k.n] as ExpressionSpecification,
      restoring: ["case", ["<", ["get", "dh"], 1.2], k.high, ["<", ["get", "dh"], 2.5], k.low, k.n] as ExpressionSpecification,
      restored: ["case", ["<", ["get", "dh"], 2.5], k.low, k.n] as ExpressionSpecification,
    }[sc];
    m.addSource("om-lines", { type: "geojson", data: d.lines });
    m.addLayer({
      id: "om-lines-c",
      type: "line",
      source: "om-lines",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": k.halo, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 5], "line-opacity": 0.6 },
    });
    m.addLayer({
      id: "om-lines",
      type: "line",
      source: "om-lines",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.9, 15, 3] },
    });
    m.addSource("om-area", poly(d.area));
    m.addLayer({ id: "om-area-f", type: "fill", source: "om-area", paint: { "fill-color": k.brand, "fill-opacity": 0.12 } });
    m.addLayer({ id: "om-area-l", type: "line", source: "om-area", paint: { "line-color": k.brand, "line-width": 1.5, "line-opacity": 0.8 } });

    if (sc === "outage" || sc === "restoring" || sc === "restored") {
      m.addSource("om-dmg", fc(d.dmg.features.filter((f) => f.properties.storm && f.properties.dh < 2.5)));
      const dc: string | ExpressionSpecification =
        sc === "outage" ? k.high : sc === "restored" ? k.low : ["case", ["<", ["get", "dh"], 1.2], k.high, k.low];
      m.addLayer({
        id: "om-dmg",
        type: "circle",
        source: "om-dmg",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 6],
          "circle-color": dc,
          "circle-stroke-color": k.halo,
          "circle-stroke-width": 1.5,
        },
      });
    }

    let cancelled = false;
    loadML().then((ml) => {
      if (cancelled || mapRef.current !== m) return;
      const addMarker = (ll: [number, number], el: HTMLElement, root?: Root) => {
        const marker = new ml.Marker({ element: el }).setLngLat(ll).addTo(m);
        markersRef.current.push({ marker, root });
      };
      const pin = (bg: string, I: LucideIcon, fg = "#fff") => {
        const el = document.createElement("div");
        el.className = "flex size-[26px] items-center justify-center rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,.3)]";
        el.style.background = bg;
        el.style.color = fg;
        const root = createRoot(el);
        root.render(<I size={13} strokeWidth={2.5} aria-hidden />);
        return { el, root };
      };
      if (sc === "outage" || sc === "restoring") {
        const max = sc === "outage" ? 2 : 3;
        const cand = d.dmg.features
          .filter((f) => f.properties.storm && f.properties.dh > 0.4 && f.properties.dh < (sc === "outage" ? 2.2 : 1.1))
          .sort((a, b) => a.properties.dh - b.properties.dh);
        const picks: [number, number][] = [];
        for (const f of cand) {
          const c = f.geometry.coordinates as [number, number];
          if (picks.every((p) => km(p, c) > 0.6)) picks.push(c);
          if (picks.length === max) break;
        }
        for (const p of picks) {
          const { el, root } = pin(k.brand, TruckIcon);
          addMarker(p, el, root);
        }
      }
      if (sc !== "normal") {
        for (const f of d.fac) {
          const { el, root } = pin(
            theme === "dark" ? "#262626" : "#ffffff",
            f.k === "A" ? AmbulanceIcon : f.k === "H" ? HospitalIcon : FlameIcon,
            theme === "dark" ? "#e5e5e5" : "#404040",
          );
          addMarker([f.x, f.y], el, root);
        }
      }
      // Approximate home area marker: brand dot with a pulsing halo. Never an exact pin.
      const h = document.createElement("div");
      h.className = "relative size-4";
      h.innerHTML = `<b class="absolute inset-0 rounded-full" style="background:${k.brand};animation:om-pulse 2.2s ease-out infinite"></b><i class="absolute inset-0 rounded-full border-[2.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,.35)]" style="background:${k.brand}"></i>`;
      addMarker(d.home, h);
    });
    camera(true);
    return () => {
      cancelled = true;
    };
  }, [ready, scenario, theme, clearMarkers, camera]);

  // Re-frame when the view or padding changes without repainting.
  const padKey = `${eventPadding.top},${eventPadding.bottom},${eventPadding.left},${eventPadding.right}`;
  React.useEffect(() => {
    if (ready) camera(false);
  }, [ready, view, padKey, camera]);

  return (
    <div className={cn("outage-map relative overflow-hidden bg-muted", className)}>
      {/* Inline position: MapLibre's unlayered `.maplibregl-map { position: relative }` beats Tailwind utilities. */}
      <div ref={rootRef} style={{ position: "absolute", inset: 0 }} />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          The map couldn’t load. Your status and estimate below are still current.
        </div>
      )}
    </div>
  );
}
