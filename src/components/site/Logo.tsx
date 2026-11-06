import { cn } from "@/lib/cn";

const BASE = "/logo/v2/visibility-campaigns";

// The official v2 logo files, swapped by colour scheme. Never recolour or stretch them.
// variant="full" is the dots + stacked wordmark; variant="icon" is the dots alone.
interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export default function Logo({ variant = "full", className }: LogoProps) {
  const name = variant === "icon" ? "icon" : "logo";
  const ratio = variant === "icon" ? "aspect-square" : "aspect-[1410/462]";

  return (
    <span className={cn("relative inline-block", ratio, className)}>
      <img
        src={`${BASE}-${name}-light.svg`}
        alt="Visibility Campaigns"
        className="absolute inset-0 h-full w-full dark:hidden"
      />
      <img
        src={`${BASE}-${name}-dark.svg`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full dark:block"
      />
    </span>
  );
}
