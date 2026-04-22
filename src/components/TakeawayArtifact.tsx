"use client";

import ReactMarkdown from "react-markdown";

interface TakeawayArtifactProps {
  markdown: string | null;
  isGenerating: boolean;
  error: string | null;
  onClose: () => void;
}

export function TakeawayArtifact({
  markdown,
  isGenerating,
  error,
  onClose,
}: TakeawayArtifactProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-stone-50 shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-8 py-4">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-stone-500">
              Your reflection
            </h2>
            <p className="mt-0.5 text-sm text-stone-900">
              A reading of the conversation you just had.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          {isGenerating && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-600" />
              <p className="text-sm">Pulling the threads together…</p>
              <p className="text-xs text-stone-400">
                This takes up to a minute — one careful pass over the whole
                conversation.
              </p>
            </div>
          )}

          {error && !isGenerating && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Couldn&apos;t generate the reflection.</p>
              <p className="mt-1 text-xs opacity-80">{error}</p>
            </div>
          )}

          {markdown && !isGenerating && (
            <article className="font-serif text-[15px] leading-relaxed text-stone-900 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-stone-500 [&_p]:mb-3 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1.5 [&_em]:italic [&_em]:text-stone-700 [&_strong]:font-semibold [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-stone-700">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
