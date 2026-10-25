// Staff-side b-roll: console tour, audit chain, staff on mobile, plus the light/dark switch and outro.

import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { Backdrop, BrowserFrame, Caption, Card, Logo, Phone, Stage, useEnter, useFloat } from "../components/primitives";
import { Place } from "../components/place";
import { BRAND, HIGH, LOW, PALETTE, capture, fontFamily, tween, EASE_IN_OUT, type ClipProps, type ThemeName } from "../theme";

// ---------------------------------------------------------------------------
// 9. Staff console: overview → reviews → audit trail inside one browser, a review card lifting off.

const PAGES = ["staff-overview", "staff-reviews", "staff-audit"];
const PAGE_LEN = 92;
const PAGE_T = 18;

export function StaffConsole({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  const drift = tween(f, [0, 240], [0, 1], EASE_IN_OUT);
  const card = useEnter(98, { damping: 15 });
  const fl = useFloat(2, 7);
  const bx = text ? 380 : 0;
  const w = text ? 1260 : 1480;
  const screenH = (w * 2000) / 3200;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2600}>
        <Place
          cx={960 + bx}
          cy={560}
          pose={{
            y: interpolate(enter, [0, 1], [300, 0]),
            z: interpolate(enter, [0, 1], [-800, 0]) + drift * 100,
            rx: interpolate(enter, [0, 1], [30, 8]),
            ry: (text ? -18 : -8) + drift * 10,
            o: enter,
          }}
        >
          <BrowserFrame theme={theme} width={w}>
            <AbsoluteFill style={{ height: screenH }}>
              <TransitionSeries>
                {PAGES.map((p, i) => (
                  <React.Fragment key={p}>
                    <TransitionSeries.Sequence durationInFrames={PAGE_LEN}>
                      <Img src={staticFile(capture(theme, p))} style={{ width: "100%", display: "block" }} />
                    </TransitionSeries.Sequence>
                    {i < PAGES.length - 1 && <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ durationInFrames: PAGE_T, config: { damping: 200 } })} />}
                  </React.Fragment>
                ))}
              </TransitionSeries>
            </AbsoluteFill>
          </BrowserFrame>
        </Place>
        <Place cx={1450 + bx * 0.25} cy={760} z={4} pose={{ x: fl.x, y: fl.y + (1 - card) * 160, z: interpolate(card, [0, 1], [-200, 300]), ry: -14, rx: 6, o: card * tween(f, [180, 196], [1, 0]) }}>
          <Card theme={theme} shot="card-review" width={520} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 100, width: 640 }}>
          <Caption theme={theme} kicker="AEP staff console" title="Every decision, accountable" sub="A human reviews what the system shouldn’t decide alone." size={68} maxWidth={520} style={{ width: 560 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 10. Audit chain: blocks link up, one gets tampered with, the integrity check flips to broken.

const BLOCKS = 7;
const TAMPER = 4;
const TAMPER_AT = 128;

export function AuditChain({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const p = PALETTE[theme];
  const gap = 230;
  const x0 = 960 - ((BLOCKS - 1) * gap) / 2;
  const y = text ? 470 : 400;
  const broken = f >= TAMPER_AT;
  const shake = broken ? Math.sin((f - TAMPER_AT) * 1.9) * tween(f, [TAMPER_AT, TAMPER_AT + 24], [14, 0]) : 0;
  const flip = tween(f, [TAMPER_AT + 6, TAMPER_AT + 26], [0, 1]);
  const cardIn = useEnter(70, { damping: 16 });
  const hex = (i: number) => ((i + 3) * 2654435761 >>> 0).toString(16).padStart(8, "0").slice(0, 6);
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <AbsoluteFill style={{ background: `radial-gradient(45% 40% at 50% ${(y / 1080) * 100}%, ${broken ? HIGH : LOW}26 0%, transparent 70%)` }} />
      <Stage perspective={1800}>
        {Array.from({ length: BLOCKS - 1 }, (_, i) => {
          const draw = tween(f, [10 + i * 8, 22 + i * 8], [0, 1]);
          const bad = broken && i >= TAMPER - 1;
          return (
            <Place key={`l${i}`} cx={x0 + i * gap + gap / 2} cy={y} pose={{ rx: 18 }}>
              <div style={{ width: gap - 120, height: 6, borderRadius: 6, background: p.grid, overflow: "hidden" }}>
                <div style={{ width: `${draw * 100}%`, height: "100%", background: bad ? HIGH : LOW, boxShadow: `0 0 18px ${bad ? HIGH : LOW}` }} />
              </div>
            </Place>
          );
        })}
        {Array.from({ length: BLOCKS }, (_, i) => {
          const e = useEnter(i * 8, { damping: 14, stiffness: 120 });
          const bad = broken && i >= TAMPER;
          const tampered = broken && i === TAMPER;
          const c = bad ? HIGH : LOW;
          return (
            <Place key={i} cx={x0 + i * gap} cy={y} z={2} pose={{ x: tampered ? shake : 0, y: (1 - e) * 80 + Math.sin(f / 30 + i) * 6, rx: 18, s: interpolate(e, [0, 1], [0.6, 1]) * (tampered ? 1.08 : 1), o: e }}>
              <div
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 30,
                  background: p.chrome,
                  boxShadow: `${p.shadow}, inset 0 0 0 3px ${c}, 0 0 40px ${c}55`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: c }} />
                </div>
                {text && <div style={{ fontSize: 20, color: p.muted }}>{tampered ? "edited" : hex(i)}</div>}
              </div>
            </Place>
          );
        })}
        <Place cx={960} cy={text ? 800 : 760} z={3} pose={{ y: (1 - cardIn) * 200, o: cardIn, rx: interpolate(flip, [0, 0.5, 1], [6, 90, 6]) }}>
          <Card theme={theme} shot={flip < 0.5 ? "card-integrity" : "card-integrity-broken"} width={760} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 80 }}>
          <Caption theme={theme} title="Tamper-evident audit trail" sub="Every entry is hash-chained to the one before. Change one and the chain breaks." align="center" size={68} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 11. Staff on mobile: overview, reviews and audit as a staggered stack.

