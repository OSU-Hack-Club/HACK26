"use client";

import * as React from "react";
import { toast } from "sonner";

import { ToastCheck } from "@/components/concierge/primitives";

import {
  DEF,
  NO_NEEDS,
  PREMISES,
  answer,
  greeting,
  intentOf,
  llmContext,
  model,
  nextId,
  type Access,
  type DamageWhere,
  type ChatMessage,
  type Channels,
  type Intent,
  type Model,
  type Needs,
  type RuntimePremise,
  type Scenario,
} from "@/lib/concierge/model";
import type { RiskLevel } from "@/lib/concierge/risk";

export type Screen = "home" | "settings" | "notifications" | "location" | "help";

export interface ConciergeState {
  scenario: Scenario;
  /** Last scenario the user opened. The status pill glows until seen === scenario. */
  seen: Scenario;
  screen: Screen;
  /** Where the Help page's back button returns to (it opens from the estimate card or Settings). */
  helpFrom: Screen;
  statusOpen: boolean;
  chatOpen: boolean;
  /** Notification center sheet. */
  inboxOpen: boolean;
  /** Read state the user set per notification id. Unset ids fall back to the item's default. */
  read: Record<string, boolean>;
  premise: string;
  unknownId: string | null;
  /** A real premise fetched from /api/premise (DynamoDB). null = using the static demo premises. */
  premiseOverride: RuntimePremise | null;
  wind: number;
  poles: number;
  spans: number;
  xfmr: boolean;
  crews: number;
  access: Access;
  where: DamageWhere;
  reroute: boolean;
  medical: boolean;
  /** Accessibility and critical-facility needs, declared by the customer in Settings. */
  needs: Needs;
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
  /** Whether free-text questions get AI answers (GET /api/chat). True until the check says otherwise. */
  aiEnabled: boolean;
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
  helpFrom: "settings",
  statusOpen: false,
  chatOpen: false,
  inboxOpen: false,
  read: {},
  premise: "P-20417",
  unknownId: null,
  premiseOverride: null,
  medical: false,
  needs: NO_NEEDS,
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

  const [aiEnabled, setAiEnabled] = React.useState(true);
  const aiEnabledRef = React.useRef(aiEnabled);
  React.useEffect(() => {
    aiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);
  React.useEffect(() => {
    // A failed check leaves AI on; /api/chat failures still fall back to the "can't answer" card.
    fetch("/api/chat")
      .then((r) => (r.ok ? (r.json() as Promise<{ enabled: boolean }>) : null))
      .then((res) => {
        if (res) setAiEnabled(res.enabled);
      })
      .catch(() => {});
  }, []);

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
      const it = intent ?? intentOf(q) ?? (aiEnabledRef.current ? null : "none");
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
    // Picking a demo premise clears any fetched override so the static profile is used.
    (id: string) => set({ premise: id, unknownId: null, premiseOverride: null, screen: "home", chat: [greeting(id)] }),
    [set],
  );

  const submitId = React.useCallback(
    (raw: string) => {
      const v = raw.trim().toUpperCase();
      if (!v) return;
      const hit = PREMISES[v] ?? Object.values(PREMISES).find((x) => x.circuit === v);
      if (hit) {
        pickPremise(hit.id);
        return;
      }
      // Not a demo premise: try the server-side DynamoDB lookup. A real premise returns its anonymized
      // record + snapshot norms; anything else (404, lookup off, error) falls back to "unknown ID".
      fetch("/api/premise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premise: v }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          // Response shape from src/app/api/premise/route.ts.
          const { premise, norms } = (await r.json()) as { premise: RuntimePremise["record"]; norms: RuntimePremise["norms"] };
          const override: RuntimePremise = { record: premise, norms };
          set({ premiseOverride: override, premise: premise.id, unknownId: null, screen: "home", chat: [greeting(premise.id, override)] });
        })
        .catch(() => set({ unknownId: v, premiseOverride: null, screen: "home" }));
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
      aiEnabled,
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
    [state, aiEnabled, set, flash, ask, pickPremise, submitId, setRead],
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
