// Join class names, skipping falsy ones. Safe to use in server components.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatNaira(value: number): string {
  return `₦${Math.round(Number(value) || 0).toLocaleString("en-NG")}`;
}
