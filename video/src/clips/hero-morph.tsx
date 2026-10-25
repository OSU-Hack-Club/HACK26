// Hero → PhoneScroll morph, used by the montage. The tilted desktop settles flat, everything but the map slides
// off screen, and the map shrinks into the phone's screen while the mobile header drops in from the top and the
// event card and nav rise from the bottom. It lands on exactly PhoneScroll's first frame, so the cut is invisible.

import React from "react";
import { Img, staticFile } from "remotion";

import { Place } from "../components/place";
import { Phone } from "../components/primitives";
import { DESKTOP_DPR, EASE_IN_OUT, PALETTE, capture, layout, size, tween, type Rect, type ThemeName } from "../theme";

/** Morph timeline, in frames from the start of the morph. */
export const MORPH = {
  /** Browser rotates flat and centers. */
  flat: [0, 22],
  /** The map is flat: the desktop map hands off to the phone layer here. */
  handoff: 24,
  /** Map window shrinks into the phone screen. */
  shrink: [24, 56],
  /** Real phone fades in over the assembled one, then holds. */
  settle: [59, 62],
  length: 68,
} as const;

// Montage layout: the desktop starts on the left (title on the right), drifts right the whole way through the
// morph, and lands as a phone on the right, turned to face the text that PhoneScroll brings in on the left.

/** The Hero's browser in the montage: on the left, turned to face the title on the right. */
export const HERO_LEFT = { text: { width: 1180, cx: 640 }, clean: { width: 1360, cx: 760 } };

/** The browser once flat: already drifting right of where it started. */
export const FLAT = { w: 1240, cx: 760, cy: 540 };

/** The phone the morph lands on, which PhoneScroll opens with in the montage. */
export const MONTAGE_PHONE = { x: 1240, width: 430, cy: 545, pose: { ry: -18, rx: 4, s: 0.94 } };

/** PhoneScroll's phone on its own (outside the montage). */
export const SCROLL_PHONE = { width: 430, cy: 545, pose: { ry: -6, rx: 4, s: 0.94 } };
export const scrollPhoneX = (text: boolean) => (text ? 1150 : 960);
export const scrollFrame = (theme: ThemeName, i: number) => `captures/${theme}/seq-m-scroll/${String(i).padStart(4, "0")}.jpg`;

/** Mobile CSS px per desktop CSS px: the phone's map is drawn a little smaller than the desktop's. */
const MAP_RATIO = 0.83;

/** Map background behind both captures, for any gap while the two maps cross over. */
const MAP_BG = { light: "#f3f4f6", dark: "#0e0e0f" } as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const center = ([x, y, w, h]: Rect) => [x + w / 2, y + h / 2] as const;

/** A rectangle of a screenshot (in its CSS px), drawn at `k` px per CSS px at the same spot. */
export function Crop({ src, cssW, rect: [x, y, w, h], k, style }: { src: string; cssW: number; rect: Rect; k: number; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x * k, top: y * k, width: w * k, height: h * k, overflow: "hidden", ...style }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: -x * k, top: -y * k, width: cssW * k, maxWidth: "none" }} />
    </div>
  );
}

const deskCss = (theme: ThemeName) => size(theme, "desk-watch")[0] / DESKTOP_DPR;

/** Browser height for a given width (title bar, its 1px rule, and the 16:10 screen), as in BrowserFrame. */
export const browserHeight = (theme: ThemeName, width: number) => {
  const [w, h] = size(theme, "desk-watch");
  return Math.round(width * 0.026) + 1 + (width * h) / w;
};

/**
 * The Hero's browser, built from layers so the parts can leave separately. At m < 0 it looks like
 * BrowserFrame with the desk-watch capture.
 */
