// Customer-side b-roll: hero, phone scroll, phone trio, storm timeline, risk, restoration, messages, safety.

import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { Backdrop, BrowserFrame, Caption, Card, Chip, Phone, Stage, cardHeight, useEnter, useFloat } from "../components/primitives";
import { Place } from "../components/place";
import { BRAND, HIGH, LOW, MID, PALETTE, capture, fontFamily, tween, EASE_IN_OUT, type ClipProps } from "../theme";

// ---------------------------------------------------------------------------
// 1. Hero: the desktop app in a tilted browser, dollying in, with cards lifting off.

export function Hero({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  const drift = tween(f, [0, 210], [0, 1], EASE_IN_OUT);
  const c1 = useEnter(48, { damping: 15 });
  const c2 = useEnter(66, { damping: 15 });
  const fl1 = useFloat(1, 7);
  const fl2 = useFloat(3, 7);
  // With text, the browser shrinks and moves right to leave the left third for the title.
  const bw = text ? 1180 : 1480;
  const bcx = text ? 1360 : 900;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2400}>
        <Place
          cx={bcx}
          cy={560}
          pose={{
            y: interpolate(enter, [0, 1], [260, 0]) - drift * 20,
            z: interpolate(enter, [0, 1], [-700, 0]) + drift * 120,
            rx: interpolate(enter, [0, 1], [32, 10]) - drift * 4,
            ry: (text ? -16 : -10) + drift * (text ? 6 : 12),
            rz: interpolate(enter, [0, 1], [3, 0]),
            o: enter,
          }}
        >
          <BrowserFrame theme={theme} shot="desk-watch" width={bw} />
        </Place>
        <Place cx={text ? 1700 : 1560} cy={text ? 300 : 330} z={5} pose={{ x: fl1.x, y: interpolate(c1, [0, 1], [180, 0]) + fl1.y, z: interpolate(c1, [0, 1], [-200, 260]), ry: -10, rx: 6, o: c1 }}>
          <Card theme={theme} shot="card-kpis" width={text ? 400 : 460} radius={0} style={{ boxShadow: "none" }} />
        </Place>
        <Place cx={text ? 1580 : 1500} cy={text ? 800 : 780} z={6} pose={{ x: fl2.x, y: interpolate(c2, [0, 1], [200, 0]) + fl2.y, z: interpolate(c2, [0, 1], [-200, 320]), ry: -12, rx: 4, o: c2 }}>
          <Card theme={theme} shot="card-msg-prestorm" width={text ? 380 : 460} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120 }}>
          <Caption theme={theme} kicker="HackOHI/O 2026 · AEP Challenge" title="AI Outage Concierge" sub="Predict. Explain. Prepare. Communicate." size={100} maxWidth={620} delay={14} style={{ width: 640 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 2. Phone scroll: a real, frame-by-frame scroll through the mobile dashboard.

export const SCROLL_FRAMES = 150;

export function PhoneScroll({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 20, stiffness: 70 });
  const i = Math.max(0, Math.min(SCROLL_FRAMES - 1, f - 10));
  const src = `captures/${theme}/seq-m-scroll/${String(i).padStart(4, "0")}.jpg`;
  const sway = Math.sin(f / 60) * 4;
  const a = useEnter(26, { damping: 16 });
  const b = useEnter(40, { damping: 16 });
  const fa = useFloat(0.5, 9);
  const fb = useFloat(2.5, 9);
  const px = text ? 1150 : 960;
  const kx = text ? px + 470 : px - 420;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage>
        <Place cx={kx} cy={text ? 300 : 430} pose={{ x: fa.x - (1 - a) * 120, y: fa.y + (1 - a) * 80, z: -160, ry: text ? -22 : 22, o: a * 0.95, blur: (1 - a) * 8 }}>
          <Card theme={theme} shot="card-kpis" width={text ? 400 : 460} radius={0} style={{ boxShadow: "none" }} />
        </Place>
        <Place cx={px + 470} cy={text ? 720 : 660} pose={{ x: fb.x + (1 - b) * 120, y: fb.y + (1 - b) * 80, z: -120, ry: -22, o: b, blur: (1 - b) * 8 }}>
          <Card theme={theme} shot="card-estimate" width={text ? 400 : 440} />
        </Place>
        <Place cx={px} cy={545} z={5} pose={{ y: interpolate(enter, [0, 1], [700, 0]), ry: sway - 6 + (1 - enter) * -20, rx: 4, s: 0.94 }}>
          <Phone theme={theme} src={src} width={430} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 130 }}>
          <Caption theme={theme} kicker="Mobile first" title="Your storm, at a glance" sub="Chance of losing power, how long it could last, and what to do, on one screen." size={78} maxWidth={720} style={{ width: 760 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 3. Phone trio: home, chat and alerts fan in.

export function PhoneTrio({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const shots = ["m-watch", "m-chat", "m-alerts"];
  const orbit = Math.sin(f / 70) * 6;
  const yOff = text ? 120 : 20;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2000}>
        {shots.map((shot, i) => {
          const e = useEnter(i * 7, { damping: 17, stiffness: 75 });
          const side = i - 1;
          const fl = useFloat(i * 2, 6);
          return (
            <Place
              key={shot}
              cx={960}
              cy={540 + yOff}
              z={i === 1 ? 3 : 1}
              pose={{
                x: side * interpolate(e, [0, 1], [120, 460]) + fl.x,
                y: interpolate(e, [0, 1], [800, 0]) + fl.y + Math.abs(side) * 30,
                z: i === 1 ? 80 : -120,
                ry: side * -18 + orbit,
                rz: side * interpolate(e, [0, 1], [10, 2]),
                s: text ? 0.8 : 0.92,
              }}
            >
              <Phone theme={theme} shot={shot} width={380} />
            </Place>
          );
        })}
      </Stage>
      {text && (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
          <Caption theme={theme} title="Plain answers, wherever you are" align="center" size={64} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 4. Storm timeline: All Clear → Watch → Outage → Restoring → Restored inside one phone.

const STAGES = [
  { shot: "m-normal", label: "All Clear", color: LOW },
  { shot: "m-watch2", label: "Watch Alert", color: MID },
  { shot: "m-outage", label: "Power Outage", color: HIGH },
  { shot: "m-restoring", label: "Restoring Power", color: BRAND },
  { shot: "m-restored", label: "Power Restored", color: LOW },
];
const STAGE_LEN = 62;
const STAGE_T = 16;
export const TIMELINE_FRAMES = STAGES.length * STAGE_LEN - (STAGES.length - 1) * STAGE_T;

export function StormTimeline({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const step = STAGE_LEN - STAGE_T;
  const active = Math.min(STAGES.length - 1, Math.floor((f + STAGE_T / 2) / step));
  const enter = useEnter(0, { damping: 20, stiffness: 70 });
  const glow = STAGES[active].color;
  const px = text ? 700 : 960;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <AbsoluteFill style={{ background: `radial-gradient(40% 55% at ${(px / 1920) * 100}% 52%, ${glow}55 0%, transparent 70%)`, transition: "none" }} />
      <Stage>
        <Place cx={px} cy={545} pose={{ y: interpolate(enter, [0, 1], [700, 0]), ry: Math.sin(f / 50) * 8, rx: 3, s: 0.95 }}>
          <Phone theme={theme} width={430}>
            <TransitionSeries>
              {STAGES.map((s, i) => (
                <React.Fragment key={s.shot}>
                  <TransitionSeries.Sequence durationInFrames={STAGE_LEN}>
                    <AbsoluteFill>
                      <Img src={staticFile(capture(theme, s.shot))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </AbsoluteFill>
                  </TransitionSeries.Sequence>
                  {i < STAGES.length - 1 && (
                    <TransitionSeries.Transition presentation={(i % 2 ? wipe({ direction: "from-bottom" }) : slide({ direction: "from-right" })) as ReturnType<typeof slide>} timing={springTiming({ durationInFrames: STAGE_T, config: { damping: 200 } })} />
                  )}
                </React.Fragment>
              ))}
            </TransitionSeries>
          </Phone>
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", left: 1080, fontFamily }}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND, marginBottom: 34 }}>Through the whole storm</div>
          {STAGES.map((s, i) => {
            const on = i === active;
            const done = i < active;
            const v = tween(f, [i * step - 4, i * step + 8], [0, 1]);
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 26, height: 96, opacity: 0.35 + v * 0.65 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: on || done ? s.color : PALETTE[theme].grid, boxShadow: on ? `0 0 0 8px ${s.color}33, 0 0 30px ${s.color}` : "none" }} />
                <span style={{ fontSize: on ? 64 : 46, fontWeight: on ? 650 : 500, letterSpacing: "-0.03em", color: on ? PALETTE[theme].ink : PALETTE[theme].muted }}>{s.label}</span>
              </div>
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 5. Risk card: "Will I lose power?" with the reasons.

export function RiskCard({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const back = useEnter(0, { damping: 20, stiffness: 60 });
  const main = useEnter(12, { damping: 16, stiffness: 70 });
  const push = tween(f, [20, 180], [0, 1], EASE_IN_OUT);
  const fl = useFloat(1, 6);
  const cx = text ? 1300 : 960;
  const W = 560;
  const h = cardHeight(theme, "card-risk", W);
  // The card is taller than the frame: start on the headline, then pan down through the reasons.
  const travel = Math.max(0, (h - 860) / 2);
  const pan = tween(f, [40, 175], [0, 1], EASE_IN_OUT);
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2000}>
        <Place cx={cx - 300} cy={300} pose={{ z: -500, ry: 16, rx: 10, o: back * 0.7, blur: 3, y: (1 - back) * -100 }}>
          <Card theme={theme} shot="card-kpis" width={560} radius={0} style={{ boxShadow: "none" }} />
        </Place>
        <Place cx={cx + 330} cy={820} pose={{ z: -420, ry: -18, rx: 8, o: back * 0.6, blur: 3, y: (1 - back) * 100 }}>
          <Card theme={theme} shot="card-estimate" width={460} />
        </Place>
        <Place
          cx={cx}
          cy={540}
          z={3}
          pose={{
            x: fl.x,
            y: fl.y + interpolate(main, [0, 1], [600, 0]) + travel - pan * travel * 2,
            z: interpolate(main, [0, 1], [-900, 0]) + push * 60,
            rx: interpolate(main, [0, 1], [38, 4]),
            ry: interpolate(main, [0, 1], [-30, -6]) + push * 4,
            o: main,
          }}
        >
          <Card theme={theme} shot="card-risk" width={W} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120 }}>
          <Caption theme={theme} kicker="Outage risk" title="Will I lose power?" sub="A five-level chance, the reasons behind it, and how sure we are." size={84} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 6. Restoration: the estimate card reacting to what-ifs, then the materials it's built from.

export function Restoration({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 18, stiffness: 70 });
  const cx = text ? 1180 : 860;
  const states = ["card-estimate", "card-estimate-trees", "card-estimate-branch"];
  const at = [0, 78, 150];
  const mat = useEnter(178, { damping: 16 });
  const fl = useFloat(2, 5);
  const flM = useFloat(4, 6);
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2200}>
        <Place cx={cx} cy={570} pose={{ x: fl.x, y: fl.y + (1 - enter) * 500, rx: 6, ry: text ? -10 : -6, z: tween(f, [0, 240], [0, 90]) }}>
          <div style={{ position: "relative", width: 620, height: cardHeight(theme, "card-estimate-trees", 620) }}>
            {states.map((s, i) => {
              const inn = i === 0 ? 1 : tween(f, [at[i], at[i] + 14], [0, 1]);
              const out = i === states.length - 1 ? 0 : tween(f, [at[i + 1], at[i + 1] + 14], [0, 1]);
              const o = inn * (1 - out);
              if (o <= 0.001) return null;
              return (
                <div key={s} style={{ position: "absolute", top: 0, left: 0, opacity: o, transform: `translateY(${(1 - inn) * 30 - out * 30}px) scale(${1 - out * 0.03})`, filter: `blur(${(1 - inn) * 8 + out * 8}px)` }}>
                  <Card theme={theme} shot={s} width={620} />
                </div>
              );
            })}
          </div>
        </Place>
        <Place cx={cx + 520} cy={560} pose={{ x: flM.x + (1 - mat) * 300, y: flM.y, z: -60, ry: -18, rx: 4, o: mat }}>
          <Card theme={theme} shot="card-materials" width={430} />
        </Place>
        {text && (
          <>
            <Place cx={cx - 60} cy={92} z={8} pose={{ o: tween(f, [72, 80], [0, 1]) * tween(f, [140, 150], [1, 0]) }}>
              <Chip theme={theme} delay={74} color={HIGH}>
                +1 pole · Trees down
              </Chip>
            </Place>
            <Place cx={cx - 60} cy={92} z={8} pose={{ o: tween(f, [144, 152], [0, 1]) }}>
              <Chip theme={theme} delay={146} color={LOW}>
                Damage on a nearby branch
              </Chip>
            </Place>
          </>
        )}
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 110, width: 760 }}>
          <Caption theme={theme} kicker="Restoration" title="How long could it take?" sub="Always a range, built from AEP labor standards. Change the damage and watch it move." size={74} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 7. Messages: the four proactive alerts cascade in like notifications.

export function Messages({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const cards = ["card-msg-prestorm", "card-msg-outage", "card-msg-update", "card-msg-restored"];
  const cx = text ? 1240 : 960;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2400}>
        {cards.map((c, i) => {
          const e = useEnter(8 + i * 24, { damping: 15, stiffness: 90 });
          const later = cards.length - 1 - i;
          const fl = useFloat(i, 4);
          return (
            <Place
              key={c}
              cx={cx}
              cy={300 + i * 150}
              z={i}
              pose={{
                x: fl.x + (i % 2 ? 40 : -40),
                y: fl.y + interpolate(e, [0, 1], [-260, 0]),
                z: i * 40 - later * 10,
                rx: 10,
                ry: text ? -14 : -8,
                rz: (i % 2 ? 1 : -1) * 1.2,
                o: e,
                s: interpolate(e, [0, 1], [1.12, 1]),
              }}
            >
              <Card theme={theme} shot={c} width={560} />
            </Place>
          );
        })}
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120, width: 820 }}>
          <Caption theme={theme} kicker="Alerts" title="Before, during and after" sub="Pre-storm, outage confirmed, estimate updated and power restored. On the channels each customer chose." size={74} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 8. Safety and honesty: the fixed 911 card and the "we can't make a confident call" fallback.

export function Safety({ theme, text }: ClipProps) {
  const f = useCurrentFrame();
  const phone = useEnter(0, { damping: 20, stiffness: 70 });
  const s = useEnter(26, { damping: 15 });
  const fb = useEnter(96, { damping: 15 });
  const fl = useFloat(1, 6);
  const fl2 = useFloat(3, 6);
  const px = text ? 1060 : 720;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <AbsoluteFill style={{ background: `radial-gradient(35% 50% at ${((px + 520) / 1920) * 100}% 40%, ${HIGH}2a 0%, transparent 70%)`, opacity: s }} />
      <Stage>
        <Place cx={px} cy={545} pose={{ y: interpolate(phone, [0, 1], [700, 0]), ry: 14 + Math.sin(f / 60) * 4, s: 0.92 }}>
          <Phone theme={theme} shot="m-safety" width={420} />
        </Place>
        <Place cx={px + 540} cy={330} z={4} pose={{ x: fl.x + (1 - s) * -280, y: fl.y, z: interpolate(s, [0, 1], [-300, 120]), ry: -14, rx: 4, o: s }}>
          <Card theme={theme} shot="card-safety" width={460} radius={16} />
        </Place>
        <Place cx={px + 580} cy={735} z={5} pose={{ x: fl2.x + (1 - fb) * 280, y: fl2.y, z: interpolate(fb, [0, 1], [-300, 160]), ry: -16, rx: 3, o: fb }}>
          <Card theme={theme} shot="card-fallback" width={380} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 110, width: 780 }}>
          <Caption theme={theme} kicker="Responsible AI" title="No guessing when it matters" sub="Hazards get a fixed 911 card, never an AI answer. Thin data gets an honest “we don’t know”." size={70} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
