"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// The app's modal: a native <dialog> (focus trap, Escape and top layer for
// free). A centred card on desktop, a bottom sheet on phones; motion lives in
// globals.css (.vc-modal). Children scroll; the footer stays put.

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // lg: wide choices side by side (the campaign type picker)
  size?: "md" | "lg";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Wide modals get more room at the sides, the same on every edge
  // (--modal-pad, set in globals.css)
  const pad = size === "lg" ? "px-6 sm:px-[var(--modal-pad)]" : "px-6";

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn("vc-modal", size === "lg" && "vc-modal-lg", className)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="vc-modal-title"
    >
      <div className="flex max-h-[inherit] flex-col overflow-hidden rounded-t-[1.75rem] bg-surface font-body text-ink shadow-[0_24px_80px_-24px_rgb(20_22_26/0.45)] ring-1 ring-line sm:rounded-[1.75rem]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <header className={cn("flex items-start gap-4 pt-5 pb-4 sm:pt-6", pad)}>
          <div className="min-w-0 flex-1">
            <h2 id="vc-modal-title" className="font-heading text-[1.35rem] leading-tight font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {description && <p className="mt-1 text-[0.95rem] text-pretty text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press -mt-1 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-page hover:text-ink"
            aria-label="Close"
          >
            <X className="h-[1.1rem] w-[1.1rem]" />
          </button>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto pb-6", pad)}>{children}</div>
        {footer && <footer className={cn("border-t border-line bg-surface py-4", pad)}>{footer}</footer>}
      </div>
    </dialog>
  );
}
