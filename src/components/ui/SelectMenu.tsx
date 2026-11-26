"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// A select that looks like the rest of the app: a button that opens a list
// with icons, a tick on the chosen option and full keyboard support
// (arrows, Home/End, Enter, Escape, first-letter jump). The list is fixed to
// the viewport, so it isn't clipped inside a scrolling modal, and opens upward
// when there's no room below.

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

type ListPosition = { top: number; left: number; width: number; up: boolean };

// Where the list goes: under the button, or above it when there's no room below
function measure(button: HTMLElement | null, optionCount: number): ListPosition | null {
  const rect = button?.getBoundingClientRect();
  if (!rect) return null;
  const listHeight = Math.min(optionCount * 44 + 12, 304);
  const up = window.innerHeight - rect.bottom < listHeight + 16 && rect.top > listHeight + 16;
  return { top: up ? rect.top - 6 : rect.bottom + 6, left: rect.left, width: rect.width, up };
}

export default function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  id,
  disabled = false,
  variant = "filled",
}: {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  id?: string;
  disabled?: boolean;
  // filled: grey field on a white sheet (modals). outline: white field with a
  // hairline, for forms that sit on the grey page (the campaign builder)
  variant?: "filled" | "outline";
}) {
  const autoId = useId();
  const buttonId = id ?? `${autoId}-button`;
  const listId = `${autoId}-list`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<ListPosition | null>(null);
  // Where the list is rendered: inside an open modal (so it sits above it in
  // the top layer), else the app's root (so it keeps the app's colours).
  // Never inside the field's own section, whose animations can carry a
  // transform that would throw off fixed positioning.
  const [host, setHost] = useState<Element | null>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const SelectedIcon = selected?.icon;

  const optionCount = options.length;

  const openList = () => {
    const button = buttonRef.current;
    setHost(button?.closest("dialog") ?? button?.closest(".vc-light") ?? document.body);
    setPos(measure(button ?? null, optionCount));
    setActive(Math.max(options.findIndex((o) => o.value === value), 0));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  // Focus the list once it's on screen, and keep the active option in view
  useLayoutEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    // Scroll only the list (scrollIntoView would also scroll the page)
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop - 6;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight + 6;
    }
  }, [active, open]);

  // Close on an outside press or resize. On scroll the list follows its
  // button, and closes only once the button has left the screen.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) close(false);
      else setPos(measure(buttonRef.current, optionCount));
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, optionCount]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape") {
      // Keep the surrounding dialog open: close only the list
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1) {
      const letter = e.key.toLowerCase();
      const start = active + 1;
      const order = [...options.slice(start), ...options.slice(0, start)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(letter));
      if (hit) setActive(options.indexOf(hit));
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
        className={cn(
          "press flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-[15px] text-ink ring-1 transition-[box-shadow,background-color]",
          "focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55",
          variant === "filled" ? "bg-page ring-transparent enabled:hover:ring-line" : "bg-surface ring-line enabled:hover:ring-muted/50",
          open && "bg-surface ring-line"
        )}
      >
        {SelectedIcon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-ink ring-1 ring-line">
            <SelectedIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open &&
        pos &&
        host &&
        createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={buttonId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
          }}
          className={cn(
            "vc-pop z-50",
            pos.up ? "origin-bottom" : "origin-top",
            " max-h-[19rem] overflow-y-auto rounded-2xl bg-surface p-1.5 font-body text-ink shadow-[0_16px_48px_-16px_rgb(20_22_26/0.35)] ring-1 ring-line outline-none"
          )}
        >
          {options.map((option, index) => {
            const Icon = option.icon;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 select-none",
                  index === active && "bg-page"
                )}
              >
                {Icon && <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-ink" : "text-muted")} aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", isSelected && "font-medium")}>{option.label}</span>
                  {option.hint && <span className="block truncate text-sm text-muted">{option.hint}</span>}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-ink" strokeWidth={2.5} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>,
          host
        )}
    </>
  );
}
