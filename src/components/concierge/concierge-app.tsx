"use client";

import * as React from "react";
import Image from "next/image";
import { BellIcon, HouseIcon, MoonIcon, SettingsIcon, SparklesIcon, ArrowUpIcon, SunIcon, type LucideIcon } from "lucide-react";
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
import { InboxBody, InboxButton, InboxHeader, useInbox } from "@/components/concierge/inbox";
import { OutageMap } from "@/components/concierge/outage-map";
import { StatusPill } from "@/components/concierge/primitives";
import { LocationScreen, NotificationsScreen, SettingsScreen } from "@/components/concierge/settings";
import { StatusBody, StatusHeader } from "@/components/concierge/status";
import { ConciergeProvider, DESKTOP, useConcierge, useMediaQuery } from "@/components/concierge/store";

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

/**
 * Mobile logo. It gives way to the status pill: on narrow phones it shrinks (down to
 * 40px wide, the header's side column minimum) so the pill can show its full label.
 */
function Logo() {
  const props = { width: 61, height: 32, priority: true } as const;
  return (
    <span className="flex h-8 w-[61px] max-w-full items-center">
      <Image src="/aep-logo-light.png" alt="American Electric Power" {...props} className="size-full object-contain object-left dark:hidden" />
      <Image src="/aep-logo-dark.png" alt="American Electric Power" {...props} className="hidden size-full object-contain object-left dark:block" />
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

function HeaderPill({ compact, className }: { compact?: boolean; className?: string }) {
  const { state, m, openStatus } = useConcierge();
  const sc = state.scenario;
  return (
    <StatusPill
      scenario={sc}
      label={statusLabel(sc, m)}
      glowing={sc !== "normal" && state.seen !== sc}
      onClick={openStatus}
      compact={compact}
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

function ScreenContent({ withMap, hideBack = false }: { withMap: boolean; hideBack?: boolean }) {
  const { state } = useConcierge();
  switch (state.screen) {
    case "settings":
      return <SettingsScreen hideBack={hideBack} />;
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

function AskBar() {
  const { openChat } = useConcierge();
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
// Mobile: single column, map-first, with a bottom nav for Home, Ask AI, Alerts, and
// Settings. Event details still slide up as a sheet.

type Tab = "home" | "chat" | "alerts" | "settings";

/** The chat and inbox flags double as tabs on mobile; any non-home screen is the Settings tab. */
function useTab(): Tab {
  const { state } = useConcierge();
  if (state.chatOpen) return "chat";
  if (state.inboxOpen) return "alerts";
  return state.screen === "home" ? "home" : "settings";
}

function BottomNav() {
  const { set, openChat, openInbox } = useConcierge();
  const { unread } = useInbox();
  const tab = useTab();
  const items: { id: Tab; label: string; icon: LucideIcon; go: () => void; badge?: number }[] = [
    { id: "home", label: "Home", icon: HouseIcon, go: () => set({ screen: "home", chatOpen: false, inboxOpen: false }) },
    { id: "chat", label: "Ask AI", icon: SparklesIcon, go: openChat },
    { id: "alerts", label: "Alerts", icon: BellIcon, go: openInbox, badge: unread },
    { id: "settings", label: "Settings", icon: SettingsIcon, go: () => set({ screen: "settings", chatOpen: false, inboxOpen: false }) },
  ];
  return (
    // Frosted glass bar floating over the content, like the header.
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-20 flex h-(--mobile-nav) border-t border-foreground/10 bg-background/60 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-1px_12px_-6px_rgb(0_0_0/0.25)] backdrop-blur-xl backdrop-saturate-150"
    >
      {items.map(({ id, label, icon: TabIcon, go, badge }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={go}
            aria-current={active ? "page" : undefined}
            aria-label={badge ? `${label}, ${badge} unread` : label}
            className={cn(
              "group/tab flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors outline-none",
              active ? "text-brand-ink" : "text-muted-foreground",
            )}
          >
            {/* Pill behind the active icon; also the keyboard focus ring. */}
            <span
              className={cn(
                "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors group-focus-visible/tab:ring-2 group-focus-visible/tab:ring-ring/50",
                active && "bg-brand-soft",
              )}
            >
              <TabIcon size={21} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {!!badge && (
                <span className="absolute -top-1 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-high px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function MobileShell() {
  const { state, closeSheets } = useConcierge();
  const isDesktop = useMediaQuery(DESKTOP);
  const tab = useTab();
  const onOpenChange = (open: boolean) => {
    if (!open) closeSheets();
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-page lg:hidden"
      style={
        {
          "--mobile-header": "calc(max(6px, env(safe-area-inset-top)) + 46px)",
          "--mobile-nav": "calc(max(8px, env(safe-area-inset-bottom)) + 58px)",
        } as React.CSSProperties
      }
    >
      {/* Frosted glass bar floating over the content, so the map and page scroll beneath it.
          Equal side columns keep the pill centered; the logo shrinks before the label truncates. */}
      <header className="absolute inset-x-0 top-0 z-20 grid h-(--mobile-header) grid-cols-[minmax(40px,1fr)_minmax(0,auto)_minmax(40px,1fr)] items-center gap-2 border-b border-foreground/10 bg-background/60 pt-[max(6px,env(safe-area-inset-top))] pr-3 pb-2.5 pl-3 shadow-[0_1px_12px_-6px_rgb(0_0_0/0.25)] backdrop-blur-xl backdrop-saturate-150">
        <Logo />
        <HeaderPill compact />
        <span aria-hidden />
      </header>

      {tab === "chat" ? (
        <section className="flex min-h-0 flex-1 flex-col bg-background pt-(--mobile-header) pb-(--mobile-nav)" aria-label="Outage Concierge chat">
          <ChatHeader />
          <ScrollArea className="min-h-0 flex-1">
            <ChatThread />
          </ScrollArea>
          <ChatComposer />
        </section>
      ) : tab === "alerts" ? (
        <section className="flex min-h-0 flex-1 flex-col bg-background pt-(--mobile-header)" aria-label="Notifications">
          <InboxHeader closable={false} titleAs="h1" />
          <ScrollArea className="min-h-0 flex-1">
            <InboxBody />
            <div aria-hidden className="h-(--mobile-nav)" />
          </ScrollArea>
        </section>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ScrollTopOn when={state.screen} />
          <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pt-[calc(var(--mobile-header)+0.875rem)] pb-[calc(var(--mobile-nav)+1.25rem)]">
            <ScreenContent withMap hideBack />
          </main>
        </ScrollArea>
      )}

      <BottomNav />

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
        <InboxButton />
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
          {state.screen === "home" && !isWide && <AskBar />}
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

      <Sheet open={state.inboxOpen && isDesktop} onOpenChange={onOpenChange}>
        <SheetContent side="right" showCloseButton={false} className="w-[440px] gap-0 p-0 data-[side=right]:sm:max-w-[440px]">
          <InboxHeader titleAs={SheetTitle} />
          <ScrollArea className="min-h-0 flex-1">
            <InboxBody />
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