export function DeskMorph({ theme, width, m }: { theme: ThemeName; width: number; m: number }) {
  const p = PALETTE[theme];
  const L = layout(theme, "desk-watch");
  const cssW = deskCss(theme);
  const k = width / cssW;
  const bar = Math.round(width * 0.026);
  const r = width * 0.012;
  const full = capture(theme, "desk-watch");
  const out = (range: [number, number]) => tween(m, range, [0, 1], EASE_IN_OUT);
  const head = out([11, 29]);
  const main = out([13, 33]);
  const chat = out([10, 30]);
  const event = out([14, 32]);
  const ctrls = 1 - tween(m, [10, 18], [0, 1]);
  const chrome = 1 - tween(m, [16, 30], [0, 1]);
  return (
    <div style={{ position: "relative", width, height: browserHeight(theme, width) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: r, background: p.chrome, boxShadow: `${p.shadow}, 0 0 0 1px ${p.chromeEdge}`, opacity: chrome }} />
      <div style={{ position: "absolute", top: bar + 1, left: 0, width, height: browserHeight(theme, width) - bar - 1 }}>
        {m < MORPH.handoff && <Crop src={capture(theme, "desk-watch-map")} cssW={cssW} rect={L.map} k={k} style={{ borderBottomLeftRadius: r }} />}
        <Crop src={full} cssW={cssW} rect={L.zoom} k={k} style={{ opacity: ctrls }} />
        <Crop src={full} cssW={cssW} rect={L.attrib} k={k} style={{ opacity: ctrls }} />
        <Crop src={full} cssW={cssW} rect={L.event} k={k} style={{ borderRadius: 16 * k, transform: `translate(${-event * 120}px, ${event * 900}px) rotate(${-event * 6}deg)` }} />
        <Crop src={full} cssW={cssW} rect={L.main} k={k} style={{ transform: `translateX(${main * 1500}px)` }} />
        <Crop src={full} cssW={cssW} rect={L.chat} k={k} style={{ borderBottomRightRadius: r, transform: `translateX(${chat * 1200}px)` }} />
      </div>
      {/* Title bar and app header leave together, upward. */}
      <div style={{ position: "absolute", top: 0, left: 0, width, transform: `translateY(${-head * 700}px)` }}>
        <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.32, padding: `0 ${bar * 0.6}px`, borderBottom: `1px solid ${p.chromeEdge}`, background: p.chrome, borderRadius: `${r}px ${r}px 0 0` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: "50%", background: c }} />
          ))}
          <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <span style={{ width: "34%", height: bar * 0.56, borderRadius: bar, background: p.pill }} />
          </span>
          <span style={{ width: bar * 1.6 }} />
        </div>
        <div style={{ position: "relative" }}>
          <Crop src={full} cssW={cssW} rect={L.header} k={k} />
        </div>
      </div>
    </div>
  );
}

/** Stage rect of the desktop map once the browser is flat (FLAT.w wide, centered on FLAT.cx, FLAT.cy). */
export function flatMapRect(theme: ThemeName, browserW: number): Rect {
  const L = layout(theme, "desk-watch");
  const s = FLAT.w / browserW;
  const kd = FLAT.w / deskCss(theme);
  const left = FLAT.cx - FLAT.w / 2;
  const top = FLAT.cy - (browserHeight(theme, browserW) * s) / 2;
  const [x, y, w, h] = L.map;
  return [left + x * kd, top + (Math.round(browserW * 0.026) + 1) * s + y * kd, w * kd, h * kd];
}

/**
 * The phone half of the morph. Starts as the bare flat desktop map (pixel for pixel), shrinks it into the phone
 * screen, and assembles the mobile home screen around it. Must sit in a <Stage perspective={2200}> like PhoneScroll.
 */
