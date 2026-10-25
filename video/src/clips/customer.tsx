// Customer-side b-roll: hero, phone scroll, phone trio, storm timeline, risk, restoration, messages, safety.

import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { Backdrop, BrowserFrame, Caption, Card, Chip, Notes, Phone, Stage, cardHeight, useEnter, useFloat } from "../components/primitives";
import { Place } from "../components/place";
import { DeskMorph, FLAT, HERO_LEFT, MONTAGE_PHONE, MORPH, PhoneMorph, SCROLL_PHONE, flatMapRect, scrollFrame, scrollPhoneX } from "./hero-morph";
import { BRAND, HIGH, LOW, MID, PALETTE, TEAM, capture, lenOr, fontFamily, tween, EASE_IN_OUT, type ClipProps, type ThemeName } from "../theme";

/** The team, as a small line under a title. */
export function TeamLine({ theme, delay = 0, style }: { theme: ThemeName; delay?: number; style?: React.CSSProperties }) {
  const v = useEnter(delay, { damping: 20, stiffness: 110 });
  const p = PALETTE[theme];
  return (
    <div style={{ fontFamily, display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 500, color: p.ink, opacity: v, transform: `translateY(${(1 - v) * 16}px)`, ...style }}>
      {TEAM.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND }} />}
          <span>{n}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero: the desktop app in a tilted browser, dollying in, with cards lifting off.
//    With `toPhone` (the montage), the layout is mirrored (browser left, title right) and it ends by morphing
//    into the phone PhoneScroll opens on, on the right.

/** Frame the morph starts at, and the Hero's length when it morphs. */
export const MORPH_AT = 110;
export const HERO_TO_PHONE_FRAMES = MORPH_AT + MORPH.length;

export function Hero({ theme, text, toPhone, morphAt, names }: ClipProps) {
  const f = useCurrentFrame();
  const morph = toPhone === true;
  const m = morph ? f - lenOr(morphAt, MORPH_AT) : -1;
  const flat = morph ? tween(m, MORPH.flat as unknown as [number, number], [0, 1], EASE_IN_OUT) : 0;
  const away = morph ? tween(m, [0, 20], [0, 1], EASE_IN_OUT) : 0;
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  const drift = tween(f, [0, 210], [0, 1], EASE_IN_OUT);
  const c1 = useEnter(48, { damping: 15 });
  const c2 = useEnter(66, { damping: 15 });
  const fl1 = useFloat(1, 7);
  const fl2 = useFloat(3, 7);
  // With text, the browser shrinks and moves aside to leave a third of the frame for the title.
  const left = morph ? HERO_LEFT[text ? "text" : "clean"] : null;
  const bw = left ? left.width : text ? 1180 : 1480;
  const bcx = left ? left.cx : text ? 1360 : 900;
  // Mirrors x positions and turns when the browser is on the left (cards nudged inward so they stay in frame).
  const side = morph ? -1 : 1;
  const mx = (x: number) => (morph ? 1920 - x + 90 : x);
  const lerp = (a: number, b: number) => a + (b - a) * flat;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2400}>
        <Place
          cx={bcx}
          cy={560}
          pose={{
            x: lerp(0, FLAT.cx - bcx),
            y: lerp(interpolate(enter, [0, 1], [260, 0]) - drift * 20, FLAT.cy - 560),
            z: lerp(interpolate(enter, [0, 1], [-700, 0]) + drift * 120, 0),
            rx: lerp(interpolate(enter, [0, 1], [32, 10]) - drift * 4, 0),
            ry: lerp(side * ((text ? -16 : -10) + drift * (text ? 6 : 12)), 0),
            rz: lerp(side * interpolate(enter, [0, 1], [3, 0]), 0),
            s: lerp(1, FLAT.w / bw),
            o: enter,
          }}
        >
          {morph ? <DeskMorph theme={theme} width={bw} m={m} /> : <BrowserFrame theme={theme} shot="desk-watch" width={bw} />}
        </Place>
        <Place cx={mx(text ? 1700 : 1560)} cy={text ? 300 : 330} z={5} pose={{ x: fl1.x + side * away * 700, y: interpolate(c1, [0, 1], [180, 0]) + fl1.y - away * 800, z: interpolate(c1, [0, 1], [-200, 260]), ry: side * -10, rx: 6, o: c1 }}>
          <Card theme={theme} shot="card-kpis" width={text ? 400 : 460} radius={0} style={{ boxShadow: "none" }} />
        </Place>
        <Place cx={mx(text ? 1580 : 1500)} cy={text ? 800 : 780} z={6} pose={{ x: fl2.x + side * away * 600, y: interpolate(c2, [0, 1], [200, 0]) + fl2.y + away * 800, z: interpolate(c2, [0, 1], [-200, 320]), ry: side * -12, rx: 4, o: c2 }}>
          <Card theme={theme} shot="card-msg-prestorm" width={text ? 380 : 460} />
        </Place>
      </Stage>
      {morph && m >= MORPH.handoff && (
        <Stage>
          <PhoneMorph theme={theme} m={m} from={flatMapRect(theme, bw)} />
        </Stage>
      )}
      {text && (
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: morph ? "flex-end" : "flex-start", padding: "0 120px", opacity: 1 - flat, transform: `translateX(${side * -flat * 320}px)` }}
        >
          <Caption theme={theme} kicker="HackOHI/O 2026 · AEP Challenge" title="AI Outage Concierge" sub="Predict. Explain. Prepare. Communicate." size={100} maxWidth={620} delay={14} align={morph ? "right" : "left"} style={{ width: 640 }} />
          {names === true && <TeamLine theme={theme} delay={56} style={{ marginTop: 34 }} />}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 2. Phone scroll: a real, frame-by-frame scroll through the mobile dashboard.
