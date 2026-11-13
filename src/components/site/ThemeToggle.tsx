"use client";

import { Moon, Sun } from "lucide-react";

// Light / dark switch for the navbar. The theme lives on <html data-theme>,
// set before first paint by the script in app/layout.tsx. Choosing here saves
// the choice on this device; until then the site follows the system setting.
// Both icons render and CSS shows the right one, so server and client agree.
export default function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("vc-theme", next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
      aria-label="Switch between light and dark mode"
    >
      <Moon className="h-[1.1rem] w-[1.1rem] dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-[1.1rem] w-[1.1rem] dark:block" aria-hidden="true" />
    </button>
  );
}
