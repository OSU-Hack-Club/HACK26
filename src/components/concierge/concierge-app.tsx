"use client";

import * as React from "react";
import Image from "next/image";
import { MoonIcon, SettingsIcon, SparklesIcon, ArrowUpIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { statusLabel } from "@/lib/concierge/model";
import { DEBUG_MENU, DebugMenu } from "@/components/concierge/debug-menu";
import { ChatComposer, ChatHeader, ChatThread, QuickAskChips } from "@/components/concierge/chat";
import { DashboardSections, EventCard, EventMapHero, FallbackCard, useMapTheme } from "@/components/concierge/home";
import { OutageMap } from "@/components/concierge/outage-map";
import { StatusPill } from "@/components/concierge/primitives";
import { LocationScreen, NotificationsScreen, SettingsScreen } from "@/components/concierge/settings";
import { StatusBody, StatusHeader } from "@/components/concierge/status";
import { ConciergeProvider, useConcierge, useMediaQuery } from "@/components/concierge/store";

const DESKTOP = "(min-width: 1024px)";
const WIDE = "(min-width: 1536px)";

export function ConciergeApp() {
  return (
    <ConciergeProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        {DEBUG_MENU && <DebugMenu />}
        <MobileShell />
        <DesktopShell />
      </div>
    </ConciergeProvider>
  );
}

function Logo() {
  const props = { width: 104, height: 44, priority: true } as const;
  return (
    <span className="flex h-11 w-[104px] shrink-0 items-center">
      <Image src="/aep-logo-light.png" alt="American Electric Power" {...props} className="h-11 w-[104px] object-contain dark:hidden" />
      <Image src="/aep-logo-dark.png" alt="American Electric Power" {...props} className="hidden h-11 w-[104px] object-contain dark:block" />
    </span>
  );
}

/**
 * Desktop logo: transparent artwork that follows the theme. Gray lettering on light,
 * reversed white lettering on dark (both derived from the sponsor PNG, 471×248).
 * Swapped with CSS so the server render never mismatches the saved theme.
 */
function DesktopLogo() {
  const props = { width: 91, height: 48, priority: true } as const;
  return (
    <span className="flex h-12 w-[91px] shrink-0 items-center">
      <Image src="/aep-logo-light.png" alt="American Electric Power" {...props} className="h-12 w-[91px] object-contain dark:hidden" />
      <Image src="/aep-logo-dark.png" alt="American Electric Power" {...props} className="hidden h-12 w-[91px] object-contain dark:block" />
    </span>
  );
}

function HeaderPill({ className }: { className?: string }) {
  const { state, openStatus } = useConcierge();
  const sc = state.scenario;
  return (
    <StatusPill
      scenario={sc}
      label={statusLabel(sc)}
      glowing={sc !== "normal" && state.seen !== sc}
      onClick={openStatus}
      className={className}
    />
  );
}

/** Resets the enclosing scroll area to the top whenever `when` changes. */
function ScrollTopOn({ when }: { when: unknown }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.closest<HTMLElement>("[data-slot=scroll-area-viewport]")?.scrollTo({ top: 0 });
  }, [when]);
  return <div ref={ref} aria-hidden />;
}

function ScreenContent({ withMap }: { withMap: boolean }) {
  const { state } = useConcierge();
  switch (state.screen) {
    case "settings":
      return <SettingsScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "location":
      return <LocationScreen />;
    default:
      if (state.unknownId) return <FallbackCard />;
      return (
        <>
          {withMap && <EventMapHero />}
          <DashboardSections />
        </>
      );
  }
}

