import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { BRAND, DESKTOP_DPR, PALETTE, capture, fontFamily, size, tween, type ThemeName } from "../theme";

// ---------------------------------------------------------------------------
// Backdrop: soft gradient, slow-drifting color orbs and a faint dot grid.

export function Backdrop({ theme, hue = 0 }: { theme: ThemeName; hue?: number }) {
  const frame = useCurrentFrame();
  const p = PALETTE[theme];
  const orb = (i: number) => {
    const t = frame / 30 + i * 2.1;
    return {
      left: `${[18, 78, 48][i] + Math.sin(t * 0.35) * 6}%`,
      top: `${[22, 30, 82][i] + Math.cos(t * 0.3) * 5}%`,
    };
  };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 120% at 50% 0%, ${p.bg[1]} 0%, ${p.bg[0]} 60%)`, overflow: "hidden", filter: hue ? `hue-rotate(${hue}deg)` : undefined }}>
      {p.orbs.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 1100,
            height: 1100,
            marginLeft: -550,
            marginTop: -550,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${c} 0%, transparent 65%)`,
            ...orb(i),
          }}
        />
      ))}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${p.grid} 1.4px, transparent 1.4px)`,
          backgroundSize: "36px 36px",
          backgroundPosition: `${(frame * 0.25) % 36}px ${(frame * 0.4) % 36}px`,
          maskImage: "radial-gradient(80% 70% at 50% 45%, black 20%, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Device frames

export function BrowserFrame({ theme, shot, width, style, children }: { theme: ThemeName; shot?: string; width: number; style?: React.CSSProperties; children?: React.ReactNode }) {
  const p = PALETTE[theme];
  const bar = Math.round(width * 0.026);
  const [w, h] = shot ? size(theme, shot) : [3200, 2000];
  const screenH = (width * h) / w;
  return (
    <div style={{ width, borderRadius: width * 0.012, overflow: "hidden", background: p.chrome, boxShadow: `${p.shadow}, 0 0 0 1px ${p.chromeEdge}`, ...style }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.32, padding: `0 ${bar * 0.6}px`, borderBottom: `1px solid ${p.chromeEdge}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ width: "34%", height: bar * 0.56, borderRadius: bar, background: p.pill }} />
        </span>
        <span style={{ width: bar * 1.6 }} />
      </div>
      <div style={{ position: "relative", height: screenH, overflow: "hidden" }}>
        {shot && <Img src={staticFile(capture(theme, shot))} style={{ width: "100%", display: "block" }} />}
        {children}
      </div>
    </div>
  );
}