export function StaffMobile({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const shots = ["m-staff-audit", "m-staff-reviews", "m-staff"];
  // The stack fans 250px left per layer, so shift the anchor right to center it.
  const cx = text ? 1480 : 1210;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2000}>
        {shots.map((s, i) => {
          const e = useEnter(i * 9, { damping: 17, stiffness: 70 });
          const fl = useFloat(i * 1.7, 6);
          const d = shots.length - 1 - i;
          return (
            <Place
              key={s}
              cx={cx}
              cy={545}
              z={i}
              pose={{
                x: fl.x - d * 250 + interpolate(e, [0, 1], [400, 0]),
                y: fl.y - d * 30 + interpolate(e, [0, 1], [500, 0]),
                z: -d * 160,
                ry: -24 + Math.sin(f / 70) * 5,
                rx: 6,
                o: e,
                s: 0.86,
              }}
            >
              <Phone theme={theme} shot={s} width={400} />
            </Place>
          );
        })}
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120, width: 760 }}>
          <Caption theme={theme} kicker="In the field" title="The console fits in a pocket" sub="Supervisors review escalations from their phone." size={72} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 12. Light ↔ dark: a diagonal sweep across the same screens.

function Split({ sweep, children }: { sweep: number; children: (t: ThemeName) => React.ReactNode }) {
  // sweep 0 = all light, 1 = all dark. Diagonal edge.
  const a = -30 + sweep * 160;
  const clip = `polygon(${a}% 0, 100% 0, 100% 100%, ${a - 30}% 100%)`;
  return (
    <>
      <AbsoluteFill>{children("light")}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{children("dark")}</AbsoluteFill>
    </>
  );
}

export function ThemeSwitch({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  // Start in the clip's theme, sweep to the other, then back.
  const there = tween(f, [24, 78], [0, 1], EASE_IN_OUT) - tween(f, [112, 166], [0, 1], EASE_IN_OUT);
  const sweep = theme === "light" ? there : 1 - there;
  const edge = -30 + sweep * 160;
  const scene = (t: ThemeName) => (
    <AbsoluteFill>
      <Backdrop theme={t} />
      <Stage perspective={2400}>
        <Place cx={text ? 1150 : 900} cy={560} pose={{ y: (1 - enter) * 300, z: tween(f, [0, 180], [0, 120]), rx: 9, ry: -10 }}>
          <BrowserFrame theme={t} shot="desk-watch" width={1300} />
        </Place>
        <Place cx={text ? 1650 : 1560} cy={600} z={3} pose={{ y: (1 - enter) * 500, z: 200, ry: -16, rx: 4, s: 0.86 }}>
          <Phone theme={t} shot="m-watch" width={380} />
        </Place>
        {text && (
          <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 110, width: 700 }}>
            <Caption theme={t} kicker="Every screen" title="Light and dark, built in" size={72} delay={10} />
          </AbsoluteFill>
        )}
      </Stage>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      <Split sweep={sweep}>{scene}</Split>
      {/* Glowing seam along the diagonal edge */}
      <AbsoluteFill
        style={{
          backgroundColor: BRAND,
          filter: `drop-shadow(0 0 18px ${BRAND})`,
          clipPath: `polygon(${edge}% 0, ${edge + 0.3}% 0, ${edge - 29.7}% 100%, ${edge - 30}% 100%)`,
          opacity: sweep > 0.005 && sweep < 0.995 ? 1 : 0,
        }}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Outro: logo and the four verbs.

export function Outro({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const logo = useEnter(4, { damping: 16 });
  const verbs = ["Predict.", "Explain.", "Prepare.", "Communicate."];
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, fontFamily }}>
        <div style={{ opacity: logo, transform: `scale(${interpolate(logo, [0, 1], [0.8, 1])})`, filter: `blur(${(1 - logo) * 10}px)` }}>
          <Logo theme={theme} height={text ? 120 : 170} />
        </div>
        {text && (
          <>
            <div style={{ fontSize: 96, fontWeight: 650, letterSpacing: "-0.04em", color: PALETTE[theme].ink, opacity: tween(f, [16, 34], [0, 1]), transform: `translateY(${tween(f, [16, 34], [30, 0])}px)` }}>
              AI Outage Concierge
            </div>
            <div style={{ display: "flex", gap: 30, fontSize: 40, fontWeight: 500 }}>
              {verbs.map((v, i) => {
                const o = tween(f, [34 + i * 8, 46 + i * 8], [0, 1]);
                return (
                  <span key={v} style={{ opacity: o, color: i === 3 ? BRAND : PALETTE[theme].muted, transform: `translateY(${(1 - o) * 20}px)` }}>
                    {v}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
