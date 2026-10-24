"use client";

import * as React from "react";
import { ArrowRightIcon, BellIcon, BellRingIcon, CheckCheckIcon, ChevronRightIcon, CircleCheckIcon, MailIcon, SettingsIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TONE, channelList, eligibility, type Tone } from "@/lib/concierge/model";
import { inbox, isRead, type Notice, type NoticeAction } from "@/lib/concierge/notifications";
import { Icon, Panel, SectionHeader } from "@/components/concierge/primitives";
import { useConcierge } from "@/components/concierge/store";

const MUTED: Tone = { c: "var(--muted-foreground)", bg: "var(--muted)", ink: "var(--muted-foreground)", edge: "var(--border)" };
const toneFor = (n: Notice) => (n.tone === "muted" ? MUTED : TONE[n.tone]);

/** Active alerts + feed for the current state, with unread counts. */
export function useInbox() {
  const { state, m } = useConcierge();
  const box = React.useMemo(() => inbox(m, state), [m, state]);
  const all = React.useMemo(() => [...box.active, ...box.feed], [box]);
  const unread = all.filter((n) => !isRead(n, state.read)).length;
  return { ...box, all, unread, read: (n: Notice) => isRead(n, state.read) };
}

/** Frosted-glass bell next to the header status pill, with an unread count badge. */
export function InboxButton({ className }: { className?: string }) {
  const { openInbox } = useConcierge();
  const { unread } = useInbox();
  return (
    <button
      type="button"
      onClick={openInbox}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(
        "glass relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
        className,
      )}
    >
      <BellIcon
        size={17}
        aria-hidden
        // Rings twice whenever the unread count changes.
        key={unread}
        style={unread ? { animation: "bell-ring 1.6s ease-in-out 0.4s 2", transformOrigin: "50% 2px" } : undefined}
      />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-high px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

/** `closable` is false on mobile, where notifications are a bottom-nav tab rather than a sheet. */
export function InboxHeader({ titleAs: Title = "span", closable = true }: { titleAs?: React.ElementType; closable?: boolean }) {
  const { set, closeSheets } = useConcierge();
  const { unread } = useInbox();
  return (
    <div className="flex shrink-0 items-start gap-1 border-b pt-2 pr-2 pb-3 pl-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <Title className="text-xl leading-tight font-semibold tracking-[-0.02em]">Notifications</Title>
        <span className="text-xs text-muted-foreground">{unread ? `${unread} unread` : "You’re all caught up"}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-[10px]"
        onClick={() => set({ screen: "notifications", inboxOpen: false })}
        aria-label="Notification settings"
      >
        <SettingsIcon className="size-[18px]" />
      </Button>
      {closable && (
        <Button variant="ghost" size="icon" className="size-10 rounded-[10px]" onClick={closeSheets} aria-label="Close">
          <XIcon className="size-[18px]" />
        </Button>
      )}
    </div>
  );
}

type Filter = "all" | "unread" | "alerts";

/** Read/unread toggle: a filled brand dot when unread, an empty ring when read. */
function ReadDot({ n, unread }: { n: Notice; unread: boolean }) {
  const { setRead } = useConcierge();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRead([n.id], unread);
      }}
      aria-label={unread ? `Mark “${n.title}” as read` : `Mark “${n.title}” as unread`}
      title={unread ? "Mark as read" : "Mark as unread"}
      className="-mt-1 -mr-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
    >
      <span className={cn("size-2.5 rounded-full transition-all", unread ? "bg-brand" : "ring-[1.5px] ring-foreground/25 ring-inset")} />
    </button>
  );
}

function ActionLink({ action, ink }: { action: NoticeAction; ink?: string }) {
  const { set, openStatus, ask } = useConcierge();
  const run = () => {
    if (action.kind === "status") openStatus();
    else if (action.kind === "ask") ask(action.q, action.intent);
    else set({ screen: action.screen, inboxOpen: false });
  };
  return (
    <button
      type="button"
      onClick={run}
      className="mt-1.5 inline-flex cursor-pointer items-center gap-1 self-start rounded-md text-[13px] font-semibold hover:underline"
      style={{ color: ink ?? "var(--brand-ink)" }}
    >
      {action.label}
      <ArrowRightIcon size={13} aria-hidden />
    </button>
  );
}

function meta(n: Notice) {
  return n.channel ? `${n.channel} · ${n.t}` : n.t;
}

