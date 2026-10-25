"use client";

// /mockups: iPhone 16 mockups of the notifications, Live Activities and widgets an AEP Outage iOS app
// would show. Design reference only; the product is the web app.

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeftIcon, MoonIcon, PauseIcon, PlayIcon, SendIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Icon, TouchSwitch } from "@/components/concierge/primitives";
import { ORDER, SC, TONE, fmt, restoredAt, type Scenario } from "@/lib/concierge/model";
import type { Notice } from "@/lib/concierge/notifications";
import { AppGrid2, AppRow, DynamicIsland, HomeIndicator, HomeScreen, IPHONE_16, LockScreen, Phone, StatusBar, Wallpaper } from "@/components/mockups/iphone";
import {
  AccessoryCircular,
  AccessoryRect,
  ClearButton,
  ExpandedNotification,
  IslandCompact,
  IslandExpanded,
  IslandMinimal,
  LargeWidget,
  LiveActivity,
  MediumWidget,
  MessagesIcon,
  MessagesThread,
  NoticeCard,
  NotificationCard,
  ScheduledSummary,
  SmallWidget,
  accessoryInline,
  type Sms,
} from "@/components/mockups/ios-parts";
import { LEVEL_INFO, STAGE, catalog, clock, levelOf, mockData, type Level, type MockData } from "@/components/mockups/mock-data";

const LEVELS: Level[] = ["critical", "time-sensitive", "active", "passive"];
const SEQUENCE_MS = 3600;
const BANNER_MS = 6000;

const ISLAND_COMPACT: React.CSSProperties = { width: 250 };
const ISLAND_EXPANDED: React.CSSProperties = { width: 371, height: 168, borderRadius: 46, top: 9 };

