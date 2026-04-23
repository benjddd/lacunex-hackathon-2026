"use client";

import { useEffect, useRef, useState } from "react";
import type { RoleLabels, Turn } from "@/lib/types";
import { DEFAULT_ROLE_LABELS } from "@/lib/types";

interface ChatPaneProps {
  transcript: Turn[];
  isLoading: boolean;
  onSend: (text: string) => void;
  disabled?: boolean;
  roleLabels?: RoleLabels;
}

export function ChatPane({
  transcript,
  isLoading,
  onSend,
  disabled,
  roleLabels = DEFAULT_ROLE_LABELS,
}: ChatPaneProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="flex h-full flex-col bg-stone-50">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-4"
      >
        {transcript.length === 0 && !isLoading && (
          <p className="text-stone-400 text-sm italic">
            Waiting to open the session…
          </p>
        )}
        {transcript.map((turn) => (
          <MessageBubble
            key={turn.index}
            turn={turn}
            roleLabels={roleLabels}
          />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-stone-500 text-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-600" />
            {roleLabels.host} is thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 bg-white px-8 py-4"
      >
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={2}
            placeholder={disabled ? "Session closed." : "Your turn. (Enter to send, Shift+Enter for newline.)"}
            disabled={disabled || isLoading}
            className="flex-1 resize-none rounded-md border border-stone-300 px-3 py-2 text-sm leading-relaxed focus:border-amber-500 focus:outline-none disabled:bg-stone-100"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !text.trim()}
            className="rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  turn,
  roleLabels,
}: {
  turn: Turn;
  roleLabels: RoleLabels;
}) {
  const isHost = turn.role === "host";
  return (
    <div className={`flex ${isHost ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isHost
            ? "bg-amber-50 text-stone-900 rounded-bl-sm"
            : "bg-slate-800 text-white rounded-br-sm"
        }`}
      >
        <div
          className={`mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider ${
            isHost ? "text-amber-800" : "text-slate-300"
          }`}
        >
          <span>{isHost ? roleLabels.host : roleLabels.participant}</span>
          {isHost && typeof turn.anchor_turn === "number" && (
            <span
              title="The platform re-opened a prior turn — cross-turn reasoning"
              className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-medium tracking-wider text-amber-900"
            >
              ↩ re-opened turn {turn.anchor_turn}
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap">{turn.text}</div>
      </div>
    </div>
  );
}
