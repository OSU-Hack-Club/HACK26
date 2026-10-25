"use client";

// iPhone 16 chrome for the notification mockups: frame, status bar, Dynamic Island, wallpaper,
// Lock Screen and Home Screen. Sizes are iPhone 16 logical points (393 × 852).

import * as React from "react";
import {
  CalendarDaysIcon,
  CameraIcon,
  CloudSunIcon,
  CompassIcon,
  FlashlightIcon,
  ImageIcon,
  MailIcon,
  MapIcon,
  MessageCircleIcon,
  MusicIcon,
  NotebookPenIcon,
  PhoneIcon,
  SettingsIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AepIcon } from "@/components/mockups/ios-parts";
import { clock } from "@/components/mockups/mock-data";

export const IPHONE_16 = { w: 393, h: 852 } as const;
const BEZEL = 12;

/** iPhone 16 body. Renders the screen at 1× and scales the whole device with `scale`. */
export function Phone({
  children,
  scale = 1,
  landscape = false,
  className,
}: {
  children: React.ReactNode;
  scale?: number;
  landscape?: boolean;
  className?: string;
}) {
  const sw = landscape ? IPHONE_16.h : IPHONE_16.w;
  const sh = landscape ? IPHONE_16.w : IPHONE_16.h;
  const fw = sw + BEZEL * 2;
  const fh = sh + BEZEL * 2;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: fw * scale, height: fh * scale }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: fw, height: fh, transform: `scale(${scale})` }}>
        <SideButtons landscape={landscape} />
        <div className="absolute inset-0 rounded-[67px] bg-[linear-gradient(145deg,#5b5b62,#26262a_35%,#141416_65%,#46464c)] p-[2.5px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55),0_0_0_1px_rgb(0_0_0/0.4)]">
          <div className="size-full rounded-[64.5px] bg-black p-[9.5px]">
            <div className="relative isolate size-full overflow-hidden rounded-[55px] bg-black select-none" style={{ width: sw, height: sh }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideButtons({ landscape }: { landscape: boolean }) {
  // [side, offset from top, length]. Left: Action button, volume up, volume down. Right: side button, Camera Control.
  const buttons: ["l" | "r", number, number, boolean?][] = [
    ["l", 128, 34],
    ["l", 196, 62],
    ["l", 272, 62],
    ["r", 222, 98],
    ["r", 488, 62, true],
  ];
  return (
    <>
      {buttons.map(([side, at, len, flush], i) => {
        const style: React.CSSProperties = landscape
          ? { left: at, width: len, height: 4, ...(side === "l" ? { bottom: -3 } : { top: -3 }) }
          : { top: at, height: len, width: 4, ...(side === "l" ? { left: -3 } : { right: -3 }) };
        return (
          <span
            key={i}
            aria-hidden
            className={cn("absolute rounded-full", flush ? "bg-[linear-gradient(90deg,#222,#3a3a40,#222)]" : "bg-[linear-gradient(90deg,#3c3c42,#6a6a72,#3c3c42)]")}
            style={style}
          />
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Status bar
 * --------------------------------------------------------------------------------------------*/

export function StatusBar({
  time,
  battery = 82,
  wifi = true,
  ink = "light",
  className,
}: {
  time: string;
  battery?: number;
  wifi?: boolean;
  /** "light" = white glyphs over wallpaper, "auto" = follows the app's light/dark appearance. */
  ink?: "light" | "auto";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-40 flex h-[54px] items-center justify-between pr-[30px] pl-[50px] pt-1",
        ink === "light" ? "text-white" : "text-black dark:text-white",
        className,
      )}
    >
      <span className="w-[54px] text-center text-[17px] font-semibold tracking-[-0.02em]">{time}</span>
      <span className="flex items-center gap-[6px]">
        <SignalGlyph />
        {wifi ? <WifiGlyph /> : <span className="text-[13px] font-semibold tracking-tight">5G</span>}
        <BatteryGlyph level={battery} />
      </span>
    </div>
  );
}

function SignalGlyph() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden fill="currentColor">
      <rect x="0" y="8" width="3.2" height="4" rx="1" />
      <rect x="4.8" y="5.5" width="3.2" height="6.5" rx="1" />
      <rect x="9.6" y="3" width="3.2" height="9" rx="1" />
      <rect x="14.4" y="0" width="3.2" height="12" rx="1" />
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" aria-hidden fill="currentColor">
      <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5.1.1.4.1.5 0l1.2-1.2c.1-.1.1-.4 0-.5C14.4 1.1 11.5 0 8.5 0S2.6 1.1.5 3.1c-.1.1-.1.4 0 .5l1.2 1.2c.1.1.4.1.5 0C3.9 3.2 6.1 2.3 8.5 2.3Z" />
      <path d="M8.5 6c1.3 0 2.6.5 3.6 1.4.1.1.4.1.5 0l1.2-1.2c.1-.1.1-.4 0-.5A7.7 7.7 0 0 0 8.5 3.7c-2 0-3.9.7-5.3 2-.1.1-.1.4 0 .5l1.2 1.2c.1.1.4.1.5 0C5.9 6.5 7.2 6 8.5 6Z" />
      <path d="M11.1 9.1c.1-.1.1-.4 0-.5a3.8 3.8 0 0 0-5.2 0c-.1.1-.1.4 0 .5l2.3 2.3c.2.2.4.2.6 0l2.3-2.3Z" />
    </svg>
  );
}

function BatteryGlyph({ level }: { level: number }) {
  const low = level <= 20;
  return (
    <span className="relative flex h-[13px] w-[27px] items-center">
      <span className="absolute inset-y-0 left-0 w-[24.5px] rounded-[4.3px] border border-current opacity-40" />
      <span className="absolute top-[4.5px] right-0 h-[4px] w-[1.5px] rounded-r-full bg-current opacity-40" />
      <span className={cn("absolute top-[2px] left-[2px] h-[9px] rounded-[2.5px]", low ? "bg-[#ff3b30]" : "bg-current")} style={{ width: 20.5 * (level / 100) }} />
    </span>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Dynamic Island
 * --------------------------------------------------------------------------------------------*/

/** The idle pill, or a custom Live Activity shape passed as children. */
export function DynamicIsland({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "absolute top-[11px] left-1/2 z-50 h-[37px] w-[126px] -translate-x-1/2 overflow-hidden rounded-full bg-black text-white transition-all duration-500 ease-[cubic-bezier(.3,1.3,.5,1)]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function HomeIndicator({ dark = false }: { dark?: boolean }) {
  return <span aria-hidden className={cn("absolute bottom-2 left-1/2 z-40 h-[5px] w-[139px] -translate-x-1/2 rounded-full", dark ? "bg-black/85 dark:bg-white/90" : "bg-white/90")} />;
}

/* ----------------------------------------------------------------------------------------------
 * Wallpaper
 * --------------------------------------------------------------------------------------------*/

export function Wallpaper({ dim = 0, blur = false }: { dim?: number; blur?: boolean }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 -z-10", blur && "scale-110 blur-2xl")}>
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(120% 70% at 15% 10%, #7aa2f7 0%, transparent 60%), radial-gradient(90% 60% at 95% 35%, #c58bd9 0%, transparent 60%), radial-gradient(110% 70% at 30% 100%, #f2a97e 0%, transparent 65%), linear-gradient(180deg, #5d7fd0, #b17fc8 55%, #e79f86)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(110% 60% at 10% 0%, #1f3f8a 0%, transparent 60%), radial-gradient(90% 60% at 100% 45%, #4a1d6b 0%, transparent 60%), radial-gradient(120% 60% at 20% 100%, #6b2a3a 0%, transparent 65%), linear-gradient(180deg, #0a1430, #1a0d2e 55%, #12060f)",
        }}
      />
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Lock Screen
 * --------------------------------------------------------------------------------------------*/

export function LockScreen({
  at,
  battery,
  wifi = true,
  inline,
  widgets,
  island,
  children,
  notificationsClassName,
}: {
  /** Hours since Monday 00:00, for the clock and date. */
  at: number;
  battery?: number;
  wifi?: boolean;
  /** Inline widget that replaces part of the date line. */
  inline?: React.ReactNode;
  /** Accessory widgets under the clock. */
  widgets?: React.ReactNode;
  island?: React.ReactNode;
  /** Notifications and Live Activities, stacked from the bottom. */
  children?: React.ReactNode;
  notificationsClassName?: string;
}) {
  const c = clock(at);
  return (
    <div className="absolute inset-0 text-white">
      <Wallpaper />
      <StatusBar time="" battery={battery} wifi={wifi} />
      {island ?? <DynamicIsland />}
      <div className="absolute inset-x-0 top-[68px] flex flex-col items-center">
        <div className="flex h-6 items-center gap-1.5 text-[19px] font-semibold tracking-[-0.01em] text-white/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.15)]">
          {inline ? (
            <>
              <span>{c.short}</span>
              <span className="flex items-center gap-1">{inline}</span>
            </>
          ) : (
            c.date
          )}
        </div>
        <div className="mt-[-4px] text-[104px] leading-[1.02] font-bold tracking-[-0.045em] text-white/95 tabular-nums [text-shadow:0_2px_24px_rgb(0_0_0/0.18)]">{c.time}</div>
        {widgets && <div className="mt-2.5 flex items-center justify-center gap-3">{widgets}</div>}
      </div>
      <div className={cn("absolute inset-x-[9px] bottom-[112px] flex max-h-[450px] flex-col justify-end gap-2", notificationsClassName)}>{children}</div>
      <LockButton side="left" icon={FlashlightIcon} />
      <LockButton side="right" icon={CameraIcon} />
      <HomeIndicator />
    </div>
  );
}

function LockButton({ side, icon: I }: { side: "left" | "right"; icon: LucideIcon }) {
  return (
    <span className={cn("absolute bottom-[42px] grid size-[50px] place-items-center rounded-full bg-black/25 backdrop-blur-xl", side === "left" ? "left-[46px]" : "right-[46px]")}>
      <I size={21} strokeWidth={2} aria-hidden />
    </span>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Home Screen
 * --------------------------------------------------------------------------------------------*/

const APPS: { name: string; icon: LucideIcon; bg: string; fg?: string }[] = [
  { name: "Calendar", icon: CalendarDaysIcon, bg: "#ffffff", fg: "#ff3b30" },
  { name: "Photos", icon: ImageIcon, bg: "linear-gradient(135deg,#ffd60a,#ff9f0a 35%,#ff375f 65%,#5e5ce6)" },
  { name: "Mail", icon: MailIcon, bg: "linear-gradient(180deg,#4fb3ff,#0a84ff)" },
  { name: "Weather", icon: CloudSunIcon, bg: "linear-gradient(180deg,#4aa6ff,#1d63d6)" },
  { name: "Maps", icon: MapIcon, bg: "linear-gradient(135deg,#6fdc8c,#3fb9f5)" },
  { name: "Clock", icon: TimerIcon, bg: "#111111" },
  { name: "Notes", icon: NotebookPenIcon, bg: "linear-gradient(180deg,#ffe066,#ffd60a)", fg: "#6b5300" },
  { name: "Settings", icon: SettingsIcon, bg: "linear-gradient(180deg,#a1a1a6,#6e6e73)" },
];

const DOCK: { name: string; icon: LucideIcon; bg: string }[] = [
  { name: "Phone", icon: PhoneIcon, bg: "linear-gradient(180deg,#5af575,#21c046)" },
  { name: "Safari", icon: CompassIcon, bg: "linear-gradient(180deg,#5ac8fa,#0a7aff)" },
  { name: "Messages", icon: MessageCircleIcon, bg: "linear-gradient(180deg,#5af575,#21c046)" },
  { name: "Music", icon: MusicIcon, bg: "linear-gradient(180deg,#fd5c74,#fa233b)" },
];

export function AppIcon({ name, icon: I, bg, fg = "#fff", label = true, badge }: { name: string; icon: LucideIcon; bg: string; fg?: string; label?: boolean; badge?: number }) {
  return (
    <span className="flex w-[62px] flex-col items-center gap-[5px]">
      <span className="relative grid size-[62px] place-items-center rounded-[14px] shadow-[0_1px_2px_rgb(0_0_0/0.12)]" style={{ background: bg, color: fg }}>
        <I size={30} strokeWidth={1.9} aria-hidden />
        {badge ? <Badge n={badge} /> : null}
      </span>
      {label && <span className="max-w-[74px] truncate text-[12px] font-medium tracking-[-0.01em] text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.3)]">{name}</span>}
    </span>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="absolute -top-1.5 -right-1.5 grid h-[24px] min-w-[24px] place-items-center rounded-full bg-[#ff3b30] px-1.5 text-[14px] font-medium text-white">{n}</span>;
}

/** The AEP Outage app on the Home Screen. */
export function AepAppIcon({ badge }: { badge?: number }) {
  return (
    <span className="flex w-[62px] flex-col items-center gap-[5px]">
      <span className="relative">
        <AepIcon size={62} />
        {badge ? <Badge n={badge} /> : null}
      </span>
      <span className="text-[12px] font-medium tracking-[-0.01em] whitespace-nowrap text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.3)]">AEP Outage</span>
    </span>
  );
}

export function HomeScreen({
  time,
  battery,
  wifi = true,
  badge,
  island,
  top,
  children,
  appsFrom = 0,
}: {
  time: string;
  battery?: number;
  wifi?: boolean;
  badge?: number;
  island?: React.ReactNode;
  /** Overlay above the Home Screen (banners). */
  top?: React.ReactNode;
  /** Widgets and icons. Defaults to a row of apps with the AEP app. */
  children?: React.ReactNode;
  appsFrom?: number;
}) {
  return (
    <div className="absolute inset-0 text-white">
      <Wallpaper />
      <StatusBar time={time} battery={battery} wifi={wifi} />
      {island ?? <DynamicIsland />}
      {top}
      <div className="absolute inset-x-0 top-[66px] flex flex-col gap-[26px] px-[27px]">
        {children ?? (
          <div className="grid grid-cols-4 gap-x-[30px] gap-y-[22px]">
            <AepAppIcon badge={badge} />
            {APPS.slice(appsFrom, appsFrom + 7).map((a) => (
              <AppIcon key={a.name} {...a} />
            ))}
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-[118px] flex justify-center gap-[7px]" aria-hidden>
        <span className="size-[7px] rounded-full bg-white" />
        <span className="size-[7px] rounded-full bg-white/40" />
      </div>
      <div className="absolute inset-x-[12px] bottom-[12px] flex h-[94px] items-center justify-between rounded-[38px] bg-white/25 px-[17px] backdrop-blur-2xl dark:bg-white/15">
        {DOCK.map((a) => (
          <AppIcon key={a.name} {...a} label={false} />
        ))}
      </div>
      <HomeIndicator />
    </div>
  );
}

/** A row of four app icons for Home Screen layouts. `withAep` puts the AEP app first. */
export function AppRow({ from = 0, count = 4, withAep = false, badge }: { from?: number; count?: number; withAep?: boolean; badge?: number }) {
  const apps = APPS.slice(from, from + count - (withAep ? 1 : 0));
  return (
    <div className="grid grid-cols-4 gap-x-[30px]">
      {withAep && <AepAppIcon badge={badge} />}
      {apps.map((a) => (
        <AppIcon key={a.name} {...a} />
      ))}
    </div>
  );
}

/** 2 × 2 block of app icons, sized to sit beside a small widget. */
export function AppGrid2({ from = 0, withAep = false, badge }: { from?: number; withAep?: boolean; badge?: number }) {
  const apps = APPS.slice(from, from + (withAep ? 3 : 4));
  return (
    <div className="grid grid-cols-2 gap-x-[30px] gap-y-[14px]">
      {withAep && <AepAppIcon badge={badge} />}
      {apps.map((a) => (
        <AppIcon key={a.name} {...a} />
      ))}
    </div>
  );
}
