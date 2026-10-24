"use client";

import * as React from "react";
import { ArrowUpIcon, LoaderCircleIcon, MessageCircleQuestionMarkIcon, SparklesIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { quickAsks, type BotMessage } from "@/lib/concierge/model";
import { Chip, Icon, RiskScale, SegmentBar } from "@/components/concierge/primitives";
import { useConcierge } from "@/components/concierge/store";

export function ChatHeader({ onClose }: { onClose?: () => void }) {
  const { state, m, aiEnabled } = useConcierge();
  const HeaderIcon = aiEnabled ? SparklesIcon : MessageCircleQuestionMarkIcon;
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b pt-2 pr-2 pb-3 pl-4">
      <span className="flex size-[34px] items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <HeaderIcon size={16} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] leading-tight font-semibold">Outage Concierge</span>
        <span className="text-xs text-muted-foreground">
          {state.unknownId ? "Unknown location" : m.P.area} · {aiEnabled ? "uses your live estimate" : "quick answers only"}
        </span>
      </span>
      {onClose && (
        <Button variant="ghost" size="icon" className="size-10 rounded-[10px]" onClick={onClose} aria-label="Close">
          <XIcon className="size-[18px]" />
        </Button>
      )}
    </div>
  );
}

function BotCard({ msg }: { msg: BotMessage }) {
  return (
    <div className="flex flex-col gap-2.5 self-stretch rounded-[16px_16px_16px_4px] bg-card p-3.5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: msg.accent }} />
        <span className="text-xs font-medium text-muted-foreground">Concierge</span>
      </div>
      {msg.headline && <div className="text-lg leading-tight font-semibold tracking-[-0.01em] text-pretty">{msg.headline}</div>}
      {msg.body && <div className="text-sm text-pretty whitespace-pre-line">{msg.body}</div>}
      {msg.risk && <RiskScale level={msg.risk} compact />}
      {msg.segs && (
        <div className="flex flex-col gap-1.5">
          <SegmentBar segs={msg.segs} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{msg.segStart}</span>
            <span>{msg.segEnd}</span>
          </div>
        </div>
      )}
      {msg.points.map((pt) => (
        <div key={pt.k} className="flex gap-2.5 rounded-[10px] bg-muted px-3 py-2.5">
          <span className="pt-0.5" style={{ color: pt.kColor }}>
            <Icon name={pt.icon} size={15} />
          </span>
          <span className="flex flex-1 flex-col gap-px">
            <span className="text-xs font-semibold" style={{ color: pt.kColor }}>
              {pt.k}
            </span>
            <span className="text-sm text-pretty">{pt.v}</span>
          </span>
        </div>
      ))}
      {msg.foot && <div className="text-xs text-muted-foreground">{msg.foot}</div>}
    </div>
  );
}

/** Message list. Keeps the newest message in view inside its scroll container. */
export function ChatThread({ className }: { className?: string }) {
  const { state } = useConcierge();
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const viewport = endRef.current?.closest<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!viewport) return;
    requestAnimationFrame(() => viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" }));
  }, [state.chat.length, state.typing]);

  return (
    <div className={cn("flex flex-col gap-3.5 px-3 py-4", className)} aria-live="polite">
      {state.chat.map((msg) =>
        msg.role === "user" ? (
          <div key={msg.id} className="max-w-[80%] self-end rounded-[18px_18px_4px_18px] bg-brand px-[13px] py-[9px] text-[15px] text-white">
            {msg.text}
          </div>
        ) : (
          <BotCard key={msg.id} msg={msg} />
        ),
      )}
      {state.typing && (
        <div className="flex items-center gap-2 self-start rounded-full bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
          <LoaderCircleIcon size={14} className="animate-spin" aria-hidden />
          Checking your estimate…
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

export function QuickAskChips({ className }: { className?: string }) {
  const { state, ask } = useConcierge();
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto [scrollbar-width:none]", className)}>
      {quickAsks(state.scenario).map((qa) => (
        <Chip key={qa.intent} onClick={() => ask(qa.label, qa.intent)}>
          {qa.label}
        </Chip>
      ))}
    </div>
  );
}

export function ChatComposer({ className }: { className?: string }) {
  const { ask, aiEnabled } = useConcierge();
  const [draft, setDraft] = React.useState("");
  const send = () => {
    const q = draft.trim();
    if (!q) return;
    ask(q);
    setDraft("");
  };
  return (
    <div className={cn("flex shrink-0 flex-col gap-2 border-t px-3 py-2.5", className)}>
      <QuickAskChips />
      <form
        className="flex items-center gap-1.5 rounded-full border border-input bg-background py-1 pr-1 pl-3.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={aiEnabled ? "Type a question…" : "Ask about outages, timing, or prep…"}
          aria-label="Ask the outage concierge"
          maxLength={500}
          className="h-[38px] min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover"
        >
          <ArrowUpIcon size={16} />
        </button>
      </form>
    </div>
  );
}