function AskBar({ showSettings }: { showSettings: boolean }) {
  const { openChat, set } = useConcierge();
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t bg-background px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
      <QuickAskChips />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openChat}
          className="flex h-[46px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full bg-muted pr-1.5 pl-3.5 text-left text-sm text-muted-foreground"
        >
          <SparklesIcon size={16} aria-hidden />
          <span className="flex-1 truncate">Ask anything about the storm…</span>
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <ArrowUpIcon size={16} aria-hidden />
          </span>
        </button>
        {showSettings && (
          <Button variant="outline" size="icon" onClick={() => set({ screen: "settings" })} aria-label="Settings" className="size-[46px] rounded-full">
            <SettingsIcon className="size-[19px]" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SheetHandle() {
  return (
    <div className="flex shrink-0 justify-center pt-2">
      <span className="h-[5px] w-11 rounded-full bg-muted" />
    </div>
  );
}

const sheetHeight = (h: string) =>
  ({ "--drawer-content-height": h, "--drawer-content-max-height": h }) as React.CSSProperties;

// ---------------------------------------------------------------------------
// Mobile: single column, map-first, sheets slide up from the bottom.

function MobileShell() {
  const { state, closeSheets } = useConcierge();
  const isDesktop = useMediaQuery(DESKTOP);
  const onOpenChange = (open: boolean) => {
    if (!open) closeSheets();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-page lg:hidden">
      <header className="flex shrink-0 items-center gap-2.5 border-b bg-background pt-[max(6px,env(safe-area-inset-top))] pr-3 pb-2.5 pl-4">
        <Logo />
        <div className="flex-1" />
        <HeaderPill />
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ScrollTopOn when={state.screen} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pt-3.5 pb-4">
          <ScreenContent withMap />
        </main>
      </ScrollArea>

      {state.screen === "home" && <AskBar showSettings />}

      <Drawer open={state.statusOpen && !isDesktop} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[20px] shadow-[var(--shadow-lg)]" style={sheetHeight("93dvh")}>
          <SheetHandle />
          <StatusHeader titleAs={DrawerTitle} />
          <ScrollArea className="min-h-0 flex-1">
            <StatusBody />
            <div className="h-[env(safe-area-inset-bottom)]" />
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      <Drawer open={state.chatOpen && !isDesktop} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[20px] shadow-[var(--shadow-lg)]" style={sheetHeight("90dvh")} aria-label="Outage Concierge chat">
          <SheetHandle />
          <ChatHeader onClose={closeSheets} />
          <ScrollArea className="min-h-0 flex-1">
            <ChatThread />
          </ScrollArea>
          <ChatComposer className="pb-[max(10px,env(safe-area-inset-bottom))]" />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop: interactive map fills the left, dashboard column on the right, and
// the concierge docked as a third column on wide screens (a side sheet otherwise).

const noopSubscribe = () => () => {};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The saved theme is only known on the client; render the light icon until hydrated.
  const hydrated = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dark = hydrated && resolvedTheme === "dark";
  return (
    <Button variant="outline" size="icon" className="size-9 rounded-full" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

const DESKTOP_EVENT_PADDING = { top: 72, bottom: 300, left: 48, right: 72 };

function DesktopShell() {
  const { state, m, set, closeSheets } = useConcierge();
  const isDesktop = useMediaQuery(DESKTOP);
  const isWide = useMediaQuery(WIDE);
  const theme = useMapTheme();
  const onOpenChange = (open: boolean) => {
    if (!open) closeSheets();
  };
  const inSettings = state.screen !== "home";

  return (
    <div className="hidden min-h-0 flex-1 flex-col overflow-hidden bg-page lg:flex">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-5">
        <DesktopLogo />
        <span aria-hidden className="hidden h-8 w-px bg-border xl:block" />
        <div className="hidden flex-col leading-tight xl:flex">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Outage Concierge</span>
          <span className="text-xs text-muted-foreground">{state.unknownId ? "Unknown location" : `${m.P.area} · ${m.P.id}`}</span>
        </div>
        <div className="flex-1" />
        <HeaderPill />
        <ThemeToggle />
        <Button
          variant={inSettings ? "secondary" : "outline"}
          className="h-9 gap-1.5 rounded-full px-3.5"
          onClick={() => set({ screen: inSettings ? "home" : "settings" })}
          aria-pressed={inSettings}
        >
          <SettingsIcon />
          Settings
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_440px_400px]">
        <section className="relative min-h-0 bg-muted" aria-label="Outage map">
          <OutageMap
            scenario={state.scenario}
            theme={theme}
            view="event"
            interactive
            eventPadding={DESKTOP_EVENT_PADDING}
            className="absolute inset-0"
          />
          {!state.unknownId && <EventCard className="absolute bottom-6 left-4 w-[380px]" />}
        </section>

        <div className="flex min-h-0 flex-col border-l">
          <ScrollArea className="min-h-0 flex-1">
            <ScrollTopOn when={state.screen} />
            <main className="flex flex-col gap-3 px-4 pt-4 pb-5">
              <ScreenContent withMap={false} />
            </main>
          </ScrollArea>
          {state.screen === "home" && !isWide && <AskBar showSettings={false} />}
        </div>

        <aside className="hidden min-h-0 flex-col border-l bg-background 2xl:flex" aria-label="Outage Concierge chat">
          <ChatHeader />
          <ScrollArea className="min-h-0 flex-1">
            <ChatThread />
          </ScrollArea>
          <ChatComposer />
        </aside>
      </div>

      <Sheet open={state.statusOpen && isDesktop} onOpenChange={onOpenChange}>
        <SheetContent side="right" showCloseButton={false} className="w-[460px] gap-0 p-0 data-[side=right]:sm:max-w-[460px]">
          <StatusHeader titleAs={SheetTitle} />
          <ScrollArea className="min-h-0 flex-1">
            <StatusBody showMap={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={state.chatOpen && isDesktop && !isWide} onOpenChange={onOpenChange}>
        <SheetContent side="right" showCloseButton={false} className={cn("w-[420px] gap-0 p-0 data-[side=right]:sm:max-w-[420px]")} aria-label="Outage Concierge chat">
          <ChatHeader onClose={closeSheets} />
          <ScrollArea className="min-h-0 flex-1">
            <ChatThread />
          </ScrollArea>
          <ChatComposer />
        </SheetContent>
      </Sheet>
    </div>
  );
}
