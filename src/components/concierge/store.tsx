"use client";

import * as React from "react";
import { toast } from "sonner";

import { ToastCheck } from "@/components/concierge/primitives";

import {
  DEF,
  PREMISES,
  answer,
  greeting,
  intentOf,
  llmContext,
  model,
  nextId,
  type Access,
  type ChatMessage,
  type Channels,
  type Intent,
  type Model,
  type Scenario,
} from "@/lib/concierge/model";
import type { RiskLevel } from "@/lib/concierge/risk";

export type Screen = "home" | "settings" | "notifications" | "location";

export interface ConciergeState {
  scenario: Scenario;
  /** Last scenario the user opened. The status pill glows until seen === scenario. */
  seen: Scenario;
  screen: Screen;
  statusOpen: boolean;
  chatOpen: boolean;
  /** Notification center sheet. */
  inboxOpen: boolean;
  /** Read state the user set per notification id. Unset ids fall back to the item's default. */
  read: Record<string, boolean>;
  premise: string;
  unknownId: string | null;
  wind: number;
  poles: number;
  spans: number;
  xfmr: boolean;
  crews: number;
  access: Access;
  reroute: boolean;
  medical: boolean;
  ch: Channels;
  chat: ChatMessage[];
  typing: boolean;
  factorsOpen: boolean;
  /** Debug menu: force the outage-chance level (null = calculated). */
  riskOverride: RiskLevel | null;
}

type Patch = Partial<ConciergeState> | ((s: ConciergeState) => Partial<ConciergeState>);

interface ConciergeContextValue {
  state: ConciergeState;
  m: Model;
  set: (patch: Patch) => void;
  openStatus: () => void;
  closeSheets: () => void;
  openChat: () => void;
  openInbox: () => void;
  /** Marks the given notifications read (true) or unread (false). */
  setRead: (ids: string[], read: boolean) => void;
  ask: (q: string, intent?: Intent) => void;
  pickPremise: (id: string) => void;
  submitId: (raw: string) => void;
  /** Debug menu: restore every value to its initial state. */
  resetAll: () => void;
  flash: (msg: string) => void;
}

const ConciergeContext = React.createContext<ConciergeContextValue | null>(null);

const INITIAL: ConciergeState = {
  ...DEF,
  scenario: "watch",
  seen: "normal",
  screen: "home",
  statusOpen: false,
  chatOpen: false,
  inboxOpen: false,
  read: {},
  premise: "P-20417",
  unknownId: null,
  medical: false,
  ch: { push: true, sms: true, email: false, call: false },
  chat: [greeting("P-20417")],
  typing: false,
  factorsOpen: false,
  riskOverride: null,
};

const TYPING_DELAY = 650;

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState(INITIAL);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const set = React.useCallback((patch: Patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const flash = React.useCallback((msg: string) => {
    toast(msg, { duration: 2200, icon: <ToastCheck /> });
  }, []);

  const pushBot = React.useCallback(
    (msg: ChatMessage) => set((s) => ({ typing: false, chat: [...s.chat, msg] })),
    [set],
  );

  const ask = React.useCallback(
    (q: string, intent?: Intent) => {
      set((s) => ({
        chat: [...s.chat, { id: nextId("u"), role: "user", text: q }],
        typing: true,
        chatOpen: true,
        statusOpen: false,
        inboxOpen: false,
      }));
      const it = intent ?? intentOf(q);
      if (it) {
        // Answer from the latest state so what-if changes made meanwhile are reflected.
        window.setTimeout(() => pushBot(answer(it, stateRef.current)), TYPING_DELAY);
        return;
      }
      const s = stateRef.current;
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context: llmContext(s) }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          const { text } = (await r.json()) as { text: string };
          pushBot({ id: nextId("c"), role: "bot", accent: "var(--brand)", body: text, points: [], foot: "AI answer based on your current estimate." });
        })
        .catch(() => pushBot(answer("none", stateRef.current)));
    },
    [set, pushBot],
  );

  const pickPremise = React.useCallback(
    (id: string) => set({ premise: id, unknownId: null, screen: "home", chat: [greeting(id)] }),
    [set],
  );

  const submitId = React.useCallback(
    (raw: string) => {
      const v = raw.trim().toUpperCase();
      if (!v) return;
      const hit = PREMISES[v] ?? Object.values(PREMISES).find((x) => x.circuit === v);
      if (hit) pickPremise(hit.id);
      else set({ unknownId: v, screen: "home" });
    },
    [set, pickPremise],
  );

  const setRead = React.useCallback(
    (ids: string[], read: boolean) => set((s) => ({ read: { ...s.read, ...Object.fromEntries(ids.map((id) => [id, read])) } })),
    [set],
  );

  const value = React.useMemo<ConciergeContextValue>(
    () => ({
      state,
      m: model(state),
      set,
      flash,
      ask,
      pickPremise,
      submitId,
      setRead,
      openStatus: () => set((s) => ({ statusOpen: true, chatOpen: false, inboxOpen: false, seen: s.scenario })),
      closeSheets: () => set({ statusOpen: false, chatOpen: false, inboxOpen: false }),
      openChat: () => set({ chatOpen: true, statusOpen: false, inboxOpen: false }),
      openInbox: () => set({ inboxOpen: true, statusOpen: false, chatOpen: false }),
      resetAll: () => set({ ...INITIAL, chat: [greeting(INITIAL.premise)] }),
    }),
    [state, set, flash, ask, pickPremise, submitId, setRead],
  );

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>;
}

export function useConcierge() {
  const ctx = React.useContext(ConciergeContext);
  if (!ctx) throw new Error("useConcierge must be used within <ConciergeProvider>.");
  return ctx;
}

/** Desktop layout breakpoint (Tailwind `lg`). */
export const DESKTOP = "(min-width: 1024px)";

/** Matches a media query on the client; false during SSR. */
export function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
