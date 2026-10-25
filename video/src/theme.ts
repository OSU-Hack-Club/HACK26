import { loadFont } from "@remotion/google-fonts/Geist";
import { Easing, interpolate } from "remotion";

import captures from "./captures.json";
import layouts from "./layouts.json";

export const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export type ThemeName = "light" | "dark";
export interface ClipProps {
  theme: ThemeName;
  /** Show the titles and labels. Clean variants have none, for editors to add their own. */
  text: boolean;
  [key: string]: unknown;
}

// The app's palette (src/app/globals.css), as hex.
export const BRAND = "#2563c9";
export const LOW = "#22a35a";
export const MID = "#f0a91c";
export const HIGH = "#e5383b";

export interface Palette {
  bg: [string, string];
  orbs: [string, string, string];
  grid: string;
  ink: string;
  muted: string;
  chrome: string;
  chromeEdge: string;
  pill: string;
  shadow: string;
  bezel: string;
  chip: string;
  chipInk: string;
}

export const PALETTE: Record<ThemeName, Palette> = {
  light: {
    bg: ["#f7f9fd", "#e6edf9"],
    orbs: ["rgba(37,99,201,0.22)", "rgba(240,169,28,0.16)", "rgba(34,163,90,0.12)"],
    grid: "rgba(15,23,42,0.07)",
    ink: "#0b1220",
    muted: "#55607a",
    chrome: "#ffffff",
    chromeEdge: "rgba(15,23,42,0.10)",
    pill: "#eef1f6",
    shadow: "0 40px 90px -30px rgba(15,23,42,0.35), 0 12px 30px -12px rgba(15,23,42,0.18)",
    bezel: "#0d0f14",
    chip: "rgba(255,255,255,0.85)",
    chipInk: "#0b1220",
  },
  dark: {
    bg: ["#04060b", "#0b1424"],
    orbs: ["rgba(37,99,201,0.38)", "rgba(240,169,28,0.14)", "rgba(34,163,90,0.12)"],
    grid: "rgba(255,255,255,0.06)",
    ink: "#f4f6fb",
    muted: "#98a2b6",
    chrome: "#17191f",
    chromeEdge: "rgba(255,255,255,0.10)",
    pill: "#23262e",
    shadow: "0 40px 100px -30px rgba(0,0,0,0.85), 0 12px 30px -12px rgba(0,0,0,0.6)",
    bezel: "#22252c",
    chip: "rgba(23,25,31,0.85)",
    chipInk: "#f4f6fb",
  },
};

export const capture = (theme: ThemeName, name: string) => `captures/${theme}/${name}.png`;

/** Pixel size of a capture (written by capture/manifest.mjs). */
export function size(theme: ThemeName, name: string): [number, number] {
  const m = (captures as unknown as Record<string, Record<string, [number, number]>>)[theme]?.[name];
  if (!m) throw new Error(`Missing capture ${theme}/${name}. Run npm run capture.`);
  return m;
}

export type Rect = [x: number, y: number, w: number, h: number];

/** Where each part of a screen sits, in CSS px (written by capture/capture.mjs, collected by capture/manifest.mjs). */
export function layout(theme: ThemeName, name: string): Record<string, Rect> {
  const l = (layouts as unknown as Record<string, Record<string, Record<string, Rect>>>)[theme]?.[name];
  if (!l) throw new Error(`Missing layout ${theme}/${name}. Run npm run capture.`);
  return l;
}

/** The team, for the opening and closing titles. */
export const TEAM = ["Adib S.", "Ornob A.", "Gautham G."];

/** Desktop captures are 2x device pixels; phone captures 3x. */
export const DESKTOP_DPR = 2;

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** interpolate() between two frames with clamping and an ease. */
export const tween = (frame: number, [a, b]: [number, number], [from, to]: [number, number], easing = EASE) =>
  interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** A clip's length when the presentation stretches it (`len`), or its standalone length. */
export const lenOr = (len: unknown, standalone: number) => (typeof len === "number" ? len : standalone);