//    With `fromHero` (the montage), the phone is already in place where the Hero's morph left it.

export const SCROLL_FRAMES = 150;

export function PhoneScroll({ theme, text, fromHero, len, backdropFrom }: ClipProps) {
  const f = useCurrentFrame();
  const settled = fromHero === true;
  const intro = useEnter(0, { damping: 20, stiffness: 70 });
  const enter = settled ? 1 : intro;
  // Stretched, the scroll plays slower and blends neighbouring captures so it stays smooth.
  const pos = typeof len === "number" ? ((f - 30) * (SCROLL_FRAMES - 1)) / (len - 100) : f - 10;
  const at = Math.max(0, Math.min(SCROLL_FRAMES - 1, pos));
  const i = Math.floor(at);
  const blend = i < SCROLL_FRAMES - 1 ? at - i : 0;
  const src = scrollFrame(theme, i);
  const sway = Math.sin(f / 60) * 4;
  const a = useEnter(26, { damping: 16 });
  const b = useEnter(40, { damping: 16 });
  const fa = useFloat(0.5, 9);
  const fb = useFloat(2.5, 9);
  // In the montage the phone sits on the right, where the Hero's morph left it, with the text on the left.
  const { x: px, width, cy, pose } = settled ? MONTAGE_PHONE : { x: scrollPhoneX(text), ...SCROLL_PHONE };
  // Cards go on the phone's right whenever the text takes the left.
  const right = settled || text;
  const kx = right ? px + (settled ? 440 : 470) : px - 420;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} frameOffset={settled ? lenOr(backdropFrom, HERO_TO_PHONE_FRAMES) : 0} />
      <Stage>
        <Place cx={kx} cy={right ? 300 : 430} pose={{ x: fa.x - (1 - a) * 120, y: fa.y + (1 - a) * 80, z: -160, ry: right ? -22 : 22, o: a * 0.95, blur: (1 - a) * 8 }}>
          <Card theme={theme} shot="card-kpis" width={right ? 400 : 460} radius={0} style={{ boxShadow: "none" }} />
        </Place>
        <Place cx={px + (settled ? 440 : 470)} cy={right ? 720 : 660} pose={{ x: fb.x + (1 - b) * 120, y: fb.y + (1 - b) * 80, z: -120, ry: -22, o: b, blur: (1 - b) * 8 }}>
          <Card theme={theme} shot="card-estimate" width={right ? 400 : 440} />
        </Place>
        <Place cx={px} cy={cy} z={5} pose={{ y: interpolate(enter, [0, 1], [700, 0]), ry: sway + pose.ry + (1 - enter) * -20, rx: pose.rx, s: pose.s }}>
          <Phone theme={theme} src={src} width={width}>
            {blend > 0.01 && <Img src={staticFile(scrollFrame(theme, i + 1))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: blend }} />}
          </Phone>
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
const STAGE_T = 16;
export const TIMELINE_FRAMES = STAGES.length * 62 - (STAGES.length - 1) * STAGE_T;

