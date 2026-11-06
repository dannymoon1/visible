import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import type { SpotState } from "@/lib/demo/adiaha";
import type { AvatarKey } from "@/components/site/CreatorAvatar";
import { cn } from "@/lib/cn";

// The app's signature: a campaign drawn as the logo's ring. Each dot is one
// creator spot around the business at the centre, and it fills as the spot
// goes open → joined → posted → verified.
//
//   <GatheringRing spots={…}>  → faces on the ring (campaign pages)
//   <MiniRing spots={…} />     → the bare logo, eight dots, for lists

type Spot = { avatar: AvatarKey; state: SpotState };

const at = (i: number, n: number, r: number): CSSProperties => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { left: `${(50 + r * Math.cos(a)).toFixed(2)}%`, top: `${(50 + r * Math.sin(a)).toFixed(2)}%` };
};

export function GatheringRing({
  spots,
  centre,
  className,
}: {
  spots: Spot[];
  centre: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square", className)}>
      <span className="absolute inset-[13%] rounded-full border border-dashed border-line" aria-hidden="true" />
      <span className="absolute top-1/2 left-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember text-on-signal shadow-[0_0_0_0.6rem_rgb(255_106_26/0.1)]">
        {centre}
      </span>
      {spots.map((s, i) => (
        <span
          key={i}
          data-state={s.state}
          className="ring-spot absolute -mt-[9%] -ml-[9%] h-[18%] w-[18%]"
          style={at(i, spots.length, 37)}
        >
          {s.state === "open" ? (
            <span className="block h-full w-full rounded-full border-2 border-dashed border-line bg-surface" />
          ) : (
            <CreatorAvatar
              who={s.avatar}
              large
              className={cn(
                "h-full w-full ring-[3px]",
                s.state === "joined" && "opacity-55 ring-surface grayscale-[35%]",
                s.state === "posted" && "ring-warning",
                s.state === "verified" && "ring-surface"
              )}
            />
          )}
          {s.state === "verified" && (
            <span className="absolute -right-[4%] -bottom-[4%] flex h-[42%] w-[42%] items-center justify-center rounded-full bg-verified text-white ring-2 ring-surface">
              <Check className="h-[65%] w-[65%]" strokeWidth={3.5} aria-hidden="true" />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// The logo itself as a progress mark: ink dots for posted spots, a green dot
// for verified, hollow for the rest
export function MiniRing({ spots, className }: { spots: Spot[]; className?: string }) {
  return (
    <span className={cn("relative inline-block aspect-square", className)} aria-hidden="true">
      <span className="absolute top-1/2 left-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
      {spots.map((s, i) => (
        <span
          key={i}
          className={cn(
            "absolute -mt-[8%] -ml-[8%] h-[16%] w-[16%] rounded-full",
            s.state === "verified" && "bg-verified",
            s.state === "posted" && "bg-ink",
            s.state === "joined" && "bg-muted/45",
            s.state === "open" && "border border-muted/50"
          )}
          style={at(i, spots.length, 40)}
        />
      ))}
    </span>
  );
}
