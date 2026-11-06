import { Info } from "lucide-react";

// A figure's source, one tap away: a small ⓘ that shows the source on hover
// or focus (tap on phones). Keeps the page clean and every claim defensible.
export default function SourceNote({ text }: { text: string }) {
  return (
    <span className="group/src relative inline-flex align-middle">
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full text-muted/70 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-signal"
        aria-label={`Source: ${text}`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 bottom-full z-20 mb-2 w-64 rounded-xl bg-[#14161A] px-3 py-2 font-body text-xs leading-snug font-normal tracking-normal text-[#F2F3F5] opacity-0 shadow-lg transition-opacity duration-200 group-focus-within/src:visible group-focus-within/src:opacity-100 group-hover/src:visible group-hover/src:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