export function StormTimeline({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const STAGE_LEN = Math.floor((lenOr(len, TIMELINE_FRAMES) + (STAGES.length - 1) * STAGE_T) / STAGES.length);
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

export function RiskCard({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const L = lenOr(len, 180);
  const back = useEnter(0, { damping: 20, stiffness: 60 });
  const main = useEnter(12, { damping: 16, stiffness: 70 });
  const push = tween(f, [20, L], [0, 1], EASE_IN_OUT);
  const fl = useFloat(1, 6);
  const cx = text ? 1300 : 960;
  const W = 560;
  const h = cardHeight(theme, "card-risk", W);
  // The card is taller than the frame: start on the headline, then pan down through the reasons.
  const travel = Math.max(0, (h - 860) / 2);
  const pan = tween(f, [40, L - 5], [0, 1], EASE_IN_OUT);
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
          <Caption theme={theme} kicker="Outage risk" title="Will I lose power?" sub="A five-level chance, the reasons behind it, and how sure we are." size={typeof len === "number" ? 76 : 84} />
          {typeof len === "number" && (
            <Notes
              theme={theme}
              delay={100}
              stagger={50}
              style={{ marginTop: 40 }}
              items={[
                { text: "Eight weighted indicators, from storm wind on the line to past storm damage", color: BRAND },
                { text: "Backtested on two held-out storms: AUC 0.63 and 0.60, vs 0.46 for “overhead wires = risky”", color: LOW },
                { text: "A confidence level, and the data we’re missing, on every answer", color: MID },
              ]}
            />
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 6. Restoration: the estimate card reacting to what-ifs, then the materials it's built from.

export function Restoration({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const L = lenOr(len, 240);
  const k = L / 240;
  const enter = useEnter(0, { damping: 18, stiffness: 70 });
  const cx = text ? 1180 : 860;
  const states = ["card-estimate", "card-estimate-trees", "card-estimate-branch"];
  const at = [0, 78 * k, 150 * k];
  const mat = useEnter(178 * k, { damping: 16 });
  const fl = useFloat(2, 5);
  const flM = useFloat(4, 6);
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2200}>
        <Place cx={cx} cy={570} pose={{ x: fl.x, y: fl.y + (1 - enter) * 500, rx: 6, ry: text ? -10 : -6, z: tween(f, [0, L], [0, 90]) }}>
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
            <Place cx={cx - 60} cy={92} z={8} pose={{ o: tween(f, [72 * k, 72 * k + 8], [0, 1]) * tween(f, [140 * k, 140 * k + 10], [1, 0]) }}>
              <Chip theme={theme} delay={74 * k} color={HIGH}>
                +1 pole · Trees down
              </Chip>
            </Place>
            <Place cx={cx - 60} cy={92} z={8} pose={{ o: tween(f, [144 * k, 144 * k + 8], [0, 1]) }}>
              <Chip theme={theme} delay={146 * k} color={LOW}>
                Damage on a nearby branch
              </Chip>
            </Place>
          </>
        )}
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 110, width: 760 }}>
          <Caption theme={theme} kicker="Restoration" title="How long could it take?" sub="Always a range, built from AEP labor standards. Change the damage and watch it move." size={typeof len === "number" ? 68 : 74} />
          {typeof len === "number" && (
            <Notes
              theme={theme}
              delay={60}
              stagger={50}
              style={{ marginTop: 36 }}
              items={[
                { text: "AEP STORMS labor standards: about 5.3 person-hours per broken pole", color: BRAND },
                { text: "×4.5 for travel, safety briefings and setup, plus road clearing", color: MID },
                { text: "Damage on a nearby branch? Crews switch this home back first", color: LOW },
              ]}
            />
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 7. Messages: the four proactive alerts cascade in like notifications.

export function Messages({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const k = lenOr(len, 180) / 180;
  const cards = ["card-msg-prestorm", "card-msg-outage", "card-msg-update", "card-msg-restored"];
  const cx = text ? 1240 : 960;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2400}>
        {cards.map((c, i) => {
          const e = useEnter(8 + i * 24 * k, { damping: 15, stiffness: 90 });
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
          <Caption theme={theme} kicker="Alerts" title="Before, during and after" sub="Pre-storm, outage confirmed, estimate updated and power restored. On the channels each customer chose." size={typeof len === "number" ? 66 : 74} />
          {typeof len === "number" && (
            <Notes
              theme={theme}
              delay={70}
              stagger={40}
              style={{ marginTop: 36 }}
              items={[
                { text: "Declared a medical need? The first alert comes 48 hours ahead, not 24", color: HIGH },
                { text: "Plus a phone call, and a welfare check if the outage passes 4 hours", color: MID },
                { text: "Needs are self-reported, never inferred from account data", color: BRAND },
              ]}
            />
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 8. Safety and honesty: the fixed 911 card and the "we can't make a confident call" fallback.

export function Safety({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const k = lenOr(len, 180) / 180;
  const phone = useEnter(0, { damping: 20, stiffness: 70 });
  const s = useEnter(26, { damping: 15 });
  const fb = useEnter(96 * k, { damping: 15 });
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
          <Caption theme={theme} kicker="Responsible AI" title="No guessing when it matters" sub="Hazards get a fixed 911 card, never an AI answer. Thin data gets an honest “we don’t know”." size={typeof len === "number" ? 64 : 70} />
          {typeof len === "number" && (
            <Notes
              theme={theme}
              delay={60}
              stagger={50}
              style={{ marginTop: 36 }}
              items={[
                { text: "Downed wire, sparks, fire or injury: the fixed 911 card, and staff are alerted", color: HIGH },
                { text: "Too little storm history: no chance or time shown, but alerts stay on", color: MID },
                { text: "Other questions go to Claude, inside guardrails, with personal details redacted", color: BRAND },
              ]}
            />
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
