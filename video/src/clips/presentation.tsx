// The presentation cut (about 2:38) for a narrated walkthrough: the team's names at both ends, longer clips with
// key facts on screen, longer holds between transitions, and long-form tours of the staff console and audit trail.

import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { Backdrop, BrowserFrame, Caption, Card, Stage, useEnter, useFloat } from "../components/primitives";
import { Place } from "../components/place";
import { BRAND, PALETTE, capture, fontFamily, tween, EASE_IN_OUT, type ClipProps, type ThemeName } from "../theme";
import { Hero, Messages, PhoneScroll, Restoration, RiskCard, Safety, StormTimeline } from "./customer";
import { Crop, MORPH } from "./hero-morph";
import { AuditChain, Outro } from "./staff";

// ---------------------------------------------------------------------------
// Numbered steps beside a tour: each appears when its part of the tour starts, and the current one is lit.

function Steps({ theme, steps, starts, style }: { theme: ThemeName; steps: { title: string; body: string }[]; starts: number[]; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  const p = PALETTE[theme];
  const active = starts.reduce((a, s, i) => (f >= s ? i : a), 0);
  return (
    <div style={{ fontFamily, display: "flex", flexDirection: "column", gap: 22, ...style }}>
      {steps.map((s, i) => {
        const shown = tween(f, [starts[i], starts[i] + 14], [0, 1]);
        const on = i === active;
        const lit = on ? tween(f, [starts[i], starts[i] + 10], [0, 1]) : 0;
        return (
          <div key={s.title} style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: shown * (on ? 1 : 0.42), transform: `translateX(${(1 - shown) * -30}px)` }}>
            <span
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 650,
                background: on ? BRAND : p.chip,
                color: on ? "#fff" : p.muted,
                boxShadow: on ? `0 0 0 ${6 * lit}px ${BRAND}33, 0 0 26px ${BRAND}88` : `inset 0 0 0 1px ${p.chromeEdge}`,
              }}
            >
              {i + 1}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 650, letterSpacing: "-0.02em", color: p.ink }}>{s.title}</span>
              <span style={{ fontSize: 23, lineHeight: 1.35, color: p.muted, maxWidth: 560 }}>{s.body}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff console tour: overview → review queue → controls → audit trail, with what each one is for.

const STAFF_PAGES = [
  { shot: "staff-overview", title: "Overview", body: "The live customer session, the KPIs and the outage-risk board across premises." },
  { shot: "staff-reviews", title: "Review queue", body: "Calls the system shouldn’t make alone wait for a person: approve, override or escalate, with a note." },
  { shot: "staff-controls", title: "Controls", body: "The model’s weights, seven human-review rules and the privacy filters, all in plain view." },
  { shot: "staff-audit", title: "Audit trail", body: "Every prediction, message and AI answer, with who acted and what was decided." },
];
const PAGE_T = 18;

export function StaffTour({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const L = typeof len === "number" ? len : 840;
  const pageLen = Math.floor((L + (STAFF_PAGES.length - 1) * PAGE_T) / STAFF_PAGES.length);
  const step = pageLen - PAGE_T;
  const starts = STAFF_PAGES.map((_, i) => (i === 0 ? 30 : i * step));
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  const drift = tween(f, [0, L], [0, 1], EASE_IN_OUT);
  // The review card lifts off while the review queue is on screen.
  const card = useEnter(step + 36, { damping: 15 });
  const cardOut = tween(f, [2 * step - 24, 2 * step - 4], [1, 0]);
  const fl = useFloat(2, 7);
  const w = text ? 1180 : 1480;
  const cx = text ? 1330 : 960;
  const screenH = (w * 2000) / 3200;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2600}>
        <Place
          cx={cx}
          cy={560}
          pose={{
            y: interpolate(enter, [0, 1], [300, 0]),
            z: interpolate(enter, [0, 1], [-800, 0]) + drift * 80,
            rx: interpolate(enter, [0, 1], [30, 7]),
            ry: (text ? -15 : -8) + drift * 8,
            o: enter,
          }}
        >
          <BrowserFrame theme={theme} width={w}>
            <AbsoluteFill style={{ height: screenH }}>
              <TransitionSeries>
                {STAFF_PAGES.map((pg, i) => (
                  <React.Fragment key={pg.shot}>
                    <TransitionSeries.Sequence durationInFrames={pageLen}>
                      <Img src={staticFile(capture(theme, pg.shot))} style={{ width: "100%", display: "block" }} />
                    </TransitionSeries.Sequence>
                    {i < STAFF_PAGES.length - 1 && (
                      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ durationInFrames: PAGE_T, config: { damping: 200 } })} />
                    )}
                  </React.Fragment>
                ))}
              </TransitionSeries>
            </AbsoluteFill>
          </BrowserFrame>
        </Place>
        <Place cx={cx + 200} cy={790} z={4} pose={{ x: fl.x, y: fl.y + (1 - card) * 160, z: interpolate(card, [0, 1], [-200, 300]), ry: -14, rx: 6, o: card * cardOut }}>
          <Card theme={theme} shot="card-review" width={520} />
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 96, width: 720 }}>
          <Caption theme={theme} kicker="AEP staff console" title="Every decision, accountable" sub="Every prediction, message and AI answer is logged, and a person signs off on anything the system shouldn’t decide alone." size={60} maxWidth={600} style={{ width: 620 }} />
          <Steps theme={theme} steps={STAFF_PAGES} starts={starts} style={{ marginTop: 44 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Audit tour, in two parts: the real audit trail and one entry up close, then the hash chain and a tamper.

const AUDIT_STEPS = [
  { title: "Every action is an entry", body: "Who acted, what was decided, the inputs and the model version." },
  { title: "Chained by hash", body: "Each entry stores the hash of the one before it." },
  { title: "Private by design", body: "Customer text is redacted before it’s stored. No names, addresses or coordinates." },
  { title: "Search, filter, export", body: "By category or severity, and out to CSV or JSON." },
];
const AUDIT_STARTS = [24, 150, 250, 330];
/** When the chain part takes over, and how long the two parts cross-fade. */
const CHAIN_AT = 400;
const CHAIN_X = 30;

function AuditPage({ theme, text }: { theme: ThemeName; text: boolean }) {
  const f = useCurrentFrame();
  const enter = useEnter(0, { damping: 22, stiffness: 60 });
  // The audit trail, then the same page with entry #30 open.
  const detail = tween(f, [120, 140], [0, 1]);
  const lift = useEnter(150, { damping: 16 });
  const fl = useFloat(1, 6);
  const w = text ? 1180 : 1400;
  const cx = text ? 1330 : 960;
  const screenH = (w * 2000) / 3200;
  // The entry drawer (CSS px of the 1600-wide page), lifted off as a card.
  const drawerW = 500;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Stage perspective={2600}>
        <Place cx={cx} cy={560} pose={{ y: interpolate(enter, [0, 1], [300, 0]), z: interpolate(enter, [0, 1], [-800, 0]) + tween(f, [0, CHAIN_AT], [0, 70]), rx: interpolate(enter, [0, 1], [30, 7]), ry: text ? -15 : -8, o: enter }}>
          <BrowserFrame theme={theme} width={w}>
            <AbsoluteFill style={{ height: screenH }}>
              <Img src={staticFile(capture(theme, "staff-audit"))} style={{ position: "absolute", width: "100%", display: "block" }} />
              <Img src={staticFile(capture(theme, "staff-detail"))} style={{ position: "absolute", width: "100%", display: "block", opacity: detail }} />
            </AbsoluteFill>
          </BrowserFrame>
        </Place>
        <Place cx={cx + (text ? 180 : 420)} cy={545} z={4} pose={{ x: fl.x + (1 - lift) * 140, y: fl.y, z: interpolate(lift, [0, 1], [-100, 320]), ry: -14, rx: 4, o: lift }}>
          <div style={{ position: "relative", width: drawerW, height: (drawerW * 720) / 480, borderRadius: 16, overflow: "hidden", boxShadow: PALETTE[theme].shadow }}>
            <Crop src={capture(theme, "staff-detail")} cssW={1600} rect={[1120, 0, 480, 720]} k={drawerW / 480} style={{ left: 0, top: 0 }} />
          </div>
        </Place>
      </Stage>
      {text && (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 96, width: 720 }}>
          <Caption theme={theme} kicker="Audit trail" title="Every entry, on the record" sub="An append-only log of every prediction, message, AI answer and staff decision." size={60} maxWidth={600} style={{ width: 620 }} />
          <Steps theme={theme} steps={AUDIT_STEPS} starts={AUDIT_STARTS} style={{ marginTop: 44 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export function AuditTour({ theme, text, len }: ClipProps) {
  const f = useCurrentFrame();
  const L = typeof len === "number" ? len : 810;
  const out = tween(f, [CHAIN_AT, CHAIN_AT + CHAIN_X], [1, 0]);
  return (
    <AbsoluteFill>
      {out > 0 && (
        <AbsoluteFill style={{ opacity: out }}>
          <AuditPage theme={theme} text={text} />
        </AbsoluteFill>
      )}
      <Sequence from={CHAIN_AT} durationInFrames={L - CHAIN_AT}>
        <AbsoluteFill style={{ opacity: 1 - out }}>
          <AuditChain
            theme={theme}
            text={text}
            tamperAt={230}
            title="Change one entry, the chain breaks"
            sub="Staff decisions are added as new entries, never edits. Any edit or deletion shows up at the exact entry it touched."
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// The cut. No `next` means a straight cut (the Hero morphs into the phone PhoneScroll opens on).

const T = 30;
const timing = springTiming({ durationInFrames: T, config: { damping: 200 } });
const HERO_FRAMES = 330;
type Section = { C: React.FC<ClipProps>; frames: number; props?: Record<string, unknown>; next?: () => ReturnType<typeof fade> };
const SECTIONS: Section[] = [
  { C: Hero, frames: HERO_FRAMES, props: { toPhone: true, morphAt: HERO_FRAMES - MORPH.length, names: true } },
  { C: PhoneScroll, frames: 360, props: { fromHero: true, backdropFrom: HERO_FRAMES }, next: () => wipe({ direction: "from-bottom-left" }) as never },
  { C: RiskCard, frames: 540, next: () => slide({ direction: "from-bottom" }) as never },
  { C: Restoration, frames: 570, next: () => flip({ direction: "from-right" }) as never },
  { C: StormTimeline, frames: 390, next: () => wipe({ direction: "from-right" }) as never },
  { C: Messages, frames: 330, next: () => slide({ direction: "from-left" }) as never },
  { C: Safety, frames: 420, next: () => slide({ direction: "from-right" }) as never },
  { C: StaffTour, frames: 840, next: () => fade() },
  { C: AuditTour, frames: 810, next: () => fade() },
  { C: Outro, frames: 390, props: { thanks: true } },
];
export const PRESENTATION_FRAMES = SECTIONS.reduce((a, s) => a + s.frames - (s.next ? T : 0), 0);

export function Presentation(props: ClipProps) {
  return (
    <TransitionSeries>
      {SECTIONS.map(({ C, frames, props: extra, next }, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={frames}>
            <C {...props} len={frames} {...extra} />
          </TransitionSeries.Sequence>
          {next && <TransitionSeries.Transition presentation={next()} timing={timing} />}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
}