export function PhoneMorph({ theme, m, from }: { theme: ThemeName; m: number; from: Rect }) {
  const p = PALETTE[theme];
  const D = layout(theme, "desk-watch");
  const M = layout(theme, "m-watch");
  const { x: cx, width: pw, cy, pose } = MONTAGE_PHONE;
  const pad = pw * 0.035;
  const sw = pw - pad * 2;
  const sh = (sw * 844) / 390;
  const ph = sh + pad * 2;
  const r = pw * 0.16;
  const sr = r - pad;
  // Phone top-left on the stage while it is still flat.
  const ox = cx - pw / 2;
  const oy = cy - ph / 2;

  const k = tween(m, MORPH.shrink as unknown as [number, number], [0, 1], EASE_IN_OUT);
  const kp = sw / 390;
  const kd0 = FLAT.w / deskCss(theme);

  // Map window: the desktop map's rect → the phone screen.
  const [fx, fy, fw, fh] = from;
  const wx = lerp(fx - ox, pad, k);
  const wy = lerp(fy - oy, pad, k);
  const ww = lerp(fw, sw, k);
  const wh = lerp(fh, sh, k);
  const rad = lerp(0, sr, k);
  const radBL = lerp(FLAT.w * 0.012, sr, k);

  // Both maps are anchored on the home dot, which glides from its desktop spot to its phone spot.
  const [hdx, hdy] = center(D.home);
  const [hmx, hmy] = center(M.home);
  const kd = lerp(kd0, MAP_RATIO * kp, k);
  const km = kd / MAP_RATIO;
  const hx = lerp((hdx - D.map[0]) * kd0, hmx * kp, k);
  const hy = lerp((hdy - D.map[1]) * kd0, hmy * kp, k);
  const deskMap = 1 - tween(m, [40, 56], [0, 1]);

  const frame0 = scrollFrame(theme, 0);
  // Mobile parts ride on the shrinking window (the header on its top edge, the card and nav on its bottom edge),
  // arriving from off screen: the header from above, the card and nav from below.
  const ws = ww / sw;
  const header = tween(m, [36, 58], [0, 1]);
  const event = tween(m, [34, 56], [0, 1]);
  const nav = tween(m, [38, 60], [0, 1]);
  const attrib = tween(m, [52, 60], [0, 1]);
  const bezel = tween(m, [38, 54], [0, 1]);
  const real = tween(m, MORPH.settle as unknown as [number, number], [0, 1]);
  const top = (rect: Rect, t: number) => {
    const y = wy + rect[1] * kp * ws;
    return { left: wx + rect[0] * kp * ws, top: y, dy: (1 - t) * -(oy + y + rect[3] * kp * ws + 80) };
  };
  const bottom = (rect: Rect, t: number) => {
    const y = wy + wh - (844 - rect[1]) * kp * ws;
    return { left: wx + rect[0] * kp * ws, top: y, dy: (1 - t) * (1080 + 80 - (oy + y)) };
  };
  const piece = (rect: Rect, at: { left: number; top: number; dy: number }, style: React.CSSProperties = {}) => (
    <div style={{ position: "absolute", left: at.left, top: at.top, transform: `translateY(${at.dy}px) scale(${ws})`, transformOrigin: "0 0" }}>
      <Crop src={frame0} cssW={390} rect={rect} k={kp} style={{ left: 0, top: 0, ...style }} />
    </div>
  );

  return (
    <Place cx={cx} cy={cy} z={5} pose={{ rx: lerp(0, pose.rx, k), ry: lerp(0, pose.ry, k), s: lerp(1, pose.s, k) }}>
      <div style={{ position: "relative", width: pw, height: ph }}>
        {/* The bare map's shadow takes over from the browser's, until the bezel brings its own. */}
        <div
          style={{
            position: "absolute",
            left: wx,
            top: wy,
            width: ww,
            height: wh,
            borderRadius: rad,
            boxShadow: p.shadow,
            opacity: tween(m, [MORPH.handoff, MORPH.handoff + 8], [0, 1]) * (1 - bezel),
          }}
        />
        {/* Bezel only (no screen fill), so nothing covers the map while it is still bigger than the screen. */}
        <div
          style={{
            position: "absolute",
            left: wx - pad,
            top: wy - pad,
            width: ww + pad * 2,
            height: wh + pad * 2,
            borderRadius: rad + pad,
            border: `${pad}px solid ${p.bezel}`,
            boxShadow: `${p.shadow}, 0 0 0 ${pw * 0.004}px rgba(0,0,0,0.5)`,
            opacity: bezel,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: wx,
            top: wy,
            width: ww,
            height: wh,
            overflow: "hidden",
            borderRadius: `${rad}px ${rad}px ${rad}px ${radBL}px`,
            background: MAP_BG[theme],
          }}
        >
          <Img src={staticFile(capture(theme, "m-watch-map"))} style={{ position: "absolute", left: hx - hmx * km, top: hy - hmy * km, width: 390 * km, maxWidth: "none" }} />
          {/* Desktop map, cropped to the map itself so no other desktop UI shows as the window moves. */}
          <div style={{ position: "absolute", left: hx - (hdx - D.map[0]) * kd, top: hy - (hdy - D.map[1]) * kd, width: D.map[2] * kd, height: D.map[3] * kd, overflow: "hidden", opacity: deskMap }}>
            <Img src={staticFile(capture(theme, "desk-watch-map"))} style={{ position: "absolute", left: -D.map[0] * kd, top: -D.map[1] * kd, width: deskCss(theme) * kd, maxWidth: "none" }} />
          </div>
        </div>
        {piece(M.attrib, bottom(M.attrib, 1), { opacity: attrib })}
        {piece(M.header, top(M.header, header), { borderRadius: `${rad / ws}px ${rad / ws}px 0 0` })}
        {piece(M.event, bottom(M.event, event), { borderRadius: 16 * kp })}
        {piece(M.nav, bottom(M.nav, nav), { borderRadius: 999 })}
        {real > 0 && <Phone theme={theme} src={frame0} width={pw} style={{ position: "absolute", left: 0, top: 0, opacity: real }} />}
      </div>
    </Place>
  );
}
