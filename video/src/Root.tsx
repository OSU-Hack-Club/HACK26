import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { HERO_TO_PHONE_FRAMES, Hero, Messages, PhoneScroll, PhoneTrio, Restoration, RiskCard, Safety, StormTimeline, TIMELINE_FRAMES } from "./clips/customer";
import { AuditChain, Outro, StaffConsole, StaffMobile, ThemeSwitch } from "./clips/staff";
import { PRESENTATION_FRAMES, Presentation } from "./clips/presentation";
import { tween, type ClipProps } from "./theme";

const FPS = 30;

/** Every clip, with its standalone length. */
export const CLIPS: { id: string; component: React.FC<ClipProps>; frames: number }[] = [
  { id: "Hero", component: Hero, frames: 210 },
  { id: "PhoneScroll", component: PhoneScroll, frames: 180 },
  { id: "PhoneTrio", component: PhoneTrio, frames: 180 },
  { id: "StormTimeline", component: StormTimeline, frames: TIMELINE_FRAMES },
  { id: "RiskCard", component: RiskCard, frames: 180 },
  { id: "Restoration", component: Restoration, frames: 240 },
  { id: "Messages", component: Messages, frames: 180 },
  { id: "Safety", component: Safety, frames: 180 },
  { id: "StaffConsole", component: StaffConsole, frames: 240 },
  { id: "AuditChain", component: AuditChain, frames: 210 },
  { id: "StaffMobile", component: StaffMobile, frames: 180 },
  { id: "ThemeSwitch", component: ThemeSwitch, frames: 180 },
  { id: "Outro", component: Outro, frames: 120 },
];

/** Standalone clips fade in and out at their edges so they cut cleanly in an editor. */
function faded(C: React.FC<ClipProps>): React.FC<ClipProps> {
  return function Faded(props) {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const o = Math.min(tween(frame, [0, 8], [0, 1]), tween(frame, [durationInFrames - 10, durationInFrames], [1, 0]));
    return (
      <AbsoluteFill style={{ background: props.theme === "dark" ? "#04060b" : "#f7f9fd" }}>
        <AbsoluteFill style={{ opacity: o }}>
          <C {...props} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };
}

// Montage: a ready-cut sizzle of the strongest clips.
const T = 18;
const timing = springTiming({ durationInFrames: T, config: { damping: 200 } });
// No `next` means a straight cut: the Hero morphs into the phone PhoneScroll opens on, so it needs no transition.
const MONTAGE: { C: React.FC<ClipProps>; frames: number; props?: Record<string, unknown>; next?: () => ReturnType<typeof fade> }[] = [
  { C: Hero, frames: HERO_TO_PHONE_FRAMES, props: { toPhone: true } },
  { C: PhoneScroll, frames: 150, props: { fromHero: true }, next: () => wipe({ direction: "from-bottom-left" }) as never },
  { C: RiskCard, frames: 120, next: () => slide({ direction: "from-bottom" }) as never },
  { C: Restoration, frames: 210, next: () => flip({ direction: "from-right" }) as never },
  { C: StormTimeline, frames: TIMELINE_FRAMES, next: () => wipe({ direction: "from-right" }) as never },
  { C: Safety, frames: 150, next: () => slide({ direction: "from-left" }) as never },
  { C: StaffConsole, frames: 240, next: () => fade() },
  { C: AuditChain, frames: 200, next: () => fade() },
  { C: Outro, frames: 120 },
];
const MONTAGE_FRAMES = MONTAGE.reduce((a, m) => a + m.frames - (m.next ? T : 0), 0);

function Montage(props: ClipProps) {
  return (
    <TransitionSeries>
      {MONTAGE.map(({ C, frames, props: extra, next }, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={frames}>
            <C {...props} {...extra} />
          </TransitionSeries.Sequence>
          {next && <TransitionSeries.Transition presentation={next()} timing={timing} />}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
}

const VARIANTS = [
  { theme: "light", text: true, suffix: "light-text" },
  { theme: "light", text: false, suffix: "light-clean" },
  { theme: "dark", text: true, suffix: "dark-text" },
  { theme: "dark", text: false, suffix: "dark-clean" },
] as const;

export function Root() {
  return (
    <>
      {[...CLIPS, { id: "Montage", component: Montage, frames: MONTAGE_FRAMES }, { id: "Presentation", component: Presentation, frames: PRESENTATION_FRAMES }].map(({ id, component, frames }) => {
        const Faded = faded(component);
        return VARIANTS.map((v) => (
          <Composition key={`${id}-${v.suffix}`} id={`${id}-${v.suffix}`} component={Faded} durationInFrames={frames} fps={FPS} width={1920} height={1080} defaultProps={{ theme: v.theme, text: v.text }} />
        ));
      })}
    </>
  );
}