/** A pinned alert that is in effect right now, tinted with its tone. */
function ActiveCard({ n, unread }: { n: Notice; unread: boolean }) {
  const { setRead } = useConcierge();
  const tone = toneFor(n);
  return (
    <div
      onClick={() => unread && setRead([n.id], true)}
      className="flex cursor-default gap-3 rounded-[14px] p-3.5"
      style={{ background: tone.bg, boxShadow: `inset 0 0 0 1px ${tone.edge}` }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-background/70" style={{ color: tone.ink }}>
        <Icon name={n.icon} size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-pretty" style={{ color: tone.ink }}>
          {n.title}
        </span>
        <p className="text-[13px] leading-snug text-pretty text-foreground/80">{n.body}</p>
        <span className="mt-0.5 text-xs" style={{ color: tone.ink }}>
          {n.t}
        </span>
        {n.action && <ActionLink action={n.action} ink={tone.ink} />}
      </div>
      <ReadDot n={n} unread={unread} />
    </div>
  );
}

function NoticeRow({ n, unread }: { n: Notice; unread: boolean }) {
  const { setRead } = useConcierge();
  const tone = toneFor(n);
  return (
    <li
      onClick={() => unread && setRead([n.id], true)}
      className={cn("flex cursor-default gap-3 border-t px-3.5 py-3 transition-colors first:border-t-0", unread && "bg-brand-soft/45")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: tone.bg, color: tone.ink }}>
        <Icon name={n.icon} size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-pretty", unread ? "font-semibold" : "font-medium")}>{n.title}</span>
        <p className="line-clamp-3 text-[13px] leading-snug text-pretty text-muted-foreground">{n.body}</p>
        <span className="mt-0.5 text-xs text-muted-foreground">{meta(n)}</span>
        {n.action && <ActionLink action={n.action} />}
      </div>
      <ReadDot n={n} unread={unread} />
    </li>
  );
}

function EmptyState({ icon: I, title, body }: { icon: typeof BellIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed px-6 py-8 text-center">
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-low-bg text-low-ink">
        <I size={19} aria-hidden />
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-[13px] text-pretty text-muted-foreground">{body}</span>
    </div>
  );
}

/** Body of the notification center: filters, bulk read controls, active alerts, feed, settings shortcut. */
export function InboxBody() {
  const { state, m, set, setRead, flash } = useConcierge();
  const { active, feed, all, unread, read } = useInbox();
  const [filter, setFilter] = React.useState<Filter>("all");

  const keep = (n: Notice) => (filter === "unread" ? !read(n) : filter === "alerts" ? n.kind === "alert" : true);
  const shownActive = active.filter(keep);
  const shownFeed = feed.filter(keep);
  const days = [...new Set(shownFeed.map((n) => n.day))];
  const alerts = all.filter((n) => n.kind === "alert").length;

  const markAll = (value: boolean) => {
    setRead(all.map((n) => n.id), value);
    flash(value ? "All notifications marked as read" : "All notifications marked as unread");
  };

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: all.length },
    { id: "unread", label: "Unread", count: unread },
    { id: "alerts", label: "Alerts", count: alerts },
  ];
  const el = eligibility(m, state);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div role="tablist" aria-label="Filter notifications" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {filters.map((f) => {
          const on = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors",
                on ? "bg-background text-foreground shadow-[var(--shadow-sm)] ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums",
                  f.id === "unread" && f.count > 0 ? "bg-brand text-white" : "bg-foreground/[0.07]",
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="-mt-1 flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" disabled={unread === 0} onClick={() => markAll(true)} className="h-8 gap-1.5 px-2.5 text-[13px] text-brand-ink hover:bg-brand-soft hover:text-brand-ink">
          <CheckCheckIcon />
          Mark All Read
        </Button>
        <Button variant="ghost" size="sm" disabled={unread === all.length} onClick={() => markAll(false)} className="h-8 gap-1.5 px-2.5 text-[13px]">
          <MailIcon />
          Mark All Unread
        </Button>
      </div>

      {filter !== "unread" || shownActive.length > 0 ? (
        <>
          <SectionHeader className="pt-0">Active Now</SectionHeader>
          {shownActive.length ? (
            shownActive.map((n) => <ActiveCard key={n.id} n={n} unread={!read(n)} />)
          ) : (
            <div className="flex items-center gap-3 rounded-[14px] bg-low-bg p-3.5 text-low-ink">
              <CircleCheckIcon size={18} className="shrink-0" aria-hidden />
              <span className="text-pretty">
                <span className="font-semibold">No active alerts.</span> We’ll let you know the moment anything changes on your line.
              </span>
            </div>
          )}
        </>
      ) : null}

      {days.map((day) => (
        <React.Fragment key={day}>
          <SectionHeader>{day}</SectionHeader>
          <Panel className="overflow-hidden">
            <ul>
              {shownFeed
                .filter((n) => n.day === day)
                .map((n) => (
                  <NoticeRow key={n.id} n={n} unread={!read(n)} />
                ))}
            </ul>
          </Panel>
        </React.Fragment>
      ))}

      {filter === "unread" && unread === 0 && (
        <EmptyState icon={CheckCheckIcon} title="You’re All Caught Up" body="New alerts and updates about your power will show up here." />
      )}

      <SectionHeader>Settings</SectionHeader>
      <Panel className="overflow-hidden">
        <button
          type="button"
          onClick={() => set({ screen: "notifications", inboxOpen: false })}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <BellRingIcon size={16} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">Notification Settings</span>
            <span className="truncate text-xs text-muted-foreground">
              {el.ok ? "Storm alerts on" : "Outage alerts only"} · {channelList(state.ch, state) || "No channels"}
            </span>
          </span>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
      </Panel>
    </div>
  );
}
