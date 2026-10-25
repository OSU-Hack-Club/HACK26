"use client";

import * as React from "react";
import { toast } from "sonner";

import { ToastCheck } from "@/components/concierge/primitives";

import {
  DEF,
  LIMITED_SAMPLE,
  NO_NEEDS,
  PREMISES,
  answer,
  greeting,
  intentOf,
  llmContext,
  model,
  nextId,
  safetyAnswer,
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
import { DEFAULT_ALERT_PREFS, type AlertPref } from "@/lib/concierge/services";
import {
  appendAudit,
  auditDiff,
  auditPremise,
  questionDrafts,
  reviewDraft,
  sessionDrafts,
  type AnswerRoute,
  type AuditDraft,
  type AuditEntry,
  type AuditSnapshot,
  type ReviewDecision,
} from "@/lib/concierge/audit";
import { isSafetyQuestion } from "@/lib/concierge/privacy";

/** Which account the app shows. Staff is a demo view, switched from Settings › Demo or the debug menu. */
export type Role = "customer" | "staff";

export type Screen = "home" | "settings" | "notifications" | "location" | "help" | "services";

export interface ConciergeState {
  scenario: Scenario;
  /** Last scenario the user opened. The status pill glows until seen === scenario. */
  seen: Scenario;
  screen: Screen;
  /** Where the Help page's back button returns to (it opens from the estimate card or Settings). */
  helpFrom: Screen;
  /** Where the Services page's back button returns to. */
  servicesFrom: Screen;
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
  /** Advanced alert preferences (heartbeat, center list, facility digest). */
  alertPrefs: AlertPref;
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
  /** Demo account view. */
  role: Role;
  setRole: (role: Role) => void;
  /** Append-only, hash-chained audit trail (src/lib/concierge/audit.ts). */
  audit: AuditEntry[];
  log: (drafts: AuditDraft[]) => void;
  /** Records a staff decision on a flagged entry. */
  review: (target: AuditEntry, decision: ReviewDecision, note: string) => void;
  /** Starts a fresh chain (the clearing itself is the first entry). */
  clearAudit: () => void;
  /** Debug only: edits an entry in place so the integrity check fails. */
  tamperAudit: () => void;
}

const ConciergeContext = React.createContext<ConciergeContextValue | null>(null);

const INITIAL: ConciergeState = {
  ...DEF,
  scenario: "watch",
  seen: "normal",
  screen: "home",
  helpFrom: "settings",
  servicesFrom: "home",
  statusOpen: false,
  chatOpen: false,
  inboxOpen: false,
  read: {},
  premise: "P-20417",
  unknownId: null,
  premiseOverride: null,
  medical: false,
  needs: NO_NEEDS,
  alertPrefs: DEFAULT_ALERT_PREFS,
  ch: { push: true, sms: true, email: false, call: false },
  chat: [greeting("P-20417")],
  typing: false,
  factorsOpen: false,
  riskOverride: null,
};

const TYPING_DELAY = 650;
/** Wait for the state to settle (slider drags, quick toggles) before auditing it. */
const AUDIT_SETTLE = 700;
const AUDIT_KEY = "concierge.audit.v1";
const ROLE_KEY = "concierge.role";

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

  const [role, setRoleState] = React.useState<Role>("customer");
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Restore the saved log and account view after mount. localStorage is client-only, so reading it
  // during render would make the server and client trees differ.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AUDIT_KEY);
      if (saved) setAudit(JSON.parse(saved) as AuditEntry[]);
      if (window.localStorage.getItem(ROLE_KEY) === "staff") setRoleState("staff");
    } catch {
      // A corrupt or blocked store just starts a new log.
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(audit));
    } catch {}
  }, [audit, hydrated]);

  const log = React.useCallback((drafts: AuditDraft[]) => {
    const s = stateRef.current;
    setAudit((a) => appendAudit(a, drafts, { premise: auditPremise(s), scenario: s.scenario }));
  }, []);

  // Audit by diffing settled snapshots, so every path (customer, settings, debug menu) is covered once.
  const audited = React.useRef<AuditSnapshot | null>(null);
  React.useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      const next = stateRef.current;
      const prev = audited.current;
      audited.current = next;
      log(prev ? auditDiff(prev, next) : sessionDrafts(next));
    }, AUDIT_SETTLE);
    return () => window.clearTimeout(t);
  }, [state, hydrated, log]);

  const setRole = React.useCallback(
    (next: Role) => {
      setRoleState(next);
      try {
        window.localStorage.setItem(ROLE_KEY, next);
      } catch {}
      log([
        {
          actor: next === "staff" ? "staff" : "customer",
          category: "account",
          severity: "info",
          action: next === "staff" ? "Staff view opened (demo)" : "Customer view opened (demo)",
          summary: `Demo mode switched the app to the ${next} account view.`,
          details: { view: next },
        },
      ]);
    },
    [log],
  );

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
      const audit = (route: AnswerRoute) => log(questionDrafts(q, route));
      // Hazards get the fixed safety card and a human, never a generated answer.
      if (!intent && isSafetyQuestion(q)) {
        audit({ kind: "safety" });
        window.setTimeout(() => pushBot(safetyAnswer()), TYPING_DELAY);
        return;
      }
      const it = intent ?? intentOf(q) ?? (aiEnabledRef.current ? null : "none");
      if (it) {
        audit({ kind: "intent", intent: it });
        // Answer from the latest state so what-if changes made meanwhile are reflected.
        window.setTimeout(() => pushBot(answer(it, stateRef.current)), TYPING_DELAY);
        return;
      }
      const s = stateRef.current;
      const t0 = performance.now();
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context: llmContext(s) }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(r.status === 503 ? "AI not configured" : r.status === 422 ? "model declined" : `error ${r.status}`);
          const { text, provider, model: aiModel, guard } = (await r.json()) as {
            text: string;
            provider: string;
            model: string;
            guard?: { injection: boolean; redacted: number };
          };
          audit({ kind: "ai", provider, model: aiModel, ms: Math.round(performance.now() - t0), injection: guard?.injection ?? false, redacted: guard?.redacted ?? 0 });
          pushBot({ id: nextId("c"), role: "bot", accent: "var(--brand)", body: text, points: [], foot: "AI answer based on your current estimate." });
        })
        .catch((e: unknown) => {
          audit({ kind: "fallback", reason: e instanceof Error && !(e instanceof TypeError) ? e.message : "network error" });
          pushBot(answer("none", stateRef.current));
        });
    },
    [set, pushBot, log],
  );

  const pickPremise = React.useCallback(
    // Picking a demo premise clears any fetched override so the static profile is used. The limited-data
    // sample travels as an override, like a premise fetched from /api/premise.
    (id: string) => {
      const override = id === LIMITED_SAMPLE.record.id ? LIMITED_SAMPLE : null;
      set({ premise: id, unknownId: null, premiseOverride: override, screen: "home", chat: [greeting(id, override)] });
    },
    [set],
  );

  const submitId = React.useCallback(
    (raw: string) => {
      const v = raw.trim().toUpperCase();
      if (!v) return;
      const hit = PREMISES[v] ?? Object.values(PREMISES).find((x) => x.circuit === v);
      if (hit || v === LIMITED_SAMPLE.record.id) {
        pickPremise(hit?.id ?? v);
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
      resetAll: () => {
        log([{ actor: "staff", category: "account", severity: "info", action: "Demo reset", summary: "Every demo input was restored to its starting value." }]);
        set({ ...INITIAL, chat: [greeting(INITIAL.premise)] });
      },
      role,
      setRole,
      audit,
      log,
      review: (target, decision, note) => log([reviewDraft(target, decision, note)]),
      clearAudit: () => {
        // The new chain starts with a record of the clearing and what the model says right now.
        const s = stateRef.current;
        audited.current = s;
        setAudit(
          appendAudit(
            [],
            [
              { actor: "staff", category: "account", severity: "notice", action: "Audit log cleared", summary: "Staff started a new audit chain (demo). Earlier entries were exported or discarded." },
              ...sessionDrafts(s).slice(1),
            ],
            { premise: auditPremise(s), scenario: s.scenario },
          ),
        );
      },
      tamperAudit: () =>
        setAudit((a) => {
          if (a.length < 2) return a;
          const i = Math.floor(a.length / 2);
          return a.map((e, j) => (j === i ? { ...e, summary: `${e.summary} [edited]` } : e));
        }),
    }),
    [state, aiEnabled, set, flash, ask, pickPremise, submitId, setRead, role, setRole, audit, log],
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
