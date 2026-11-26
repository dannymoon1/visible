"use client";

// "Where and when", the builder's second step (campaign creation plan,
// screen 5, built 26 Nov 2026): platforms as tiles, places that start from
// our cities, languages that fit Akwa Ibom, and the campaign's run drawn as
// a timeline. The calendar and the city search are shadcn/ui (Radix): a
// popover on desktop, a bottom sheet on phones.

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CalendarBlank, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, YouTubeShortsIcon, type BrandIconProps } from "@/components/icons/brands";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/cn";
import { PLATFORMS, type Platform } from "@/lib/campaignOptions";
import { ALL_PLACE_OPTIONS, QUICK_PLACES, placeLabel, samePlace, type Place } from "@/lib/campaignPlaces";
import { END_DAYS, VIEW_WINDOW_DAYS, addDays, daysBetween } from "@/lib/pricing";

// ---------------------------------------------------------
// Dates: kept as YYYY-MM-DD, shown the Nigerian way ("Wed 3 Dec")

export function todayISO(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
const toISO = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// "Wed 3 Dec" (with the year when it isn't this year)
export function dayLabel(iso: string): string {
  const date = toDate(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

// Phones get bottom sheets, wider screens popovers
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 640px)").matches,
    () => true
  );
}

// ---------------------------------------------------------
// Shared pieces

function Chip({ on, onClick, children, ...rest }: { on: boolean; onClick: () => void; children: ReactNode; "aria-haspopup"?: "dialog" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      {...rest}
      className={cn(
        "press inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        on ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink hover:border-muted/50"
      )}
    >
      {children}
    </button>
  );
}

