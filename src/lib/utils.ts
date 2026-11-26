import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui's class joiner: later classes win over earlier ones (twMerge), so
// a className passed to a shadcn component can override its defaults. App
// code keeps using the simpler cn in src/lib/cn.ts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