export function NotificationMockups() {
  const [scenario, setScenario] = React.useState<Scenario>("outage");
  const [medical, setMedical] = React.useState(false);
  const d = React.useMemo(() => mockData(scenario, medical), [scenario, medical]);
  const all = React.useMemo(() => catalog(medical), [medical]);
  const byId = React.useMemo(() => Object.fromEntries(all.map((n) => [n.id, n])), [all]);

  return (
    <main className="min-h-dvh bg-page text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon size={15} aria-hidden />
            App
          </Link>
          <div className="mr-auto">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">iOS Notification & Widget Mockups</h1>
            <p className="text-xs text-muted-foreground">iPhone 16 · design reference for the AEP Outage app</p>
          </div>
          <ScenarioPicker value={scenario} onChange={setScenario} />
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
            <TouchSwitch checked={medical} onCheckedChange={setMedical} />
            Medical Need
          </label>
          <AppearanceToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-14 px-5 py-8">
        <Hero d={d} all={all} onScenario={setScenario} />

        <Section title="Notifications" note="Real copy from the concierge inbox. The interruption level decides how loudly iOS delivers each one.">
          <Shot title="Lock Screen Stack" note="Latest alerts on top. Older ones group under them.">
            <LockStack d={d} />
          </Shot>
          <Shot title="Banner on Home Screen" note="Drops in from the Dynamic Island while the phone is in use.">
            <Phone scale={SCALE}>
              <HomeScreen time={clock(d.now).time} battery={d.battery} wifi={!d.out} badge={unread(d)} top={<Banner n={d.feed[0]} d={d} />} />
            </Phone>
          </Shot>
          <Shot title="Time Sensitive" note={LEVEL_INFO["time-sensitive"].d}>
            <SingleOnLock n={byId["outage-confirmed"]} d={d} />
          </Shot>
          <Shot title="Critical Alert" note={LEVEL_INFO.critical.d}>
            <SingleOnLock n={byId["downed-wires"]} d={d} extra={medical ? byId.escalation : undefined} />
          </Shot>
          <Shot title="Long-Press Actions" note="Rich preview with the live estimate and quick actions. No need to open the app.">
            <Expanded d={d} n={latestStorm(d) ?? d.feed[0] ?? byId["watch-issued"]} />
          </Shot>
          <Shot title="Scheduled Summary" note={LEVEL_INFO.passive.d}>
            <Summary d={d} all={all} />
          </Shot>
          <Shot title="Text Message (SMS)" note="Same alerts on the SMS channel, for customers without the app.">
            <SmsOnLock d={d} all={all} />
          </Shot>
          <Shot title="Messages Thread" note="The full SMS history for this storm. Reply OUT if power is still off after restoration.">
            <Phone scale={SCALE}>
              <StatusBar time={clock(d.now).time} battery={d.battery} wifi={!d.out} ink="auto" />
              <DynamicIsland />
              <MessagesThread messages={smsThread(d, all)} />
              <HomeIndicator dark />
            </Phone>
          </Shot>
          <Shot title="Notification Center" note="Everything sent so far, newest first.">
            <NotificationCenter d={d} />
          </Shot>
        </Section>

        <Section title="Live Activity & Dynamic Island" note="Starts when an outage is confirmed and tracks restoration until power is back. Outside an outage these show the Power Outage stage as a preview.">
          <Shot title="Lock Screen Live Activity" note="Back-by time, the likely window and restoration progress.">
            <LiveOnLock d={liveData(d, medical)} />
          </Shot>
          <Shot title="Dynamic Island · Expanded" note="Long-press the island while using another app.">
            <Phone scale={SCALE}>
              <HomeScreen
                time={clock(liveData(d, medical).now).time}
                battery={d.battery}
                wifi={false}
                island={
                  <DynamicIsland style={ISLAND_EXPANDED} className="shadow-[0_10px_40px_rgb(0_0_0/0.4)]">
                    <IslandExpanded d={liveData(d, medical)} />
                  </DynamicIsland>
                }
              />
            </Phone>
          </Shot>
          <Shot title="Dynamic Island · Compact & Minimal" note="Compact when it’s the only activity. Minimal when another app shares the island.">
            <IslandStates d={liveData(d, medical)} />
          </Shot>
        </Section>

        <Section title="Widgets" note="Home Screen widgets in all three sizes, Lock Screen accessories, and StandBy while charging.">
          <Shot title="Small & Medium" note="Status at a glance, with the back-by time or outage chance.">
            <Phone scale={SCALE}>
              <HomeScreen time={clock(d.now).time} battery={d.battery} wifi={!d.out}>
                <MediumWidget d={d} />
                <div className="flex items-start justify-between">
                  <SmallWidget d={d} />
                  <AppGrid2 from={0} withAep badge={unread(d)} />
                </div>
                <AppRow from={3} />
              </HomeScreen>
            </Phone>
          </Shot>
          <Shot title="Large" note="Status, estimate, progress and the storm timeline.">
            <Phone scale={SCALE}>
              <HomeScreen time={clock(d.now).time} battery={d.battery} wifi={!d.out}>
                <LargeWidget d={d} />
                <AppRow from={2} withAep badge={unread(d)} />
              </HomeScreen>
            </Phone>
          </Shot>
          <Shot title="Lock Screen Widgets" note="Inline above the clock, plus circular and rectangular accessories.">
            <Phone scale={SCALE}>
              <LockScreen
                at={d.now}
                battery={d.battery}
                wifi={!d.out}
                inline={accessoryInline(d)}
                widgets={
                  <>
                    <AccessoryCircular d={d} />
                    <AccessoryRect d={d} />
                  </>
                }
              />
            </Phone>
          </Shot>
          <Shot title="StandBy" note="Landscape on a charger. Large, glanceable, always dark." wide>
            <StandBy d={d} />
          </Shot>
        </Section>

        <Section title="Widget States" note="Every status side by side, for design review.">
          <WidgetMatrix medical={medical} />
        </Section>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Hero: push any notification to a live phone
 * --------------------------------------------------------------------------------------------*/

function Hero({ d, all, onScenario }: { d: MockData; all: Notice[]; onScenario: (s: Scenario) => void }) {
  const [surface, setSurface] = React.useState<"lock" | "home">("lock");
  const [pushed, setPushed] = React.useState<{ n: Notice; key: number } | null>(null);
  const [bannerOn, setBannerOn] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const seq = React.useMemo(() => all.filter((n) => STAGE[n.id]), [all]);
  const seqAt = React.useRef(0);

  const push = React.useCallback(
    (n: Notice) => {
      if (STAGE[n.id]) onScenario(ORDER[STAGE[n.id]]);
      setPushed({ n, key: Date.now() });
      setBannerOn(true);
    },
    [onScenario],
  );

  React.useEffect(() => {
    if (!bannerOn || surface !== "home" || playing) return;
    const t = window.setTimeout(() => setBannerOn(false), BANNER_MS);
    return () => window.clearTimeout(t);
  }, [bannerOn, surface, playing, pushed]);

  React.useEffect(() => {
    if (!playing) return;
    const step = () => {
      push(seq[seqAt.current % seq.length]);
      seqAt.current++;
      if (seqAt.current >= seq.length) {
        seqAt.current = 0;
        setPlaying(false);
      }
    };
    step();
    const t = window.setInterval(step, SEQUENCE_MS);
    return () => window.clearInterval(t);
  }, [playing, push, seq]);

  const n = pushed?.n;
  const level = n ? levelOf(n) : "active";
  const now = n ? Math.max(d.now, n.h + 1 / 120) : d.now;
  const live = d.out ? d : null;
  // Lock Screen: the pushed notice on top, then the latest others grouped beneath it.
  const rest = d.feed.filter((x) => x.id !== n?.id && !x.defaultRead);

  return (
    <section className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <Phone scale={0.82}>
          {surface === "lock" ? (
            <LockScreen at={now} battery={d.battery} wifi={!d.out} widgets={!n && !live ? <AccessoryRect d={d} /> : undefined}>
              {live && !n && <LiveActivity d={live} />}
              {n && <NoticeCard key={pushed!.key} n={n} now={now} level={level} className="animate-in duration-500 fade-in zoom-in-95 slide-in-from-bottom-6" />}
              {rest.length > 0 && <NoticeCard n={rest[0]} now={now} level={levelOf(rest[0])} stack={rest.length - 1} lines={2} />}
            </LockScreen>
          ) : (
            <HomeScreen
              time={clock(now).time}
              battery={d.battery}
              wifi={!d.out}
              badge={unread(d)}
              island={
                live ? (
                  <DynamicIsland style={ISLAND_COMPACT}>
                    <IslandCompact d={live} />
                  </DynamicIsland>
                ) : undefined
              }
              top={
                n && bannerOn ? (
                  <div key={pushed!.key} className="absolute inset-x-[9px] top-[54px] z-50 animate-in duration-500 ease-[cubic-bezier(.2,1.25,.4,1)] fade-in slide-in-from-top-12 zoom-in-90">
                    <NoticeCard n={n} now={now} level={level} banner />
                  </div>
                ) : null
              }
            >
              <MediumWidget d={d} />
              <div className="flex items-start justify-between">
                <SmallWidget d={d} />
                <AppGrid2 from={0} withAep badge={unread(d)} />
              </div>
              <AppRow from={3} />
            </HomeScreen>
          )}
        </Phone>
        <Segmented
          value={surface}
          onChange={setSurface}
          options={[
            { value: "lock", label: "Lock Screen" },
            { value: "home", label: "Home Screen" },
          ]}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">Send a Notification</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            Tap any message the app sends over a storm to push it to the phone. The status, widgets and Live Activity follow the storm stage that sends it. Play runs the whole storm in order.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {playing ? <PauseIcon size={15} aria-hidden /> : <PlayIcon size={15} aria-hidden />}
            {playing ? "Pause Storm" : "Play Storm Sequence"}
          </button>
          {pushed && (
            <button type="button" onClick={() => setPushed(null)} className="h-9 cursor-pointer rounded-full border bg-background px-4 text-[13px] font-medium hover:bg-muted">
              Clear Phone
            </button>
          )}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {LEVELS.map((lv) => {
            const items = all.filter((x) => levelOf(x) === lv);
            if (!items.length) return null;
            return (
              <div key={lv} className="flex flex-col rounded-[14px] bg-card ring-1 ring-foreground/10">
                <div className="border-b px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <LevelDot level={lv} />
                    {LEVEL_INFO[lv].label}
                    <span className="font-normal text-muted-foreground">· {items.length}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{LEVEL_INFO[lv].d}</p>
                </div>
                <ul className="flex flex-col p-1.5">
                  {items.map((x) => (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaying(false);
                          push(x);
                        }}
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-muted",
                          pushed?.n.id === x.id && "bg-muted",
                        )}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: x.tone === "muted" ? "var(--muted)" : TONE[x.tone].bg, color: x.tone === "muted" ? "var(--muted-foreground)" : TONE[x.tone].ink }}>
                          <Icon name={x.icon} size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{x.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {x.t} · {STAGE[x.id] ? SC[ORDER[STAGE[x.id]]].label : "Any Time"}
                          </span>
                        </span>
                        <SendIcon size={14} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LevelDot({ level }: { level: Level }) {
  const c = { critical: "#ff3b30", "time-sensitive": "var(--mid)", active: "var(--brand)", passive: "var(--muted-foreground)" }[level];
  return <span className="size-2 rounded-full" style={{ background: c }} />;
}

/* ----------------------------------------------------------------------------------------------
 * Gallery shots
 * --------------------------------------------------------------------------------------------*/

const SCALE = 0.6;

const unread = (d: MockData) => d.feed.filter((n) => !n.defaultRead).length;
const latestStorm = (d: MockData) => d.feed.find((n) => STAGE[n.id]);
/** Live Activity data: the current status during an outage, else the Power Outage stage as a preview. */
const liveData = (d: MockData, medical: boolean) => (d.out || d.sc === "restored" ? d : mockData("outage", medical));

function Banner({ n, d }: { n?: Notice; d: MockData }) {
  if (!n) return null;
  return (
    <div className="absolute inset-x-[9px] top-[54px] z-50">
      <NoticeCard n={n} now={d.now} level={levelOf(n)} banner />
    </div>
  );
}

function LockStack({ d }: { d: MockData }) {
  const unreadItems = d.feed.filter((n) => !n.defaultRead);
  const list = unreadItems.length ? unreadItems : d.feed.slice(0, 1);
  const [a, b, ...more] = list;
  return (
    <Phone scale={SCALE}>
      <LockScreen at={d.now} battery={d.battery} wifi={!d.out}>
        {a && <NoticeCard n={a} now={d.now} level={levelOf(a)} />}
        {b && <NoticeCard n={b} now={d.now} level={levelOf(b)} stack={more.length} lines={2} />}
      </LockScreen>
    </Phone>
  );
}

function SingleOnLock({ n, d, extra }: { n?: Notice; d: MockData; extra?: Notice }) {
  if (!n) return null;
  const at = Math.max(n.h, extra?.h ?? -Infinity) + 2 / 60;
  return (
    <Phone scale={SCALE}>
      <LockScreen at={at} battery={d.battery} wifi={false}>
        {extra && <NoticeCard n={extra} now={at} level={levelOf(extra)} />}
        <NoticeCard n={n} now={at} level={levelOf(n)} />
      </LockScreen>
    </Phone>
  );
}

function Expanded({ d, n }: { d: MockData; n?: Notice }) {
  if (!n) return null;
  return (
    <Phone scale={SCALE}>
      <Wallpaper blur dim={0.25} />
      <StatusBar time={clock(d.now).time} battery={d.battery} wifi={!d.out} />
      <DynamicIsland />
      <div className="absolute inset-x-[12px] top-[96px]">
        <ExpandedNotification n={n} d={d} level={levelOf(n)} />
      </div>
      <HomeIndicator />
    </Phone>
  );
}

function Summary({ d, all }: { d: MockData; all: Notice[] }) {
  const items = all
    .filter((n) => levelOf(n) === "passive")
    .sort((a, b) => b.h - a.h);
  const at = 18;
  return (
    <Phone scale={SCALE}>
      <LockScreen at={at} battery={d.battery} notificationsClassName="max-h-none">
        <ScheduledSummary items={items} now={at} date={clock(at).date} />
      </LockScreen>
    </Phone>
  );
}

const SMS_IDS = ["pre-storm", "outage-confirmed", "estimate-updated", "power-restored"];

function smsThread(d: MockData, all: Notice[]): Sms[] {
  const prefs = all.find((n) => n.id === "prefs-saved");
  const out: Sms[] = [{ t: prefs?.t ?? "Sat. 11:20 AM", text: `AEP: You’re signed up for outage texts for ${d.area}. Reply HELP for help, STOP to opt out.` }];
  d.previews.forEach((p, i) => {
    if (p.status !== "Sent" && p.status !== "Latest") return;
    const n = all.find((x) => x.id === SMS_IDS[i]);
    const t = i === 2 ? fmt(d.m.nowH, true) : i === 3 ? restoredAt(d.m) : (n?.t ?? "");
    out.push({ t, text: p.text });
  });
  return out;
}

function SmsOnLock({ d, all }: { d: MockData; all: Notice[] }) {
  const thread = smsThread(d, all);
  const last = thread[thread.length - 1];
  return (
    <Phone scale={SCALE}>
      <LockScreen at={d.now} battery={d.battery} wifi={!d.out}>
        <NotificationCard title="AEP Alerts" body={last.text} time="now" icon={<MessagesIcon />} lines={5} level={d.sc === "outage" ? "time-sensitive" : "active"} />
      </LockScreen>
    </Phone>
  );
}

function NotificationCenter({ d }: { d: MockData }) {
  const c = clock(d.now);
  const groups = d.feed.reduce<{ day: string; items: Notice[] }[]>((acc, n) => {
    const g = acc.find((x) => x.day === n.day);
    if (g) g.items.push(n);
    else acc.push({ day: n.day, items: [n] });
    return acc;
  }, []);
  return (
    <Phone scale={SCALE}>
      <Wallpaper blur dim={0.3} />
      <StatusBar time={c.time} battery={d.battery} wifi={!d.out} />
      <DynamicIsland />
      <div className="absolute inset-x-0 top-[58px] bottom-0 flex flex-col overflow-hidden px-[9px] text-white [mask-image:linear-gradient(180deg,#000_85%,transparent)]">
        <p className="text-center text-[15px] font-semibold text-white/80">{c.date}</p>
        <div className="mt-4 mb-2 flex items-center justify-between px-2">
          <span className="text-[22px] font-bold tracking-[-0.025em]">Notification Center</span>
          <ClearButton />
        </div>
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <React.Fragment key={g.day}>
              <p className="mt-2 px-2 text-[13px] font-semibold tracking-wide text-white/70 uppercase">{g.day}</p>
              {g.items.map((n) => (
                <NoticeCard key={n.id} n={n} now={d.now} level={levelOf(n)} lines={2} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      <HomeIndicator />
    </Phone>
  );
}

function LiveOnLock({ d }: { d: MockData }) {
  return (
    <Phone scale={SCALE}>
      <LockScreen at={d.now} battery={d.battery} wifi={false} inline={accessoryInline(d)}>
        <LiveActivity d={d} />
      </LockScreen>
    </Phone>
  );
}

function IslandStates({ d }: { d: MockData }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[28px] bg-[linear-gradient(180deg,#5d7fd0,#b17fc8)] px-4 py-8 dark:bg-[linear-gradient(180deg,#0a1430,#1a0d2e)]" style={{ width: (IPHONE_16.w + 24) * SCALE + 30 }}>
      <IslandSample label="Compact">
        <div className="h-[37px] w-[250px] overflow-hidden rounded-full bg-black text-white">
          <IslandCompact d={d} />
        </div>
      </IslandSample>
      <IslandSample label="Minimal, beside another activity">
        <div className="flex items-center gap-2">
          <div className="grid h-[37px] w-[160px] place-items-center rounded-full bg-black text-[13px] font-semibold text-[#ff9f0a]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#ff9f0a]" />
              12:48 timer
            </span>
          </div>
          <div className="size-[37px] overflow-hidden rounded-full bg-black">
            <IslandMinimal d={d} />
          </div>
        </div>
      </IslandSample>
      <IslandSample label="Idle">
        <div className="h-[37px] w-[126px] rounded-full bg-black" />
      </IslandSample>
    </div>
  );
}

function IslandSample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-xs font-medium text-white/80">{label}</span>
    </div>
  );
}

function StandBy({ d }: { d: MockData }) {
  const c = clock(d.now);
  return (
    <Phone scale={SCALE} landscape>
      <div className="dark absolute inset-0 flex items-center justify-center gap-6 bg-black px-10">
        <div className="flex h-[332px] w-[332px] flex-col items-center justify-center rounded-[44px] bg-[#111]">
          <span className="text-[120px] leading-none font-bold tracking-[-0.05em] text-white tabular-nums">{c.time}</span>
          <span className="mt-2 text-[22px] font-semibold text-white/55">{c.date.split(",")[0]}</span>
        </div>
        <div className="origin-center" style={{ width: 332, height: 332 }}>
          <div className="origin-top-left" style={{ transform: `scale(${332 / 158})` }}>
            <SmallWidget d={d} />
          </div>
        </div>
      </div>
      <span aria-hidden className="absolute top-1/2 left-[11px] h-[126px] w-[37px] -translate-y-1/2 rounded-full bg-black ring-1 ring-white/5" />
    </Phone>
  );
}

function WidgetMatrix({ medical }: { medical: boolean }) {
  const rows = React.useMemo(() => ORDER.map((s) => mockData(s, medical)), [medical]);
  return (
    <div className="col-span-full flex flex-col gap-4">
      {rows.map((d) => (
        <div key={d.sc} className="relative isolate overflow-hidden rounded-[24px] p-5">
          <Wallpaper />
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white">
            <span className="size-2 rounded-full" style={{ background: d.tone.c }} />
            {d.pill}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <SmallWidget d={d} />
            <MediumWidget d={d} />
            <div className="flex flex-col items-start gap-3">
              <span className="flex items-center gap-1.5 text-[16px] font-semibold text-white">{accessoryInline(d)}</span>
              <div className="flex items-center gap-3">
                <AccessoryCircular d={d} />
                <AccessoryRect d={d} />
              </div>
            </div>
            <div className="h-[37px] w-[250px] overflow-hidden rounded-full bg-black text-white">
              <IslandCompact d={d} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Layout + controls
 * --------------------------------------------------------------------------------------------*/

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-[-0.02em] whitespace-nowrap">{title}</h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{note}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-6 gap-y-10">{children}</div>
    </section>
  );
}

function Shot({ title, note, wide = false, children }: { title: string; note: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <figure className={cn("flex flex-col items-center gap-3", wide && "col-span-full sm:col-span-2")}>
      {children}
      <figcaption className="max-w-[300px] text-center">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{note}</p>
      </figcaption>
    </figure>
  );
}

function ScenarioPicker({ value, onChange }: { value: Scenario; onChange: (s: Scenario) => void }) {
  return (
    <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
      {ORDER.map((s) => {
        const on = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={cn("flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors", on ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <span className="size-[7px] rounded-full" style={{ background: TONE[SC[s].tone].c }} />
            {SC[s].label}
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("h-7 cursor-pointer rounded-full px-3.5 text-xs font-medium transition-colors", o.value === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const noop = () => () => {};

function AppearanceToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // False during SSR and hydration, so the label matches the server render.
  const mounted = React.useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-medium hover:bg-muted"
    >
      {dark ? <SunIcon size={14} aria-hidden /> : <MoonIcon size={14} aria-hidden />}
      {dark ? "Light" : "Dark"}
    </button>
  );
}