/** A phone with a 390×844 screen. Pass a capture name, an image path, or children. */
export function Phone({ theme, shot, src, width, style, children }: { theme: ThemeName; shot?: string; src?: string; width: number; style?: React.CSSProperties; children?: React.ReactNode }) {
  const p = PALETTE[theme];
  const pad = width * 0.035;
  const screenW = width - pad * 2;
  const screenH = (screenW * 844) / 390;
  const r = width * 0.16;
  return (
    <div
      style={{
        width,
        height: screenH + pad * 2,
        padding: pad,
        borderRadius: r,
        background: p.bezel,
        boxShadow: `${p.shadow}, inset 0 0 0 ${width * 0.006}px rgba(255,255,255,0.14), 0 0 0 ${width * 0.004}px rgba(0,0,0,0.5)`,
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: r - pad, overflow: "hidden", position: "relative", background: "#000" }}>
        {(shot || src) && <Img src={staticFile(src ?? capture(theme, shot!))} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating card: a close-up capture with its real corner radius and a soft shadow.

export function Card({ theme, shot, width, radius = 14, style, dpr = DESKTOP_DPR }: { theme: ThemeName; shot: string; width: number; radius?: number; style?: React.CSSProperties; dpr?: number }) {
  const [w, h] = size(theme, shot);
  const scale = width / (w / dpr);
  return (
    <div style={{ width, height: (width * h) / w, borderRadius: radius * scale, overflow: "hidden", boxShadow: PALETTE[theme].shadow, ...style }}>
      <Img src={staticFile(capture(theme, shot))} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export const cardHeight = (theme: ThemeName, shot: string, width: number) => {
  const [w, h] = size(theme, shot);
  return (width * h) / w;
};

// ---------------------------------------------------------------------------
// Motion helpers

/** 0→1 spring that starts at `delay`. */
export function useEnter(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 90, mass: 1, ...config } });
}

/** Gentle idle float so nothing ever sits perfectly still. */
export function useFloat(seed = 0, amp = 8) {
  const frame = useCurrentFrame();
  return { x: Math.sin(frame / 40 + seed) * amp * 0.6, y: Math.cos(frame / 34 + seed * 1.7) * amp };
}

export function Stage({ perspective = 2200, children, style }: { perspective?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 45%", alignItems: "center", justifyContent: "center", ...style }}>{children}</AbsoluteFill>;
}

/** Fades the whole clip in and out at its edges. */
export function EdgeFade({ children, inFrames = 10, outFrames = 12 }: { children: React.ReactNode; inFrames?: number; outFrames?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = Math.min(tween(frame, [0, inFrames], [0, 1]), tween(frame, [durationInFrames - outFrames, durationInFrames], [1, 0]));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

// ---------------------------------------------------------------------------
// Text

/** Title block: kicker, title (word-by-word rise with blur) and subtitle. */
export function Caption({
  theme,
  kicker,
  title,
  sub,
  delay = 8,
  align = "left",
  size: fs = 76,
  maxWidth,
  style,
}: {
  theme: ThemeName;
  kicker?: string;
  title: string;
  sub?: string;
  delay?: number;
  align?: "left" | "center" | "right";
  size?: number;
  /** Title wrap width in px (defaults to about 11 em). */
  maxWidth?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTE[theme];
  const words = title.split(" ");
  const rise = (d: number) => spring({ frame: frame - d, fps, config: { damping: 20, stiffness: 110 } });
  const k = rise(delay - 4);
  const s = rise(delay + words.length * 3 + 6);
  return (
    <div style={{ fontFamily, color: p.ink, textAlign: align, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start", gap: fs * 0.22, ...style }}>
      {kicker && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: fs * 0.25,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: BRAND,
            opacity: k,
            transform: `translateY(${(1 - k) * 16}px)`,
          }}
        >
          <span style={{ width: 28, height: 3, borderRadius: 3, background: BRAND }} />
          {kicker}
        </div>
      )}
      <div style={{ fontSize: fs, fontWeight: 650, letterSpacing: "-0.035em", lineHeight: 1.04, maxWidth: maxWidth ?? fs * 11 }}>
        {words.map((w, i) => {
          const v = rise(delay + i * 3);
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.24em", opacity: v, transform: `translateY(${(1 - v) * 40}px)`, filter: `blur(${(1 - v) * 10}px)` }}>
              {w}
            </span>
          );
        })}
      </div>
      {sub && (
        <div style={{ fontSize: fs * 0.34, fontWeight: 450, color: p.muted, lineHeight: 1.35, maxWidth: fs * 9, opacity: s, transform: `translateY(${(1 - s) * 18}px)` }}>{sub}</div>
      )}
    </div>
  );
}

/** Small glass label that pops in, e.g. "+ Trees Down". */
export function Chip({ theme, children, delay = 0, color = BRAND, style }: { theme: ThemeName; children: React.ReactNode; delay?: number; color?: string; style?: React.CSSProperties }) {
  const v = useEnter(delay, { damping: 14, stiffness: 140 });
  const p = PALETTE[theme];
  return (
    <div
      style={{
        fontFamily,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 22px",
        borderRadius: 999,
        background: p.chip,
        color: p.chipInk,
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        boxShadow: `${p.shadow}, inset 0 0 0 1px ${p.chromeEdge}`,
        backdropFilter: "blur(14px)",
        opacity: v,
        transform: `scale(${interpolate(v, [0, 1], [0.7, 1])}) translateY(${(1 - v) * 20}px)`,
        ...style,
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 16px ${color}` }} />
      {children}
    </div>
  );
}

export function Logo({ theme, height = 64, style }: { theme: ThemeName; height?: number; style?: React.CSSProperties }) {
  return <Img src={staticFile(`brand/aep-logo-${theme}.png`)} style={{ height, ...style }} />;
}
