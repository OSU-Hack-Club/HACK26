// 15-second showcase of every iOS mockup on /mockups (notifications, Live Activity, Dynamic Island, widgets,
// StandBy), in quick beats. Each beat shows a different storm status, so the colors change as it goes.

import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { Backdrop, Caption, Chip, Stage, useFloat } from "../components/primitives";
import { Place } from "../components/place";
import { BRAND, HIGH, LOW, MID, PALETTE, capture, size, tween, EASE_IN_OUT, type ClipProps, type ThemeName } from "../theme";

type Item = { shot: string; label: string; status: string };
const STATUS_COLOR: Record<string, string> = { normal: LOW, watch: MID, outage: HIGH, restoring: BRAND, restored: LOW };

const BEATS: { status: string; items: [string, string][] }[] = [
  { status: "outage", items: [["lock-screen-stack", "Lock Screen Stack"], ["banner-on-home-screen", "Banner on Home Screen"], ["time-sensitive", "Time Sensitive"]] },
  { status: "watch", items: [["critical-alert", "Critical Alert"], ["long-press-actions", "Long-Press Actions"], ["scheduled-summary", "Scheduled Summary"]] },
  { status: "restoring", items: [["text-message-sms", "Text Message"], ["messages-thread", "Messages Thread"], ["notification-center", "Notification Center"]] },
  { status: "outage", items: [["lock-screen-live-activity", "Live Activity"], ["dynamic-island-expanded", "Dynamic Island"], ["dynamic-island-compact-minimal", "Compact & Minimal"]] },
  { status: "restored", items: [["small-medium", "Small & Medium Widgets"], ["large", "Large Widget"], ["lock-screen-widgets", "Lock Screen Widgets"]] },
];
const MATRIX = ["normal", "watch", "outage", "restoring", "restored"];

/** Frame each beat starts at; the finale (StandBy + every widget state) is the last one. */
const FIRST = 50;
const BEAT = 66;
const startOf = (j: number) => FIRST + j * BEAT;
export const MOCKUPS_FRAMES = 450;

/** Corner radius of each capture, as a fraction of its shorter side (phones use the iPhone frame's corner). */
const radiusOf = (shot: string) => (shot.startsWith("matrix") ? 0.14 : shot === "dynamic-island-compact-minimal" ? 0.1 : 0.16);

function Shot({ theme, item, box }: { theme: ThemeName; item: Item; box: [number, number] }) {
  const name = `mock-${item.shot}-${item.status}`;
  const [w, h] = size(theme, name);
  const s = Math.min(box[0] / w, box[1] / h);
  const W = w * s;
  const H = h * s;
  return <Img src={staticFile(capture(theme, name))} style={{ width: W, height: H, display: "block", borderRadius: Math.min(W, H) * radiusOf(item.shot), boxShadow: PALETTE[theme].shadow }} />;
}

export function Mockups({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Plain springs (not hooks), since beats mount and unmount as the clip plays.
  const sp = (at: number) => spring({ frame: f - at, fps, config: { damping: 16, stiffness: 120 } });
  // The title starts big in the middle, then moves up into a header for the beats.
  const up = tween(f, [FIRST + 6, FIRST + 30], [0, 1], EASE_IN_OUT);
  const cy = text ? 610 : 545;
  const beat = Math.max(0, Math.min(BEATS.length, Math.floor((f - FIRST) / BEAT)));
  const status = beat < BEATS.length ? BEATS[beat].status : "restoring";
  const glowIn = tween(f, [startOf(beat), startOf(beat) + 14], [0, 1]);
  const fl = [useFloat(0.3, 6), useFloat(1.9, 6), useFloat(3.4, 6)];
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      {f >= FIRST - 4 && (
        <AbsoluteFill style={{ background: `radial-gradient(55% 50% at 50% ${(cy / 1080) * 100}%, ${STATUS_COLOR[status]}40 0%, transparent 72%)`, opacity: glowIn }} />
      )}
      <Stage perspective={1900}>
        {BEATS.map((b, j) => {
          const s0 = startOf(j);
          if (f < s0 - 2 || f > s0 + BEAT + 26) return null;
          const out = tween(f, [s0 + BEAT, s0 + BEAT + 18], [0, 1], EASE_IN_OUT);
          // Alternate where each beat comes from: below, then the right.
          const fromRight = j % 2 === 1;
          return b.items.map(([shot, label], i) => {
            const e = sp(s0 + i * 5);
            const side = i - 1;
            const item = { shot, label, status: b.status };
            return (
              <Place
                key={`${j}-${i}`}
                cx={960 + side * 430}
                cy={cy}
                z={i === 1 ? 3 : 2}
                pose={{
                  x: fl[i].x + (fromRight ? (1 - e) * 1300 : 0) - out * 260 * (side || 1),
                  y: fl[i].y + (fromRight ? 0 : (1 - e) * 900) - out * 760,
                  z: (i === 1 ? 80 : -40) + (1 - e) * -400,
                  rx: (1 - e) * 24 + out * 28,
                  ry: side * -12 + (1 - e) * (fromRight ? -40 : side * 30),
                  rz: (1 - e) * side * 10 - out * side * 6,
                  s: interpolate(e, [0, 1], [0.82, 1]),
                  o: Math.min(1, e * 1.4) * (1 - out),
                  blur: (1 - e) * 10 + out * 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
                  <Shot theme={theme} item={item} box={[400, text ? 600 : 680]} />
                  {text && (
                    <Chip theme={theme} delay={s0 + 8 + i * 5} color={STATUS_COLOR[b.status]} style={{ fontSize: 22, padding: "10px 18px" }}>
                      {label}
                    </Chip>
                  )}
                </div>
              </Place>
            );
          });
        })}
        {/* Finale: StandBy, and every widget state in its own color. */}
        {(() => {
          const s0 = startOf(BEATS.length);
          if (f < s0 - 2) return null;
          const sb = sp(s0);
          return (
            <>
              <Place cx={text ? 560 : 520} cy={cy} z={3} pose={{ x: (1 - sb) * -900, y: fl[0].y, rx: 6, ry: 16 + (1 - sb) * 30, z: (1 - sb) * -300, o: sb, blur: (1 - sb) * 10 }}>
                <Shot theme={theme} item={{ shot: "standby", label: "StandBy", status: "restored" }} box={[680, 400]} />
              </Place>
              {MATRIX.map((st, i) => {
                const e = sp(s0 + 6 + i * 5);
                return (
                  <Place key={st} cx={text ? 1300 : 1320} cy={cy - 330 + i * 165} z={4 + i} pose={{ x: (1 - e) * 1000, y: fl[(i + 1) % 3].y * 0.4, ry: -14, rz: (1 - e) * 6, z: (1 - e) * -200, o: e, blur: (1 - e) * 8 }}>
                    <Shot theme={theme} item={{ shot: "matrix", label: "", status: st }} box={[800, 150]} />
                  </Place>
                );
              })}
            </>
          );
        })()}
      </Stage>
      {text && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${up * -398}px) scale(${interpolate(up, [0, 1], [1, 0.62])})` }}>
          <Caption theme={theme} kicker="Beyond the web app" title="Along with the main app, we have even more features!" align="center" size={84} maxWidth={1400} delay={4} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
