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
  showReasoning?: boolean;
  showHostMeta?: boolean;
}

type MicState = "idle" | "recording" | "transcribing";

export function ChatPane({
  transcript,
  isLoading,
  onSend,
  disabled,
  roleLabels = DEFAULT_ROLE_LABELS,
  showReasoning = false,
  showHostMeta = false,
}: ChatPaneProps) {
  const [text, setText] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length, isLoading]);

  // Re-focus the input after each host turn so the participant doesn't have
  // to click back into the field between turns.
  useEffect(() => {
    if (!isLoading && !disabled) {
      textareaRef.current?.focus();
    }
  }, [isLoading, disabled]);

  // Best-effort cleanup on unmount: stop any live mic stream so the browser
  // tab indicator doesn't linger.
  useEffect(() => {
    return () => {
      if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const showMicError = (msg: string) => {
    setMicError(msg);
    if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
    micErrorTimerRef.current = setTimeout(() => setMicError(null), 4000);
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const startRecording = async () => {
    setMicError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window === "undefined" ||
      typeof window.MediaRecorder === "undefined"
    ) {
      showMicError("Microphone recording isn't supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        showMicError("Mic permission denied. Enable it in the browser.");
      } else if (name === "NotFoundError") {
        showMicError("No microphone found.");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        showMicError(`Couldn't start mic: ${msg}`);
      }
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];

    // Prefer webm/opus; fall back to whatever the browser will give us.
    let recorder: MediaRecorder;
    try {
      if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ) {
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      } else if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      } else {
        recorder = new MediaRecorder(stream);
      }
    } catch (err) {
      releaseStream();
      const msg = err instanceof Error ? err.message : String(err);
      showMicError(`Recorder init failed: ${msg}`);
      return;
    }
    mediaRecorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (ev: BlobEvent) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    });
    recorder.addEventListener("stop", () => {
      void handleRecorderStop();
    });
    recorder.addEventListener("error", (ev: Event) => {
      const anyEv = ev as Event & { error?: { message?: string } };
      const msg = anyEv.error?.message ?? "recorder error";
      showMicError(msg);
      releaseStream();
      setMicState("idle");
    });

    recorder.start();
    setMicState("recording");
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state !== "inactive") {
      try {
        rec.stop();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showMicError(`Stop failed: ${msg}`);
        releaseStream();
        setMicState("idle");
      }
    }
  };

  const handleRecorderStop = async () => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    releaseStream();
    if (chunks.length === 0) {
      setMicState("idle");
      showMicError("No audio captured.");
      return;
    }
    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size === 0) {
      setMicState("idle");
      showMicError("Recording was empty.");
      return;
    }
    setMicState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        let errText = `transcribe ${res.status}`;
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload?.error) errText = payload.error;
        } catch {
          // ignore body parse
        }
        throw new Error(errText);
      }
      const payload = (await res.json()) as { text?: string };
      const transcribed = (payload.text ?? "").trim();
      if (!transcribed) {
        showMicError("Didn't pick up any speech. Try again.");
      } else {
        setText((prev) => {
          const base = prev.trimEnd();
          return base.length === 0 ? transcribed : `${base} ${transcribed}`;
        });
        // Return focus to the textarea so the user can edit and send.
        textareaRef.current?.focus();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showMicError(`Transcription failed: ${msg}`);
    } finally {
      setMicState("idle");
    }
  };

  const handleMicClick = () => {
    if (micState === "idle") {
      void startRecording();
    } else if (micState === "recording") {
      stopRecording();
    }
    // transcribing → button is disabled; no-op
  };

  const micDisabled =
    disabled || isLoading || micState === "transcribing";

  const micLabel =
    micState === "recording"
      ? "Stop recording"
      : micState === "transcribing"
        ? "Transcribing…"
        : "Record voice input";

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
            showReasoning={showReasoning}
            showHostMeta={showHostMeta}
          />
        ))}
        {isLoading && (
          <HostThinkingIndicator
            hostLabel={roleLabels.host}
            isOpening={transcript.length === 0}
          />
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 bg-white px-8 py-4"
      >
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={2}
            placeholder={
              disabled
                ? "Session closed."
                : isLoading
                  ? "Waiting for the host…"
                  : "Your turn. (Enter to send, Shift+Enter for newline.)"
            }
            disabled={disabled || isLoading}
            className="flex-1 resize-none rounded-md border border-stone-300 px-3 py-2 text-sm leading-relaxed focus:border-amber-500 focus:outline-none disabled:bg-stone-100"
          />
          <button
            type="button"
            onClick={handleMicClick}
            disabled={micDisabled}
            aria-label={micLabel}
            title={micLabel}
            aria-pressed={micState === "recording"}
            className={`flex h-auto w-10 items-center justify-center rounded-md border text-sm transition-colors disabled:opacity-40 ${
              micState === "recording"
                ? "border-red-500 bg-red-50 text-red-600 hover:bg-red-100"
                : "border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            <MicButtonContent state={micState} />
          </button>
          <button
            type="submit"
            disabled={disabled || isLoading || !text.trim()}
            className="rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {micError && (
          <div className="mt-2 text-xs text-red-600" role="alert">
            {micError}
          </div>
        )}
      </form>
    </div>
  );
}

function MicButtonContent({ state }: { state: MicState }) {
  if (state === "transcribing") {
    return (
      <svg
        className="h-4 w-4 animate-spin text-stone-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (state === "recording") {
    return (
      <span
        className="block h-3 w-3 animate-pulse rounded-full bg-red-500"
        aria-hidden="true"
      />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  );
}

function MessageBubble({
  turn,
  roleLabels,
  showReasoning = false,
  showHostMeta = false,
}: {
  turn: Turn;
  roleLabels: RoleLabels;
  showReasoning?: boolean;
  showHostMeta?: boolean;
}) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const isHost = turn.role === "host";
  const hasReasoning = isHost && showReasoning && !!turn.reasoning;

  return (
    <div className={`flex ${isHost ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[75%] ${isHost ? "" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isHost
              ? "bg-amber-50 text-stone-900 rounded-bl-sm"
              : "bg-slate-800 text-white rounded-br-sm"
          }`}
        >
          <div
            className={`mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider ${
              isHost ? "text-amber-800" : "text-slate-300"
            }`}
          >
            <span>{isHost ? roleLabels.host : roleLabels.participant}</span>
            {showHostMeta && isHost && typeof turn.anchor_turn === "number" && (
              <span
                title="The platform re-opened a prior turn — cross-turn reasoning"
                className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-medium tracking-wider text-amber-900"
              >
                ↩ re-opened turn {turn.anchor_turn}
              </span>
            )}
            {showHostMeta && isHost && turn.deployed_notice && (
              <span
                title={`Cross-turn notice (${turn.deployed_notice.type}) across turns [${turn.deployed_notice.anchors.join(", ")}]: ${turn.deployed_notice.observation}`}
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium tracking-wider text-emerald-900"
              >
                ◆ {turn.deployed_notice.type.replace(/_/g, " ")} · turns {turn.deployed_notice.anchors.join(",")}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap">{turn.text}</div>
        </div>

        {hasReasoning && (
          <div className="mt-1 px-1">
            <button
              type="button"
              onClick={() => setReasoningOpen((o) => !o)}
              className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              <span className="text-[8px]">{reasoningOpen ? "▾" : "▸"}</span>
              why this question?
            </button>
            {reasoningOpen && (
              <div className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-600">
                {turn.reasoning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Three-dot typing indicator + progressive copy. The host's turn can take
// 5–10 seconds while Opus generates; a single small dot read as "stall".
// This animates clearly enough to show the platform is working, and the
// copy progresses every couple of seconds so participants don't feel stuck.
function HostThinkingIndicator({
  hostLabel,
  isOpening = false,
}: {
  hostLabel: string;
  isOpening?: boolean;
}) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phases = isOpening
    ? [`${hostLabel} is opening the session…`]
    : [
        `${hostLabel} is reading what you said…`,
        `${hostLabel} is thinking across the conversation…`,
        `${hostLabel} is writing your next question…`,
      ];
  useEffect(() => {
    // Cycling the phase via timers is a deliberate setState-in-effect: the
    // copy progresses to keep the participant oriented during a long wait.
    /* eslint-disable react-hooks/set-state-in-effect */
    setPhaseIdx(0);
    if (isOpening) return;
    const a = setTimeout(() => setPhaseIdx(1), 2200);
    const b = setTimeout(() => setPhaseIdx(2), 4800);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [hostLabel, isOpening]);
  return (
    <div className="flex items-center gap-3 rounded-md bg-stone-100 px-4 py-3 text-stone-600">
      <span aria-hidden className="inline-flex items-center gap-1">
        <span className="lacunex-thinking-dot" style={{ animationDelay: "0ms" }} />
        <span className="lacunex-thinking-dot" style={{ animationDelay: "180ms" }} />
        <span className="lacunex-thinking-dot" style={{ animationDelay: "360ms" }} />
      </span>
      <span className="text-sm">{phases[phaseIdx]}</span>
      <style>{`
        .lacunex-thinking-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b42318;
          opacity: 0.35;
          animation: lacunex-thinking-bounce 1.2s ease-in-out infinite;
        }
        @keyframes lacunex-thinking-bounce {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