// A popover on desktop, a bottom sheet on phones, around the same content
function Picker({
  open,
  onOpenChange,
  title,
  description,
  anchor,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  anchor: ReactNode;
  children: ReactNode;
  wide: boolean;
}) {
  if (wide) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>{anchor}</PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={8}
          aria-label={title}
          className="w-auto rounded-[1.25rem] border-line bg-surface p-2 text-ink shadow-[0_16px_40px_-12px_rgb(20_22_26/0.25)]"
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <>
      {anchor}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[1.5rem] border-line bg-surface px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-ink">
          <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
          <SheetHeader className="p-0 pt-2 text-left">
            <SheetTitle className="font-heading text-lg font-semibold text-ink">{title}</SheetTitle>
            <SheetDescription className="text-sm text-muted">{description}</SheetDescription>
          </SheetHeader>
          <div className="flex justify-center">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------
// 1. Platforms as tiles

const PLATFORM_TILES: Record<Platform, { icon: (p: BrandIconProps) => ReactNode; name: string; what: string }> = {
  TikTok: { icon: TikTokIcon, name: "TikTok", what: "Short video" },
  Instagram: { icon: InstagramIcon, name: "Instagram", what: "Reel or post" },
  Facebook: { icon: FacebookIcon, name: "Facebook", what: "Video or post" },
  "YouTube Shorts": { icon: YouTubeShortsIcon, name: "YouTube Shorts", what: "Under a minute" },
  YouTube: { icon: YouTubeIcon, name: "YouTube", what: "Long video" },
};
// The order brands most often pick, for our market
const TILE_ORDER: Platform[] = ["TikTok", "Instagram", "Facebook", "YouTube Shorts", "YouTube"];

export function PlatformTiles({ value, onToggle, invalid }: { value: string[]; onToggle: (p: Platform) => void; invalid: boolean }) {
  return (
    <div id="platforms" role="group" aria-label="Platforms" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {TILE_ORDER.filter((p) => PLATFORMS.includes(p)).map((p) => {
        const tile = PLATFORM_TILES[p];
        const on = value.includes(p);
        const Icon = tile.icon;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            aria-invalid={invalid && !value.length ? true : undefined}
            onClick={() => onToggle(p)}
            className={cn(
              "press relative flex min-h-[6.5rem] flex-col items-start justify-between gap-3 rounded-2xl bg-surface p-3.5 text-left transition-shadow",
              on ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-muted/50"
            )}
          >
            <Icon colored className="h-7 w-7" aria-hidden="true" />
            <span>
              <span className="block text-sm leading-tight font-semibold text-ink">{tile.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{tile.what}</span>
            </span>
            <span
              className={cn(
                "absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full transition-[opacity,scale] duration-200",
                on ? "scale-100 bg-ink text-page opacity-100" : "scale-75 opacity-0"
              )}
              aria-hidden="true"
            >
              <Check weight="bold" className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------
// 2. Where customers are

export function PlaceField({ value, onChange }: { value: Place; onChange: (p: Place) => void }) {
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const quick = QUICK_PLACES.find((q) => samePlace(q.place, value));
  const other = !quick;

  const search = (
    <Command className="w-full rounded-xl bg-surface text-ink sm:w-80">
      <CommandInput placeholder="Search a city or state" className="h-11 text-[15px]" />
      <CommandList className="max-h-72">
        <CommandEmpty>No city or state by that name.</CommandEmpty>
        <CommandGroup heading="Cities">
          {ALL_PLACE_OPTIONS.filter((o) => o.place.city).map((o) => (
            <PlaceItem key={o.key} option={o} on={samePlace(o.place, value)} onPick={() => (onChange(o.place), setOpen(false))} />
          ))}
        </CommandGroup>
        <CommandGroup heading="Whole states">
          {ALL_PLACE_OPTIONS.filter((o) => !o.place.city).map((o) => (
            <PlaceItem key={o.key} option={o} on={samePlace(o.place, value)} onPick={() => (onChange(o.place), setOpen(false))} />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <div id="place" role="group" aria-label="Where your customers are" className="flex flex-wrap gap-2">
      {QUICK_PLACES.map((q) => (
        <Chip key={q.key} on={quick?.key === q.key} onClick={() => onChange(q.place)}>
          {q.label}
        </Chip>
      ))}
      <Picker
        wide={wide}
        open={open}
        onOpenChange={setOpen}
        title="Another city"
        description="Search Nigerian cities and states."
        anchor={
          <span className="inline-flex">
            <Chip on={other} onClick={() => setOpen(true)} aria-haspopup="dialog">
              <MagnifyingGlass className="h-4 w-4" aria-hidden="true" />
              {other ? placeLabel(value) : "Another city"}
            </Chip>
          </span>
        }
      >
        {search}
      </Picker>
    </div>
  );
}

function PlaceItem({ option, on, onPick }: { option: (typeof ALL_PLACE_OPTIONS)[number]; on: boolean; onPick: () => void }) {
  return (
    <CommandItem
      value={`${option.label} ${option.detail}`}
      onSelect={onPick}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-[15px] data-[selected=true]:bg-page"
    >
      <span>
        {option.label}
        {option.place.city && <span className="ml-1.5 text-sm text-muted">{option.detail}</span>}
      </span>
      {on && <Check weight="bold" className="h-4 w-4 text-ink" aria-hidden="true" />}
    </CommandItem>
  );
}

// ---------------------------------------------------------
// 3. Languages

export function LanguageChips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (l: string) => void }) {
  return (
    <div id="languages" role="group" aria-label="Languages" className="flex flex-wrap gap-2">
      {options.map((l) => (
        <Chip key={l} on={value.includes(l)} onClick={() => onToggle(l)}>
          {l}
        </Chip>
      ))}
    </div>
  );
}

// ---------------------------------------------------------
// 4. Dates drawn as a run

const LENGTHS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 21, label: "3 weeks" },
  { days: 30, label: "30 days" },
] as const;

export function CampaignRun({
  startDate,
  endDate,
  verified,
  startError,
  endError,
  onStart,
  onEnd,
}: {
  startDate: string;
  endDate: string;
  verified: boolean;
  startError?: string;
  endError?: string;
  onStart: (iso: string) => void;
  onEnd: (iso: string) => void;
}) {
  const wide = useWide();
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const length = startDate && endDate ? daysBetween(startDate, endDate) : null;
  const valid = length !== null && length >= END_DAYS.min && length <= END_DAYS.max;
  const pickedOther = Boolean(startDate) && startDate !== today && startDate !== tomorrow;
  const customLength = length !== null && !LENGTHS.some((l) => l.days === length);

  const calendar = (which: "start" | "end") => {
    const selected = which === "start" ? startDate : endDate;
    const base = startDate || today;
    const from = which === "start" ? today : addDays(base, END_DAYS.min);
    const to = which === "end" ? addDays(base, END_DAYS.max) : undefined;
    return (
      <Calendar
        mode="single"
        selected={selected ? toDate(selected) : undefined}
        defaultMonth={toDate(selected || from)}
        startMonth={toDate(from)}
        endMonth={to ? toDate(to) : undefined}
        disabled={[{ before: toDate(from) }, ...(to ? [{ after: toDate(to) }] : [])]}
        onSelect={(date) => {
          if (!date) return;
          if (which === "start") onStart(toISO(date));
          else onEnd(toISO(date));
          setPicking(null);
        }}
        className="bg-transparent p-1 [--cell-size:--spacing(10)]"
      />
    );
  };

  return (
    <div className="space-y-6 rounded-[1.5rem] bg-surface p-5 ring-1 ring-line sm:p-6">
      <div>
        <p id="startDate-label" className="mb-1.5 text-sm font-medium text-ink">
          Starts<span className="text-error" aria-hidden="true"> *</span>
          <span className="sr-only"> (required)</span>
        </p>
        <div id="startDate" role="group" aria-labelledby="startDate-label" className="flex flex-wrap gap-2">
          <Chip on={startDate === today} onClick={() => onStart(today)}>
            Today
          </Chip>
          <Chip on={startDate === tomorrow} onClick={() => onStart(tomorrow)}>
            Tomorrow
          </Chip>
          <Picker
            wide={wide}
            open={picking === "start"}
            onOpenChange={(o) => setPicking(o ? "start" : null)}
            title="Pick a start date"
            description="Creators can join from this day."
            anchor={
              <span className="inline-flex">
                <Chip on={pickedOther} onClick={() => setPicking("start")} aria-haspopup="dialog">
                  <CalendarBlank className="h-4 w-4" aria-hidden="true" />
                  {pickedOther ? dayLabel(startDate) : "Pick a date"}
                </Chip>
              </span>
            }
          >
            {calendar("start")}
          </Picker>
        </div>
        {startError ? (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {startError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">{verified ? "Verified creators are emailed on this day." : "Creators can join from this day."}</p>
        )}
      </div>

      <div>
        <p id="endDate-label" className="mb-1.5 text-sm font-medium text-ink">
          Runs for<span className="text-error" aria-hidden="true"> *</span>
          <span className="sr-only"> (required)</span>
        </p>
        <div id="endDate" role="group" aria-labelledby="endDate-label" className="flex flex-wrap gap-2">
          {LENGTHS.map(({ days, label }) => (
            <Chip
              key={days}
              on={length === days}
              onClick={() => {
                // No start yet: a length starts it today
                if (!startDate) onStart(today);
                onEnd(addDays(startDate || today, days));
              }}
            >
              {label}
            </Chip>
          ))}
          <Picker
            wide={wide}
            open={picking === "end"}
            onOpenChange={(o) => setPicking(o ? "end" : null)}
            title="Pick the last day"
            description={`${END_DAYS.min} to ${END_DAYS.max} days after the start.`}
            anchor={
              <span className="inline-flex">
                <Chip on={customLength} onClick={() => {
                    if (!startDate) onStart(today);
                    setPicking("end");
                  }} aria-haspopup="dialog">
                  <CalendarBlank className="h-4 w-4" aria-hidden="true" />
                  {customLength && endDate ? `Until ${dayLabel(endDate)}` : "Custom"}
                </Chip>
              </span>
            }
          >
            {calendar("end")}
          </Picker>
        </div>
        {endError ? (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {endError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">The last day creators can post. A campaign also ends when its budget is used.</p>
        )}
      </div>

      {valid && length !== null ? (
        <RunTimeline startDate={startDate} endDate={endDate} length={length} />
      ) : (
        <p className="rounded-2xl bg-page px-4 py-3 text-sm text-muted">
          {startDate ? `Choose how long it runs: ${END_DAYS.min} to ${END_DAYS.max} days.` : "Choose when it starts. It then runs for one to four weeks."}
        </p>
      )}
    </div>
  );
}

// Posting days in ink, then the days views still count in a lighter shade
function RunTimeline({ startDate, endDate, length }: { startDate: string; endDate: string; length: number }) {
  const final = addDays(endDate, VIEW_WINDOW_DAYS);
  const split = (length / (length + VIEW_WINDOW_DAYS)) * 100;
  return (
    <div className="rounded-2xl bg-page px-4 pt-3 pb-4">
      <div aria-hidden="true">
        <div className="relative h-5">
          <span
            className="absolute bottom-0 -translate-x-1/2 text-xs font-medium whitespace-nowrap text-ink"
            style={{ left: `clamp(3.5rem, ${split}%, calc(100% - 3.5rem))` }}
          >
            Last day {dayLabel(endDate)}
          </span>
        </div>
        <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full">
          <span className="h-full bg-ink transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ width: `${split}%` }} />
          <span className="h-full flex-1 bg-ink/15" />
        </div>
        <div className="mt-1.5 flex justify-between gap-3 text-xs">
          <span className="text-ink">
            <span className="font-medium">Starts</span> {dayLabel(startDate)}
          </span>
          <span className="text-right text-muted">
            <span className="font-medium">Results final</span> {dayLabel(final)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-pretty text-ink">
        Creators can post from <strong className="font-semibold">{dayLabel(startDate)}</strong> to{" "}
        <strong className="font-semibold">{dayLabel(endDate)}</strong> ({length} days). Views are counted for {VIEW_WINDOW_DAYS} days after each
        post, so your results are final by <strong className="font-semibold">{dayLabel(final)}</strong>.
      </p>
    </div>
  );
}
